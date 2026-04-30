type QueryResult = {
  data: any
  error: null
  count: number
}

class QueryBuilder implements PromiseLike<QueryResult> {
  private result: QueryResult

  constructor(result?: Partial<QueryResult>) {
    this.result = {
      data: [],
      error: null,
      count: 0,
      ...result,
    }
  }

  select(..._args: unknown[]) { return this }
  eq(..._args: unknown[]) { return this }
  neq(..._args: unknown[]) { return this }
  is(..._args: unknown[]) { return this }
  in(..._args: unknown[]) { return this }
  gte(..._args: unknown[]) { return this }
  lte(..._args: unknown[]) { return this }
  like(..._args: unknown[]) { return this }
  ilike(..._args: unknown[]) { return this }
  order(..._args: unknown[]) { return this }
  limit(..._args: unknown[]) { return this }
  range(..._args: unknown[]) { return this }
  match(..._args: unknown[]) { return this }

  single() {
    return Promise.resolve({ data: null, error: null, count: 0 })
  }

  maybeSingle() {
    return Promise.resolve({ data: null, error: null, count: 0 })
  }

  insert(..._args: unknown[]) { return this }
  update(..._args: unknown[]) { return this }
  upsert(..._args: unknown[]) { return this }
  delete(..._args: unknown[]) { return this }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled as any, onrejected as any)
  }
}

function makeClient() {
  return {
    from(..._args: unknown[]) {
      return new QueryBuilder()
    },
    auth: {
      async getUser() {
        return { data: { user: null }, error: null }
      },
      async getSession() {
        return { data: { session: null }, error: null }
      },
    },
  }
}

export async function createClient() {
  return makeClient()
}

export async function getSessionWithProfile() {
  return null as { user: { email?: string | null } | null; profile?: any } | null
}
