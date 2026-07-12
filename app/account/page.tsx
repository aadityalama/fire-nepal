"use client";

import { BadgeCheck, Bell, Lock, Settings, UserRound } from "lucide-react";
import { EcosystemWorkspacePanel, type EcosystemWorkspaceItem } from "@/components/product/hub/EcosystemWorkspacePanel";

const ACCOUNT_ITEMS: EcosystemWorkspaceItem[] = [
  { href: "/dashboard/profile", label: "My Profile", description: "Personal account information and profile details.", icon: UserRound },
  { href: "/dashboard/membership", label: "Membership", description: "Plans, billing, and membership status.", icon: BadgeCheck },
  { href: "/dashboard/security", label: "Security", description: "Security controls and session protection.", icon: Lock },
  { href: "/smart-reminders", label: "Reminders", description: "Scheduled reminders and financial nudges.", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", description: "Workspace preferences and app settings.", icon: Settings },
];

export default function AccountPage() {
  return (
    <EcosystemWorkspacePanel
      title="Account"
      eyebrow="Account workspace"
      description="Profile, membership, security, reminders, and settings in one focused workspace."
      items={ACCOUNT_ITEMS}
    />
  );
}
