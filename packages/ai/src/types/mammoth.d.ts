declare module 'mammoth' {
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string }>
  export function convertToHtml(options: { buffer: Buffer }): Promise<{ value: string }>
}
