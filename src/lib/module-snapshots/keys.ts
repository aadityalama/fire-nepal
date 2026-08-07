/** Canonical module keys for public.user_module_snapshots. */
export const MODULE_SNAPSHOT_KEYS = [
  "return_to_nepal",
  "smart_loan",
  "fire_lending",
  "ssf_pension",
  "pension_slips",
  "nepal_col",
  "payslip_history",
  "family_hub",
  "financial_intel_rollups",
] as const;

export type ModuleSnapshotKey = (typeof MODULE_SNAPSHOT_KEYS)[number];

export function isModuleSnapshotKey(value: string): value is ModuleSnapshotKey {
  return (MODULE_SNAPSHOT_KEYS as readonly string[]).includes(value);
}
