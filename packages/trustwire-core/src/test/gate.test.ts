import { checkTrust, recordInteraction } from "../gate";

// Mock @trustchain/sdk
jest.mock("@trustchain/sdk", () => ({
  init: jest.fn(),
}));

import { init } from "@trustchain/sdk";
const mockInit = init as jest.MockedFunction<typeof init>;

function makeMockSidecar(trustScore: number | null) {
  return {
    trustScore: jest.fn().mockResolvedValue({ trust_score: trustScore }),
    propose: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  } as unknown as Awaited<ReturnType<typeof init>>;
}

describe("checkTrust", () => {
  it("returns PASS when score >= threshold", async () => {
    const sidecar = makeMockSidecar(0.8);
    const result = await checkTrust(sidecar, "agent-pubkey-abc", { threshold: 0.6, unknownPolicy: "PASS" });
    expect(result.decision).toBe("PASS");
    expect(result.score).toBe(0.8);
    expect(result.agentId).toBe("agent-pubkey-abc");
  });

  it("returns DENY when score < threshold", async () => {
    const sidecar = makeMockSidecar(0.3);
    const result = await checkTrust(sidecar, "agent-pubkey-abc", { threshold: 0.6, unknownPolicy: "PASS" });
    expect(result.decision).toBe("DENY");
    expect(result.score).toBe(0.3);
  });

  it("returns UNKNOWN when trust_score is null and applies unknownPolicy PASS", async () => {
    const sidecar = makeMockSidecar(null);
    const result = await checkTrust(sidecar, "agent-pubkey-abc", { threshold: 0.6, unknownPolicy: "PASS" });
    expect(result.decision).toBe("PASS");
    expect(result.score).toBeNull();
  });

  it("returns UNKNOWN when trust_score is null and applies unknownPolicy DENY", async () => {
    const sidecar = makeMockSidecar(null);
    const result = await checkTrust(sidecar, "agent-pubkey-abc", { threshold: 0.6, unknownPolicy: "DENY" });
    expect(result.decision).toBe("DENY");
    expect(result.score).toBeNull();
  });

  it("uses default config (threshold 0.6, unknownPolicy PASS) when config omitted", async () => {
    const sidecar = makeMockSidecar(null);
    const result = await checkTrust(sidecar, "agent-pubkey-abc");
    expect(result.decision).toBe("PASS");
  });

  it("throws InvalidAgentError for empty agentPubkey", async () => {
    const sidecar = makeMockSidecar(0.8);
    await expect(checkTrust(sidecar, "")).rejects.toThrow("InvalidAgentError");
  });

  it("returns UNKNOWN when trustScore() times out", async () => {
    const sidecar = {
      trustScore: jest.fn().mockRejectedValue(new Error("timeout")),
      propose: jest.fn(),
      stop: jest.fn(),
    } as unknown as Awaited<ReturnType<typeof init>>;
    const result = await checkTrust(sidecar, "agent-pubkey-abc", { threshold: 0.6, unknownPolicy: "PASS" });
    expect(result.decision).toBe("PASS");
    expect(result.score).toBeNull();
  });
});

describe("recordInteraction", () => {
  it("calls sidecar.propose with correct outcome", async () => {
    const sidecar = makeMockSidecar(0.8);
    await recordInteraction(sidecar, "agent-pubkey-abc", "success");
    expect(sidecar.propose).toHaveBeenCalledWith("agent-pubkey-abc", {
      type: "task",
      outcome: "success",
    });
  });

  it("calls sidecar.propose for failure outcome", async () => {
    const sidecar = makeMockSidecar(0.3);
    await recordInteraction(sidecar, "agent-pubkey-abc", "failure");
    expect(sidecar.propose).toHaveBeenCalledWith("agent-pubkey-abc", {
      type: "task",
      outcome: "failure",
    });
  });

  it("throws InvalidOutcomeError for invalid outcome", async () => {
    const sidecar = makeMockSidecar(0.8);
    await expect(
      recordInteraction(sidecar, "agent-pubkey-abc", "invalid" as never)
    ).rejects.toThrow("InvalidOutcomeError");
  });
});
