const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  }).outputText,
  filename,
);

const { computeAgentPtpOutstanding } = require('../src/utils/agentPtpOutstanding.ts');

function collectionRecord(agentName, agreementNumber, actionResult, ptpAmount) {
  return { agentName, agreementNumber, actionResult, ptpAmount };
}

function callistRecord(agreement_rk, os_current) {
  return { agreement_rk, os_current };
}

const result = computeAgentPtpOutstanding(
  [
    collectionRecord('Agent A', '0001', 'Promise to pay', 1000),
    collectionRecord('Agent A', '1', 'Promise to pay (lump sum)', 2000),
    collectionRecord('Agent B', '1', 'Promise to pay', 500),
    collectionRecord('Agent A', '2', 'Promise to pay follow-up', 300),
  ],
  [
    callistRecord('0001', 2500),
    callistRecord('1', 3000),
    callistRecord('2', 1000),
  ],
);

assert.deepEqual(result, [
  { agent: 'Agent A', ptpAmount: 3000, outstanding: 3000, ptpCount: 2, matchedCount: 1 },
  { agent: 'Agent B', ptpAmount: 500, outstanding: 3000, ptpCount: 1, matchedCount: 1 },
]);

console.log('Agent PTP vs outstanding aggregation passed.');
