import "server-only";
import { revalidatePath } from "next/cache";
import { ALL_WINGS } from "@/lib/cards";

export function revalidateCollections(ownerIds: string[] = [], tradeId?: string) {
  revalidatePath("/my-cards");
  revalidatePath("/my-cards/review");
  revalidatePath("/my-cards/capture");
  revalidatePath("/trades");
  revalidatePath("/sharing");
  revalidatePath("/admin");
  if (tradeId) revalidatePath(`/trades/${tradeId}`);
  for (const wing of ALL_WINGS) {
    revalidatePath(`/my-cards/${wing.slug}`);
  }
  for (const ownerId of ownerIds) {
    revalidatePath(`/shared/${ownerId}`);
    revalidatePath(`/shared/${ownerId}/propose`);
    for (const wing of ALL_WINGS) {
      revalidatePath(`/shared/${ownerId}/${wing.slug}`);
    }
  }
}
