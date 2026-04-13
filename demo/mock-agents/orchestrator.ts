import { init } from "@trustchain/sdk";
import { checkTrust, recordInteraction } from "trustwire-core";
import { AGENT_ALPHA_ID, runTask as runAlpha } from "./agent-alpha";
import { AGENT_BETA_ID, runTask as runBeta } from "./agent-beta";

const THRESHOLD = 0.6;
const args = process.argv.slice(2);
const roundsArg = args.find((a) => a.startsWith("--rounds="));
const ROUNDS = roundsArg ? parseInt(roundsArg.split("=")[1]) : 10;
const REPORT_ONLY = args.includes("--report");

async function main() {
  const sidecar = await init({ name: "trustwire-orchestrator" });
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

async function printReport(sidecar: Awaited<ReturnType<typeof init>>) {
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
