/**
 * Application-wide constants for Eduator AI
 */

// API Configuration
export const API_VERSION = 'v1'
export const API_BASE_PATH = `/api/${API_VERSION}`

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Profile Types
export const PROFILE_TYPES = {
  PLATFORM_OWNER: 'platform_owner',
  SCHOOL_SUPERADMIN: 'school_superadmin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const

export type ProfileType = (typeof PROFILE_TYPES)[keyof typeof PROFILE_TYPES]

// Organization Types
export const ORGANIZATION_TYPES = {
  SCHOOL: 'school',
  UNIVERSITY: 'university',
  INSTITUTION: 'institution',
  ACADEMY: 'academy',
  OTHER: 'other',
} as const

export type OrganizationType = (typeof ORGANIZATION_TYPES)[keyof typeof ORGANIZATION_TYPES]

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
} as const

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS]

// Approval Status
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS]

// Organization Status
export const ORGANIZATION_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
} as const

export type OrganizationStatus = (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS]

// Question Types
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  MULTIPLE_SELECT: 'multiple_select',
  FILL_BLANK: 'fill_blank',
  TRUE_FALSE: 'true_false',
} as const

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES]

// Difficulty Levels
export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[keyof typeof DIFFICULTY_LEVELS]

// Exam Settings Defaults
export const DEFAULT_EXAM_SETTINGS = {
  questionCount: 10,
  difficultyDistribution: {
    easy: 30,
    medium: 50,
    hard: 20,
  },
  questionTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE],
  timeLimit: 60, // minutes
  shuffleQuestions: true,
  shuffleOptions: true,
  showResults: true,
}

/**
 * Centralized AI Model Configuration
 * All model names are defined here for easy management
 */
export const AI_MODELS = {
  // Main text generation model
  TEXT: "models/gemini-2.5-flash",
  TEXT_FALLBACK: "models/gemini-2.5-flash",
  
  // Gemini model aliases (for backward compatibility and direct use)
  GEMINI_FLASH: "models/gemini-2.5-flash",
  GEMINI_PRO: "models/gemini-2.5-flash",
  
  // Image generation models (using Gemini native image generation)
  IMAGE_GENERATION: [
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image-preview",
  ],
  
  // Image prompt generation model
  IMAGE_PROMPT: "gemini-2.5-flash",
  
  // Chat/conversation model
  CHAT: "models/gemini-2.5-flash",
  CHAT_FALLBACK: "models/gemini-2.5-flash",
  
  // Translation model
  TRANSLATION: "models/gemini-2.5-flash",
  TRANSLATION_FALLBACK: "models/gemini-2.5-flash",
  
  // Exam generation model
  EXAM: "models/gemini-2.5-flash",
  EXAM_FALLBACK: "models/gemini-2.5-flash",
  
  // Lesson generation model
  LESSON: "models/gemini-2.5-flash",
  LESSON_FALLBACK: "models/gemini-2.5-flash",
  
  // Language detection model
  LANGUAGE_DETECTION: "models/gemini-2.5-flash",
  LANGUAGE_DETECTION_FALLBACK: "models/gemini-2.5-flash",
  
  // Embedding model (for RAG) - Gemini embedding model
  // text-embedding-004/005 return 404 on this API; use gemini-embedding-001 per docs
  EMBEDDING: "gemini-embedding-001",
  // Output dimensions for embeddings (768/1536/3072 supported via Matryoshka; 768 is smallest high-quality option)
  EMBEDDING_DIMENSIONS: 768,
  
  // Text-to-Speech model
  TTS: "gemini-2.5-flash-preview-tts",
} as const

export type ModelType = keyof typeof AI_MODELS

// Rate Limiting
export const RATE_LIMITS = {
  DEFAULT: {
    max: 100,
    windowMs: 60000, // 1 minute
  },
  AI_GENERATION: {
    max: 10,
    windowMs: 60000, // 1 minute
  },
  AUTH: {
    max: 5,
    windowMs: 60000, // 1 minute
  },
}

// File Upload Limits (document upload: PDF, Word, Markdown, Text up to 15MB)
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain'],
  ALLOWED_EXTENSIONS: ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.md', '.txt', '.markdown'],
}

// Theme Colors (green as default per user preference)
export const THEME_COLORS = {
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
}

const LANGUAGE_DEFINITIONS = [
  { code: 'en', englishName: 'English', nativeName: 'English', countryCode: 'gb', flagEmoji: '🇬🇧' },
  { code: 'az', englishName: 'Azerbaijani', nativeName: 'Azərbaycan', countryCode: 'az', flagEmoji: '🇦🇿' },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', countryCode: 'ru', flagEmoji: '🇷🇺' },
  { code: 'tr', englishName: 'Turkish', nativeName: 'Türkçe', countryCode: 'tr', flagEmoji: '🇹🇷' },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', countryCode: 'de', flagEmoji: '🇩🇪' },
  { code: 'fr', englishName: 'French', nativeName: 'Français', countryCode: 'fr', flagEmoji: '🇫🇷' },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', countryCode: 'es', flagEmoji: '🇪🇸' },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano', countryCode: 'it', flagEmoji: '🇮🇹' },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', countryCode: 'pt', flagEmoji: '🇵🇹' },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', countryCode: 'sa', flagEmoji: '🇸🇦' },
  { code: 'zh', englishName: 'Chinese', nativeName: '中文', countryCode: 'cn', flagEmoji: '🇨🇳' },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', countryCode: 'jp', flagEmoji: '🇯🇵' },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어', countryCode: 'kr', flagEmoji: '🇰🇷' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', countryCode: 'in', flagEmoji: '🇮🇳' },
] as const

// Supported Languages for Translation
export const SUPPORTED_LANGUAGES = LANGUAGE_DEFINITIONS.map(({ code, englishName }) => ({ code, name: englishName })) as readonly {
  code: (typeof LANGUAGE_DEFINITIONS)[number]['code']
  name: string
}[]

export type LanguageCode = (typeof LANGUAGE_DEFINITIONS)[number]['code']

/**
 * Language Information with Flags
 * Complete language data including code, name, country code, and flag emoji.
 * This is the primary UI metadata source for language display.
 */
export const LANGUAGES_WITH_FLAGS = [
  ...LANGUAGE_DEFINITIONS.map(({ code, nativeName, countryCode, flagEmoji }) => ({
    code,
    name: nativeName,
    countryCode,
    flagEmoji,
  })),
] as const

/**
 * Language to Country Code Mapping for Flag Images
 * Derived from LANGUAGES_WITH_FLAGS to avoid duplicate sources.
 * Includes extra fallbacks used in some old records.
 */
export const LANGUAGE_TO_COUNTRY_CODE: Record<string, string> = {
  ...Object.fromEntries(LANGUAGES_WITH_FLAGS.map((lang) => [lang.code, lang.countryCode])),
  nl: 'nl', // Dutch -> Netherlands
  pl: 'pl', // Polish -> Poland
  uk: 'ua', // Ukrainian -> Ukraine
}

/**
 * Language Flag Emojis
 * Derived from LANGUAGES_WITH_FLAGS to avoid duplicate sources.
 * Includes extra fallbacks used in some old records.
 */
export const LANGUAGE_FLAG_EMOJIS: Record<string, string> = {
  ...Object.fromEntries(LANGUAGES_WITH_FLAGS.map((lang) => [lang.code, lang.flagEmoji])),
  nl: '🇳🇱',
  pl: '🇵🇱',
  uk: '🇺🇦',
}

/**
 * Curated language subset for in-app content generation selectors.
 * Derived from LANGUAGES_WITH_FLAGS so language metadata stays in one place.
 */
const CONTENT_LANGUAGE_CODES = ['en', 'az', 'ru', 'tr', 'de', 'fr', 'es', 'it', 'ar'] as const

  const getLanguageByCode = (code: string) => {
    const lang = LANGUAGES_WITH_FLAGS.find((item) => item.code === code)
  if (!lang) {
    throw new Error(`Missing language metadata for code: ${code}`)
  }
  return lang
}

export const CONTENT_LANGUAGES = CONTENT_LANGUAGE_CODES.map((code) => getLanguageByCode(code)) as readonly (typeof LANGUAGES_WITH_FLAGS)[number][]
export type ContentLanguageCode = (typeof CONTENT_LANGUAGE_CODES)[number]

/** Map full language name (lowercase) to 2-letter code for normalization */
const LANGUAGE_NAME_TO_CODE: Record<string, string> = {}
for (const { code, name } of LANGUAGES_WITH_FLAGS) {
  LANGUAGE_NAME_TO_CODE[name.toLowerCase()] = code
}
for (const { code, name } of SUPPORTED_LANGUAGES) {
  if (!LANGUAGE_NAME_TO_CODE[name.toLowerCase()]) {
    LANGUAGE_NAME_TO_CODE[name.toLowerCase()] = code
  }
}
// Alternate names / country names so API and forms always resolve correctly
LANGUAGE_NAME_TO_CODE['azerbaijan'] = 'az'
LANGUAGE_NAME_TO_CODE['azərbaycan'] = 'az'

/**
 * Normalize any language input to a 2-letter ISO code (en, az, ru, ...).
 * Use everywhere for storage, API, and UI so flags and lookups work consistently.
 * - Accepts 2-letter code (returns lowercased)
 * - Accepts full name (e.g. "English") and returns code
 * - Returns 'en' for unknown or missing input
 */
export function normalizeLanguageCode(lang: string | undefined | null): string {
  if (lang == null || typeof lang !== 'string') return 'en'
  const trimmed = lang.trim()
  if (!trimmed) return 'en'
  const lower = trimmed.toLowerCase()
  if (trimmed.length === 2) return lower
  return LANGUAGE_NAME_TO_CODE[lower] ?? 'en'
}

/**
 * Return full language name for a 2-letter code (for AI prompts only).
 * Use normalizeLanguageCode for storage and API; use this only when building prompt text.
 */
export function getLanguageNameForPrompt(code: string): string {
  const c = (code ?? 'en').trim().toLowerCase()
  const entry = LANGUAGE_DEFINITIONS.find((l) => l.code === c)
  return entry?.englishName ?? 'English'
}
