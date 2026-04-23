declare module 'word-extractor' {
  class WordExtractor {
    extract(filePathOrBuffer: string | Buffer): Promise<{ getBody: () => string }>
  }
  export = WordExtractor
}
