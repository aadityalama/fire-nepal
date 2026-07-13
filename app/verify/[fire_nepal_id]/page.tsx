import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MemberVerificationClient } from "@/components/membership/MemberVerificationClient";
import { fetchPublicMemberVerification } from "@/lib/member-card-verification";

type PageProps = {
  params: Promise<{ fire_nepal_id: string }>;
};

export const metadata: Metadata = {
  title: "Verify FIRE Nepal Membership",
  robots: { index: false, follow: false },
};

export default async function VerifyMemberPage({ params }: PageProps) {
  const { fire_nepal_id } = await params;
  const id = decodeURIComponent(fire_nepal_id).trim();
  if (!id || !/^FN-[0-9]{4}-[0-9]{6}$/.test(id)) {
    notFound();
  }

  const verification = await fetchPublicMemberVerification(id);

  return <MemberVerificationClient fireNepalId={id} verification={verification} />;
}
