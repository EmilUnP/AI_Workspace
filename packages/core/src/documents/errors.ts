/** User-facing message for upload failures (shared across ERP and ERP). */
export const UPLOAD_ERROR_USER_MESSAGE =
  "The file couldn't be uploaded due to a server problem. Please try again in a moment."

/** Map known errors to user-friendly upload messages. */
export function toUploadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message?.toLowerCase() ?? ''
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) return UPLOAD_ERROR_USER_MESSAGE
    if (msg.includes('payload') || msg.includes('body') || msg.includes('size')) return 'File is too large or invalid. Try a smaller file.'
    if (msg.includes('storage') || msg.includes('bucket')) return UPLOAD_ERROR_USER_MESSAGE
    if (msg.includes('auth') || msg.includes('jwt')) return 'Session expired. Please sign in again.'
  }
  return UPLOAD_ERROR_USER_MESSAGE
}
