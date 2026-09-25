export const SGPA_ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const SGPA_ATTACHMENT_MAX_COUNT = 5

export const SGPA_ATTACHMENT_ACCEPT =
  'image/jpeg,image/png,image/webp,application/pdf'

const ALLOWED_EXTENSIONS_BY_MIME_TYPE: Record<string, readonly string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
}

type AttachmentFile = Pick<File, 'name' | 'size' | 'type'>

export function validateSgpaAttachment(file: AttachmentFile): string | null {
  const allowedExtensions = ALLOWED_EXTENSIONS_BY_MIME_TYPE[file.type]
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (
    !allowedExtensions ||
    !extension ||
    !allowedExtensions.includes(extension)
  ) {
    return 'Formato não permitido. Envie imagens JPG, PNG ou WebP, ou documentos PDF.'
  }

  if (file.size > SGPA_ATTACHMENT_MAX_SIZE_BYTES) {
    return 'O arquivo excede o limite de 5 MB.'
  }

  if (file.size === 0) {
    return 'O arquivo está vazio.'
  }

  return null
}

export function getSgpaAttachmentExtension(file: AttachmentFile): string {
  const validationError = validateSgpaAttachment(file)
  if (validationError) throw new Error(validationError)

  return file.name.split('.').pop()!.toLowerCase()
}

export function getAppAssetPath(publicUrl: string): string | null {
  try {
    const pathname = decodeURIComponent(new URL(publicUrl).pathname)
    const marker = '/storage/v1/object/public/app-assets/'
    const markerIndex = pathname.indexOf(marker)

    if (markerIndex === -1) return null

    const path = pathname.slice(markerIndex + marker.length)
    return path && !path.startsWith('/') ? path : null
  } catch {
    return null
  }
}
