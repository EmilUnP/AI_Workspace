import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UsersRepository } from '../repositories/users.repository.js'
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository.js'
import {
  createAccessToken,
  createRefreshToken,
  generateRandomId,
  generateRefreshTokenHash,
  hashPassword,
  verifyPassword,
  verifyRefreshToken
} from '../utils/security.js'
import { env } from '../config/env.js'

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  // Public registration cannot escalate privileges.
  role: z.literal('user').default('user'),
  manual_note: z.string().max(1000).optional()
})

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
})

export class AuthService {
  private readonly usersRepo: UsersRepository
  private readonly refreshTokensRepo: RefreshTokensRepository

  constructor(app: FastifyInstance) {
    this.usersRepo = new UsersRepository(app)
    this.refreshTokensRepo = new RefreshTokensRepository(app)
  }

  async register(input: unknown) {
    const data = registerSchema.parse(input)
    const existing = await this.usersRepo.findByEmail(data.email)
    if (existing) {
      const error = new Error('Email already exists') as Error & { statusCode?: number }
      error.statusCode = 409
      throw error
    }

    const passwordHash = await hashPassword(data.password)
    const user = await this.usersRepo.create(data.email, passwordHash, data.role, data.manual_note)
    return this.issueTokens({ id: user.id, email: user.email, role: user.role })
  }

  async login(input: unknown) {
    const data = loginSchema.parse(input)
    const user = await this.usersRepo.findByEmail(data.email)
    if (!user) {
      const error = new Error('Invalid credentials') as Error & { statusCode?: number }
      error.statusCode = 401
      throw error
    }

    const validPassword = await verifyPassword(data.password, user.password_hash)
    if (!validPassword) {
      const error = new Error('Invalid credentials') as Error & { statusCode?: number }
      error.statusCode = 401
      throw error
    }

    return this.issueTokens({ id: user.id, email: user.email, role: user.role })
  }

  async refresh(refreshToken: string) {
    const payload = await verifyRefreshToken(refreshToken)
    const tokenHash = generateRefreshTokenHash(refreshToken)
    const tokenRow = await this.refreshTokensRepo.findActiveByHash(tokenHash)
    if (!tokenRow) {
      const error = new Error('Refresh token is invalid or expired') as Error & { statusCode?: number }
      error.statusCode = 401
      throw error
    }
    await this.refreshTokensRepo.revokeById(tokenRow.id)

    return this.issueTokens({
      id: payload.sub,
      email: payload.email,
      role: payload.role
    })
  }

  private async issueTokens(user: { id: string; email: string; role: string }) {
    const accessToken = await createAccessToken({ sub: user.id, email: user.email, role: user.role })
    const refreshToken = await createRefreshToken({ sub: user.id, email: user.email, role: user.role })
    const refreshTokenHash = generateRefreshTokenHash(refreshToken)
    const refreshTokenId = generateRandomId()
    const refreshExpiresAt = new Date(Date.now() + this.parseDurationMs(env.JWT_REFRESH_TTL))

    await this.refreshTokensRepo.create({
      id: refreshTokenId,
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshExpiresAt
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer'
      }
    }
  }

  private parseDurationMs(input: string) {
    const match = input.match(/^(\d+)([smhd])$/)
    if (!match) return 7 * 24 * 60 * 60 * 1000
    const value = Number(match[1])
    const unit = match[2]
    if (unit === 's') return value * 1000
    if (unit === 'm') return value * 60 * 1000
    if (unit === 'h') return value * 60 * 60 * 1000
    return value * 24 * 60 * 60 * 1000
  }
}
