"use strict";
/**
 * Application-wide constants for Eduator AI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGES_WITH_FLAGS = exports.LANGUAGE_FLAG_EMOJIS = exports.LANGUAGE_TO_COUNTRY_CODE = exports.CONTENT_LANGUAGES = exports.SUPPORTED_LANGUAGES = exports.THEME_COLORS = exports.FILE_LIMITS = exports.RATE_LIMITS = exports.AI_MODELS = exports.DEFAULT_EXAM_SETTINGS = exports.DIFFICULTY_LEVELS = exports.QUESTION_TYPES = exports.ORGANIZATION_STATUS = exports.APPROVAL_STATUS = exports.SUBSCRIPTION_PLANS = exports.ORGANIZATION_TYPES = exports.PROFILE_TYPES = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.API_BASE_PATH = exports.API_VERSION = void 0;
// API Configuration
exports.API_VERSION = 'v1';
exports.API_BASE_PATH = `/api/${exports.API_VERSION}`;
// Pagination defaults
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
// Profile Types
exports.PROFILE_TYPES = {
    PLATFORM_OWNER: 'platform_owner',
    SCHOOL_SUPERADMIN: 'school_superadmin',
    TEACHER: 'teacher',
    STUDENT: 'student',
};
// Organization Types
exports.ORGANIZATION_TYPES = {
    SCHOOL: 'school',
    UNIVERSITY: 'university',
    INSTITUTION: 'institution',
    ACADEMY: 'academy',
    OTHER: 'other',
};
// Subscription Plans
exports.SUBSCRIPTION_PLANS = {
    BASIC: 'basic',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise',
};
// Approval Status
exports.APPROVAL_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
};
// Organization Status
exports.ORGANIZATION_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    INACTIVE: 'inactive',
};
// Question Types
exports.QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'multiple_choice',
    MULTIPLE_SELECT: 'multiple_select',
    FILL_BLANK: 'fill_blank',
    TRUE_FALSE: 'true_false',
};
// Difficulty Levels
exports.DIFFICULTY_LEVELS = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
};
// Exam Settings Defaults
exports.DEFAULT_EXAM_SETTINGS = {
    questionCount: 10,
    difficultyDistribution: {
        easy: 30,
        medium: 50,
        hard: 20,
    },
    questionTypes: [exports.QUESTION_TYPES.MULTIPLE_CHOICE, exports.QUESTION_TYPES.TRUE_FALSE],
    timeLimit: 60, // minutes
    shuffleQuestions: true,
    shuffleOptions: true,
    showResults: true,
};
/**
 * Centralized AI Model Configuration
 * All model names are defined here for easy management
 */
exports.AI_MODELS = {
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
    EMBEDDING_DIMENSIONS: 768,
    // Text-to-Speech model
    TTS: "gemini-2.5-flash-preview-tts",
};
// Rate Limiting
exports.RATE_LIMITS = {
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
};
// File Upload Limits (document upload: PDF, Word, Markdown, Text up to 15MB)
exports.FILE_LIMITS = {
    MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain'],
    ALLOWED_EXTENSIONS: ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.md', '.txt', '.markdown'],
};
// Theme Colors (green as default per user preference)
exports.THEME_COLORS = {
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
};
// Supported Languages for Translation
exports.SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ru', name: 'Russian' },
    { code: 'az', name: 'Azerbaijani' },
    { code: 'tr', name: 'Turkish' },
];
/**
 * Content generation languages used in in-app selectors (exam/lesson generation + translation tabs).
 * Keep this list smaller than SUPPORTED_LANGUAGES when product UX requires a curated set.
 */
exports.CONTENT_LANGUAGES = [
    { code: 'en', name: 'English', countryCode: 'gb', flagEmoji: '🇬🇧' },
    { code: 'az', name: 'Azərbaycan', countryCode: 'az', flagEmoji: '🇦🇿' },
    { code: 'ru', name: 'Русский', countryCode: 'ru', flagEmoji: '🇷🇺' },
    { code: 'tr', name: 'Türkçe', countryCode: 'tr', flagEmoji: '🇹🇷' },
    { code: 'de', name: 'Deutsch', countryCode: 'de', flagEmoji: '🇩🇪' },
    { code: 'fr', name: 'Français', countryCode: 'fr', flagEmoji: '🇫🇷' },
    { code: 'es', name: 'Español', countryCode: 'es', flagEmoji: '🇪🇸' },
    { code: 'ar', name: 'العربية', countryCode: 'sa', flagEmoji: '🇸🇦' },
];
/**
 * Language to Country Code Mapping for Flag Images
 * Maps language codes to ISO 3166-1 alpha-2 country codes for displaying flag images
 * Used with flagcdn.com service: https://flagcdn.com/w40/{countryCode}.png
 */
exports.LANGUAGE_TO_COUNTRY_CODE = {
    en: 'gb', // English -> Great Britain
    az: 'az', // Azerbaijani -> Azerbaijan
    ru: 'ru', // Russian -> Russia
    tr: 'tr', // Turkish -> Turkey
    de: 'de', // German -> Germany
    fr: 'fr', // French -> France
    es: 'es', // Spanish -> Spain
    it: 'it', // Italian -> Italy
    pt: 'pt', // Portuguese -> Portugal
    zh: 'cn', // Chinese -> China
    ja: 'jp', // Japanese -> Japan
    ko: 'kr', // Korean -> South Korea
    ar: 'sa', // Arabic -> Saudi Arabia (common representation)
    hi: 'in', // Hindi -> India
    nl: 'nl', // Dutch -> Netherlands
    pl: 'pl', // Polish -> Poland
    uk: 'ua', // Ukrainian -> Ukraine
};
/**
 * Language Flag Emojis
 * Unicode flag emojis for each supported language
 */
exports.LANGUAGE_FLAG_EMOJIS = {
    en: '🇬🇧',
    az: '🇦🇿',
    ru: '🇷🇺',
    tr: '🇹🇷',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    it: '🇮🇹',
    pt: '🇵🇹',
    zh: '🇨🇳',
    ja: '🇯🇵',
    ko: '🇰🇷',
    ar: '🇸🇦',
    hi: '🇮🇳',
    nl: '🇳🇱',
    pl: '🇵🇱',
    uk: '🇺🇦',
};
/**
 * Language Information with Flags
 * Complete language data including code, name, country code, and flag emoji
 */
exports.LANGUAGES_WITH_FLAGS = [
    { code: 'en', name: 'English', countryCode: 'gb', flagEmoji: '🇬🇧' },
    { code: 'az', name: 'Azərbaycan', countryCode: 'az', flagEmoji: '🇦🇿' },
    { code: 'ru', name: 'Русский', countryCode: 'ru', flagEmoji: '🇷🇺' },
    { code: 'tr', name: 'Türkçe', countryCode: 'tr', flagEmoji: '🇹🇷' },
    { code: 'de', name: 'Deutsch', countryCode: 'de', flagEmoji: '🇩🇪' },
    { code: 'fr', name: 'Français', countryCode: 'fr', flagEmoji: '🇫🇷' },
    { code: 'es', name: 'Español', countryCode: 'es', flagEmoji: '🇪🇸' },
    { code: 'it', name: 'Italiano', countryCode: 'it', flagEmoji: '🇮🇹' },
    { code: 'pt', name: 'Português', countryCode: 'pt', flagEmoji: '🇵🇹' },
    { code: 'ar', name: 'العربية', countryCode: 'sa', flagEmoji: '🇸🇦' },
    { code: 'zh', name: '中文', countryCode: 'cn', flagEmoji: '🇨🇳' },
    { code: 'ja', name: '日本語', countryCode: 'jp', flagEmoji: '🇯🇵' },
    { code: 'ko', name: '한국어', countryCode: 'kr', flagEmoji: '🇰🇷' },
    { code: 'hi', name: 'हिन्दी', countryCode: 'in', flagEmoji: '🇮🇳' },
];
//# sourceMappingURL=constants.js.map