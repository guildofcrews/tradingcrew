"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireApprovedUser } from "@/lib/auth-utils";
import { revalidateCollections } from "@/lib/revalidate-gallery";
import {
  acceptTradeForUser,
  cancelAcceptedTradeForUser,
  confirmTradeForUser,
  counterTradeForUser,
  isTradeError,
  proposeTradeForUser,
  rejectTradeForUser,
  withdrawTradeForUser,
  type TradeRef,
} from "@/lib/trade-commands";

async function approvedId(): Promise<{ id: string } | { error: string }> {
  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return { error: "Your account isn't approved yet" };
  return { id: user.id };
}

function finish(ref: TradeRef, extra?: { tradeId?: string }): ActionResult {
  revalidateCollections([ref.proposerId, ref.recipientId], ref.tradeId);
  return { success: true, tradeId: extra?.tradeId ?? ref.tradeId };
}

function fail(error: unknown, fallback: string): ActionResult {
  if (isTradeError(error)) return { success: false, error: error.message };
  console.error(fallback, error);
  return { success: false, error: fallback };
}

export async function proposeTrade(input: {
  recipientId: string;
  wantCardIds: string[];
  giveCardIds: string[];
  message?: string;
}): Promise<ActionResult> {
  const actor = await approvedId();
  if ("error" in actor) return { success: false, error: actor.error };
  try {
    const ref = await proposeTradeForUser(actor.id, input);
    return finish(ref);
  } catch (error) {
    return fail(error, "Couldn't send that trade. Please try again.");
  }
}

export async function withdrawTrade(tradeId: string): Promise<ActionResult> {
  const actor = await approvedId();
  if ("error" in actor) return { success: false, error: actor.error };
  try {
    return finish(await withdrawTradeForUser(actor.id, tradeId));
  } catch (error) {
    return fail(error, "Couldn't close that trade. Please try again.");
  }
}

export async function rejectTrade(tradeId: string): Promise<ActionResult> {
  const actor = await approvedId();
  if ("error" in actor) return { success: false, error: actor.error };
  try {
    return finish(await rejectTradeForUser(actor.id, tradeId));
  } catch (error) {
    return fail(error, "Couldn't decline that trade. Please try again.");
  }
}

export async function counterTrade(input: {
  tradeId: string;
  wantCardIds: string[];
  giveCardIds: string[];
  message?: string;
}): Promise<ActionResult> {
  const actor = await approvedId();
  if ("error" in actor) return { success: false, error: actor.error };
  try {
    return finish(await counterTradeForUser(actor.id, input));
  } catch (error) {
    return fail(error, "Couldn't send that counter-offer. Please try again.");
  }
}

export async function acceptTrade(tradeId: string): Promise<ActionResult> {
  const actor = await approvedId();
  if ("error" in actor) return { success: false, error: actor.error };
  try {
    return finish(await acceptTradeForUser(actor.id, tradeId));
  } catch (error) {
    return fail(error, "Couldn't accept that trade. Please try again.");
  }
}

export async function cancelAcceptedTrade(tradeId: string): Promise<ActionResult> {
  const actor = await approvedId();
  if ("error" in actor) return { success: false, error: actor.error };
  try {
    return finish(await cancelAcceptedTradeForUser(actor.id, tradeId));
  } catch (error) {
    return fail(error, "Couldn't cancel that swap. Please try again.");
  }
}

export async function confirmTrade(tradeId: string): Promise<ActionResult> {
  const actor = await approvedId();
  if ("error" in actor) return { success: false, error: actor.error };
  try {
    return finish(await confirmTradeForUser(actor.id, tradeId));
  } catch (error) {
    return fail(error, "Couldn't confirm that swap. Please try again.");
  }
}
