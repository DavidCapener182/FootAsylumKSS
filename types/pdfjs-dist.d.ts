declare module 'pdfjs-dist/legacy/build/pdf.mjs'
declare module 'pdfjs-dist/build/pdf.mjs'

declare module '@thednp/dommatrix' {
  const DOMMatrix: new (...args: unknown[]) => unknown
  export default DOMMatrix
  export { DOMMatrix }
}
