import { createT } from './t'

export const getTranslations = async (namespace?: string) => {
  return createT(namespace)
}

export const getLocale = async () => 'en'

export const getMessages = async () => ({})

export const getRequestConfig = <T>(factory: () => T) => factory

