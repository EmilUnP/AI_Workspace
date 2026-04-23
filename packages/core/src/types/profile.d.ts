import type { ProfileType, ApprovalStatus } from '@eduator/config';
/**
 * User Profile Types
 */
export interface Profile {
    id: string;
    user_id: string;
    profile_type: ProfileType;
    organization_id: string | null;
    full_name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
    approval_status: ApprovalStatus;
    is_active: boolean;
    metadata: ProfileMetadata | null;
    registration_info: RegistrationInfo | null;
    source: 'erp' | 'api';
    created_at: string;
    updated_at: string;
}
export interface RegistrationInfo {
    heard_from?: string;
    usage_purpose?: string;
    organization_name?: string;
    organization_size?: string;
    use_case?: string;
    additional_info?: string;
}
export interface ProfileMetadata {
    bio?: string;
    department?: string;
    subject_areas?: string[];
    grade_levels?: string[];
    certifications?: string[];
    years_of_experience?: number;
    preferred_language?: string;
    timezone?: string;
    notifications_enabled?: boolean;
    /** When true, teacher sees API Integration in sidebar and can create API keys */
    api_integration_enabled?: boolean;
}
export interface CreateProfileInput {
    user_id: string;
    profile_type: ProfileType;
    organization_id?: string | null;
    full_name: string;
    email: string;
    avatar_url?: string | null;
    phone?: string | null;
    metadata?: ProfileMetadata | null;
}
export interface UpdateProfileInput {
    full_name?: string;
    avatar_url?: string | null;
    phone?: string | null;
    metadata?: ProfileMetadata | null;
}
export interface ProfileWithOrganization extends Profile {
    organization?: {
        id: string;
        name: string;
        type: string;
        subscription_plan: string;
    } | null;
}
/**
 * Platform Owner specific types
 */
export interface PlatformOwnerDashboard {
    total_organizations: number;
    total_users: number;
    pending_approvals: number;
    active_subscriptions: {
        basic: number;
        premium: number;
        enterprise: number;
    };
    recent_signups: Profile[];
    usage_statistics: {
        exams_generated_today: number;
        exams_generated_this_week: number;
        exams_generated_this_month: number;
        ai_requests_today: number;
    };
}
/**
 * School Admin specific types
 */
export interface SchoolAdminDashboard {
    total_teachers: number;
    total_students: number;
    total_classes: number;
    total_exams: number;
    pending_teacher_approvals: number;
    recent_activities: ActivityLog[];
    class_performance: ClassPerformanceSummary[];
}
export interface ActivityLog {
    id: string;
    profile_id: string;
    profile_name: string;
    action: string;
    resource_type: string;
    resource_id: string;
    timestamp: string;
}
export interface ClassPerformanceSummary {
    class_id: string;
    class_name: string;
    average_score: number;
    total_students: number;
    exams_completed: number;
}
//# sourceMappingURL=profile.d.ts.map