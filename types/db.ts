/** Row types mirroring supabase/migrations. Keep in sync when adding columns. */

export type Entity = 'PBK' | 'PK' | 'SHARED'
export type Locale = 'ko' | 'en'
export type EmployeeType = 'Employee' | 'Intern' | 'Consultant' | 'Agency Project'
export type ProgramType = 'intern' | 'new_hire' | 'ojt'
export type ProgramStatus = 'planned' | 'active' | 'closed'
export type EnrollmentStatus = 'active' | 'completed' | 'withdrawn'
export type ReportTypeCode = 'weekly' | 'training' | 'interview'
export type ReportStatus = 'draft' | 'submitted' | 'completed'
export type WatcherRole = 'co_mentor' | 'observer'

export interface Department {
  dept_code: string
  name_en: string
  entity: Entity
  sort_order: number
  is_active: boolean
}

export interface Team {
  code: string
  name_en: string
  name_ko: string | null
  lead_id: string | null
  entity: Entity | null
  sort_order: number
  is_active: boolean
}

export interface Profile {
  id: string
  auth_user_id: string | null
  entra_id: string | null
  email: string
  display_name: string
  name_ko: string | null
  job_title: string | null
  entity: Entity | null
  team_code: string | null
  dept_code: string | null
  employee_type: EmployeeType | null
  manager_id: string | null
  is_admin: boolean
  is_people_ops: boolean
  is_gm: boolean
  is_active: boolean
  must_change_password: boolean
  locale: Locale
  last_login_at: string | null
  deactivated_at: string | null
  created_at: string
  updated_at: string
}

export interface Program {
  id: string
  program_type: ProgramType
  name_ko: string
  name_en: string
  start_date: string
  end_date: string
  duration_weeks: number
  enabled_report_types: ReportTypeCode[]
  status: ProgramStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TrainingPlanItem {
  week_from: number
  week_to: number
  topic: string
  method?: string
  owner?: string
}

export interface Enrollment {
  id: string
  program_id: string
  trainee_id: string
  mentor_id: string | null
  start_date: string | null
  end_date: string | null
  jd_text: string | null
  training_plan: TrainingPlanItem[]
  status: EnrollmentStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface EnrollmentWatcher {
  enrollment_id: string
  profile_id: string
  role: WatcherRole
  created_at: string
}

export interface ReportType {
  code: ReportTypeCode
  name_ko: string
  name_en: string
  author_kind: 'trainee' | 'supervisor'
  has_period: boolean
  requires_review: boolean
  trainee_visible: boolean
  current_schema_version: number
  sort_order: number
}

/** weekly v1 body (ported from the intern app) */
export interface WeeklyContentV1 {
  topic: string
  learned: string
  rating: 'Excellent' | 'Good' | 'Okay' | 'Tough' | ''
  feeling: string
  questions: string
}
/** weekly v1 mentor review (ported) */
export interface WeeklyReviewV1 {
  good: string
  next: string
  qa: string
  progress: 'On Track' | 'Minor Adjustment' | 'Review Required' | ''
}
/** interview v1 body (ported — single merged field) */
export interface InterviewContentV1 {
  content: string
}

export interface Report {
  id: string
  enrollment_id: string
  trainee_id: string
  report_type: ReportTypeCode
  author_id: string
  period_index: number | null
  report_date: string | null
  content: Record<string, unknown>
  schema_version: number
  status: ReportStatus
  submitted_at: string | null
  completed_at: string | null
  reviewer_id: string | null
  review: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
}
