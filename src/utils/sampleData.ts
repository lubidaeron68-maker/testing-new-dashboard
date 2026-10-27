import type { CollectionRecord } from '../types';

// Sample data generator matching the exact Excel structure from user's spec
const companies = ['Shaw', 'Maya', 'CashExpr', 'OnlineLo', 'OLP_D_SI', 'Union_Di', 'BigLoans'];
const departments = ['BLOB A', 'BLOB B', 'Dig 1', 'Dig 2'];
const agents = [
  { log: 'JJRabino', name: 'John Jenb' },
  { log: 'JPVega', name: 'Jashtine P' },
  { log: 'JMMariar', name: 'John Mari' },
  { log: 'GMapaye', name: 'Grace Ma' },
  { log: 'RAgoncil', name: 'Ronaly A' },
  { log: 'HCacher', name: 'Hanz Cac' },
  { log: 'LSobaran', name: 'Lovely So' },
  { log: 'MVray', name: 'Melba Vir' },
  { log: 'MBusbus', name: 'Mark Bus' },
  { log: 'MEYcong', name: 'Maria Eli' },
  { log: 'JDelapen', name: 'Jerome D' },
  { log: 'ADelosa', name: 'Abigel De' },
  { log: 'JPandino', name: 'Jastine P' },
  { log: 'NADimarc', name: 'Nicole An' },
  { log: 'JEAguinal', name: 'Jamaika E' },
  { log: 'LSalaman', name: 'Lalaine S' },
  { log: 'RJBalandi', name: 'Rinz Josh' },
];

const contactTypes = [
  { type: 'Right Party Contact', result: 'Call Drop', notes: 'call drop', weight: 15 },
  { type: 'Right Party Contact', result: 'Callback', notes: 'callback', weight: 10 },
  { type: 'Right Party Contact', result: 'Refuse to Pay', notes: 'Refuse to pay', weight: 8 },
  { type: 'Partial Contact', result: 'Silence', notes: 'no response', weight: 12 },
  { type: 'Partial Contact', result: 'Call Drop', notes: 'call drop', weight: 10 },
  { type: 'Partial Contact', result: 'I forgot to call', notes: 'follow up', weight: 8 },
  { type: 'No Answer', result: 'Unsuccessful', notes: 'No Answer', weight: 15 },
  { type: 'No Contact', result: 'Unsuccessful', notes: 'No contact', weight: 10 },
  { type: 'Left Message', result: 'Message', notes: 'left message', weight: 8 },
  { type: 'No Answer', result: 'Voicemail', notes: 'voicemail', weight: 5 },
  { type: 'Partial Contact', result: 'Will Inform', notes: 'will inform', weight: 5 },
  { type: 'Right Party Contact', result: 'Promise to pay', notes: 'PTP', weight: 4 },
  { type: 'Right Party Contact', result: 'Promise to pay (lump sum)', notes: 'Lump sum PTP', weight: 3 },
];

const ptpStatuses = ['Promised', 'Paid', 'Refused', 'Pending', 'No PTP'];
const ptpWeights = [25, 15, 20, 20, 20];

const paymentChannels = ['GCash', 'Bank Transfer', 'Over the Counter', 'Online Banking', 'Remittance Center', 'None'];
const overdueReasons = ['Financial Hardship', 'Dispute', 'Unemployment', 'Medical Emergency', 'Forgot to Pay', 'No Specific Reason', 'Awaiting Salary', 'Business Loss'];
const paymentPlanStatuses = ['Active', 'Completed', 'Defaulted', 'Pending', 'Cancelled', 'N/A'];
const paymentPlanSummaries = ['5K monthly for 6 months', '10K bi-weekly for 3 months', 'Full payment', '3K weekly for 4 weeks', 'N/A', '15K one-time'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomWeighted<T>(items: { item: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i.item;
  }
  return items[0].item;
}

function randomPhone(): string {
  return '639' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

function randomAgreement(company: string): string {
  if (company === 'Maya') return 'M61' + Math.floor(100000 + Math.random() * 900000).toString();
  if (company === 'CashExpr') return 'QN' + Math.floor(100000 + Math.random() * 900000).toString();
  if (company === 'OLP_D_SI') return 'SN' + Math.floor(100000 + Math.random() * 900000).toString();
  if (company === 'Union_Di') return 'W26' + Math.floor(100000 + Math.random() * 900000).toString();
  return Math.floor(20000000 + Math.random() * 10000000).toString();
}

function randomDate(): string {
  const start = new Date(2025, 0, 1);
  const end = new Date(2025, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomTime(): string {
  // Call center operational hours spanning from 8 AM to 10 PM (22:00)
  // With some evening calls around 8 PM - 10 PM (including 22:01:10)
  const isEvening = Math.random() < 0.2;
  let h: number;
  if (isEvening) {
    // 19 to 22 (7 PM to 10 PM)
    h = Math.floor(19 + Math.random() * 4);
  } else {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    h = Math.round(13 + z * 3);
    h = Math.max(8, Math.min(18, h));
  }
  const m = Math.floor(Math.random() * 60);
  const s = Math.floor(Math.random() * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function randomExecutionTime(): string {
  // Generates in user's requested format "21-10-2026 22:01:10" and converts to 12-Hour format
  const day = Math.floor(1 + Math.random() * 28).toString().padStart(2, '0');
  const month = Math.floor(1 + Math.random() * 12).toString().padStart(2, '0');
  const year = '2026';
  const time = randomTime();
  const format24 = `${day}-${month}-${year} ${time}`;
  
  // Convert 24-hour format (e.g. 21-10-2026 22:01:10) to 12-hour format
  const match = time.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const rawH = parseInt(match[1], 10);
    const ampm = rawH >= 12 ? 'PM' : 'AM';
    let h12 = rawH % 12;
    if (h12 === 0) h12 = 12;
    const h12Str = h12 < 10 ? `0${h12}` : String(h12);
    return `${day}-${month}-${year} ${h12Str}:${match[2]}:${match[3]} ${ampm}`;
  }
  return format24;
}

/**
 * Hourly snapshot variant: same columns, but every Date is pinned to today and
 * the Execution dtime is clustered inside a single hour window so hourly charts
 * clearly show one bucket. Used by the Admin-only hourly dump.
 */
export function generateHourlySampleData(hour: number = 10, count: number = 150): CollectionRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  const records = generateSampleData(count).map((record, index) => {
    const minute = String(index % 60).padStart(2, '0');
    const second = String((index * 7) % 60).padStart(2, '0');
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    const meridiem = hour >= 12 ? 'PM' : 'AM';
    return {
      ...record,
      date: today,
      executionTime: `${today} ${String(hour12).padStart(2, '0')}:${minute}:${second} ${meridiem}`,
      additionalAction: record.additionalAction || 'Hourly snapshot',
      additionalInfo: record.additionalInfo || 'Hourly snapshot',
    };
  });
  return records;
}

export function generateSampleData(count: number = 150): CollectionRecord[] {
  const records: CollectionRecord[] = [];

  for (let i = 0; i < count; i++) {
    const company = randomItem(companies);
    const agent = randomItem(agents);
    const dept = randomItem(departments);
    const contact = randomWeighted(
      contactTypes.map(c => ({ item: c, weight: c.weight }))
    );
    const initialDP = Math.floor(1 + Math.random() * 365);
    const actualDF = initialDP + Math.floor(-10 + Math.random() * 20);
    const overdue = Math.round((500 + Math.random() * 50000) * 100) / 100;
    const callDuration = Math.round((Math.random() * 8) * 10) / 10;
    const ptpStatus = randomWeighted(
      ptpStatuses.map((s, idx) => ({ item: s, weight: ptpWeights[idx] }))
    );
    const ptpAmount = ptpStatus === 'No PTP' ? null : Math.round((100 + Math.random() * 5000) * 100) / 100;
    const ptpPaid = ptpStatus === 'Paid' ? ptpAmount : ptpStatus === 'Promised' ? Math.round(Math.random() * (ptpAmount || 0) * 100) / 100 : null;
    const payment = ptpStatus === 'Paid' ? ptpAmount : null;

    // Payment plan data
    const hasPlan = Math.random() > 0.4;
    const planTarget = hasPlan ? Math.round((1000 + Math.random() * 20000) * 100) / 100 : null;
    const planPaid = hasPlan && planTarget ? Math.round(Math.random() * planTarget * 100) / 100 : null;
    const planNotPaid = hasPlan && planTarget && planPaid !== null ? Math.round((planTarget - planPaid) * 100) / 100 : null;

    records.push({
      id: `REC-${i + 1}`,
      company,
      agreementNumber: randomAgreement(company),
      creditAssignmentDate: randomDate(),
      creditAssigned: '****' + Math.floor(1000 + Math.random() * 9000),
      department: dept,
      initialDP,
      actualDF: Math.max(1, actualDF),
      agentLog: agent.log,
      agentName: agent.name,
      actionType: 'Outbound',
      contactType: contact.type,
      actionResult: contact.result,
      overdueReason: randomItem(overdueReasons),
      overdueAmount: overdue,
      date: randomDate(),
      executionTime: randomExecutionTime(),
      dialedPhone: randomPhone(),
      requestedPaymentChannel: ptpStatus !== 'No PTP' ? randomItem(paymentChannels) : '',
      requestedPTP: ptpStatus === 'No PTP' ? 'Refuse to pay' : 'PTP Requested',
      ptpStatus,
      ptpDueDate: ptpStatus !== 'No PTP' ? randomDate() : '',
      ptpAmount,
      ptpPaid,
      paymentPlanSummary: hasPlan ? randomItem(paymentPlanSummaries) : 'N/A',
      paymentPlanStatus: hasPlan ? randomItem(paymentPlanStatuses.filter(s => s !== 'N/A')) : 'N/A',
      paymentPlanTargetAmount: planTarget,
      paymentPlanPaidAmount: planPaid,
      paymentPlanNotPaidAmount: planNotPaid,
      payment1: payment,
      payment2: null,
      payment3: null,
      payment4: null,
      agentNotes: contact.notes,
      callDuration,
      additionalAction: Math.random() > 0.7 ? 'Priority Account' : '',
      additionalInfo: Math.random() > 0.7 ? 'Priority Account' : '',
      raw: {},
    });
  }

  return records;
}
