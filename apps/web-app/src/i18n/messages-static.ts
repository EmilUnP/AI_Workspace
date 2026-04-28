import az from '../messages/az.json'
import en from '../messages/en.json'

type Messages = Record<string, unknown>

export const MESSAGES = {
  az: az as Messages,
  en: en as Messages,
} as const
