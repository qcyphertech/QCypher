'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MAX_DIMENSION = 1200
const JPEG_QUALITY  = 0.82

// Same HEIC-conversion + resize/compress pipeline as job photos (JobPhotos.tsx)
// — iPhones save camera captures as HEIC, which <img>/canvas can't decode.
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

export function CatalogImageUpload({ value, onChange }: {
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const normalized = await maybeConvertHeic(file)
      const compressed = await compressImage(normalized)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id
      if (!tenantId) throw new Error('Not signed in')

      const path = `${tenantId}/${crypto.randomUUID()}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('catalog-images')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from('catalog-images').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files)}
      />

      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-[hsl(var(--border))]" />
          <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[13px] font-semibold"
              style={{ color: 'hsl(var(--foreground))', cursor: uploading ? 'wait' : 'pointer' }}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Replace
            </button>
            <button type="button" onClick={() => onChange('')} disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-[13px] font-semibold"
              style={{ color: '#dc2626', cursor: uploading ? 'wait' : 'pointer' }}>
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] px-3 py-4 text-[14px] font-semibold"
          style={{ color: 'hsl(var(--muted-foreground))', cursor: uploading ? 'wait' : 'pointer' }}>
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
            : <><ImageIcon className="w-4 h-4" /> Upload a photo</>}
        </button>
      )}

      {error && <p className="text-[13px] text-red-600 mt-1.5">{error}</p>}
    </div>
  )
}
