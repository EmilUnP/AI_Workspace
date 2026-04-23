import { generateContent, generateJSON } from '../gemini'
import { SUPPORTED_LANGUAGES } from '@eduator/config'

/**
 * Translation Service
 * Translates educational content using Gemini AI
 */
export const translator = {
  /**
   * Translate text to a target language
   */
  async translate(params: {
    text: string
    targetLanguage: string
    sourceLanguage?: string
    context?: 'general' | 'academic' | 'exam' | 'lesson'
  }): Promise<{ translation: string; tokensUsed: number }> {
    const { text, targetLanguage, sourceLanguage, context = 'academic' } = params

    // Validate target language
    const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage)
    if (!targetLang) {
      throw new Error(`Unsupported target language: ${targetLanguage}`)
    }

    const contextInstructions: Record<string, string> = {
      general: 'Translate naturally while maintaining the original meaning.',
      academic: 'Translate academic/educational content, maintaining technical accuracy and formal tone.',
      exam: 'Translate exam content precisely, ensuring questions and answers remain clear and unambiguous.',
      lesson: 'Translate lesson content in an engaging way appropriate for students.',
    }

    const prompt = `Translate the following text to ${targetLang.name}.

${sourceLanguage ? `Source language: ${sourceLanguage}` : 'Detect the source language automatically.'}

Context: ${contextInstructions[context]}

## Text to translate:
${text}

## Important:
- Maintain formatting (bullet points, numbering, etc.)
- Keep technical terms accurate
- Preserve any code or formulas unchanged
- Ensure cultural appropriateness

Provide ONLY the translation, no explanations.`

    const { text: translation, tokensUsed } = await generateContent(prompt, {
      model: 'flash', // Use Flash for speed
    })

    return { translation: translation.trim(), tokensUsed }
  },

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(params: {
    texts: string[]
    targetLanguage: string
    sourceLanguage?: string
    context?: 'general' | 'academic' | 'exam' | 'lesson'
  }): Promise<{ translations: string[]; tokensUsed: number }> {
    const { texts, targetLanguage, sourceLanguage, context = 'academic' } = params

    const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage)
    if (!targetLang) {
      throw new Error(`Unsupported target language: ${targetLanguage}`)
    }

    const prompt = `Translate the following texts to ${targetLang.name}.

${sourceLanguage ? `Source language: ${sourceLanguage}` : 'Detect the source language automatically.'}

Context: ${context === 'exam' ? 'Exam' : context === 'lesson' ? 'Lesson' : context === 'general' ? 'General' : 'Academic/educational'} content translation.

## Texts to translate:
${texts.map((t, i) => `[${i + 1}] ${t}`).join('\n\n')}

## Output format:
{
  "translations": [
    "Translation of text 1",
    "Translation of text 2",
    ...
  ]
}

Important:
- Maintain the order of translations
- Preserve formatting within each text
- Keep technical terms accurate`

    const { data, tokensUsed } = await generateJSON<{ translations: string[] }>(prompt, {
      model: 'flash',
    })

    return { translations: data.translations, tokensUsed }
  },

  /**
   * Translate exam questions with options
   */
  async translateExamQuestion(params: {
    question: string
    options?: string[]
    correctAnswer: string | string[]
    explanation?: string
    targetLanguage: string
  }): Promise<{
    translation: {
      question: string
      options?: string[]
      correctAnswer: string | string[]
      explanation?: string
    }
    tokensUsed: number
  }> {
    const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === params.targetLanguage)
    if (!targetLang) {
      throw new Error(`Unsupported target language: ${params.targetLanguage}`)
    }

    const prompt = `Translate this exam question to ${targetLang.name}.

## Question:
${params.question}

${params.options ? `## Options:\n${params.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}` : ''}

## Correct Answer:
${Array.isArray(params.correctAnswer) ? params.correctAnswer.join(', ') : params.correctAnswer}

${params.explanation ? `## Explanation:\n${params.explanation}` : ''}

## Output format:
{
  "question": "Translated question",
  ${params.options ? '"options": ["Option A", "Option B", "Option C", "Option D"],' : ''}
  "correctAnswer": "Translated correct answer",
  ${params.explanation ? '"explanation": "Translated explanation"' : ''}
}

Important:
- Translate content accurately while maintaining clarity
- Ensure the question remains unambiguous
- Keep answer letters/identifiers in the same order`

    const { data, tokensUsed } = await generateJSON<{
      question: string
      options?: string[]
      correctAnswer: string | string[]
      explanation?: string
    }>(prompt, {
      model: 'flash',
    })

    return { translation: data, tokensUsed }
  },

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number; tokensUsed: number }> {
    const prompt = `Detect the language of the following text:

"${text.substring(0, 500)}"

Respond in JSON format:
{
  "language_code": "two-letter code (e.g., en, es, fr)",
  "language_name": "Full name (e.g., English, Spanish, French)",
  "confidence": 0.0 to 1.0
}`

    const { data, tokensUsed } = await generateJSON<{
      language_code: string
      language_name: string
      confidence: number
    }>(prompt, {
      model: 'flash',
    })

    return {
      language: data.language_code,
      confidence: data.confidence,
      tokensUsed,
    }
  },

  /**
   * Get list of supported languages
   */
  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES
  },
}
