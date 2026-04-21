import JSZip from 'jszip'
import { PDFParse } from 'pdf-parse'

const DOCX_CONTENT_PATHS = [
  /^word\/document\.xml$/,
  /^word\/header\d+\.xml$/,
  /^word\/footer\d+\.xml$/,
]

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function xmlToPlainText(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const paths = Object.keys(zip.files).filter((path) => DOCX_CONTENT_PATHS.some((pattern) => pattern.test(path)))
  const chunks = await Promise.all(
    paths.map(async (path) => {
      const file = zip.file(path)
      if (!file) return ''
      return xmlToPlainText(await file.async('string'))
    })
  )

  return chunks.filter(Boolean).join('\n\n').trim()
}

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.trim().toLowerCase() || ''
}

export async function extractTextFromSourceFile(file: File): Promise<string> {
  const extension = getFileExtension(file.name)
  const buffer = Buffer.from(await file.arrayBuffer())

  if (extension === 'pdf') {
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result.text.trim()
    } finally {
      await parser.destroy()
    }
  }

  if (extension === 'docx') {
    return extractDocxText(buffer)
  }

  if (extension === 'txt' || extension === 'md' || extension === 'csv') {
    return buffer.toString('utf8').trim()
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
    return ''
  }

  throw new Error(`Unsupported CMP source file type: .${extension || 'unknown'}`)
}
