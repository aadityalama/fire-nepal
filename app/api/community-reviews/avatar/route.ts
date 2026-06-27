import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseUrl } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  COMMUNITY_REVIEW_AVATAR_BUCKET,
  communityReviewAvatarPath,
} from "@/services/community-reviews-supabase";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const reviewId = String(form.get("reviewId") ?? "").trim();

  if (!(file instanceof File) || !reviewId) {
    return NextResponse.json({ error: "file and reviewId are required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
  }

  const { data: owned, error: ownErr } = await supabase
    .from("community_reviews")
    .select("id")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (ownErr) {
    return NextResponse.json({ error: ownErr.message }, { status: 500 });
  }
  if (!owned) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const path = communityReviewAvatarPath(reviewId, ext);
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage.from(COMMUNITY_REVIEW_AVATAR_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const publicUrl = `${getSupabaseUrl()}/storage/v1/object/public/${COMMUNITY_REVIEW_AVATAR_BUCKET}/${path}`;

  const { data, error } = await admin
    .from("community_reviews")
    .update({ avatar_url: publicUrl, updated_by: user.id, status: "pending" })
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .select("id, avatar_url")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: data?.avatar_url ?? publicUrl });
}
