import { createClient } from './eduator-auth-server-shim'

export function createAdminClient() {
  return {
    from: (..._args: unknown[]) => ({
      select: (..._sargs: unknown[]) => ({
        eq: (..._eargs: unknown[]) => ({
          single: async () => ({ data: null, error: null }),
          order: (..._oargs: unknown[]) => ({ data: [], error: null }),
        }),
        in: (..._iargs: unknown[]) => ({ data: [], error: null }),
        order: (..._oargs: unknown[]) => ({ data: [], error: null }),
        single: async () => ({ data: null, error: null }),
      }),
      insert: (..._iargs: unknown[]) => ({
        select: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
      upsert: (..._uargs: unknown[]) => ({ error: null }),
      update: (..._uargs: unknown[]) => ({
        eq: (..._eargs: unknown[]) => ({
          select: () => ({ single: async () => ({ data: null, error: null }) }),
        }),
      }),
      delete: () => ({ eq: (..._eargs: unknown[]) => ({ error: null }) }),
    }),
    storage: {
      from: (..._args: unknown[]) => ({
        upload: async (..._uargs: unknown[]) => ({ error: null }),
        remove: async (..._rargs: unknown[]) => ({ error: null }),
        download: async (..._dargs: unknown[]) => ({ data: null, error: null }),
        getPublicUrl: (..._pargs: unknown[]) => ({ data: { publicUrl: '' } }),
      }),
    },
    auth: {
      getUser: async () => {
        const c = await createClient()
        return c.auth.getUser()
      },
      admin: {
        createUser: async (payload: Record<string, unknown>) => ({
          data: { user: { id: crypto.randomUUID(), email: String(payload.email || '') } },
          error: null,
        }),
        deleteUser: async (_id: string) => ({ error: null }),
      },
    },
  }
}
