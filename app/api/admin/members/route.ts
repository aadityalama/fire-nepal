import { NextResponse } from "next/server";
import { fetchAdminMembers } from "@/lib/admin/fetch-admin-members";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { members, error } = await fetchAdminMembers();
  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }
  return NextResponse.json({ members });
}
