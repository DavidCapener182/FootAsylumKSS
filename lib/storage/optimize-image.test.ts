import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { optimizeStorageImage } from './optimize-image'

describe('storage image optimisation', () => {
  it('preserves PNG pixels, transparency and dimensions while reducing bytes', async () => {
    const input = await sharp({ create: { width: 640, height: 480, channels: 4, background: { r: 10, g: 90, b: 180, alpha: 0.5 } } }).png({ compressionLevel: 0 }).toBuffer()
    const result = await optimizeStorageImage(new File([new Uint8Array(input)], 'plan.png', { type: 'image/png' }))
    const output = Buffer.from(await result.arrayBuffer())
    expect(result.size).toBeLessThan(input.length / 2)
    expect(result.type).toBe('image/png')
    expect(await sharp(output).raw().toBuffer()).toEqual(await sharp(input).raw().toBuffer())
  })
  it('never transforms PDFs, tiny images or invalid image bytes', async () => {
    for (const file of [new File(['%PDF'], 'audit.pdf', { type: 'application/pdf' }), new File(['tiny'], 'tiny.jpg', { type: 'image/jpeg' }), new File([new Uint8Array(300000)], 'invalid.png', { type: 'image/png' })]) {
      expect(await optimizeStorageImage(file)).toBe(file)
    }
  })
  it('compresses large JPEGs with orientation preserved and a bounded long edge', async () => {
    const pixels = new Uint8Array(3000 * 1000 * 3)
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 31 + (i >> 6)) % 256
    const input = await sharp(pixels, { raw: { width: 3000, height: 1000, channels: 3 } }).jpeg({ quality: 100 }).withMetadata({ orientation: 6 }).toBuffer()
    expect(input.length).toBeGreaterThan(750000)
    const output = await optimizeStorageImage(new File([new Uint8Array(input)], 'phone.jpeg', { type: 'image/jpeg' }))
    const meta = await sharp(Buffer.from(await output.arrayBuffer())).metadata()
    expect(output.size).toBeLessThan(input.length)
    expect(meta.height).toBe(2560)
    expect(meta.width).toBeLessThan(meta.height!)
    expect([undefined, 1]).toContain(meta.orientation)
  })
})
