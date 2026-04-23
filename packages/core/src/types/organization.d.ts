import type { OrganizationType, SubscriptionPlan, OrganizationStatus } from '@eduator/config';
/**
 * Organization Types
 */
export interface Organization {
    id: string;
    name: string;
    slug: string;
    type: OrganizationType;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    website: string | null;
    logo_url: string | null;
    subscription_plan: SubscriptionPlan;
    status: OrganizationStatus;
    settings: OrganizationSettings | null;
    metadata: OrganizationMetadata | null;
    created_at: string;
    updated_at: string;
}
export interface OrganizationSettings {
    max_teachers: number;
    max_students: number;
    max_exams_per_month: number;
    ai_requests_per_month: number;
    storage_limit_gb: number;
    features_enabled: string[];
    branding?: {
        primary_color?: string;
        secondary_color?: string;
        custom_domain?: string;
    };
}
export interface OrganizationMetadata {
    founded_year?: number;
    student_count_range?: string;
    accreditation?: string[];
    timezone?: string;
    academic_year_start?: string;
    academic_year_end?: string;
}
export interface CreateOrganizationInput {
    name: string;
    type: OrganizationType;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    website?: string | null;
    logo_url?: string | null;
    subscription_plan?: SubscriptionPlan;
    settings?: Partial<OrganizationSettings>;
    metadata?: OrganizationMetadata;
}
export interface UpdateOrganizationInput {
    name?: string;
    type?: OrganizationType;
    email?: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    website?: string | null;
    logo_url?: string | null;
    subscription_plan?: SubscriptionPlan;
    status?: OrganizationStatus;
    settings?: Partial<OrganizationSettings>;
    metadata?: OrganizationMetadata;
}
export interface OrganizationWithStats extends Organization {
    stats: {
        total_teachers: number;
        total_students: number;
        total_classes: number;
        total_exams: number;
        storage_used_gb: number;
        ai_requests_used: number;
    };
}
/**
 * Subscription & Billing Types
 */
export interface SubscriptionDetails {
    plan: SubscriptionPlan;
    start_date: string;
    end_date: string;
    is_trial: boolean;
    trial_ends_at: string | null;
    billing_cycle: 'monthly' | 'yearly';
    amount: number;
    currency: string;
    next_billing_date: string;
    payment_method: PaymentMethod | null;
}
export interface PaymentMethod {
    type: 'card' | 'bank_transfer' | 'invoice';
    last_four?: string;
    brand?: string;
    expiry_month?: number;
    expiry_year?: number;
}
export interface Invoice {
    id: string;
    organization_id: string;
    amount: number;
    currency: string;
    status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
    due_date: string;
    paid_at: string | null;
    invoice_url: string | null;
    created_at: string;
}
/**
 * Plan Limits by Subscription
 */
export declare const PLAN_LIMITS: Record<SubscriptionPlan, OrganizationSettings>;
//# sourceMappingURL=organization.d.ts.map