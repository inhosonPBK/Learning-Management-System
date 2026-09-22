/**
 * Seeds departments, teams, profiles and auth users from the org workbook.
 *
 *   npm run seed -- "../01. PBK_PK_org_users_seed/PBK_org_users_seed.xlsx"
 *   npm run seed -- <xlsx> --dry-run            # parse + report only, no writes
 *   npm run seed -- <xlsx> --only=inho.son@promega.com
 *   npm run seed -- <xlsx> --reset-passwords    # issue new temp passwords to existing users too
 *
 * Idempotent: upserts by email, skips existing auth users (unless --reset-passwords).
 * Writes out/seed-output-<timestamp>.csv with temp passwords for NEWLY created accounts only.
 * Uses the service-role key (no direct DB connection needed).
 */
import { config } from 'dotenv'
import { randomInt } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

config({ path: '.env.local' })

// ── CLI ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const xlsxPath = args.find(a => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
const resetPasswords = args.includes('--reset-passwords')
const only = args.find(a => a.startsWith('--only='))?.slice(7).toLowerCase()

if (!xlsxPath) {
  console.error('usage: npm run seed -- <path-to-xlsx> [--dry-run] [--only=email] [--reset-passwords]')
  process.exit(1)
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1) }
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// ── Constants ────────────────────────────────────────────────────────────
const FLAGS = {
  admin: ['inho.son@promega.com'],
  people_ops: ['youla.lee@promega.com', 'hyesong.choi@promega.com', 'youngjun.lee@promega.com'],
  gm: ['jeunga.na@promega.com'],
}
/** Proposed Korean team names (editable later in /admin/teams). Keyed by org_tree "Dept name". */
const TEAM_NAME_KO: Record<string, string> = {
  'GM': '경영총괄',
  'R&D': '연구개발팀',
  'MKT Science': '마케팅사이언스팀',
  'F&A': '재무회계팀',
  'Operations': '생산운영팀',
  'MKT Service': '마케팅서비스팀',
  'Sales Operation': '영업운영팀',
  'Quality Assurance': '품질보증팀',
  'Logistics': '물류팀',
  'People Operations': '피플오퍼레이션팀',
}

/** dept_code → legal entity (from the workbook README). The root (GM) is SHARED regardless of dept. */
const ENTITY_BY_DEPT: Record<string, 'PBK' | 'PK' | 'SHARED'> = {
  '70601140': 'PBK', '70602000': 'PBK',
  '70704000': 'PK', '70703000': 'PK', '70704630': 'PK', '70701610': 'PK', '70704610': 'PK',
  '70605000': 'SHARED', '70705000': 'SHARED',
}
/** Consultants / agency staff get a profile (org chart completeness) but no login. */
const EXTERNAL_TYPES = new Set(['Consultant', 'Agency Project'])

// ── Types ────────────────────────────────────────────────────────────────
interface UserRow {
  entra_id: string; display_name: string; email: string; job_title: string; entity?: string
  dept_code: string; dept_name: string; employee_type: string; manager_email: string
  depth: number; suggested_role?: string
}
interface TreeRow { 'Dept name'?: string; Email: string }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const isExternal = (u: UserRow) => EXTERNAL_TYPES.has(u.employee_type) || u.suggested_role === 'EXTERNAL'

function tempPassword(len = 12) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const all = letters + digits
  const pick = (s: string) => s[randomInt(s.length)]
  const chars = [pick(letters), pick(letters), pick(digits), pick(digits)]
  while (chars.length < len) chars.push(pick(all))
  for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]] }
  return chars.join('')
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const wb = XLSX.readFile(xlsxPath!)
  const users: Required<UserRow>[] = XLSX.utils.sheet_to_json<UserRow>(wb.Sheets['users']).map(r => {
    const dept_code = String(r.dept_code)
    const manager_email = r.manager_email ? String(r.manager_email).trim().toLowerCase() : ''
    const entity = r.entity?.trim() || (!manager_email ? 'SHARED' : ENTITY_BY_DEPT[dept_code])
    if (!entity) throw new Error(`unknown entity for dept_code ${dept_code} (${r.email})`)
    return {
      ...r,
      email: String(r.email).trim().toLowerCase(),
      manager_email,
      dept_code,
      depth: Number(r.depth),
      entity,
      suggested_role: r.suggested_role ?? '',
    }
  })
  const tree = XLSX.utils.sheet_to_json<TreeRow>(wb.Sheets['org_tree'])

  // Validate
  const byEmail = new Map(users.map(u => [u.email, u]))
  if (byEmail.size !== users.length) throw new Error('duplicate emails in users sheet')
  for (const u of users) if (u.manager_email && !byEmail.has(u.manager_email)) throw new Error(`manager not found: ${u.manager_email} (for ${u.email})`)
  const roots = users.filter(u => !u.manager_email)
  if (roots.length !== 1) throw new Error(`expected exactly one root, found ${roots.length}`)

  // Teams from org_tree: rows with "Dept name" are team leads
  const leadTeam = new Map<string, { code: string; name_en: string }>()
  for (const r of tree) {
    const name = r['Dept name']?.toString().trim()
    if (!name) continue
    leadTeam.set(String(r.Email).trim().toLowerCase(), { code: slug(name), name_en: name })
  }
  if (leadTeam.size === 0) throw new Error('no "Dept name" values found in org_tree sheet')

  // Resolve team for every user by walking up to the nearest lead
  const teamOf = (email: string): string => {
    let cur: string | undefined = email
    for (let i = 0; i < 10 && cur; i++) {
      const t = leadTeam.get(cur)
      if (t) return t.code
      cur = byEmail.get(cur)?.manager_email || undefined
    }
    throw new Error(`no team lead found in chain for ${email}`)
  }
  const teamCode = new Map(users.map(u => [u.email, teamOf(u.email)]))

  // Report
  const counts = new Map<string, number>()
  for (const c of teamCode.values()) counts.set(c, (counts.get(c) ?? 0) + 1)
  console.log(`users: ${users.length} · teams: ${leadTeam.size} · externals (no login): ${users.filter(isExternal).map(u => u.display_name).join(', ') || 'none'}`)
  for (const [email, t] of leadTeam) console.log(`  ${t.code.padEnd(20)} ${t.name_en.padEnd(20)} lead=${email.padEnd(32)} n=${counts.get(t.code)}`)
  if (dryRun) { console.log('\n--dry-run: no writes'); return }

  // 1) departments
  const depts = new Map<string, { name_en: string; entity: string }>()
  for (const u of users) if (!depts.has(u.dept_code)) depts.set(u.dept_code, { name_en: u.dept_name, entity: u.entity })
  {
    const rows = [...depts].map(([dept_code, d], i) => ({ dept_code, name_en: d.name_en, entity: d.entity, sort_order: i + 1 }))
    const { error } = await admin.from('departments').upsert(rows, { onConflict: 'dept_code' })
    if (error) throw error
    console.log(`departments upserted: ${rows.length}`)
  }

  // 2) teams (lead_id linked in step 6)
  {
    const rows = [...leadTeam].map(([email, t], i) => ({
      code: t.code, name_en: t.name_en, name_ko: TEAM_NAME_KO[t.name_en] ?? null,
      entity: byEmail.get(email)!.entity, sort_order: i + 1,
    }))
    const { error } = await admin.from('teams').upsert(rows, { onConflict: 'code', ignoreDuplicates: false })
    if (error) throw error
    console.log(`teams upserted: ${rows.length}`)
  }

  // 3) profiles pass 1 (no manager/team yet)
  const targets = only ? users.filter(u => u.email === only) : users
  {
    const rows = targets.map(u => ({
      entra_id: u.entra_id || null,
      email: u.email,
      display_name: u.display_name,
      job_title: u.job_title || null,
      entity: u.entity,
      dept_code: u.dept_code,
      employee_type: u.employee_type,
      is_active: !isExternal(u),
    }))
    const { error } = await admin.from('profiles').upsert(rows, { onConflict: 'email' })
    if (error) throw error
    console.log(`profiles upserted: ${rows.length}`)
  }
  const { data: allProfiles, error: pErr } = await admin.from('profiles').select('id, email, auth_user_id, is_active')
  if (pErr) throw pErr
  const profileByEmail = new Map(allProfiles!.map(p => [String(p.email).toLowerCase(), p]))

  // 4) auth users
  const { data: authList, error: aErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (aErr) throw aErr
  const authByEmail = new Map(authList.users.map(u => [u.email!.toLowerCase(), u]))
  const created: { email: string; display_name: string; temp_password: string }[] = []
  let existing = 0, skipped = 0
  for (const u of targets) {
    const p = profileByEmail.get(u.email)!
    if (!p.is_active) { skipped++; continue }
    let authUser = authByEmail.get(u.email)
    if (authUser && !resetPasswords) {
      existing++
    } else {
      const pw = tempPassword()
      if (authUser) {
        const { error } = await admin.auth.admin.updateUserById(authUser.id, { password: pw })
        if (error) throw error
      } else {
        const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: pw, email_confirm: true, user_metadata: { display_name: u.display_name } })
        if (error) throw error
        authUser = data.user
      }
      created.push({ email: u.email, display_name: u.display_name, temp_password: pw })
      const { error } = await admin.from('profiles').update({ must_change_password: true }).eq('id', p.id)
      if (error) throw error
    }
    if (p.auth_user_id !== authUser!.id) {
      const { error } = await admin.from('profiles').update({ auth_user_id: authUser!.id }).eq('id', p.id)
      if (error) throw error
    }
  }
  console.log(`auth: created/reset ${created.length} · existing ${existing} · skipped(external) ${skipped}`)

  // 5) manager links + 6) team codes
  for (const u of targets) {
    const p = profileByEmail.get(u.email)!
    const manager = u.manager_email ? profileByEmail.get(u.manager_email) : undefined
    const { error } = await admin.from('profiles').update({ manager_id: manager?.id ?? null, team_code: teamCode.get(u.email) }).eq('id', p.id)
    if (error) throw error
  }
  for (const [email, t] of leadTeam) {
    const lead = profileByEmail.get(email)
    if (!lead) continue
    const { error } = await admin.from('teams').update({ lead_id: lead.id }).eq('code', t.code)
    if (error) throw error
  }
  console.log('manager_id / team_code / teams.lead_id linked')

  // 7) flags (set only; never cleared here)
  for (const [flag, emails] of Object.entries(FLAGS)) {
    const col = `is_${flag}`
    const { error } = await admin.from('profiles').update({ [col]: true }).in('email', emails)
    if (error) throw error
  }
  console.log('flags set: admin / people_ops / gm')

  // 8) output
  if (created.length) {
    mkdirSync('out', { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const file = join('out', `seed-output-${ts}.csv`)
    const csv = ['email,display_name,temp_password', ...created.map(c => `${c.email},"${c.display_name}",${c.temp_password}`)].join('\n')
    writeFileSync(file, csv, 'utf8')
    console.log(`\nTEMP PASSWORDS written to ${file} — distribute via Teams DM and delete the file.`)
  }
}

main().catch(err => { console.error('\nSEED FAILED:', err.message ?? err); process.exit(1) })
