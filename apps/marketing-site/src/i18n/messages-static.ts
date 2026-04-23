/**
 * Static message imports for i18n.
 * Keep this marketing site self-contained by only importing the `public` module.
 */

import publicAz from '../messages/public/az.json'
import publicEn from '../messages/public/en.json'
import publicRu from '../messages/public/ru.json'
import publicTr from '../messages/public/tr.json'

type Messages = Record<string, unknown>

export const MESSAGES = {
  public: {
    az: publicAz as Messages,
    en: publicEn as Messages,
    ru: publicRu as Messages,
    tr: publicTr as Messages,
  },
} as const

