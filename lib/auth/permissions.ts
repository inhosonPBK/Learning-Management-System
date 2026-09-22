import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Viewer } from './viewer'
import type { Enrollment, Program, Report, ReportType } from '@/types/db'

/**
 * How far up the org chart report visibility extends.
 * 'direct' — only the trainee's manager_id (decided 2026-09-22).
 * 'chain'  — every ancestor up to the GM.
 */
export const MANAGER_SCOPE: 'direct' | 'chain' = 'direct'

export interface ReportAccess {
  report: Report
  enrollment: Enrollment
  type: ReportType
}

export async function isManagerOf(v: Viewer, traineeId: string): Promise<boolean> {
  if (v.directReportIds.includes(traineeId)) return true
  if (MANAGER_SCOPE === 'direct') return false

  const admin = createAdminClient()
  let current: string | null = traineeId
  for (let depth = 0; depth < 8 && current; depth++) {
    const { data }: { data: { manager_id: string | null } | null } = await admin
      .from('profiles')
      .select('manager_id')
      .eq('id', current)
      .maybeSingle()
    if (!data?.manager_id) return false
    if (data.manager_id === v.id) return true
    current = data.manager_id
  }
  return false
}

function isOversight(v: Viewer) {
  return v.isAdmin || v.isPeopleOps || v.isGm
}

// ── Enrollments ────────────────────────────────────────────────────────────

export async function canViewEnrollment(v: Viewer, e: Enrollment): Promise<boolean> {
  if (!v.isActive) return false
  if (isOversight(v)) return true
  if (v.id === e.trainee_id || v.id === e.mentor_id) return true
  if (v.watcherOfEnrollmentIds.includes(e.id)) return true
  return isManagerOf(v, e.trainee_id)
}

export function canManageEnrollments(v: Viewer) {
  return v.isActive && (v.isAdmin || v.isPeopleOps)
}
export const canManagePrograms = canManageEnrollments
export const canManageTeams = canManageEnrollments

// ── Reports ────────────────────────────────────────────────────────────────

export async function canViewReport(v: Viewer, { report, enrollment, type }: ReportAccess): Promise<boolean> {
  if (!v.isActive) return false
  if (report.status === 'draft') return v.id === report.author_id || v.isAdmin
  if (isOversight(v)) return true
  if (v.id === report.author_id) return true
  if (v.id === report.trainee_id) return type.trainee_visible
  if (enrollment.mentor_id === v.id) return true
  if (v.watcherOfEnrollmentIds.includes(enrollment.id)) return true
  return isManagerOf(v, report.trainee_id)
}

export function canEditReport(v: Viewer, r: Report) {
  return v.isActive && v.id === r.author_id && r.status === 'draft'
}
export const canSubmitReport = canEditReport

export function canRecallReport(v: Viewer, r: Report) {
  return v.isActive && v.id === r.author_id && r.status === 'submitted'
}

export function canReviewReport(v: Viewer, { report, enrollment, type }: ReportAccess) {
  if (!v.isActive || !type.requires_review || report.status !== 'submitted') return false
  return enrollment.mentor_id === v.id || v.coMentorOfEnrollmentIds.includes(enrollment.id)
}

export function canReopenReport(v: Viewer) {
  return v.isActive && (v.isAdmin || v.isPeopleOps)
}

export async function canCreateReport(v: Viewer, enrollment: Enrollment, program: Program, type: ReportType): Promise<boolean> {
  if (!v.isActive || enrollment.status !== 'active') return false
  if (!program.enabled_report_types.includes(type.code)) return false
  if (type.author_kind === 'trainee') return v.id === enrollment.trainee_id
  if (enrollment.mentor_id === v.id || v.coMentorOfEnrollmentIds.includes(enrollment.id)) return true
  return isManagerOf(v, enrollment.trainee_id)
}

/** Government 면담일지 is a supervisor artifact — trainee excluded even though they may view the enrollment. */
export async function canPrintInterviewLog(v: Viewer, e: Enrollment): Promise<boolean> {
  if (v.id === e.trainee_id && !v.isAdmin) return false
  return canViewEnrollment(v, e)
}

// ── Users / materials / directory ──────────────────────────────────────────

export function canManageUsers(v: Viewer) {
  return v.isActive && v.isAdmin
}

export function canReadMaterials(v: Viewer) {
  return v.isActive
}
export const canViewDirectory = canReadMaterials

export function canManageMaterials(v: Viewer, material?: { author_id: string | null }) {
  if (!v.isActive) return false
  if (v.isAdmin || v.isPeopleOps) return true
  return !!material && material.author_id === v.id
}
