import { checkTrust, recordInteraction } from "trustwire-core";
import { AGENT_ALPHA_ID, runTask as runAlpha } from "./agent-alpha.js";
import { AGENT_BETA_ID, runTask as runBeta } from "./agent-beta.js";

/** In-memory sidecar that mimics the @trustchain/sdk sidecar interface */
class InMemorySidecar {
  private data = new Map<string, { successes: number; total: number }>();

  async trustScore(agentPubkey: string): Promise<{ trust_score: number | null }> {
    const rec = this.data.get(agentPubkey);
    if (!rec || rec.total === 0) return { trust_score: null };
    return { trust_score: rec.successes / rec.total };
  }

  async propose(agentPubkey: string, event: { type: string; outcome: string }): Promise<void> {
    if (!this.data.has(agentPubkey)) this.data.set(agentPubkey, { successes: 0, total: 0 });
    const rec = this.data.get(agentPubkey)!;
    rec.total++;
    if (event.outcome === "success") rec.successes++;
  }

  async interactionCount(agentPubkey: string): Promise<number> {
    return this.data.get(agentPubkey)?.total ?? 0;
  }

  stop(): void {}
}

const THRESHOLD = 0.6;
const args = process.argv.slice(2);
const roundsArg = args.find((a) => a.startsWith("--rounds="));
const ROUNDS = roundsArg ? parseInt(roundsArg.split("=")[1]) : 10;
const REPORT_ONLY = args.includes("--report");

async function main() {
  const sidecar = new InMemorySidecar();
  console.log("Trustwire Orchestrator started\n");

  if (REPORT_ONLY) {
    await printReport(sidecar);
    sidecar.stop();
    return;
  }

  const agents = [
    { id: AGENT_ALPHA_ID, run: runAlpha },
    { id: AGENT_BETA_ID, run: runBeta },
  ];

  for (let i = 1; i <= ROUNDS; i++) {
    const taskId = `task-${String(i).padStart(3, "0")}`;
    const candidate = agents[(i - 1) % agents.length];

    const gate = await checkTrust(sidecar, candidate.id, {
      threshold: THRESHOLD,
      unknownPolicy: "PASS",
    });

    const scoreStr = gate.score !== null ? `score: ${gate.score.toFixed(2)}` : "no history";

    if (gate.decision === "DENY") {
      const fallback = agents.find((a) => a.id !== candidate.id)!;
      console.log(
        `[Round ${String(i).padStart(2, "0")}] ${taskId} → ${candidate.id.slice(0, 11)}  DENY    (${scoreStr})  → fallback: ${fallback.id.slice(0, 11)}`
      );
      const result = await fallback.run(taskId);
      await recordInteraction(sidecar, fallback.id, result.outcome);
      console.log(`           ${result.outcome === "success" ? "✓" : "✗"} ${result.outcome}`);
    } else {
      const gateLabel = gate.score === null ? "UNKNOWN" : "PASS   ";
      const result = await candidate.run(taskId);
      await recordInteraction(sidecar, candidate.id, result.outcome);
      console.log(
        `[Round ${String(i).padStart(2, "0")}] ${taskId} → ${candidate.id.slice(0, 11)}  ${gateLabel} (${scoreStr})  → ${result.outcome === "success" ? "✓" : "✗"} ${result.outcome}`
      );
    }
  }

  console.log();
  await printReport(sidecar);
  sidecar.stop();
}

async function printReport(sidecar: InMemorySidecar) {
  console.log("Trust Report:");
  for (const id of [AGENT_ALPHA_ID, AGENT_BETA_ID]) {
    const gate = await checkTrust(sidecar, id, { threshold: THRESHOLD, unknownPolicy: "PASS" });
    const scoreStr = gate.score !== null ? gate.score.toFixed(2) : "n/a";
    console.log(`  ${id.slice(0, 11)}  score: ${scoreStr}  → ${gate.decision}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
