'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type JobPhoto = {
  id: string
  tenant_id: string
  order_id: string
  storage_path: string
  label: string | null
  uploaded_by: string | null
  created_at: string
  url?: string
}

export async function getJobPhotos(orderId: string): Promise<JobPhoto[]> {
  const supabase = await createClient()

  // deleted_at filtering happens here, not in RLS — see
  // 20260830000009_fix_job_photos_delete_rls.sql for why baking "not
  // deleted" into the SELECT policy actually broke soft-deleting a row.
  const { data: photos, error } = await supabase
    .from('job_photos')
    .select('*')
    .eq('order_id', orderId)
    .is('deleted_at', null)
    .order('created_at')

  if (error) throw error
  if (!photos?.length) return []

  // Generate signed URLs (1-hour expiry) for each photo
  const withUrls = await Promise.all(
    photos.map(async (photo) => {
      const { data } = await supabase.storage
        .from('job-photos')
        .createSignedUrl(photo.storage_path, 3600)
      return { ...photo, url: data?.signedUrl ?? null }
    })
  )

  return withUrls.filter((p) => p.url) as JobPhoto[]
}

export async function saveJobPhoto(input: {
  orderId: string
  storagePath: string
  label: string | null
}): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = user.app_metadata?.tenant_id
  if (!tenantId) throw new Error('No tenant')

  const { data, error } = await supabase
    .from('job_photos')
    .insert({
      tenant_id:    tenantId,
      order_id:     input.orderId,
      storage_path: input.storagePath,
      label:        input.label,
      uploaded_by:  user.id,
    })
    .select('id')
    .single()

  if (error) throw error
  revalidatePath(`/orders/${input.orderId}`)
  return data
}

export async function deleteJobPhoto(photoId: string, orderId: string): Promise<void> {
  const supabase = await createClient()

  // Fetch path first (RLS ensures this is the right tenant's row)
  const { data: photo, error: fetchErr } = await supabase
    .from('job_photos')
    .select('storage_path')
    .eq('id', photoId)
    .single()

  if (fetchErr || !photo) throw new Error('Photo not found')

  // Soft-delete the metadata row
  const { error: softErr } = await supabase
    .from('job_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId)

  if (softErr) throw softErr

  // Hard-delete the actual file from storage
  await supabase.storage.from('job-photos').remove([photo.storage_path])

  revalidatePath(`/orders/${orderId}`)
}
