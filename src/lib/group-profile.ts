export type GroupProfile = {
  companyName: string;
  roomNumber: string;
  companyType: string;
  description: string;
  logoUrl: string;
};

export function emptyGroupProfile(): GroupProfile {
  return {
    companyName: "",
    roomNumber: "",
    companyType: "",
    description: "",
    logoUrl: "",
  };
}

export function normalizeGroupProfileField(value?: string | null): string {
  return value?.trim() ?? "";
}

export function hasGroupProfile(profile: GroupProfile): boolean {
  return Boolean(
    normalizeGroupProfileField(profile.companyName) ||
      normalizeGroupProfileField(profile.roomNumber) ||
      normalizeGroupProfileField(profile.logoUrl),
  );
}

export function groupProfileRoomLabel(roomNumber: string): string | null {
  const room = normalizeGroupProfileField(roomNumber);
  if (!room) return null;
  return `Room ${room}`;
}

export function groupProfileMemberCountLabel(count: number): string {
  return `${count} Member${count === 1 ? "" : "s"}`;
}
