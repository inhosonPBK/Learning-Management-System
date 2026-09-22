'use server'

import { cookies } from 'next/headers'
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/request'
import { getViewer } from '@/lib/auth/viewer'
import { createAdminClient } from '@/lib/supabase/admin'

/** Switch UI language. Persists to cookie and, when logged in, to profiles.locale. */
export async function setLocale(value: string) {
  const locale = normalizeLocale(value)
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

  const viewer = await getViewer()
  if (viewer) {
    await createAdminClient().from('profiles').update({ locale }).eq('id', viewer.id)
  }
}
