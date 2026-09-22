import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/types/db'

/** Everything permission checks need about the current user, computed once per request. */
export interface Viewer {
  profile: Profile
  id: string
  authUserId: string
  isAdmin: boolean
  isPeopleOps: boolean
  isGm: boolean
  isActive: boolean
  mustChangePassword: boolean
  /** active profiles whose manager_id = me */
  directReportIds: string[]
  /** enrollments where I am the assigned mentor */
  mentorOfEnrollmentIds: string[]
  /** enrollments where I am a co_mentor watcher */
  coMentorOfEnrollmentIds: string[]
  /** enrollments where I am any kind of watcher */
  watcherOfEnrollmentIds: string[]
  /** enrollments where I am the trainee */
  myEnrollmentIds: string[]
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle<Profile>()
  if (!profile) return null

  const [reports, mentor, watchers, mine] = await Promise.all([
    admin.from('profiles').select('id').eq('manager_id', profile.id).eq('is_active', true),
    admin.from('enrollments').select('id').eq('mentor_id', profile.id),
    admin.from('enrollment_watchers').select('enrollment_id, role').eq('profile_id', profile.id),
    admin.from('enrollments').select('id').eq('trainee_id', profile.id),
  ])

  const watcherRows = (watchers.data ?? []) as { enrollment_id: string; role: string }[]

  return {
    profile,
    id: profile.id,
    authUserId: user.id,
    isAdmin: profile.is_admin,
    isPeopleOps: profile.is_people_ops,
    isGm: profile.is_gm,
    isActive: profile.is_active,
    mustChangePassword: profile.must_change_password,
    directReportIds: (reports.data ?? []).map(r => r.id),
    mentorOfEnrollmentIds: (mentor.data ?? []).map(r => r.id),
    coMentorOfEnrollmentIds: watcherRows.filter(w => w.role === 'co_mentor').map(w => w.enrollment_id),
    watcherOfEnrollmentIds: watcherRows.map(w => w.enrollment_id),
    myEnrollmentIds: (mine.data ?? []).map(r => r.id),
  }
})

/**
 * Page/action gate. Redirects to /login (no session), /inactive (deactivated),
 * or /change-password (first login) unless allowMustChange is set.
 */
export async function requireViewer(opts?: { allowMustChange?: boolean }): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect('/login')
  if (!viewer.isActive) redirect('/inactive')
  if (viewer.mustChangePassword && !opts?.allowMustChange) redirect('/change-password')
  return viewer
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer()
  if (!viewer.isAdmin) redirect('/dashboard')
  return viewer
}

/** Admin or People Operations — program/enrollment/team management. */
export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer()
  if (!viewer.isAdmin && !viewer.isPeopleOps) redirect('/dashboard')
  return viewer
}

/** True when the viewer has at least one supervisory relationship (renders manager/mentor sections). */
export function isSupervisor(v: Viewer) {
  return v.directReportIds.length > 0 || v.mentorOfEnrollmentIds.length > 0 || v.coMentorOfEnrollmentIds.length > 0
}
