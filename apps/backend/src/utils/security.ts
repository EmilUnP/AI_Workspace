import { compare, hash } from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { env } from '../config/env.js'

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET)
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET)

export async function hashPassword(password: string) {
  return hash(password, 12)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash)
}

export async function createAccessToken(payload: {
  sub: string
  email: string
  role: string
}) {
  return new SignJWT({ ...payload, tokenType: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret)
}

export async function createRefreshToken(payload: {
  sub: string
  email: string
  role: string
}) {
  return new SignJWT({ ...payload, tokenType: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(refreshSecret)
}

export async function verifyRefreshToken(token: string) {
  const result = await jwtVerify(token, refreshSecret)
  return result.payload as {
    sub: string
    email: string
    role: string
    tokenType: 'refresh'
  }
}

export function generateRefreshTokenHash(refreshToken: string) {
  return createHash('sha256').update(refreshToken).digest('hex')
}

export function generateRandomId(size = 16) {
  return randomBytes(size).toString('hex')
}
