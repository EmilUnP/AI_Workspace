/**
 * Course and Self-Paced Learning Types
 * For AI Curriculum Architect feature
 */
export interface Course {
    id: string;
    organization_id: string;
    created_by: string;
    title: string;
    description: string | null;
    subject: string | null;
    grade_level: string | null;
    difficulty_level: CourseDifficultyLevel;
    language: string;
    course_style: CourseStyle;
    access_code: string;
    lesson_ids: string[];
    total_lessons: number;
    estimated_duration_minutes: number;
    is_published: boolean;
    is_archived: boolean;
    metadata: CourseMetadata | null;
    created_at: string;
    updated_at: string;
}
export type CourseDifficultyLevel = 'grade_1' | 'grade_2' | 'grade_3' | 'grade_4' | 'grade_5' | 'grade_6' | 'grade_7' | 'grade_8' | 'grade_9' | 'grade_10' | 'grade_11' | 'grade_12' | 'undergraduate' | 'graduate' | 'phd';
export type CourseStyle = 'serious_academic' | 'fun_gamified';
export interface CourseMetadata {
    source_documents?: string[];
    ai_model_used?: string;
    generation_time_ms?: number;
    visual_gaps?: VisualGap[];
    curriculum_alignment?: string[];
    standards?: string[];
    topics_covered?: string[];
    final_exam_id?: string;
}
export interface VisualGap {
    lesson_id: string;
    lesson_title: string;
    reason: string;
    suggested_content_type: 'video' | 'image' | 'interactive';
    priority: 'high' | 'medium' | 'low';
}
export interface CreateCourseInput {
    organization_id: string;
    created_by: string;
    title: string;
    description?: string | null;
    subject?: string | null;
    grade_level?: string | null;
    difficulty_level: CourseDifficultyLevel;
    language: string;
    course_style: CourseStyle;
    lesson_ids?: string[];
    metadata?: Partial<CourseMetadata>;
}
export interface UpdateCourseInput {
    title?: string;
    description?: string | null;
    subject?: string | null;
    grade_level?: string | null;
    difficulty_level?: CourseDifficultyLevel;
    language?: string;
    course_style?: CourseStyle;
    lesson_ids?: string[];
    is_published?: boolean;
    is_archived?: boolean;
    metadata?: Partial<CourseMetadata>;
}
/**
 * Course Generation Request
 */
export interface CourseGenerationRequest {
    document_ids: string[];
    difficulty_level: CourseDifficultyLevel;
    num_lessons: number;
    language: string;
    course_style: CourseStyle;
    subject?: string;
    grade_level?: string;
    topic?: string;
    lesson_topics?: string[];
    exam_settings?: {
        question_count?: number;
        question_types?: Array<'multiple_choice' | 'multiple_select' | 'fill_blank' | 'true_false'>;
        difficulty_distribution?: {
            easy: number;
            medium: number;
            hard: number;
        };
    };
    /** Optional: per-lesson generation (images, audio, center text). Omitted = use defaults. */
    lesson_generation_options?: {
        includeImages?: boolean;
        includeAudio?: boolean;
        centerText?: boolean;
    };
}
/** Single entry in the course generation log for analysis */
export interface GenerationLogEntry {
    step: string;
    ts: number;
    duration_ms?: number;
    lesson_index?: number;
    lesson_id?: string;
    success: boolean;
    message?: string;
    error?: string;
}
export interface CourseGenerationResponse {
    success: boolean;
    course_id?: string;
    course: Partial<Course>;
    lessons: Array<{
        id: string;
        title: string;
        order: number;
        topic: string;
    }>;
    generation_time_ms: number;
    tokens_used: number;
    visual_gaps?: VisualGap[];
    final_exam_id?: string;
    /** Structured log of each generation step for analysis */
    generation_log?: GenerationLogEntry[];
}
/**
 * Course Progress Tracking
 */
export interface CourseProgress {
    id: string;
    course_id: string;
    student_id: string;
    current_lesson_id: string | null;
    completed_lesson_ids: string[];
    progress_percentage: number;
    time_spent_seconds: number;
    started_at: string;
    completed_at: string | null;
    last_accessed_at: string;
}
export interface CourseAnalytics {
    course_id: string;
    total_enrollments: number;
    active_students: number;
    completed_students: number;
    average_completion_rate: number;
    average_time_spent_seconds: number;
    lesson_analytics: CourseLessonAnalytics[];
}
/**
 * Course-specific lesson analytics (simplified version for course context)
 * For detailed lesson analytics, see LessonAnalytics in lesson.ts
 */
export interface CourseLessonAnalytics {
    lesson_id: string;
    lesson_title: string;
    views: number;
    completions: number;
    average_time_spent: number;
    drop_off_rate: number;
}
//# sourceMappingURL=course.d.ts.map