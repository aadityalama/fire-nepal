import type { Metadata } from "next";
import { AdminMembersClient } from "@/components/admin/AdminMembersClient";
import { fetchAdminMembers } from "@/lib/admin/fetch-admin-members";
import { requireAdminUserId } from "@/lib/admin/require-admin";

export const metadata: Metadata = {
  title: "Members | Admin | FIRE Nepal",
  description: "Manage membership expiry, suspension, and renewals.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdminUserId();
  const sp = await searchParams;
  const { members, error } = await fetchAdminMembers();
  return (
    <AdminMembersClient initialMembers={members} initialError={error} initialFilter={sp.filter} />
  );
}
