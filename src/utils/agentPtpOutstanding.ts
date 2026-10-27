import type { CollectionRecord, DailyCallRecord } from '../types';

export interface AgentPtpOutstanding {
  agent: string;
  /** Total PTP amount promised by this agent (from the collections report). */
  ptpAmount: number;
  /** Total outstanding balance of the accounts they PTP'd (from the daily call list). */
  outstanding: number;
  /** How many PTP rows this agent has in the report. */
  ptpCount: number;
  /** How many of those PTP'd accounts were found in the callist via agreement_rk. */
  matchedCount: number;
}

/** Same PTP rule the PTP'S KPI card uses. */
function isPTPActionResult(actionResult: string): boolean {
  const v = (actionResult || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (v === 'promise to pay' || v === 'promise to pay (lump sum)') return true;
  return v.includes('promise to pay') && (v.includes('lump sum') || v === 'promise to pay');
}

/** Strip formatting noise so "000123" and "123" match across the two files. */
function normalizeKey(value: string): string {
  return (value || '').trim().replace(/[\s.-]/g, '').replace(/^0+(?=\d)/, '');
}

/**
 * Joins the collections report to the daily call list:
 * report["Agreement id"]  ->  callist["agreement_rk"]
 *
 * The agent's PTP amount is summed for every PTP row; outstanding is counted
 * once per agreement and agent. The callist is pre-indexed for a single-pass join.
 */
export function computeAgentPtpOutstanding(
  records: CollectionRecord[],
  callist: DailyCallRecord[]
): AgentPtpOutstanding[] {
  // Index the callist once: agreement_rk -> outstanding balance.
  // A balance is a point-in-time value, so duplicates take the highest amount
  // rather than summing (which would double-count the same account).
  const outstandingByAgreement = new Map<string, number>();
  for (let i = 0; i < callist.length; i++) {
    const record = callist[i];
    const key = normalizeKey(record.agreement_rk);
    if (!key) continue;
    if (record.os_current === null || record.os_current === undefined) continue;
    const existing = outstandingByAgreement.get(key);
    if (existing === undefined || record.os_current > existing) {
      outstandingByAgreement.set(key, record.os_current);
    }
  }

  const agentMap = new Map<string, AgentPtpOutstanding>();
  const matchedAgreementsByAgent = new Map<string, Set<string>>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!isPTPActionResult(record.actionResult)) continue;

    const agent = record.agentName || 'Unknown';
    let entry = agentMap.get(agent);
    if (!entry) {
      entry = { agent, ptpAmount: 0, outstanding: 0, ptpCount: 0, matchedCount: 0 };
      agentMap.set(agent, entry);
      matchedAgreementsByAgent.set(agent, new Set());
    }

    entry.ptpCount++;
    entry.ptpAmount += record.ptpAmount || 0;

    const key = normalizeKey(record.agreementNumber);
    const outstanding = key ? outstandingByAgreement.get(key) : undefined;
    const matchedAgreements = matchedAgreementsByAgent.get(agent);
    if (key && outstanding !== undefined && matchedAgreements && !matchedAgreements.has(key)) {
      matchedAgreements.add(key);
      entry.outstanding += outstanding;
      entry.matchedCount++;
    }
  }

  // Biggest PTP amount first, then by outstanding balance as a tie-breaker.
  return Array.from(agentMap.values()).sort(
    (a, b) => b.ptpAmount - a.ptpAmount || b.outstanding - a.outstanding || a.agent.localeCompare(b.agent)
  );
}
