/**
 * Application-wide constants for Eduator AI
 */
export declare const API_VERSION = "v1";
export declare const API_BASE_PATH = "/api/v1";
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const PROFILE_TYPES: {
    readonly PLATFORM_OWNER: "platform_owner";
    readonly SCHOOL_SUPERADMIN: "school_superadmin";
    readonly TEACHER: "teacher";
    readonly STUDENT: "student";
};
export type ProfileType = (typeof PROFILE_TYPES)[keyof typeof PROFILE_TYPES];
export declare const ORGANIZATION_TYPES: {
    readonly SCHOOL: "school";
    readonly UNIVERSITY: "university";
    readonly INSTITUTION: "institution";
    readonly ACADEMY: "academy";
    readonly OTHER: "other";
};
export type OrganizationType = (typeof ORGANIZATION_TYPES)[keyof typeof ORGANIZATION_TYPES];
export declare const SUBSCRIPTION_PLANS: {
    readonly BASIC: "basic";
    readonly PREMIUM: "premium";
    readonly ENTERPRISE: "enterprise";
};
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS];
export declare const APPROVAL_STATUS: {
    readonly PENDING: "pending";
    readonly APPROVED: "approved";
    readonly REJECTED: "rejected";
};
export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];
export declare const ORGANIZATION_STATUS: {
    readonly ACTIVE: "active";
    readonly SUSPENDED: "suspended";
    readonly INACTIVE: "inactive";
};
export type OrganizationStatus = (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS];
export declare const QUESTION_TYPES: {
    readonly MULTIPLE_CHOICE: "multiple_choice";
    readonly MULTIPLE_SELECT: "multiple_select";
    readonly FILL_BLANK: "fill_blank";
    readonly TRUE_FALSE: "true_false";
};
export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];
export declare const DIFFICULTY_LEVELS: {
    readonly EASY: "easy";
    readonly MEDIUM: "medium";
    readonly HARD: "hard";
};
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[keyof typeof DIFFICULTY_LEVELS];
export declare const DEFAULT_EXAM_SETTINGS: {
    questionCount: number;
    difficultyDistribution: {
        easy: number;
        medium: number;
        hard: number;
    };
    questionTypes: ("multiple_choice" | "true_false")[];
    timeLimit: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showResults: boolean;
};
/**
 * Centralized AI Model Configuration
 * All model names are defined here for easy management
 */
export declare const AI_MODELS: {
    readonly TEXT: "models/gemini-2.5-flash";
    readonly TEXT_FALLBACK: "models/gemini-2.5-flash";
    readonly GEMINI_FLASH: "models/gemini-2.5-flash";
    readonly GEMINI_PRO: "models/gemini-2.5-flash";
    readonly IMAGE_GENERATION: readonly ["gemini-3-pro-image-preview", "gemini-2.5-flash-image-preview"];
    readonly IMAGE_PROMPT: "gemini-2.5-flash";
    readonly CHAT: "models/gemini-2.5-flash";
    readonly CHAT_FALLBACK: "models/gemini-2.5-flash";
    readonly TRANSLATION: "models/gemini-2.5-flash";
    readonly TRANSLATION_FALLBACK: "models/gemini-2.5-flash";
    readonly EXAM: "models/gemini-2.5-flash";
    readonly EXAM_FALLBACK: "models/gemini-2.5-flash";
    readonly LESSON: "models/gemini-2.5-flash";
    readonly LESSON_FALLBACK: "models/gemini-2.5-flash";
    readonly LANGUAGE_DETECTION: "models/gemini-2.5-flash";
    readonly LANGUAGE_DETECTION_FALLBACK: "models/gemini-2.5-flash";
    readonly EMBEDDING: "gemini-embedding-001";
    readonly EMBEDDING_DIMENSIONS: 768;
    readonly TTS: "gemini-2.5-flash-preview-tts";
};
export type ModelType = keyof typeof AI_MODELS;
export declare const RATE_LIMITS: {
    DEFAULT: {
        max: number;
        windowMs: number;
    };
    AI_GENERATION: {
        max: number;
        windowMs: number;
    };
    AUTH: {
        max: number;
        windowMs: number;
    };
};
export declare const FILE_LIMITS: {
    MAX_FILE_SIZE: number;
    ALLOWED_DOCUMENT_TYPES: string[];
    ALLOWED_EXTENSIONS: string[];
};
export declare const THEME_COLORS: {
    primary: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
    secondary: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
    };
};
export declare const SUPPORTED_LANGUAGES: readonly [{
    readonly code: "en";
    readonly name: "English";
}, {
    readonly code: "es";
    readonly name: "Spanish";
}, {
    readonly code: "fr";
    readonly name: "French";
}, {
    readonly code: "de";
    readonly name: "German";
}, {
    readonly code: "pt";
    readonly name: "Portuguese";
}, {
    readonly code: "it";
    readonly name: "Italian";
}, {
    readonly code: "zh";
    readonly name: "Chinese";
}, {
    readonly code: "ja";
    readonly name: "Japanese";
}, {
    readonly code: "ko";
    readonly name: "Korean";
}, {
    readonly code: "ar";
    readonly name: "Arabic";
}, {
    readonly code: "hi";
    readonly name: "Hindi";
}, {
    readonly code: "ru";
    readonly name: "Russian";
}, {
    readonly code: "az";
    readonly name: "Azerbaijani";
}, {
    readonly code: "tr";
    readonly name: "Turkish";
}];
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
/**
 * Content generation languages used in in-app selectors (exam/lesson generation + translation tabs).
 * Keep this list smaller than SUPPORTED_LANGUAGES when product UX requires a curated set.
 */
export declare const CONTENT_LANGUAGES: readonly [{
    readonly code: "en";
    readonly name: "English";
    readonly countryCode: "gb";
    readonly flagEmoji: "🇬🇧";
}, {
    readonly code: "az";
    readonly name: "Azərbaycan";
    readonly countryCode: "az";
    readonly flagEmoji: "🇦🇿";
}, {
    readonly code: "ru";
    readonly name: "Русский";
    readonly countryCode: "ru";
    readonly flagEmoji: "🇷🇺";
}, {
    readonly code: "tr";
    readonly name: "Türkçe";
    readonly countryCode: "tr";
    readonly flagEmoji: "🇹🇷";
}, {
    readonly code: "de";
    readonly name: "Deutsch";
    readonly countryCode: "de";
    readonly flagEmoji: "🇩🇪";
}, {
    readonly code: "fr";
    readonly name: "Français";
    readonly countryCode: "fr";
    readonly flagEmoji: "🇫🇷";
}, {
    readonly code: "es";
    readonly name: "Español";
    readonly countryCode: "es";
    readonly flagEmoji: "🇪🇸";
}, {
    readonly code: "ar";
    readonly name: "العربية";
    readonly countryCode: "sa";
    readonly flagEmoji: "🇸🇦";
}];
export type ContentLanguageCode = (typeof CONTENT_LANGUAGES)[number]['code'];
/**
 * Language to Country Code Mapping for Flag Images
 * Maps language codes to ISO 3166-1 alpha-2 country codes for displaying flag images
 * Used with flagcdn.com service: https://flagcdn.com/w40/{countryCode}.png
 */
export declare const LANGUAGE_TO_COUNTRY_CODE: Record<string, string>;
/**
 * Language Flag Emojis
 * Unicode flag emojis for each supported language
 */
export declare const LANGUAGE_FLAG_EMOJIS: Record<string, string>;
/**
 * Language Information with Flags
 * Complete language data including code, name, country code, and flag emoji
 */
export declare const LANGUAGES_WITH_FLAGS: readonly [{
    readonly code: "en";
    readonly name: "English";
    readonly countryCode: "gb";
    readonly flagEmoji: "🇬🇧";
}, {
    readonly code: "az";
    readonly name: "Azərbaycan";
    readonly countryCode: "az";
    readonly flagEmoji: "🇦🇿";
}, {
    readonly code: "ru";
    readonly name: "Русский";
    readonly countryCode: "ru";
    readonly flagEmoji: "🇷🇺";
}, {
    readonly code: "tr";
    readonly name: "Türkçe";
    readonly countryCode: "tr";
    readonly flagEmoji: "🇹🇷";
}, {
    readonly code: "de";
    readonly name: "Deutsch";
    readonly countryCode: "de";
    readonly flagEmoji: "🇩🇪";
}, {
    readonly code: "fr";
    readonly name: "Français";
    readonly countryCode: "fr";
    readonly flagEmoji: "🇫🇷";
}, {
    readonly code: "es";
    readonly name: "Español";
    readonly countryCode: "es";
    readonly flagEmoji: "🇪🇸";
}, {
    readonly code: "it";
    readonly name: "Italiano";
    readonly countryCode: "it";
    readonly flagEmoji: "🇮🇹";
}, {
    readonly code: "pt";
    readonly name: "Português";
    readonly countryCode: "pt";
    readonly flagEmoji: "🇵🇹";
}, {
    readonly code: "ar";
    readonly name: "العربية";
    readonly countryCode: "sa";
    readonly flagEmoji: "🇸🇦";
}, {
    readonly code: "zh";
    readonly name: "中文";
    readonly countryCode: "cn";
    readonly flagEmoji: "🇨🇳";
}, {
    readonly code: "ja";
    readonly name: "日本語";
    readonly countryCode: "jp";
    readonly flagEmoji: "🇯🇵";
}, {
    readonly code: "ko";
    readonly name: "한국어";
    readonly countryCode: "kr";
    readonly flagEmoji: "🇰🇷";
}, {
    readonly code: "hi";
    readonly name: "हिन्दी";
    readonly countryCode: "in";
    readonly flagEmoji: "🇮🇳";
}];
//# sourceMappingURL=constants.d.ts.map