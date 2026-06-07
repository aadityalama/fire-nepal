import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminMemberDetailClient } from "@/components/admin/AdminMemberDetailClient";
import { fetchAdminMemberDetail } from "@/lib/admin/fetch-admin-member-detail";
import { requireAdminUserId } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ renew?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: `Member ${userId.slice(0, 8)}… | Admin`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminMemberDetailPage({ params, searchParams }: PageProps) {
  await requireAdminUserId();
  const { userId } = await params;
  const { renew } = await searchParams;
  const detail = await fetchAdminMemberDetail(userId);
  if (!detail) notFound();
  return <AdminMemberDetailClient detail={detail} initialRenewOpen={renew === "1"} />;
}
