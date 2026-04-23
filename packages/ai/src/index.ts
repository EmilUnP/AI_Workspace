// Gemini client
export {
  getGeminiPro,
  getGeminiFlash,
  generateContent,
  generateContentStream,
  generateJSON,
  GeminiChat,
} from './gemini'

// AI Services
export {
  questionGenerator,
  ChatbotService,
  createChatbot,
  lessonGenerator,
  generateLesson,
  translator,
  type GenerateQuestionsParams,
  type GenerateQuestionsResult,
  type GenerateLessonParams,
  type GenerateLessonResult,
  type GeneratedLesson,
  type LessonGenerationContentOptions,
} from './services'

// Image Generator
export {
  generateLessonImages,
  detectLanguage,
  generateImagePrompts,
  type LessonImage,
} from './image-generator'

// TTS Generator
export {
  generateLessonAudio,
  regenerateLessonAudio,
} from './tts-generator'

// STT Generator
export {
  transcribeAudio,
  transcribeAudioFromSource,
  transcribeAudioClientSide,
  type STTOptions,
  type STTResult,
} from './stt-generator'

// Prompts (for advanced usage)
export * from './prompts/exam'
export * from './prompts/chatbot'
export * from './prompts/lesson'
