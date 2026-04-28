import { z } from 'zod'
import { generateText } from '../ai/gemini.js'

const translateSchema = z.object({
  text: z.string().min(1),
  toLanguage: z.string().min(1)
})

export class TranslatorAiService {
  async translate(input: unknown) {
    const data = translateSchema.parse(input)
    const text = await generateText(`Translate this text to ${data.toLanguage}:\n\n${data.text}`)
    return { translatedText: text }
  }
}
