/**
 * Bulk-import profile photos: a folder of files named <email>.jpg|jpeg|png|webp (e.g. inho.son@promega.com.jpg
 * or inho.son.jpg — the domain is optional). Matches profiles by e-mail, uploads to the `avatars` bucket and sets
 * profiles.avatar_path. Existing photos are replaced.
 *
 *   npm run avatars -- "../04. Photos"            # import
 *   npm run avatars -- "../04. Photos" --dry-run  # match report only
 *
 * Tip: 256–512 px square images look best; anything larger is stored as-is (2 MB cap).
 */
import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })
const args = process.argv.slice(2)
const dir = args.find(a => !a.startsWith("--"))!
const dryRun = args.includes('--dry-run')
if (!args.find(a => !a.startsWith("--"))) { console.error('usage: npm run avatars -- <folder> [--dry-run]'); process.exit(1) }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

async function main() {
  const { data: profiles, error } = await admin.from('profiles').select('id, email, display_name, avatar_path')
  if (error) throw error
  const byEmail = new Map(profiles!.map(p => [String(p.email).toLowerCase(), p]))
  const byLocal = new Map(profiles!.map(p => [String(p.email).toLowerCase().split('@')[0], p]))

  const files = readdirSync(dir).filter(f => MIME[extname(f).toLowerCase()])
  const plan = files.map(f => {
    const base = f.slice(0, -extname(f).length).toLowerCase().trim()
    const profile = byEmail.get(base) ?? byLocal.get(base) ?? null
    return { file: f, profile, size: statSync(join(dir, f)).size }
  })
  console.table(plan.map(p => ({ file: p.file, match: p.profile?.display_name ?? '— (no match)', kb: Math.round(p.size / 1024) })))
  const matched = plan.filter(p => p.profile)
  console.log(`files ${files.length} · matched ${matched.length} · unmatched ${files.length - matched.length}${dryRun ? '  (dry-run)' : ''}`)
  if (dryRun) return

  let ok = 0
  for (const p of matched) {
    if (p.size > 2 * 1024 * 1024) { console.error('  x too large (>2MB):', p.file); continue }
    const ext = extname(p.file).toLowerCase()
    const path = `${randomUUID()}${ext === '.jpeg' ? '.jpg' : ext}`
    const { error: upErr } = await admin.storage.from('avatars').upload(path, readFileSync(join(dir, p.file)), { contentType: MIME[ext], upsert: false })
    if (upErr) { console.error('  x upload failed:', p.file, upErr.message); continue }
    const { error: dbErr } = await admin.from('profiles').update({ avatar_path: path }).eq('id', p.profile!.id)
    if (dbErr) { console.error('  x db failed:', p.file, dbErr.message); continue }
    if (p.profile!.avatar_path) await admin.storage.from('avatars').remove([p.profile!.avatar_path])
    ok++
  }
  console.log(`imported ${ok}/${matched.length}`)
}

main().catch(err => { console.error('\nIMPORT FAILED:', err.message ?? err); process.exit(1) })
