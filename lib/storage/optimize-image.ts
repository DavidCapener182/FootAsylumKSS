import sharp from 'sharp'

/** Server-side storage optimisation. Never returns a larger file or alters documents. */
export async function optimizeStorageImage(file: File): Promise<File> {
  const imageType = /^image\/(jpeg|png|webp)$/i.test(file.type)
  const unnamedType = (!file.type || file.type === 'application/octet-stream') && /\.(jpe?g|png|webp)$/i.test(file.name)
  if ((!imageType && !unnamedType) || file.size < 256_000 || file.size > 25 * 1024 * 1024) return file
  try {
    const input = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(input, { limitInputPixels: 60_000_000 }).metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) return file
    // PNGs may be plans, screenshots or signatures: preserve all pixels and transparency.
    let pipeline = sharp(input, { limitInputPixels: 60_000_000 }).keepMetadata().timeout({ seconds: 10 })
    let type: string
    let extension: string
    if (metadata.format === 'png' || metadata.hasAlpha) {
      pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      type = 'image/png'
      extension = 'png'
    } else {
      // Already-small JPEGs are usually compressed by the upload screen.
      if (metadata.format === 'jpeg' && file.size < 750_000) return file
      pipeline = pipeline.rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true, chromaSubsampling: '4:4:4' })
      type = 'image/jpeg'
      extension = 'jpg'
    }
    const output = await pipeline.toBuffer()
    if (output.length >= file.size * 0.95) return file
    return new File([new Uint8Array(output)], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${extension}`, {
      type, lastModified: file.lastModified,
    })
  } catch {
    // Unsupported/corrupt formats retain the existing upload behaviour.
    return file
  }
}
