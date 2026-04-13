import { exportToERC8004 } from "../erc8004";

jest.mock("@trustchain/sdk", () => ({
  init: jest.fn(),
}));

import { init } from "@trustchain/sdk";

function makeMockSidecar(trustScore: number | null, interactionCount: number) {
  return {
    trustScore: jest.fn().mockResolvedValue({
      trust_score: trustScore,
      interaction_count: interactionCount,
      last_updated: "2026-04-13T10:00:00.000Z",
    }),
    propose: jest.fn(),
    stop: jest.fn(),
  } as unknown as Awaited<ReturnType<typeof init>>;
}

describe("exportToERC8004", () => {
  it("returns correct summary for agent with history", async () => {
    const sidecar = makeMockSidecar(0.75, 12);
    const result = await exportToERC8004(sidecar, "agent-pubkey-abc");

    expect(result.agentId).toBe("agent-pubkey-abc");
    expect(result.score).toBe(0.75);
    expect(result.interactionCount).toBe(12);
    expect(result.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null score for agent with no history", async () => {
    const sidecar = makeMockSidecar(null, 0);
    const result = await exportToERC8004(sidecar, "agent-pubkey-new");

    expect(result.score).toBeNull();
    expect(result.interactionCount).toBe(0);
  });

  it("returns ISO 8601 lastUpdated string", async () => {
    const sidecar = makeMockSidecar(0.5, 3);
    const result = await exportToERC8004(sidecar, "agent-pubkey-abc");

    expect(() => new Date(result.lastUpdated)).not.toThrow();
    expect(new Date(result.lastUpdated).toISOString()).toBe(result.lastUpdated);
  });

  it("throws InvalidAgentError for empty agentPubkey", async () => {
    const sidecar = makeMockSidecar(0.5, 1);
    await expect(exportToERC8004(sidecar, "")).rejects.toThrow("InvalidAgentError");
  });
});
