export type GatewaySpend = {
  costUsd: string | null;
  generationId: string | null;
};

/** Pull the cost AI Gateway attaches to providerMetadata.gateway. */
export function readGatewaySpend(metadata: unknown): GatewaySpend {
  if (!metadata || typeof metadata !== "object") {
    return { costUsd: null, generationId: null };
  }
  const gateway = (metadata as { gateway?: unknown }).gateway;
  if (!gateway || typeof gateway !== "object") {
    return { costUsd: null, generationId: null };
  }
  const record = gateway as Record<string, unknown>;
  const raw = record.cost ?? record.marketCost ?? record.totalCost;
  return {
    costUsd: asMoney(raw),
    generationId: typeof record.generationId === "string" ? record.generationId : null,
  };
}

function asMoney(raw: unknown): string | null {
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value < 0) return null;
  return value.toFixed(8);
}

export function tokenCount(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}
