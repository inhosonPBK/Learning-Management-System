/**
 * Migrates weekly + interview reports from the OLD training-report Supabase project into the new
 * `reports` table, matching people by e-mail and mapping fixed columns → jsonb bodies.
 *
 *   npm run migrate:old -- --dry-run
 *   npm run migrate:old -- --only=soomin.kim@promega.com
 *   npm run migrate:old -- --complete-enrollments     # also mark migrated enrollments completed
 *
 * Requires in .env.local:  OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY  (+ the new project keys)
 * Idempotent: weekly rows are skipped when (enrollment, week) already exists; interview rows when
 * (enrollment, date, author) already exists.
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const only = args.find(a => a.startsWith('--only='))?.slice(7).toLowerCase()
const completeEnrollments = args.includes('--complete-enrollments')

const need = (k: string) => {
  const v = process.env[k]
  if (!v) { console.error(`Missing ${k} in .env.local`); process.exit(1) }
  return v
}
const oldDb = createClient(need('OLD_SUPABASE_URL'), need('OLD_SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const newDb = createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

interface OldProfile { id: string; name: string; email: string; role: string | null; mentor_id: string | null }
interface OldReport {
  id: string; intern_id: string; week_number: number; topic: string | null; learned: string | null; rating: string | null
  feeling: string | null; questions: string | null; status: 'draft' | 'submitted' | 'completed'; submitted_at: string | null
  mentor_good: string | null; mentor_next: string | null; mentor_qa: string | null; mentor_progress: string | null
  mentor_id: string | null; completed_at: string | null; created_at: string; updated_at: string
}
interface OldInterview {
  id: string; mentor_id: string; intern_id: string; week_number: number | null; interview_date: string | null
  content: string | null; status: 'draft' | 'submitted'; created_at: string; updated_at: string
}

async function main() {
  // ── load old ─────────────────────────────────────────────────────────────
  const [{ data: oldProfiles, error: e1 }, { data: oldReports, error: e2 }, { data: oldInterviews, error: e3 }] = await Promise.all([
    oldDb.from('profiles').select('id,name,email,role,mentor_id'),
    oldDb.from('reports').select('*'),
    oldDb.from('interview_reports').select('*'),
  ])
  if (e1 || e2 || e3) throw e1 ?? e2 ?? e3
  const oldById = new Map((oldProfiles as OldProfile[]).map(p => [p.id, { ...p, email: p.email.toLowerCase() }]))
  console.log(`old: profiles ${oldById.size} · weekly ${oldReports!.length} · interview ${oldInterviews!.length}`)

  // ── load new ─────────────────────────────────────────────────────────────
  const [{ data: newProfiles }, { data: enrollments }, { data: existing }] = await Promise.all([
    newDb.from('profiles').select('id,email,display_name'),
    newDb.from('enrollments').select('id,trainee_id,mentor_id,program_id,status'),
    newDb.from('reports').select('enrollment_id,report_type,period_index,report_date,author_id'),
  ])
  const newByEmail = new Map(newProfiles!.map(p => [String(p.email).toLowerCase(), p]))
  const enrollmentByTrainee = new Map(enrollments!.map(e => [e.trainee_id, e]))
  const mapPerson = (oldId: string | null) => (oldId ? newByEmail.get(oldById.get(oldId)?.email ?? '') ?? null : null)

  const internIds = new Set([...(oldReports as OldReport[]).map(r => r.intern_id), ...(oldInterviews as OldInterview[]).map(r => r.intern_id)])
  const plan: { intern: string; email: string; enrollment: string | null; weekly: number; interview: number; skippedWeekly: number; skippedInterview: number }[] = []
  const weeklyRows: Record<string, unknown>[] = []
  const interviewRows: Record<string, unknown>[] = []
  const touched = new Set<string>()

  for (const internId of internIds) {
    const oldIntern = oldById.get(internId)
    if (!oldIntern) continue
    if (only && oldIntern.email !== only) continue
    const newIntern = newByEmail.get(oldIntern.email)
    const enrollment = newIntern ? enrollmentByTrainee.get(newIntern.id) : undefined
    const row = { intern: oldIntern.name, email: oldIntern.email, enrollment: enrollment?.id ?? null, weekly: 0, interview: 0, skippedWeekly: 0, skippedInterview: 0 }
    plan.push(row)
    if (!newIntern || !enrollment) continue

    for (const r of (oldReports as OldReport[]).filter(x => x.intern_id === internId)) {
      if (existing!.some(x => x.enrollment_id === enrollment.id && x.report_type === 'weekly' && x.period_index === r.week_number)) { row.skippedWeekly++; continue }
      const reviewer = mapPerson(r.mentor_id) ?? (enrollment.mentor_id ? { id: enrollment.mentor_id } : null)
      const hasReview = !!(r.mentor_good || r.mentor_next || r.mentor_qa || r.mentor_progress)
      weeklyRows.push({
        enrollment_id: enrollment.id, trainee_id: newIntern.id, report_type: 'weekly', author_id: newIntern.id,
        period_index: r.week_number, report_date: null,
        content: { topic: r.topic ?? '', learned: r.learned ?? '', rating: r.rating ?? '', feeling: r.feeling ?? '', questions: r.questions ?? '', legacy_id: r.id },
        schema_version: 1, status: r.status,
        submitted_at: r.submitted_at ?? (r.status !== 'draft' ? r.updated_at : null),
        completed_at: r.completed_at ?? (r.status === 'completed' ? r.updated_at : null),
        reviewer_id: hasReview || r.status === 'completed' ? reviewer?.id ?? null : null,
        review: hasReview ? { good: r.mentor_good ?? '', next: r.mentor_next ?? '', qa: r.mentor_qa ?? '', progress: r.mentor_progress ?? '' } : null,
        created_at: r.created_at, updated_at: r.updated_at,
      })
      row.weekly++
    }

    for (const iv of (oldInterviews as OldInterview[]).filter(x => x.intern_id === internId)) {
      const author = mapPerson(iv.mentor_id) ?? (enrollment.mentor_id ? { id: enrollment.mentor_id } : null)
      if (!author) { row.skippedInterview++; continue }
      const date = iv.interview_date ? iv.interview_date.slice(0, 10) : iv.created_at.slice(0, 10)
      if (existing!.some(x => x.enrollment_id === enrollment.id && x.report_type === 'interview' && x.report_date === date && x.author_id === author.id)) { row.skippedInterview++; continue }
      interviewRows.push({
        enrollment_id: enrollment.id, trainee_id: newIntern.id, report_type: 'interview', author_id: author.id,
        period_index: null, report_date: date,
        content: { content: iv.content ?? '', legacy_id: iv.id, legacy_week: iv.week_number },
        schema_version: 1, status: iv.status,
        submitted_at: iv.status === 'submitted' ? iv.updated_at : null,
        created_at: iv.created_at, updated_at: iv.updated_at,
      })
      row.interview++
    }
    touched.add(enrollment.id)
  }

  console.table(plan)
  console.log(`to insert: weekly ${weeklyRows.length} · interview ${interviewRows.length}${dryRun ? '  (dry-run, no writes)' : ''}`)
  if (dryRun) return

  let ok = 0
  for (const r of [...weeklyRows, ...interviewRows]) {
    const { error } = await newDb.from('reports').insert(r)
    if (error) console.error('  x', r.report_type, r.period_index ?? r.report_date, error.message)
    else ok++
  }
  console.log(`inserted ${ok}/${weeklyRows.length + interviewRows.length}`)

  const actor = newByEmail.get('inho.son@promega.com')?.id ?? null
  for (const eid of touched) {
    await newDb.from('audit_log').insert({
      actor_id: actor, action: 'report.migrate', entity_type: 'enrollment', entity_id: eid,
      detail: { source: 'training-report (2026 H1)', weekly: weeklyRows.filter(r => r.enrollment_id === eid).length, interview: interviewRows.filter(r => r.enrollment_id === eid).length },
    })
    if (completeEnrollments) await newDb.from('enrollments').update({ status: 'completed', completed_at: '2026-09-03T00:00:00Z' }).eq('id', eid)
  }
  if (completeEnrollments) console.log(`enrollments marked completed: ${touched.size}`)
}

main().catch(err => { console.error('\nMIGRATION FAILED:', err.message ?? err); process.exit(1) })
