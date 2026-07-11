/**
 * FIRE Nepal permanent data policy.
 *
 * User-entered records are durable by default. App releases, migrations,
 * schema-cache failures, cloud outages, refreshes, and logouts must not erase
 * local or cloud records. Destructive behavior must be explicit and auditable.
 */

export const PERMANENT_DATA_POLICY_VERSION = 1;

export type DurableRecord = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  deleted_at?: string | null;
};

export type PermanentDataAuditAction = "created" | "updated" | "restored" | "soft_deleted" | "migration_merged";

export type PermanentDataAuditEntry = {
  id: string;
  recordId: string;
  module: string;
  action: PermanentDataAuditAction;
  timestamp: string;
  actorId?: string | null;
};

function recordTimestamp(record: DurableRecord): string {
  return record.updatedAt ?? record.createdAt ?? "";
}

function isSoftDeleted(record: DurableRecord): boolean {
  return Boolean(record.deletedAt ?? record.deleted_at);
}

export function mergeDurableRecords<T extends DurableRecord>(localRecords: T[], remoteRecords: T[]): T[] {
  const byId = new Map<string, T>();

  for (const record of [...remoteRecords, ...localRecords]) {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, record);
      continue;
    }

    const existingDeleted = isSoftDeleted(existing);
    const incomingDeleted = isSoftDeleted(record);
    if (incomingDeleted && !existingDeleted) {
      byId.set(record.id, { ...existing, ...record });
      continue;
    }
    if (existingDeleted && !incomingDeleted) continue;

    byId.set(record.id, recordTimestamp(record) >= recordTimestamp(existing) ? record : existing);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const order = recordTimestamp(b).localeCompare(recordTimestamp(a));
    return order !== 0 ? order : a.id.localeCompare(b.id);
  });
}

export function markRecordSoftDeleted<T extends DurableRecord>(record: T, timestamp = new Date().toISOString()): T {
  return {
    ...record,
    deletedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createPersistenceAuditEntry(params: {
  module: string;
  recordId: string;
  action: PermanentDataAuditAction;
  actorId?: string | null;
  timestamp?: string;
}): PermanentDataAuditEntry {
  const timestamp = params.timestamp ?? new Date().toISOString();
  return {
    id: `${params.module}:${params.recordId}:${params.action}:${timestamp}`,
    module: params.module,
    recordId: params.recordId,
    action: params.action,
    actorId: params.actorId ?? null,
    timestamp,
  };
}

export function preserveExistingState<T>(current: T, replacement: T | null | undefined): T {
  return replacement ?? current;
}
