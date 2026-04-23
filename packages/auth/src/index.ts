// Browser client
export {
  createClient,
  getUser,
  getSession,
  signInWithPassword,
  signUp,
  signOut,
  signInWithOAuth,
  resetPassword,
  updatePassword,
  updateUserMetadata,
  onAuthStateChange,
} from './supabase/client'

// Server client
export {
  createClient as createServerClient,
  getUser as getServerUser,
  getSession as getServerSession,
  verifyAuth,
  getSessionWithProfile,
  getUserProfile,
  getUserProfileWithOrganization,
} from './supabase/server'

// Admin client
export {
  createAdminClient,
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUser,
  adminGetUserById,
  adminListUsers,
  adminGenerateInviteLink,
  adminBanUser,
  adminUnbanUser,
  adminCreateProfile,
  adminUpdateProfile,
  adminGetOrganizationProfiles,
} from './supabase/admin'

// Middleware
export {
  updateSession,
  createAuthMiddleware,
  hasRole,
  getRedirectUrl,
  type RouteConfig,
} from './supabase/middleware'
