/**
 * Applies supabase/migrations/*.sql in filename order, once each.
 * Tracks applied files in public.schema_migrations.
 *
 *   npm run migrate            # apply pending
 *   npm run migrate -- --status
 *
 * Requires SUPABASE_DB_URL in .env.local (Session pooler URI from Supabase → Connect).
 */
import { config } from 'dotenv'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

config({ path: '.env.local' })

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('SUPABASE_DB_URL is not set in .env.local')
  process.exit(1)
}

const sql = postgres(url, { ssl: 'require', prepare: false, max: 1, onnotice: () => {} })
const dir = join(process.cwd(), 'supabase', 'migrations')
const statusOnly = process.argv.includes('--status')

async function main() {
  await sql`create table if not exists public.schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`

  const applied = new Set(
    (await sql<{ filename: string }[]>`select filename from public.schema_migrations`).map(r => r.filename)
  )
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

  if (statusOnly) {
    for (const f of files) console.log(`${applied.has(f) ? '✓' : '·'} ${f}`)
    return
  }

  let count = 0
  for (const f of files) {
    if (applied.has(f)) continue
    const body = readFileSync(join(dir, f), 'utf8')
    process.stdout.write(`applying ${f} … `)
    await sql.begin(async tx => {
      await tx.unsafe(body)
      await tx`insert into public.schema_migrations (filename) values (${f})`
    })
    console.log('ok')
    count++
  }
  console.log(count ? `${count} migration(s) applied` : 'up to date')
}

main()
  .catch(err => { console.error('\nFAILED:', err.message); process.exit(1) })
  .finally(() => sql.end())
