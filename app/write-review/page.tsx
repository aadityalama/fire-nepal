"use client";

import { WriteReviewModal } from "@/components/community-reviews/WriteReviewModal";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function WriteReviewPage() {
  const { user, loading } = useProductAuth();
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=%2Fwrite-review");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center px-4 py-16">
        <p className="text-sm font-bold text-emerald-800">Loading…</p>
      </main>
    );
  }

  return (
    <WriteReviewModal
      open={open}
      onClose={() => {
        setOpen(false);
        router.push("/#community");
      }}
    />
  );
}
