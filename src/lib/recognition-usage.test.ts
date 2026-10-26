import assert from "node:assert/strict";
import { test } from "node:test";
import { readGatewaySpend, tokenCount } from "./recognition-usage";

test("reads the gateway cost string", () => {
  const spend = readGatewaySpend({
    gateway: { cost: "0.00012340", generationId: "gen_123", marketCost: "0.00012340" },
  });
  assert.equal(spend.costUsd, "0.00012340");
  assert.equal(spend.generationId, "gen_123");
});

test("ignores a missing gateway payload", () => {
  assert.deepEqual(readGatewaySpend(undefined), { costUsd: null, generationId: null });
  assert.equal(tokenCount(undefined), null);
  assert.equal(tokenCount(12.2), 12);
});
