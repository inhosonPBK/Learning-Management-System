import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuditEntity = 'report' | 'profile' | 'enrollment' | 'program' | 'material' | 'team' | 'auth'

/** Fire-and-forget audit record written from server actions (never throws). */
export async function logAudit(
  actorId: string | null,
  action: string,
  entityType: AuditEntity,
  entityId: string | null,
  detail?: Record<string, unknown>,
) {
  try {
    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      detail: detail ?? null,
    })
  } catch (err) {
    console.error('[audit] failed', action, err)
  }
}
