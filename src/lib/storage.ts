import { supabase } from './supabase'
import type { AttachmentType } from '@/types'

const BUCKET = 'attachments'

// Matches the bucket limits set in supabase/migrations/002_pilot_features.sql
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'docx', 'xlsx']
export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',')
const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

/** Returns a short user-facing problem, or null when the file is fine to upload */
export function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(ext) || (file.type && !ALLOWED_MIME.includes(file.type))) {
    return 'Use a PDF, image, Word or Excel file'
  }
  if (file.size > MAX_FILE_BYTES) return 'Files must be 10 MB or smaller'
  return null
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export async function uploadFile(file: File, purchaseRequestId: string) {
  const problem = validateFile(file)
  if (problem) return { error: problem, path: null }

  // Random name so stored paths never leak or collide with the original file name
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${purchaseRequestId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) return { error: error.message, path: null }
  return { error: null, path }
}

/** The bucket is private: open files through a short-lived signed link */
export async function getSignedUrl(path: string, expiresInSeconds = 60 * 5) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds)
  return { url: data?.signedUrl ?? null, error: error?.message ?? null }
}

export async function openAttachment(path: string) {
  // Open the tab synchronously so popup blockers allow it, then point it at the signed link
  const tab = window.open('', '_blank')
  const { url, error } = await getSignedUrl(path)
  if (!url) {
    tab?.close()
    return { error: error ?? 'Could not open this file' }
  }
  if (tab) tab.location.href = url
  else window.location.href = url
  return { error: null }
}

export async function attachFile(
  purchaseRequestId: string,
  file: File,
  attachmentType: AttachmentType,
  uploadedBy: string,
  description?: string,
) {
  const { error, path } = await uploadFile(file, purchaseRequestId)
  if (error || !path) return { error: error ?? 'Upload failed' }

  const { error: insertError } = await supabase.from('purchase_attachments').insert({
    purchase_request_id: purchaseRequestId,
    attachment_type: attachmentType,
    file_path: path,
    // Kept for older rows; new files are opened via getSignedUrl(file_path)
    file_url: path,
    file_name: file.name,
    file_size: file.size,
    description: description ?? null,
    uploaded_by: uploadedBy,
  })
  if (insertError) return { error: insertError.message }
  return { error: null }
}
