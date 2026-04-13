# trustwire

Runtime trust gating for multi-agent workflows. Wraps [@trustchain/sdk](https://github.com/viftode4/trustchain-js) to give orchestrators a simple pass/deny decision based on agent interaction history.

## How It Works

1. Before routing a task, the orchestrator calls `checkTrust(sidecar, agentId)`
2. Trustwire checks the agent's historical score via `@trustchain/sdk`
3. Score ≥ threshold → **PASS** (route to agent)
4. Score < threshold → **DENY** (route to fallback)
5. No history → **UNKNOWN** (default: PASS — give new agents a chance)
6. After the task completes, call `recordInteraction(sidecar, agentId, outcome)` to update the score

## Packages

| Package | Description |
|---|---|
| `trustwire-core` | Core gate logic + ERC-8004 export hook |
| `trustwire-openclaw` | MCP tool wrappers for OpenClaw integration |

## Install

```bash
npm install trustwire-core @trustchain/sdk
```

## Usage

```typescript
import { init } from "@trustchain/sdk";
import { checkTrust, recordInteraction } from "trustwire-core";

const sidecar = await init({ name: "my-orchestrator" });

// Before routing
const gate = await checkTrust(sidecar, agentPubkey, { threshold: 0.6 });
if (gate.decision === "PASS") {
  const result = await runAgentTask(agentPubkey, task);
  await recordInteraction(sidecar, agentPubkey, result.outcome);
}

sidecar.stop();
```

## MCP Tools (OpenClaw)

```typescript
import { trustwireCheck } from "trustwire-openclaw/check-trust";
import { trustwireRecord } from "trustwire-openclaw/record";

// trustwire_check
const { decision, score } = await trustwireCheck({ agentId, threshold: 0.6 });

// trustwire_record
await trustwireRecord({ agentId, outcome: "success" });
```

## Demo

```bash
npm install
# Cold start — 5 rounds, all UNKNOWN
npx ts-node --project demo/mock-agents/tsconfig.json demo/mock-agents/orchestrator.ts --rounds=5

# Warmup — 20 rounds, trust diverges
npx ts-node --project demo/mock-agents/tsconfig.json demo/mock-agents/orchestrator.ts --rounds=20

# Report only
npx ts-node --project demo/mock-agents/tsconfig.json demo/mock-agents/orchestrator.ts --report
```

## ERC-8004 Export

```typescript
import { exportToERC8004 } from "trustwire-core/erc8004";

const summary = await exportToERC8004(sidecar, agentPubkey);
// { agentId, score, interactionCount, lastUpdated }
// Ready for on-chain submission (not wired — future extension)
```

## Tech Stack

- [`@trustchain/sdk`](https://github.com/viftode4/trustchain-js) — Ed25519 receipts, NetFlow trust scoring
- TypeScript, Node 22+, Jest
