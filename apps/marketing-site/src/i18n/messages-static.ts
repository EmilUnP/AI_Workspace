/**
 * Static message imports for i18n.
 * Keep this marketing site self-contained by only importing the `public` module.
 */

import publicAz from '../messages/public/az.json'
import publicEn from '../messages/public/en.json'

type Messages = Record<string, unknown>

export const MESSAGES = {
  public: {
    az: publicAz as Messages,
    en: publicEn as Messages,
  },
} as const

