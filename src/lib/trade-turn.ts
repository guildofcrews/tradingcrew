/** Open negotiation. Accepted is the later "pending delivery" phase, not a turn. */
export function isOpenTrade(status: string): boolean {
  return status === "proposed" || status === "countered";
}

/**
 * Whose answer an open trade is waiting on.
 * Older proposed rows have a null turn and still belong to the recipient.
 */
export function turnUserIdOf(trade: {
  status: string;
  turnUserId: string | null;
  recipientId: string;
}): string | null {
  if (!isOpenTrade(trade.status)) return null;
  if (trade.turnUserId) return trade.turnUserId;
  if (trade.status === "proposed") return trade.recipientId;
  return null;
}

export function isYourTurn(
  trade: { status: string; turnUserId: string | null; recipientId: string },
  userId: string
): boolean {
  return turnUserIdOf(trade) === userId;
}

/**
 * The acting user's "want" cards are the ones they would receive.
 * Stored directions stay in the original proposer's voice: offer = proposer gives.
 */
export function sidesForActor(actorIsProposer: boolean, wantIds: string[], giveIds: string[]) {
  return actorIsProposer
    ? { offerIds: giveIds, requestIds: wantIds }
    : { offerIds: wantIds, requestIds: giveIds };
}
