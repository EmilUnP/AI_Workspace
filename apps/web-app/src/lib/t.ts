export type TranslateValues = Record<string, string | number | boolean | null | undefined>

export type TranslateFn = (key: string, values?: TranslateValues) => string

const injectValues = (template: string, values?: TranslateValues): string => {
  if (!values) return template
  return Object.entries(values).reduce((acc, [name, value]) => {
    const safe = value == null ? '' : String(value)
    return acc.replaceAll(`{${name}}`, safe)
  }, template)
}

export const createT = (_namespace?: string): TranslateFn => {
  return (key, values) => injectValues(key, values)
}

export const getT = async (namespace?: string): Promise<TranslateFn> => {
  return createT(namespace)
}

export const useT = (namespace?: string): TranslateFn => {
  return createT(namespace)
}

