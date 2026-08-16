import "server-only";

import {
  loadFireLendingStoreForUser,
  saveFireLendingStoreForUser,
} from "@/lib/fire-lending/fire-lending-snapshot-server";
import { deliverLoanRequestToRecipientStore } from "@/lib/fire-lending/loan-request-delivery";
import type { FireLendingRequest, FireLendingStore } from "@/lib/fire-lending/types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const LOG_PREFIX = "[FIRE Nepal loan-request-delivery]";

/** Resolve auth user id from a FIRE Nepal member id (user_profiles.fire_nepal_id). */
export async function resolveAuthUserIdByFireNepalId(
  fireNepalId: string,
): Promise<string | null> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return null;

  const fireId = fireNepalId.trim().toUpperCase();
  if (!fireId) return null;

  const { data, error } = await admin
    .from("user_profiles")
    .select("id")
    .eq("fire_nepal_id", fireId)
    .maybeSingle();

  if (error || !data?.id) {
    if (error) console.info(LOG_PREFIX, "profile lookup failed", error.message);
    return null;
  }
  return data.id;
}

export type DeliverLoanRequestToRecipientAccountResult =
  | { ok: true; delivered: true; recipientUserId: string; alreadyPresent: boolean }
  | { ok: true; delivered: false; skipped: string }
  | { ok: false; error: string };

/**
 * Load the recipient's fire_lending snapshot, mirror the request with remapped
 * party ids (toPartyId === recipient.currentUserId), and persist.
 */
export async function deliverLoanRequestToRecipientAccount(input: {
  senderStore: FireLendingStore;
  request: FireLendingRequest;
  /** Auth user id of the sender — never deliver into the sender's own row. */
  senderUserId: string;
}): Promise<DeliverLoanRequestToRecipientAccountResult> {
  const recipientParty = input.senderStore.parties.find((p) => p.id === input.request.toPartyId);
  const fireId = recipientParty?.fireNepalId?.trim() ?? "";
  if (!fireId) {
    return { ok: true, delivered: false, skipped: "recipient_fire_id_missing" };
  }

  const recipientUserId = await resolveAuthUserIdByFireNepalId(fireId);
  if (!recipientUserId) {
    return { ok: true, delivered: false, skipped: "recipient_profile_not_found" };
  }
  if (recipientUserId === input.senderUserId) {
    return { ok: true, delivered: false, skipped: "recipient_is_sender" };
  }

  const loaded = await loadFireLendingStoreForUser(recipientUserId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error };
  }

  const delivered = deliverLoanRequestToRecipientStore({
    senderStore: input.senderStore,
    recipientStore: loaded.store,
    request: input.request,
  });

  if (!delivered.ok) {
    return { ok: false, error: delivered.error };
  }

  const saved = await saveFireLendingStoreForUser(recipientUserId, delivered.store);
  if (!saved.ok) {
    return { ok: false, error: saved.error };
  }

  console.info(LOG_PREFIX, "delivered", {
    requestId: input.request.id,
    recipientUserId,
    alreadyPresent: delivered.alreadyPresent,
  });

  return {
    ok: true,
    delivered: true,
    recipientUserId,
    alreadyPresent: delivered.alreadyPresent,
  };
}
