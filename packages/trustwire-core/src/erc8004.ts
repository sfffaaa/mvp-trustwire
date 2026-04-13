import { init } from "@trustchain/sdk";
import { InvalidAgentError } from "./gate";

type Sidecar = Awaited<ReturnType<typeof init>>;

// Extend the SDK type to accommodate optional fields used in ERC-8004 summary
interface TrustScoreData {
  trust_score?: number | null;
  interaction_count?: number;
  last_updated?: string;
}

export interface ERC8004Summary {
  agentId: string;
  score: number | null;
  interactionCount: number;
  lastUpdated: string; // ISO 8601
}

export async function exportToERC8004(
  sidecar: Sidecar,
  agentPubkey: string
): Promise<ERC8004Summary> {
  if (!agentPubkey) throw new InvalidAgentError();

  let result: TrustScoreData;
  try {
    result = (await sidecar.trustScore(agentPubkey)) as unknown as TrustScoreData;
  } catch {
    return { agentId: agentPubkey, score: null, interactionCount: 0, lastUpdated: new Date().toISOString() };
  }

  const score: number | null = result.trust_score ?? null;
  const interactionCount: number = result.interaction_count ?? 0;
  const lastUpdated: string =
    result.last_updated
      ? new Date(result.last_updated).toISOString()
      : new Date().toISOString();

  return { agentId: agentPubkey, score, interactionCount, lastUpdated };
}
