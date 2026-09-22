import { supabase } from './supabase'
import type { AttachmentType } from '@/types'

const BUCKET = 'attachments'

export async function uploadFile(file: File, purchaseRequestId: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${purchaseRequestId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) return { error: error.message, path: null, url: null }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { error: null, path, url: data.publicUrl }
}

export async function attachFile(
  purchaseRequestId: string,
  file: File,
  attachmentType: AttachmentType,
  uploadedBy: string,
  description?: string,
) {
  const { error, path, url } = await uploadFile(file, purchaseRequestId)
  if (error || !path || !url) return { error: error ?? 'Upload failed' }

  const { error: insertError } = await supabase.from('purchase_attachments').insert({
    purchase_request_id: purchaseRequestId,
    attachment_type: attachmentType,
    file_path: path,
    file_url: url,
    file_name: file.name,
    description: description ?? null,
    uploaded_by: uploadedBy,
  })
  if (insertError) return { error: insertError.message }
  return { error: null }
}
