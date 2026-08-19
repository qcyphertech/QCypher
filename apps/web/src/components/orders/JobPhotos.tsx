'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, X, Trash2, Loader2, ImageIcon, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveJobPhoto, deleteJobPhoto, renameJobPhoto } from '@/lib/actions/photos'
import type { JobPhoto } from '@/lib/actions/photos'

const LABEL_OPTIONS = ['Before', 'After', 'Other']
const MAX_PHOTOS_SOFT_WARN = 12
const MAX_DIMENSION = 1600   // px — longer edge capped here
const JPEG_QUALITY  = 0.82   // ~82% — good quality/size balance
const GRID_COLS = 'repeat(auto-fill, minmax(126px, 1fr))'

type Props = {
  orderId: string
  initialPhotos: JobPhoto[]
  tenantId: string
}

// A photo the user has picked but not yet saved — named and labeled here,
// in step 2, before it ever touches Supabase Storage or the database.
type PendingPhoto = {
  localId: string
  file: File
  blob: Blob
  previewUrl: string
  name: string
  label: string
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

function LabelPicker({ value, onChange, size = 'md' }: { value: string; onChange: (v: string) => void; size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? '6px 4px' : '7px 6px'
  const font = size === 'sm' ? '10.5px' : '11.5px'
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {LABEL_OPTIONS.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            flex: 1, padding: pad, borderRadius: '8px',
            border: opt === value ? 'none' : '1px solid hsl(var(--border))',
            background: opt === value ? 'linear-gradient(135deg,#2a52a0,#4a9db5)' : 'hsl(var(--background))',
            color: opt === value ? '#fff' : 'hsl(var(--muted-foreground))',
            fontSize: font, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// Editable name field shared by both the pending-review grid and the
// saved gallery — a plain input that looks like text until focused.
function NameField({ value, placeholder, onChange, onBlur, disabled }: {
  value: string
  placeholder: string
  onChange: (v: string) => void
  onBlur?: (value: string) => void
  disabled?: boolean
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      // Reads the live DOM value at blur time, not a value captured in a
      // render closure — blur can fire before React has re-rendered with
      // the latest onChange, so a closure-captured value here would be
      // stale and silently skip the save (found live-testing the rename).
      onBlur={e => onBlur?.(e.target.value)}
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%', border: '1px solid transparent', background: 'transparent',
        borderRadius: '8px', padding: '5px 7px', margin: 0,
        fontSize: '12.5px', fontWeight: 700, color: 'hsl(var(--foreground))',
        fontFamily: 'inherit',
      }}
      onFocus={e => { e.currentTarget.style.background = 'hsl(var(--muted))'; e.currentTarget.style.borderColor = 'hsl(var(--border))' }}
      onMouseLeave={e => { if (document.activeElement !== e.currentTarget) { e.currentTarget.style.background = 'transparent' } }}
    />
  )
}

export function JobPhotos({ orderId, initialPhotos, tenantId }: Props) {
  const [photos,        setPhotos]        = useState<JobPhoto[]>(initialPhotos)
  const [pending,        setPending]       = useState<PendingPhoto[]>([])
  const [preparing,     setPreparing]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [uploadError,   setUploadError]   = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<JobPhoto | null>(null)
  const [lightbox,      setLightbox]      = useState<JobPhoto | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Last name actually persisted per photo, so handleRename can tell a
  // real edit from a no-op. photos[].name itself isn't safe to compare
  // against — the NameField's onChange keeps it in sync with the input
  // on every keystroke, so by the time blur fires it already equals
  // whatever was just typed, and a "did this change?" check against it
  // would always say no.
  const savedNames = useRef<Record<string, string>>(
    Object.fromEntries(initialPhotos.map(p => [p.id, p.name ?? '']))
  )

  // Pending previews are local blob: URLs — must be revoked or they leak
  // for the life of the tab, and definitely on unmount.
  useEffect(() => () => { pending.forEach(p => URL.revokeObjectURL(p.previewUrl)) }, [])

  const grouped = LABEL_OPTIONS.reduce<Record<string, JobPhoto[]>>((acc, label) => {
    acc[label] = photos.filter(p => (p.label ?? 'Other').toLowerCase() === label.toLowerCase())
    return acc
  }, { Before: [], After: [], Other: [] })

  // Step 1 → 2: pick photos, convert/compress them, and hold them locally
  // for naming — nothing touches Supabase Storage or the database yet.
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    setUploadError(null)
    setPreparing(true)
    try {
      const prepared: PendingPhoto[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const normalized = await maybeConvertHeic(file)
        const compressed = await compressImage(normalized)
        console.info(`[job-photos] compression: ${(file.size / 1024).toFixed(1)} KB → ${(compressed.size / 1024).toFixed(1)} KB (${Math.round((1 - compressed.size / file.size) * 100)}% reduction)`)
        prepared.push({
          localId: crypto.randomUUID(),
          file: normalized,
          blob: compressed,
          previewUrl: URL.createObjectURL(compressed),
          name: '',
          label: 'Before',
        })
      }
      setPending(prev => [...prev, ...prepared])
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Could not prepare photo')
    } finally {
      setPreparing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  function updatePending(localId: string, patch: Partial<PendingPhoto>) {
    setPending(prev => prev.map(p => p.localId === localId ? { ...p, ...patch } : p))
  }

  function removePending(localId: string) {
    setPending(prev => {
      const target = prev.find(p => p.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter(p => p.localId !== localId)
    })
  }

  function cancelPending() {
    pending.forEach(p => URL.revokeObjectURL(p.previewUrl))
    setPending([])
    setUploadError(null)
  }

  // Step 2 → 3: actually upload + persist every pending photo, in the
  // order the user reviewed them, then drop them into the saved gallery.
  async function confirmPending() {
    if (pending.length === 0) return
    setUploadError(null)
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadError('Not signed in'); setSaving(false); return }

    const saved: JobPhoto[] = []
    try {
      for (const item of pending) {
        const path = `${tenantId}/${orderId}/${crypto.randomUUID()}.jpg`

        const { error: uploadErr } = await supabase.storage
          .from('job-photos')
          .upload(path, item.blob, { contentType: 'image/jpeg', upsert: false })
        if (uploadErr) throw uploadErr

        const { data: signed } = await supabase.storage
          .from('job-photos')
          .createSignedUrl(path, 3600)

        const result = await saveJobPhoto({ orderId, storagePath: path, label: item.label, name: item.name })

        saved.push({
          id: result.id,
          tenant_id: tenantId,
          order_id: orderId,
          storage_path: path,
          label: item.label,
          name: item.name.trim() || null,
          uploaded_by: user.id,
          created_at: new Date().toISOString(),
          url: signed?.signedUrl ?? undefined,
        })
      }
      setPhotos(prev => [...prev, ...saved])
      saved.forEach(p => { savedNames.current[p.id] = p.name ?? '' })
      pending.forEach(p => URL.revokeObjectURL(p.previewUrl))
      setPending([])
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
      // Whatever made it through stays saved; drop only the photos that
      // never got persisted so the user isn't stuck re-entering names
      // for ones that already succeeded.
      if (saved.length > 0) {
        setPhotos(prev => [...prev, ...saved])
        saved.forEach(p => { savedNames.current[p.id] = p.name ?? '' })
        const savedCount = saved.length
        setPending(prev => {
          prev.slice(0, savedCount).forEach(p => URL.revokeObjectURL(p.previewUrl))
          return prev.slice(savedCount)
        })
      }
    } finally {
      setSaving(false)
    }
  }

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

  async function handleRename(photo: JobPhoto, name: string) {
    const trimmed = name.trim()
    if ((savedNames.current[photo.id] ?? '') === trimmed) return
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, name: trimmed || null } : p))
    try {
      await renameJobPhoto(photo.id, orderId, trimmed)
      savedNames.current[photo.id] = trimmed
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Could not save the name')
    }
  }

  const atSoftLimit = photos.length >= MAX_PHOTOS_SOFT_WARN
  const busy = preparing || saving

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
          position: 'relative', overflow: 'hidden',
          padding: '16px 18px',
          background: 'linear-gradient(120deg, #0d1f45 0%, #1a3070 45%, #2a52a0 80%, #4a9db5 130%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(60% 140% at 90% 0%, rgba(255,255,255,0.16), transparent 60%)',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Camera style={{ width: '16px', height: '16px', color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
                Job Photos
              </p>
              <p style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', marginTop: '1px' }}>
                {photos.length === 0 ? 'No photos yet' : `${photos.length} photo${photos.length !== 1 ? 's' : ''} on this job`}
              </p>
            </div>
          </div>

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
            disabled={busy}
            style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '10px',
              background: '#fff', color: '#2a52a0', fontSize: '13px', fontWeight: 700,
              border: 'none', cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {preparing
              ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
              : <Upload style={{ width: '14px', height: '14px' }} />}
            {preparing ? 'Preparing…' : 'Upload'}
          </button>
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

        {/* Step 2 — name & label before saving */}
        {pending.length > 0 && (
          <div style={{ padding: '16px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted) / 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', color: '#fff',
                fontSize: '11px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>2</div>
              <div>
                <p style={{ fontSize: '13.5px', fontWeight: 800, color: 'hsl(var(--foreground))' }}>
                  Name &amp; label — {pending.length} photo{pending.length !== 1 ? 's' : ''} picked
                </p>
                <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '1px' }}>
                  Set before saving, or leave blank and rename later
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: '14px' }}>
              {pending.map(item => (
                <div key={item.localId} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    position: 'relative', borderRadius: '12px', overflow: 'hidden',
                    aspectRatio: '1', background: 'hsl(var(--muted))',
                    outline: '2px dashed hsl(var(--border))', outlineOffset: '2px',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => removePending(item.localId)}
                      disabled={saving}
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '26px', height: '26px', borderRadius: '8px',
                        background: 'rgba(0,0,0,0.55)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <X style={{ width: '13px', height: '13px', color: '#fff' }} />
                    </button>
                  </div>
                  <NameField
                    value={item.name}
                    placeholder="Name this photo…"
                    onChange={v => updatePending(item.localId, { name: v })}
                    disabled={saving}
                  />
                  <LabelPicker value={item.label} onChange={v => updatePending(item.localId, { label: v })} size="sm" />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={confirmPending}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', borderRadius: '10px',
                  background: 'linear-gradient(135deg,#2a52a0,#4a9db5)', color: '#fff',
                  fontSize: '13px', fontWeight: 700, border: 'none',
                  cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                  : <Check style={{ width: '14px', height: '14px' }} />}
                {saving ? 'Saving…' : `Save ${pending.length} Photo${pending.length !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={cancelPending}
                disabled={saving}
                style={{
                  padding: '9px 16px', borderRadius: '10px',
                  background: 'hsl(var(--background))', color: 'hsl(var(--muted-foreground))',
                  fontSize: '13px', fontWeight: 700, border: '1px solid hsl(var(--border))',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Saved gallery, grouped by label */}
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
                <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: '14px' }}>
                  {grouped[label].map(photo => (
                    <div key={photo.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div
                        style={{
                          position: 'relative', borderRadius: '10px', overflow: 'hidden',
                          aspectRatio: '1', background: 'hsl(var(--muted))',
                          cursor: 'pointer',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.name ?? photo.label ?? 'Job photo'}
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
                      <NameField
                        value={photo.name ?? ''}
                        placeholder="Name this photo…"
                        onChange={v => setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, name: v } : p))}
                        onBlur={v => handleRename(photo, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 && pending.length === 0 && !busy && (
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
          <div style={{
            position: 'absolute', top: '18px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          }}>
            {lightbox.name && (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{lightbox.name}</span>
            )}
            {lightbox.label && (
              <span style={{
                fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)',
              }}>
                {lightbox.label}
              </span>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.name ?? lightbox.label ?? 'Job photo'}
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
              This {confirmDelete.name ? `"${confirmDelete.name}"` : confirmDelete.label ? `"${confirmDelete.label}" photo` : 'photo'} will be permanently removed. This can't be undone.
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
