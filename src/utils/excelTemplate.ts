import * as XLSX from 'xlsx';

// Generate a sample Excel template matching the exact column structure from user's spec
export function downloadSampleExcel(): void {
  // Exact column headers as specified by the user
  const headers = [
    'Company name',
    'Agreement id',
    'Credit assignment date',
    'Department',
    'Initial DPD',
    'Actual DPD',
    'Agent login',
    'Agent name',
    'Action type',
    'Contact type',
    'Action result',
    'Overdue reason',
    'Date',
    'Execution dtime',
    'Dialed phone',
    'Requested payment channel',
    'PTP status',
    'PTP due date',
    'PTP amount',
    'PTP paid amount',
    'Payment plan summary',
    'Payment plan status',
    'Payment plan target amount',
    'Payment plan paid amount',
    'Payment plan not paid amount',
    'Agents note',
    'Call duration, minutes',
    'Additional action',
  ];

  const sampleRows = [
    ['Shaw', '21147445', '2024-06-15', 'BLOB B', 189, 189, 'JJRabino', 'John Jenb', 'Outbound', 'Partial Contact', 'Silence', 'Financial Hardship', '2026-10-21', '21-10-2026 22:01:10', '639263562', 'GCash', 'Refused', '', '', '', 'N/A', 'N/A', '', '', '', 'no response', 0.7, ''],
    ['Shaw', '21146779', '2024-06-15', 'BLOB B', 189, 189, 'JPVega', 'Jashtine P', 'Outbound', 'Right Party Contact', 'Call Drop', 'Forgot to Pay', '2026-10-21', '21-10-2026 10:15:00', '639774882', 'Bank Transfer', 'Refused', '', '', '', 'N/A', 'N/A', '', '', '', 'dc', 0.3, ''],
    ['Shaw', '19251586', '2024-07-20', 'BLOB B', 63, 63, 'JPVega', 'Jashtine P', 'Outbound', 'No Answer', 'Unsuccessful', 'No Specific Reason', '2026-10-21', '21-10-2026 11:00:00', '639362785', '', 'Refused', '', '', '', 'N/A', 'N/A', '', '', '', 'No Answer', 0.1, ''],
    ['Maya', 'M61100395', '2024-08-01', 'BLOB A', 61, 71, 'GMapaye', 'Grace Ma', 'Outbound', 'Partial Contact', 'Call Drop', 'Awaiting Salary', '2025-01-15', '2025-01-15 14:30:00', '639811174', 'GCash', 'Promised', '2025-01-20', 5000, '', '5K monthly for 6 months', 'Active', 30000, 5000, 25000, 'No call', 0.0, 'Priority'],
    ['Maya', 'M61904391', '2024-08-01', 'BLOB A', 61, 71, 'RAgoncil', 'Ronaly A', 'Outbound', 'Left Message', 'Message', 'Medical Emergency', '2025-01-15', '2025-01-15 15:45:00', '639979751', '', 'Refused', '', '', '', 'N/A', 'N/A', '', '', '', 'left message', 0.5, ''],
    ['CashExpr', 'QN839354', '2024-05-10', 'BLOB A', 252, 263, 'MBusbus', 'Mark Bus', 'Outbound', 'Right Party Contact', 'Call Drop', 'Business Loss', '2025-01-16', '2025-01-16 09:00:00', '639655521', 'Online Banking', 'Paid', '2025-01-18', 35000, 35000, 'Full payment', 'Completed', 35000, 35000, 0, 'dropped call', 2.0, 'Paid in full'],
    ['OnlineLo', 'OL123456', '2024-09-15', 'BLOB B', 72, 76, 'MVray', 'Melba Vir', 'Outbound', 'Partial Contact', 'Call Drop', 'Unemployment', '2025-01-16', '2025-01-16 10:30:00', '639317442', '', 'Refused', '', '', '', 'N/A', 'N/A', '', '', '', 'keeps on No call', 0.4, ''],
    ['BigLoans', 'BL987654', '2024-10-01', 'Dig 1', 30, 30, 'RJBalandi', 'Rinz Josh', 'Outbound', 'No Contact', 'Unsuccessful', 'Dispute', '2025-01-16', '2025-01-16 13:00:00', '639638025', 'Remittance Center', 'Pending', '2025-01-22', 10000, '', '10K bi-weekly for 3 months', 'Active', 30000, 0, 30000, 'Message left', 0.6, 'Follow up needed'],
    ['Union_Di', 'UN456789', '2024-04-20', 'Dig 1', 120, 120, 'JDelapen', 'Jerome D', 'Outbound', 'Right Party Contact', 'Promise to pay (lump sum)', 'Financial Hardship', '2025-01-17', '2025-01-17 09:45:00', '639154832', 'GCash', 'Promised', '2025-01-25', 15000, '', '15K one-time', 'Pending', 15000, 0, 15000, 'after hours', 0.6, ''],
    ['OLP_D_SI', 'SN345678', '2024-03-10', 'BLOB A', 189, 189, 'HCacher', 'Hanz Cac', 'Outbound', 'Partial Contact', 'Will Inform', 'Forgot to Pay', '2025-01-17', '2025-01-17 11:20:00', '639765221', 'Over the Counter', 'Promised', '2025-01-23', 8000, '', '3K weekly for 4 weeks', 'Active', 12000, 3000, 9000, 'callback', 0.6, ''],
    ['Shaw', '21147450', '2024-06-20', 'BLOB A', 45, 50, 'NADimarc', 'Nicole An', 'Outbound', 'Partial Contact', 'Silence', 'Awaiting Salary', '2025-01-17', '2025-01-17 14:00:00', '639306121', 'GCash', 'Promised', '2025-01-24', 7500, '', '5K monthly for 6 months', 'Active', 30000, 7500, 22500, 'drop call', 0.9, 'High priority'],
    ['Maya', 'M61413560', '2024-11-01', 'BLOB A', 1, 5, 'LSalaman', 'Lalaine S', 'Outbound', 'Partial Contact', 'Call Drop', 'No Specific Reason', '2025-01-17', '2025-01-17 15:30:00', '639184661', '', 'No PTP', '', '', '', 'N/A', 'N/A', '', '', '', 'no response', 1.0, ''],
    ['CashExpr', 'QN839355', '2024-05-15', 'BLOB B', 200, 210, 'JEAguinal', 'Jamaika E', 'Outbound', 'Right Party Contact', 'Promise to pay', 'Business Loss', '2025-01-18', '2025-01-18 10:00:00', '639152051', 'Bank Transfer', 'Promised', '2025-01-25', 12000, '', '10K bi-weekly for 3 months', 'Active', 30000, 0, 30000, 'PTP', 1.2, ''],
    ['BigLoans', 'BL987655', '2024-10-05', 'Dig 2', 90, 95, 'JPandino', 'Jastine P', 'Outbound', 'Partial Contact', 'Call Drop', 'Medical Emergency', '2025-01-18', '2025-01-18 11:45:00', '639994036', 'Online Banking', 'Refused', '', '', '', 'N/A', 'N/A', '', '', '', 'mag session', 0.2, ''],
    ['Shaw', '21083773', '2024-07-01', 'BLOB B', 220, 220, 'HCacher', 'Hanz Cac', 'Outbound', 'Right Party Contact', 'Callback', 'Unemployment', '2025-01-18', '2025-01-18 13:15:00', '639929451', 'GCash', 'Pending', '2025-01-28', 20000, '', 'Full payment', 'Pending', 20000, 0, 20000, 'talk to client', 1.6, 'Callback scheduled'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 2, 15) }));
  ws['!cols'] = colWidths;

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Collections Data');

  XLSX.writeFile(wb, 'collections-template-sample.xlsx');
}
