import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const LOCALES = ['ko', 'en'] as const
export type AppLocale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = 'ko'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export function normalizeLocale(value: string | undefined | null): AppLocale {
  return value === 'en' ? 'en' : 'ko'
}

/** Cookie-based locale (no URL prefix). The cookie is set by setLocale() and seeded from profiles.locale on login. */
export default getRequestConfig(async () => {
  const store = await cookies()
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value)
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
