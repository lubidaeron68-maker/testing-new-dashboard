import type {
  CollectionRecord,
  DashboardData,
  KPIData,
  AgentPerformance,
  CompanyBreakdown,
  ClientPTPStat,
  ContactTypeStat,
  DepartmentStat,
  PTPStatusStat,
  CallDurationBucket,
} from '../types';

function normalizeContactType(type: string): string {
  const t = type.toLowerCase().trim();
  if (t.includes('right part') || t.includes('rpc') || t.includes('right party')) return 'Right Party Contact';
  if (t.includes('partial')) return 'Partial Contact';
  if (t.includes('no ans') || t.includes('noans')) return 'No Answer';
  if (t.includes('no contact') || t.includes('no conta') || t.includes('nocontact')) return 'No Contact';
  if (t.includes('left mess') || t.includes('voicemail') || t.includes('vm') || t.includes('voice mail')) return 'Left Message';
  if (t.includes('drop') || t.includes('dropped')) return 'Call Drop';
  if (t.includes('callback') || t.includes('call back')) return 'Callback';
  if (t.includes('refuse')) return 'Refuse to Pay';
  if (t.includes('wrong')) return 'Wrong Number';
  if (t.includes('busy')) return 'Busy';
  if (t.includes('disconnect')) return 'Disconnected';
  return type || 'Unknown';
}

function isContact(contactType: string): boolean {
  const t = contactType.toLowerCase();
  return t.includes('right part') || t.includes('partial') || t.includes('callback');
}

// Right Party Contact (RPC) only - the base for RPC -> PTP conversion
function isRightPartyContact(contactType: string): boolean {
  const t = contactType.toLowerCase();
  return t.includes('right part') || t.includes('rpc') || t.includes('right party');
}

// Count action outcomes separately from the payment-status breakdown.
function isPTPActionResult(actionResult: string): boolean {
  if (!actionResult) return false;
  const result = actionResult.trim().toLowerCase().replace(/\s+/g, ' ');
  if (result === 'promise to pay' || result === 'promise to pay (lump sum)') return true;
  // Robust matching: handles minor variations such as "promise to pay(lump sum)", "ptp (lump sum)", "ptp"
  if (result.includes('promise to pay') && (result.includes('lump sum') || result === 'promise to pay')) return true;
  return false;
}

function hasPromisedPTPStatus(status: string, requested: string): boolean {
  const s = (status + ' ' + requested).toLowerCase();
  return s.includes('yes') || s.includes('promised') || s.includes('confirmed') || s.includes('agreed');
}

function isPTPPaid(record: CollectionRecord): boolean {
  return (record.ptpPaid !== null && record.ptpPaid > 0) ||
    (record.paymentPlanPaidAmount !== null && record.paymentPlanPaidAmount > 0) ||
    [record.payment1, record.payment2, record.payment3, record.payment4].some(p => p !== null && p > 0);
}

function getRecordPayments(record: CollectionRecord): number {
  return (record.ptpPaid || 0) +
    (record.paymentPlanPaidAmount || 0) +
    (record.payment1 || 0) +
    (record.payment2 || 0) +
    (record.payment3 || 0) +
    (record.payment4 || 0);
}

// Compute KPIs for any subset of records (used for Department-filtered KPI cards)
export function computeKPIs(records: CollectionRecord[]): KPIData {
  const totalAccounts = records.length;
  let totalOverdue = 0;
  let totalCalls = 0;
  let durationSum = 0;
  let durationCount = 0;
  let totalPTP = 0;
  let ptpPaidAmount = 0;
  let contactCount = 0;
  let rpcCount = 0;
  const uniqueAgreements = new Set<string>();

  for (let i = 0; i < totalAccounts; i++) {
    const r = records[i];
    totalOverdue += r.overdueAmount || 0;
    ptpPaidAmount += getRecordPayments(r);

    if (r.agreementNumber && r.agreementNumber.trim()) {
      uniqueAgreements.add(r.agreementNumber.trim());
    }

    const hasCall = r.callDuration !== null || Boolean(r.dialedPhone);
    if (hasCall) totalCalls++;

    const dur = r.callDuration;
    if (dur !== null && dur !== undefined) {
      durationSum += dur;
      durationCount++;
    }

    if (isContact(r.contactType)) contactCount++;
    if (isRightPartyContact(r.contactType)) rpcCount++;
    if (isPTPActionResult(r.actionResult)) totalPTP++;
  }

  const avgCallDuration = durationCount > 0 ? durationSum / durationCount : 0;
  const contactRate = totalAccounts > 0 ? (contactCount / totalAccounts) * 100 : 0;
  const noContactRate = 100 - contactRate;
  const uniqueAccounts = uniqueAgreements.size > 0 ? uniqueAgreements.size : totalAccounts;

  return {
    totalAccounts,
    uniqueAccounts,
    rpcCount,
    totalOverdue,
    totalCalls,
    avgCallDuration,
    totalPTP,
    ptpPaidAmount,
    contactRate,
    noContactRate,
  };
}

interface AgentAccumulator {
  name: string;
  calls: number;
  contacts: number;
  rpc: number;
  ptp: number;
  ptpAmount: number;
  durationSum: number;
  durationCount: number;
  totalOverdue: number;
}

interface CompanyAccumulator {
  company: string;
  count: number;
  overdue: number;
  calls: number;
  ptpCount: number;
  ptpAmount: number;
  ptpPaid: number;
  rpc: number;
}

interface DeptAccumulator {
  department: string;
  count: number;
  overdue: number;
}

interface PTPAccumulator {
  status: string;
  count: number;
  amount: number;
}

// Ultra-fast single-pass data processor for 50k-100k+ records
export function processData(records: CollectionRecord[]): DashboardData {
  const totalAccounts = records.length;
  let totalOverdue = 0;
  let totalCalls = 0;
  let durationSum = 0;
  let durationCount = 0;
  let totalPTP = 0;
  let ptpPaidAmount = 0;
  let contactCount = 0;
  let rpcCount = 0;
  const uniqueAgreements = new Set<string>();

  const agentMap = new Map<string, AgentAccumulator>();
  const companyMap = new Map<string, CompanyAccumulator>();
  const contactMap = new Map<string, number>();
  const deptMap = new Map<string, DeptAccumulator>();
  const ptpMap = new Map<string, PTPAccumulator>();

  const durationBuckets: Record<string, number> = {
    '0-1 min': 0,
    '1-3 min': 0,
    '3-5 min': 0,
    '5-10 min': 0,
    '10+ min': 0,
  };

  const companiesSet = new Set<string>();
  const departmentsSet = new Set<string>();
  const agentsSet = new Set<string>();

  // Single-pass O(N) loop
  for (let i = 0; i < totalAccounts; i++) {
    const r = records[i];

    // Unique account tracking by Agreement id
    if (r.agreementNumber && r.agreementNumber.trim()) {
      uniqueAgreements.add(r.agreementNumber.trim());
    }

    // 1. Overdue & payments
    const overdue = r.overdueAmount || 0;
    totalOverdue += overdue;
    const payments = getRecordPayments(r);
    ptpPaidAmount += payments;

    // 2. Call & duration
    const hasCall = r.callDuration !== null || Boolean(r.dialedPhone);
    if (hasCall) totalCalls++;

    const dur = r.callDuration;
    if (dur !== null && dur !== undefined) {
      durationSum += dur;
      durationCount++;
      if (dur <= 1) durationBuckets['0-1 min']++;
      else if (dur <= 3) durationBuckets['1-3 min']++;
      else if (dur <= 5) durationBuckets['3-5 min']++;
      else if (dur <= 10) durationBuckets['5-10 min']++;
      else durationBuckets['10+ min']++;
    }

    // 3. Contact & PTP
    const hasContact = isContact(r.contactType);
    if (hasContact) contactCount++;

    if (isRightPartyContact(r.contactType)) {
      rpcCount++;
    }

    const hasPTP = isPTPActionResult(r.actionResult);
    if (hasPTP) totalPTP++;

    // 4. Unique sets
    if (r.company) companiesSet.add(r.company);
    if (r.department) departmentsSet.add(r.department);
    if (r.agentName) agentsSet.add(r.agentName);

    // 5. Agent Accumulator
    const agentName = r.agentName || 'Unknown';
    let agentAcc = agentMap.get(agentName);
    if (!agentAcc) {
      agentAcc = {
        name: agentName,
        calls: 0,
        contacts: 0,
        rpc: 0,
        ptp: 0,
        ptpAmount: 0,
        durationSum: 0,
        durationCount: 0,
        totalOverdue: 0,
      };
      agentMap.set(agentName, agentAcc);
    }
    if (hasCall) agentAcc.calls++;
    if (hasContact) agentAcc.contacts++;
    if (isRightPartyContact(r.contactType)) agentAcc.rpc++;
    if (hasPTP) agentAcc.ptp++;
    agentAcc.ptpAmount += r.ptpAmount || 0;
    if (dur !== null && dur !== undefined) {
      agentAcc.durationSum += dur;
      agentAcc.durationCount++;
    }
    agentAcc.totalOverdue += overdue;

    // 6. Company Accumulator (Client name from the "Company name" column)
    const company = r.company || 'Unknown';
    let compAcc = companyMap.get(company);
    if (!compAcc) {
      const fresh: CompanyAccumulator = {
        company,
        count: 0,
        overdue: 0,
        calls: 0,
        ptpCount: 0,
        ptpAmount: 0,
        ptpPaid: 0,
        rpc: 0,
      };
      companyMap.set(company, fresh);
      compAcc = fresh;
    }
    compAcc.count++;
    compAcc.overdue += overdue;
    if (hasCall) compAcc.calls++;
    if (hasPTP) {
      compAcc.ptpCount++;
      compAcc.ptpAmount += r.ptpAmount || 0;
    }
    compAcc.ptpPaid += r.ptpPaid || 0;
    if (isRightPartyContact(r.contactType)) compAcc.rpc++;

    // 7. Department Accumulator
    const dept = r.department || 'Unknown';
    let deptAcc = deptMap.get(dept);
    if (!deptAcc) {
      deptAcc = { department: dept, count: 0, overdue: 0 };
      deptMap.set(dept, deptAcc);
    }
    deptAcc.count++;
    deptAcc.overdue += overdue;

    // 8. Contact Type Counter
    const normContact = normalizeContactType(r.contactType);
    contactMap.set(normContact, (contactMap.get(normContact) || 0) + 1);

    // 9. PTP Status Counter
    let ptpStatusCategory = 'No PTP';
    if (isPTPPaid(r)) {
      ptpStatusCategory = 'Paid';
    } else if (hasPromisedPTPStatus(r.ptpStatus, r.requestedPTP)) {
      ptpStatusCategory = 'Promised';
    } else if ((r.ptpStatus + ' ' + r.requestedPTP).toLowerCase().includes('refuse')) {
      ptpStatusCategory = 'Refused';
    } else if (r.ptpAmount && r.ptpAmount > 0) {
      ptpStatusCategory = 'Pending';
    }

    let ptpAcc = ptpMap.get(ptpStatusCategory);
    if (!ptpAcc) {
      ptpAcc = { status: ptpStatusCategory, count: 0, amount: 0 };
      ptpMap.set(ptpStatusCategory, ptpAcc);
    }
    ptpAcc.count++;
    ptpAcc.amount += (r.ptpAmount || 0) + payments;
  }

  // Final KPIs
  const avgCallDuration = durationCount > 0 ? durationSum / durationCount : 0;
  const contactRate = totalAccounts > 0 ? (contactCount / totalAccounts) * 100 : 0;
  const noContactRate = 100 - contactRate;
  const uniqueAccounts = uniqueAgreements.size > 0 ? uniqueAgreements.size : totalAccounts;

  const kpi: KPIData = {
    totalAccounts,
    uniqueAccounts,
    rpcCount,
    totalOverdue,
    totalCalls,
    avgCallDuration,
    totalPTP,
    ptpPaidAmount,
    contactRate,
    noContactRate,
  };

  // Convert accumulators to sorted result arrays
  const agentPerformance: AgentPerformance[] = Array.from(agentMap.values())
    .map((a) => ({
      name: a.name,
      calls: a.calls,
      contacts: a.contacts,
      rpc: a.rpc,
      ptp: a.ptp,
      ptpAmount: a.ptpAmount,
      ptpConversion: a.rpc > 0 ? (a.ptp / a.rpc) * 100 : 0,
      avgDuration: a.durationCount > 0 ? a.durationSum / a.durationCount : 0,
      totalOverdue: a.totalOverdue,
    }))
    .sort((a, b) => b.ptpAmount - a.ptpAmount || b.rpc - a.rpc);

  const companyBreakdown: CompanyBreakdown[] = Array.from(companyMap.values())
    .sort((a, b) => b.count - a.count);

  const departmentStats: DepartmentStat[] = Array.from(deptMap.values())
    .sort((a, b) => b.count - a.count);

  const contactTypeStats: ContactTypeStat[] = Array.from(contactMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: totalAccounts > 0 ? (count / totalAccounts) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const ptpStatusStats: PTPStatusStat[] = Array.from(ptpMap.values())
    .sort((a, b) => b.count - a.count);

  const callDurationBuckets: CallDurationBucket[] = Object.entries(durationBuckets).map(
    ([range, count]) => ({ range, count })
  );

  // PTP acquired per Client (grouped from the "Company name" column)
  const clientPtpStats: ClientPTPStat[] = companyBreakdown
    .map((c) => ({
      client: c.company,
      ptpCount: c.ptpCount,
      ptpAmount: c.ptpAmount,
      ptpPaid: c.ptpPaid,
      rpc: c.rpc,
      accounts: c.count,
    }))
    .sort((a, b) => b.ptpAmount - a.ptpAmount || b.ptpCount - a.ptpCount);

  return {
    records,
    kpi,
    agentPerformance,
    companyBreakdown,
    contactTypeStats,
    departmentStats,
    ptpStatusStats,
    clientPtpStats,
    callDurationBuckets,
    companies: Array.from(companiesSet).sort(),
    departments: Array.from(departmentsSet).sort(),
    agents: Array.from(agentsSet).sort(),
  };
}
