export type TranslateValues = Record<string, string | number | boolean | null | undefined>
import type { AppLocale } from './i18n'
import { resolveTranslation } from './i18n'

export type TranslateFn = (key: string, values?: TranslateValues) => string

const injectValues = (template: string, values?: TranslateValues): string => {
  if (!values) return template
  return Object.entries(values).reduce((acc, [name, value]) => {
    const safe = value == null ? '' : String(value)
    return acc.replaceAll(`{${name}}`, safe)
  }, template)
}

export const createT = (namespace?: string, locale: AppLocale = 'en'): TranslateFn => {
  return (key, values) => injectValues(resolveTranslation(locale, namespace, key), values)
}

export const getT = async (namespace?: string): Promise<TranslateFn> => {
  return createT(namespace)
}

export const useT = (namespace?: string): TranslateFn => {
  return createT(namespace)
}

