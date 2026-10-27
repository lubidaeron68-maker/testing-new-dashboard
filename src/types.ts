export interface CollectionRecord {
  id: string;
  company: string;
  agreementNumber: string;
  creditAssignmentDate: string;
  creditAssigned: string;
  department: string;
  initialDP: number | null;
  actualDF: number | null;
  agentLog: string;
  agentName: string;
  actionType: string;
  contactType: string;
  actionResult: string;
  overdueReason: string;
  overdueAmount: number | null;
  date: string;
  executionTime: string;
  dialedPhone: string;
  requestedPaymentChannel: string;
  requestedPTP: string;
  ptpStatus: string;
  ptpDueDate: string;
  ptpAmount: number | null;
  ptpPaid: number | null;
  paymentPlanSummary: string;
  paymentPlanStatus: string;
  paymentPlanTargetAmount: number | null;
  paymentPlanPaidAmount: number | null;
  paymentPlanNotPaidAmount: number | null;
  payment1: number | null;
  payment2: number | null;
  payment3: number | null;
  payment4: number | null;
  agentNotes: string;
  callDuration: number | null;
  additionalAction: string;
  additionalInfo: string;
  raw?: Record<string, unknown>;
}

export interface ParseProgress {
  stage: 'reading' | 'parsing' | 'mapping' | 'done';
  percent: number;
  message: string;
  rowCount?: number;
}

export interface DailyCallRecord {
  id: string;
  portfolio_date: string;
  customer_rk: string;
  agreement_rk: string;
  agreement_id: string;
  agency_name: string;
  debtor_name: string;
  partner_name: string;
  company_name: string;
  product: string;
  date_of_assignment: string;
  date_of_abortion: string;
  os_current: number | null;
  dpd_current: number | null;
  targeted_amount_current: number | null;
  initial_dpd_bucket: string;
  initial_dpd: number | null;
  mobile_phone_number: string;
}

export interface DailyCallListFile {
  id: string;
  fileName: string;
  sourceBytes: number;
  uploadedLabel: string;
  records: DailyCallRecord[];
  sheetName: string;
  companies: string[];
  agencies: string[];
  partners: string[];
  products: string[];
  portfolioDates: string[];
  dpdBuckets: string[];
  portfolioSummary: DailyPortfolioSummaryRow[];
  heapBytes: number;
}

export interface DailyPortfolioSummaryRow {
  date: string;
  rows: number;
  outstanding: number | null;
  target: number | null;
  averageDpd: number | null;
}

export interface KPIData {
  /** Total FIS Taggings (with redial included) */
  totalAccounts: number;
  /** Total unique accounts tagged based on unique Agreement ID */
  uniqueAccounts: number;
  /** Total Right Party Contact (RPC) count */
  rpcCount: number;
  totalOverdue: number;
  totalCalls: number;
  avgCallDuration: number;
  totalPTP: number;
  ptpPaidAmount: number;
  contactRate: number;
  noContactRate: number;
}

export interface AgentPerformance {
  name: string;
  calls: number;
  contacts: number;
  rpc: number;
  ptp: number;
  /** Total PTP amount promised by agent */
  ptpAmount: number;
  /** PTP conversion rate: ptp / rpc * 100 */
  ptpConversion: number;
  avgDuration: number;
  totalOverdue: number;
}

export interface CompanyBreakdown {
  company: string;
  count: number;
  overdue: number;
  calls: number;
  /** Number of PTP records acquired for this client */
  ptpCount: number;
  /** Total PTP amount promised for this client */
  ptpAmount: number;
  /** Total PTP amount actually paid for this client */
  ptpPaid: number;
  /** RPC count for this client */
  rpc: number;
}

/** PTP acquired per client (Company name) — for the client PTP chart */
export interface ClientPTPStat {
  client: string;
  ptpCount: number;
  ptpAmount: number;
  ptpPaid: number;
  rpc: number;
  accounts: number;
}

export interface ContactTypeStat {
  type: string;
  count: number;
  percentage: number;
}

export interface DepartmentStat {
  department: string;
  count: number;
  overdue: number;
}

export interface PTPStatusStat {
  status: string;
  count: number;
  amount: number;
}

export interface CallDurationBucket {
  range: string;
  count: number;
}

export interface DashboardData {
  records: CollectionRecord[];
  kpi: KPIData;
  agentPerformance: AgentPerformance[];
  companyBreakdown: CompanyBreakdown[];
  contactTypeStats: ContactTypeStat[];
  departmentStats: DepartmentStat[];
  ptpStatusStats: PTPStatusStat[];
  /** PTP data grouped by Company name (client) */
  clientPtpStats: ClientPTPStat[];
  callDurationBuckets: CallDurationBucket[];
  companies: string[];
  departments: string[];
  agents: string[];
}

/** When the report was dumped: at end of day, or hourly during the day. */
export type ReportPeriod = 'eod' | 'hourly';

export interface Dataset {
  id: string;
  fileName: string;
  /** Cadence this file was uploaded on */
  period: ReportPeriod;
  uploadedAt: string;
  uploadedLabel: string;
  data: DashboardData;
  rowCount: number;
  durationMs: number;
  color: string;
  dateRangeLabel: string;
  /** Estimated heap footprint in bytes after string interning */
  heapBytes: number;
  /** Original source file size in bytes */
  sourceBytes: number;
  /** Rows retained for the interactive Records table (may be < rowCount) */
  tableRowCount: number;
  /** Rows dropped from the table only — aggregates still cover them */
  truncatedRows: number;
}
