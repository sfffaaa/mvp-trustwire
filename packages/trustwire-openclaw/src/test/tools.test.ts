import { trustwireCheck } from "../check-trust";
import { trustwireRecord } from "../record";

jest.mock("@trustchain/sdk", () => ({
  init: jest.fn(),
}));

jest.mock("trustwire-core", () => ({
  checkTrust: jest.fn(),
  recordInteraction: jest.fn(),
  InvalidAgentError: class InvalidAgentError extends Error {},
  InvalidOutcomeError: class InvalidOutcomeError extends Error {},
}));

import { init } from "@trustchain/sdk";
import { checkTrust, recordInteraction } from "trustwire-core";

const mockInit = init as jest.MockedFunction<typeof init>;
const mockCheckTrust = checkTrust as jest.MockedFunction<typeof checkTrust>;
const mockRecordInteraction = recordInteraction as jest.MockedFunction<typeof recordInteraction>;

function makeMockSidecar() {
  return {
    trustScore: jest.fn(),
    propose: jest.fn(),
    stop: jest.fn(),
  } as unknown as Awaited<ReturnType<typeof init>>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInit.mockResolvedValue(makeMockSidecar());
});

describe("trustwireCheck", () => {
  it("returns decision and score for known agent", async () => {
    mockCheckTrust.mockResolvedValue({ decision: "PASS", score: 0.82, agentId: "agent-abc" });

    const result = await trustwireCheck({ agentId: "agent-abc" });

    expect(result.decision).toBe("PASS");
    expect(result.score).toBe(0.82);
  });

  it("accepts optional threshold", async () => {
    mockCheckTrust.mockResolvedValue({ decision: "DENY", score: 0.4, agentId: "agent-abc" });

    const result = await trustwireCheck({ agentId: "agent-abc", threshold: 0.7 });

    expect(result.decision).toBe("DENY");
    expect(mockCheckTrust).toHaveBeenCalledWith(
      expect.anything(),
      "agent-abc",
      expect.objectContaining({ threshold: 0.7 })
    );
  });

  it("returns PASS with null score for unknown agent", async () => {
    mockCheckTrust.mockResolvedValue({ decision: "PASS", score: null, agentId: "agent-new" });

    const result = await trustwireCheck({ agentId: "agent-new" });

    expect(result.score).toBeNull();
    expect(result.decision).toBe("PASS");
  });
});

describe("trustwireRecord", () => {
  it("records a success interaction and returns ok", async () => {
    mockRecordInteraction.mockResolvedValue(undefined);

    const result = await trustwireRecord({ agentId: "agent-abc", outcome: "success" });

    expect(result.ok).toBe(true);
    expect(mockRecordInteraction).toHaveBeenCalledWith(
      expect.anything(),
      "agent-abc",
      "success"
    );
  });

  it("records a failure interaction and returns ok", async () => {
    mockRecordInteraction.mockResolvedValue(undefined);

    const result = await trustwireRecord({ agentId: "agent-abc", outcome: "failure" });

    expect(result.ok).toBe(true);
  });

  it("propagates error from recordInteraction", async () => {
    mockRecordInteraction.mockRejectedValue(new Error("InvalidOutcomeError: bad outcome"));

    await expect(
      trustwireRecord({ agentId: "agent-abc", outcome: "invalid" as never })
    ).rejects.toThrow("InvalidOutcomeError");
  });
});
