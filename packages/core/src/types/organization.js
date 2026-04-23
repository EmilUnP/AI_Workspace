"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LIMITS = void 0;
/**
 * Plan Limits by Subscription
 */
exports.PLAN_LIMITS = {
    basic: {
        max_teachers: 10,
        max_students: 200,
        max_exams_per_month: 50,
        ai_requests_per_month: 100,
        storage_limit_gb: 5,
        features_enabled: ['exam_generator', 'basic_analytics', 'pdf_export'],
    },
    premium: {
        max_teachers: 50,
        max_students: 1000,
        max_exams_per_month: 250,
        ai_requests_per_month: 500,
        storage_limit_gb: 25,
        features_enabled: [
            'exam_generator',
            'advanced_analytics',
            'pdf_export',
            'excel_export',
            'ai_chatbot',
            'custom_branding',
        ],
    },
    enterprise: {
        max_teachers: -1, // Unlimited
        max_students: -1, // Unlimited
        max_exams_per_month: -1, // Unlimited
        ai_requests_per_month: -1, // Unlimited
        storage_limit_gb: 100,
        features_enabled: [
            'exam_generator',
            'advanced_analytics',
            'pdf_export',
            'excel_export',
            'word_export',
            'ai_chatbot',
            'lesson_generator',
            'translation',
            'custom_branding',
            'api_access',
            'priority_support',
            'sso',
        ],
    },
};
//# sourceMappingURL=organization.js.map