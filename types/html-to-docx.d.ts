declare module 'html-to-docx' {
  interface HtmlToDocxOptions {
    table?: {
      row?: {
        cantSplit?: boolean
      }
    }
    footer?: boolean
    pageNumber?: boolean
  }

  export default function HTMLtoDOCX(
    htmlString: string,
    headerHtmlString?: string,
    documentOptions?: HtmlToDocxOptions
  ): Promise<Buffer>
}
