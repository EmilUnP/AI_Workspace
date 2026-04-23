import { FastifyRequest, FastifyReply } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import type { Profile } from '@eduator/core/types/profile'
import { teacherApiKeyRepository } from '@eduator/db'

const API_KEY_PREFIX = 'edsk_'

// Extend FastifyRequest to include user context and API key id (for usage logging)
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      profile?: Profile
    }
    apiKeyId?: string
  }
}

// Create Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      },
    })
  }

  const token = authHeader.substring(7).trim() // Remove 'Bearer ' and any trailing whitespace

  try {
    let supabase
    try {
      supabase = getSupabaseAdmin()
    } catch (configError) {
      request.log.error({ error: configError }, 'Supabase config missing')
      return reply.code(503).send({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Server misconfigured: missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).',
        },
      })
    }

    // API key auth (third-party): Bearer edsk_...
    if (token.startsWith(API_KEY_PREFIX)) {
      let keyResult: { profileId: string; keyId: string } | null = null
      try {
        keyResult = await teacherApiKeyRepository.getProfileIdByKey(token)
      } catch (dbError) {
        request.log.error({ error: dbError }, 'API key lookup failed')
        return reply.code(503).send({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Authentication service temporarily unavailable. If your API key is correct, the server may have a database connection issue.',
          },
        })
      }
      if (!keyResult) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired API key. Check that your key is correct (paste only the key, e.g. edsk_...), has no extra spaces, and was created in Eduator under API Integration.',
          },
        })
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', keyResult.profileId)
        .single()

      if (profileError || !profile) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Profile not found for API key',
          },
        })
      }

      const meta = profile.metadata as { api_integration_enabled?: boolean } | null
      if (profile.profile_type !== 'teacher' || !meta?.api_integration_enabled) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'API integration not enabled for this account',
          },
        })
      }

      request.user = {
        id: profile.user_id,
        email: profile.email ?? '',
        profile: profile as Profile,
      }
      request.apiKeyId = keyResult.keyId
      return
    }

    // JWT token auth (session)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      request.log.warn({ userId: user.id, error: profileError }, 'Failed to fetch profile')
    }

    if (profile && profile.approval_status !== 'approved' && profile.profile_type !== 'platform_owner') {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Account pending approval',
        },
      })
    }

    request.user = {
      id: user.id,
      email: user.email!,
      profile: profile as Profile,
    }
  } catch (error) {
    const err = error as Error
    request.log.error({ err: err?.message, stack: err?.stack }, 'Auth middleware error')
    const isDev = process.env.NODE_ENV !== 'production'
    const detail = isDev && err?.message ? err.message : undefined
    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed. Check that your API key is correct (paste only the key, e.g. edsk_...), has no extra spaces, and was created in Eduator under API Integration. If the key works in the Eduator app, ensure the API server has the same Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).',
        ...(detail && { detail }),
      },
    })
  }
}

/**
 * Role-based authorization middleware factory
 */
export function requireRole(...allowedRoles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // First run auth middleware
    await authMiddleware(request, reply)

    // Check if auth middleware already sent a response
    if (reply.sent) return

    const profile = request.user?.profile

    if (!profile) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Profile not found',
        },
      })
    }

    if (!allowedRoles.includes(profile.profile_type)) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        },
      })
    }
  }
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return // No auth, but don't fail
  }

  const token = authHeader.substring(7)

  try {
    const supabase = getSupabaseAdmin()
    const { data: { user } } = await supabase.auth.getUser(token)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      request.user = {
        id: user.id,
        email: user.email!,
        profile: profile as Profile,
      }
    }
  } catch (error) {
    request.log.warn({ error }, 'Optional auth failed')
    // Don't fail, just don't set user
  }
}
