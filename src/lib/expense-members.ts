import type { Expense, RoommateProfile } from "@/lib/expense-utils";

export function generateMemberId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function memberDisplayName(
  memberId: string,
  profiles: Record<string, RoommateProfile>,
): string {
  return profiles[memberId]?.name?.trim() || "Unknown member";
}

export function memberNameMap(
  memberIds: string[],
  profiles: Record<string, RoommateProfile>,
): Record<string, string> {
  return Object.fromEntries(memberIds.map((id) => [id, memberDisplayName(id, profiles)]));
}

export function resolveExpensePayerName(
  expense: Expense,
  profiles: Record<string, RoommateProfile>,
): string {
  return memberDisplayName(expense.payerId, profiles);
}

type LegacyExpenseRow = Expense & { payer?: string };

export function migrateExpenseToMemberIds(
  expense: LegacyExpenseRow,
  nameToId: Map<string, string>,
  memberIds: string[],
): Expense {
  const payerId =
    expense.payerId ??
    (expense.payer ? nameToId.get(expense.payer) : undefined) ??
    memberIds[0] ??
    generateMemberId();

  const splitAmong = expense.splitAmong
    ?.map((key) => nameToId.get(key) ?? key)
    .filter((id) => memberIds.includes(id));

  const splitPercentages = expense.splitPercentages
    ? Object.fromEntries(
        Object.entries(expense.splitPercentages).map(([key, value]) => [
          nameToId.get(key) ?? key,
          value,
        ]),
      )
    : undefined;

  const { payer: _payer, ...rest } = expense;
  return {
    ...rest,
    payerId,
    splitAmong: splitAmong && splitAmong.length > 0 ? splitAmong : undefined,
    splitPercentages,
  };
}

export function migrateLegacyMembersToIds(
  legacyMembers: string[],
  legacyProfiles: Record<string, RoommateProfile>,
): { memberIds: string[]; profiles: Record<string, RoommateProfile>; nameToId: Map<string, string> } {
  const memberIds: string[] = [];
  const profiles: Record<string, RoommateProfile> = {};
  const nameToId = new Map<string, string>();

  for (const name of legacyMembers) {
    let id = nameToId.get(name);
    if (!id) {
      id = generateMemberId();
      nameToId.set(name, id);
      const legacyProfile = legacyProfiles[name];
      profiles[id] = legacyProfile
        ? { ...legacyProfile, name: legacyProfile.name?.trim() || name }
        : {
            name,
            phone: "+82 10-0000-0000",
            kakaoId: `${name.toLowerCase().replace(/\s+/g, ".")}.kr`,
            bankName: "Korean Bank",
            accountNumber: "000-000-000000",
            emergencyContact: "+977 98X-XXX-XXXX",
            notes: "New roommate profile. Add bank and contact details for faster settlement.",
          };
    }
    if (!memberIds.includes(id)) memberIds.push(id);
  }

  for (const [key, profile] of Object.entries(legacyProfiles)) {
    if (nameToId.has(key)) continue;
    const id = generateMemberId();
    nameToId.set(key, id);
    nameToId.set(profile.name, id);
    profiles[id] = { ...profile, name: profile.name?.trim() || key };
    if (!memberIds.includes(id)) memberIds.push(id);
  }

  return { memberIds, profiles, nameToId };
}
