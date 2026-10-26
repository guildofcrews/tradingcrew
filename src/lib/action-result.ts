export type ActionResult =
  | { success: true; tradeId?: string; name?: string }
  | { success: false; error: string };
