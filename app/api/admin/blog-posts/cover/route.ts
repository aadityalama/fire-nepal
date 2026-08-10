import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/config";
import { BLOG_COVER_BUCKET, blogCoverPath } from "@/services/blog-posts-supabase";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const postId = String(form.get("postId") ?? "").trim();

  if (!(file instanceof File) || !postId) {
    return NextResponse.json({ error: "file and postId are required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 3MB" }, { status: 400 });
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const path = blogCoverPath(postId, ext);
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage.from(BLOG_COVER_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const publicUrl = `${getSupabaseUrl()}/storage/v1/object/public/${BLOG_COVER_BUCKET}/${path}`;

  const { data, error } = await admin
    .from("blog_posts")
    .update({ cover_image_url: publicUrl, updated_by: gate.userId })
    .eq("id", postId)
    .select("id, cover_image_url")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ cover_image_url: data.cover_image_url });
}
