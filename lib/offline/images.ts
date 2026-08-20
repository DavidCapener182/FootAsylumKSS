const DEFAULT_MAX_EDGE = 1920
const DEFAULT_QUALITY = 0.82

export async function compressEvidenceImage(file: File, options: { maxEdge?: number; quality?: number } = {}): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 750_000) return file
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return file

  const bitmap = await createImageBitmap(file)
  try {
    const maxEdge = options.maxEdge || DEFAULT_MAX_EDGE
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', options.quality || DEFAULT_QUALITY))
    if (!blob || blob.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'evidence'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
  } finally {
    bitmap.close()
  }
}

export function compressEvidenceFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressEvidenceImage(file)))
}
