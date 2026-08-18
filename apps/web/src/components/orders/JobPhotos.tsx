'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, X, Trash2, Plus, Loader2, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveJobPhoto, deleteJobPhoto } from '@/lib/actions/photos'
import type { JobPhoto } from '@/lib/actions/photos'

const LABEL_OPTIONS = ['Before', 'After', 'Other']
const MAX_PHOTOS_SOFT_WARN = 12
const MAX_DIMENSION = 1600   // px — longer edge capped here
const JPEG_QUALITY  = 0.82   // ~82% — good quality/size balance

type Props = {
  orderId: string
  initialPhotos: JobPhoto[]
  tenantId: string
}

// iPhones default to saving camera captures as HEIC/HEIF (the file
// input's `capture="environment"` triggers this), which browsers can't
// decode via <img>/canvas — compressImage below would fail every single
// one with "Image load failed" before any upload was even attempted.
// Convert to JPEG first so the rest of the pipeline never sees HEIC.
async function maybeConvertHeic(file: File): Promise<File> {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name)
  if (!isHeic) return file
  try {
    const heic2any = (await import('heic2any')).default
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(result) ? result[0] : result
    return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
  } catch {
    throw new Error('This photo format isn\'t supported. In your camera settings, set photos to save as "Most Compatible" (JPEG), then try again.')
  }
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) { height = Math.round((height * MAX_DIMENSION) / width); width = MAX_DIMENSION }
        else                  { width  = Math.round((width  * MAX_DIMENSION) / height); height = MAX_DIMENSION }
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read this photo — it may be corrupted or in an unsupported format.')) }
    img.src = objectUrl
  })
}

export function JobPhotos({ orderId, initialPhotos, tenantId }: Props) {
  const [photos,        setPhotos]        = useState<JobPhoto[]>(initialPhotos)
  const [uploading,     setUploading]     = useState(false)
  const [uploadError,   setUploadError]   = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<JobPhoto | null>(null)
  const [lightbox,      setLightbox]      = useState<JobPhoto | null>(null)
  const [pendingLabel,  setPendingLabel]  = useState('Before')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const grouped = LABEL_OPTIONS.reduce<Record<string, JobPhoto[]>>((acc, label) => {
    acc[label] = photos.filter(p => (p.label ?? 'Other').toLowerCase() === label.toLowerCase())
    return acc
  }, { Before: [], After: [], Other: [] })

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    setUploadError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadError('Not signed in'); return }

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue

        const normalized = await maybeConvertHeic(file)
        const compressed = await compressImage(normalized)
        console.info(`[job-photos] compression: ${(file.size / 1024).toFixed(1)} KB → ${(compressed.size / 1024).toFixed(1)} KB (${Math.round((1 - compressed.size / file.size) * 100)}% reduction)`)
        const ext        = 'jpg'
        const filename   = `${crypto.randomUUID()}.${ext}`
        const path       = `${tenantId}/${orderId}/${filename}`

        const { error: uploadErr } = await supabase.storage
          .from('job-photos')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })

        if (uploadErr) throw uploadErr

        // Get a signed URL for immediate display
        const { data: signed } = await supabase.storage
          .from('job-photos')
          .createSignedUrl(path, 3600)

        const saved = await saveJobPhoto({ orderId, storagePath: path, label: pendingLabel })

        const newPhoto: JobPhoto = {
          id:           saved.id,
          tenant_id:    tenantId,
          order_id:     orderId,
          storage_path: path,
          label:        pendingLabel,
          uploaded_by:  user.id,
          created_at:   new Date().toISOString(),
          url:          signed?.signedUrl ?? undefined,
        }
        setPhotos(prev => [...prev, newPhoto])
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [orderId, tenantId, pendingLabel])

  async function confirmAndDelete() {
    if (!confirmDelete) return
    const photo = confirmDelete
    setConfirmDelete(null)
    setDeleting(photo.id)
    try {
      await deleteJobPhoto(photo.id, orderId)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      if (lightbox?.id === photo.id) setLightbox(null)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const atSoftLimit = photos.length >= MAX_PHOTOS_SOFT_WARN

  return (
    <>
      <div style={{
        borderRadius: '18px',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: photos.length ? '1px solid hsl(var(--border))' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(42,82,160,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Camera style={{ width: '16px', height: '16px', color: '#2a52a0' }} />
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                Job Photos
              </p>
              <p style={{ fontSize: '13px', color: 'hsl(var(--muted-foreground))', marginTop: '1px' }}>
                {photos.length === 0 ? 'No photos yet' : `${photos.length} photo${photos.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Upload controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Label picker */}
            <select
              value={pendingLabel}
              onChange={e => setPendingLabel(e.target.value)}
              style={{
                padding: '6px 10px', borderRadius: '10px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--muted))',
                fontSize: '13px', fontWeight: 600,
                color: 'hsl(var(--foreground))', cursor: 'pointer',
              }}
            >
              {LABEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '10px',
                background: 'linear-gradient(135deg,#2a52a0,#4a9db5)',
                color: '#fff', fontSize: '13px', fontWeight: 700,
                border: 'none', cursor: uploading ? 'wait' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading
                ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                : <Plus style={{ width: '14px', height: '14px' }} />}
              {uploading ? 'Uploading…' : 'Add photo'}
            </button>
          </div>
        </div>

        {uploadError && (
          <div style={{ padding: '10px 16px', background: 'rgba(220,38,38,0.06)', borderBottom: '1px solid rgba(220,38,38,0.15)' }}>
            <p style={{ fontSize: '13px', color: '#dc2626' }}>{uploadError}</p>
          </div>
        )}

        {atSoftLimit && (
          <div style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.18)' }}>
            <p style={{ fontSize: '13px', color: '#b45309' }}>
              You have {photos.length} photos on this job. Consider keeping it to {MAX_PHOTOS_SOFT_WARN} or fewer to stay organised.
            </p>
          </div>
        )}

        {/* Gallery grouped by label */}
        {photos.length > 0 && (
          <div style={{ padding: '16px' }}>
            {LABEL_OPTIONS.filter(label => grouped[label].length > 0).map(label => (
              <div key={label} style={{ marginBottom: '20px' }}>
                <p style={{
                  fontSize: '12px', fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))',
                  marginBottom: '10px',
                }}>
                  {label}
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '8px',
                }}>
                  {grouped[label].map(photo => (
                    <div
                      key={photo.id}
                      style={{
                        position: 'relative', borderRadius: '10px', overflow: 'hidden',
                        aspectRatio: '1', background: 'hsl(var(--muted))',
                        cursor: 'pointer',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.label ?? 'Job photo'}
                        onClick={() => setLightbox(photo)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(photo) }}
                        disabled={deleting === photo.id}
                        style={{
                          position: 'absolute', top: '6px', right: '6px',
                          width: '28px', height: '28px', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.55)', border: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: deleting === photo.id ? 'wait' : 'pointer',
                        }}
                      >
                        {deleting === photo.id
                          ? <Loader2 style={{ width: '13px', height: '13px', color: '#fff', animation: 'spin 1s linear infinite' }} />
                          : <Trash2 style={{ width: '13px', height: '13px', color: '#fff' }} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 && !uploading && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '32px 16px', gap: '10px',
          }}>
            <ImageIcon style={{ width: '28px', height: '28px', color: 'hsl(var(--muted-foreground))', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>
              Add before/after photos to document the job
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.12)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '20px', height: '20px', color: '#fff' }} />
          </button>
          {lightbox.label && (
            <span style={{
              position: 'absolute', top: '18px', left: '50%', transform: 'translateX(-50%)',
              fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)',
            }}>
              {lightbox.label}
            </span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.label ?? 'Job photo'}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '90vh',
              borderRadius: '12px', objectFit: 'contain',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              borderRadius: '18px', padding: '24px',
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
              width: '100%', maxWidth: '360px',
            }}
          >
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: '8px' }}>
              Delete photo?
            </p>
            <p style={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', marginBottom: '20px' }}>
              This {confirmDelete.label ? `"${confirmDelete.label}" photo` : 'photo'} will be permanently removed. This can't be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '9px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAndDelete}
                style={{
                  padding: '9px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
