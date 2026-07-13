import type Database from "better-sqlite3";

export interface AuditActor {
  id: number;
  name: string;
}

// Records a manager-visible audit trail entry. `details` is stored as JSON so
// call sites can log arbitrary structured context (old/new values, reason,
// etc.) without further schema changes.
export function logAudit(
  db: Database.Database,
  actor: AuditActor,
  action: string,
  entityType: string,
  entityId: number | null,
  details?: Record<string, unknown>
): void {
  db.prepare(
    "INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(actor.id, actor.name, action, entityType, entityId, details ? JSON.stringify(details) : null);
}
