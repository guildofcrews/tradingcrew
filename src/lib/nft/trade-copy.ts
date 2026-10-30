/** Shown while a trade that includes a digital card is being finished. */
export function digitalTradeNote(): string {
  return "TradingCrew doesn't take payment and doesn't transfer digital cards. You and your friend finish that yourselves. After you both mark the trade complete, the card moves to the other gallery here.";
}

export function acceptedSwapLead(otherName: string, includesDigital: boolean): string {
  if (!includesDigital) {
    return `Swap the real cards with ${otherName}. When you're both done, each of you taps the button. The cards move in the app only after the second tap.`;
  }
  return `Finish this with ${otherName} yourselves. TradingCrew doesn't take payment or transfer a digital card. Swap any real cards in person, and move any digital card on its own site. When you're both done, each of you taps the button. The cards move in the gallery only after the second tap.`;
}

export function acceptedSwapButton(includesDigital: boolean): string {
  return includesDigital ? "We finished the swap" : "We swapped cards in person";
}

export function acceptedStatusLead(includesDigital: boolean): string {
  return includesDigital
    ? "Accepted — waiting for you both to finish the swap."
    : "Accepted — waiting for the real-life swap.";
}
