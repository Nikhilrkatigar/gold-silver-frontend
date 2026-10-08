// Run: node src/utils/receipt.check.mjs — receipts for real Kunal Durgesh entries.
import assert from 'node:assert/strict';
import { receiptFromVoucher, receiptFromSettlement, receiptHTML, receiptText, receiptTitle, receiptFileName, inr } from './receipt.js';

const ctx = { shop: { name: 'Manoj Jewellery' }, customer: { name: 'Kunal <Durgesh>' }, labourChargeType: 'per-gram' };

// #173: 15 g silver received, balance 38.58 g → 23.58 g
const r173 = receiptFromVoucher({
  voucherNumber: '173', date: '2026-10-08', paymentType: 'add_silver', total: 15, cashReceived: 15, items: [],
  balanceSnapshot: { oldBalance: { totalAmount: 1150, silverFineWeight: 38.58 }, currentBalance: { amount: 1150, silverFineWeight: 23.58 } }
}, ctx);
assert.equal(receiptTitle(r173), 'Silver Received');
const html = receiptHTML(r173);
assert.match(html, /Fine silver received/);
assert.match(html, /38\.580 g/);
assert.match(html, /23\.580 g/);
assert.match(html, /−15\.000 g/);                       // "This entry" row
assert.match(html, /Kunal &lt;Durgesh&gt;/);            // user text is escaped
assert.doesNotMatch(html, /Kunal <Durgesh>/);

// #164: credit bill, per-gram labour = rate × gross
const r164 = receiptFromVoucher({
  voucherNumber: '164', date: '2026-10-08', paymentType: 'credit', total: 700,
  items: [{ itemName: 'Topis', metalType: 'silver', pieces: 1, grossWeight: 3.08, netWeight: 3.08, fineWeight: 3.08, labourRate: 10, amount: 700 }]
}, ctx);
assert.equal(receiptTitle(r164), 'Credit Bill');
assert.equal(r164.items[0].labour, 30.8);
assert.match(receiptHTML(r164), /Grand total<\/span><span>₹700\.00/);
assert.match(receiptText(r164), /Credit Bill #164/);

assert.equal(receiptTitle({ paymentType: 'add_cash', cashReceived: -2000 }), 'Cash Adjustment');
assert.equal(receiptTitle({ paymentType: 'credit', voucherType: 'purchase' }), 'Purchase Bill');
assert.equal(inr(167830), '₹1,67,830.00');
assert.equal(receiptFileName(r173), 'Silver-Received_173_Kunal-Durgesh.pdf');
assert.match(receiptHTML(receiptFromSettlement({ _id: 'abcdef123', metalType: 'gold', metalRate: 6000, fineGiven: 1, amount: 6000, direction: 'payment' }, ctx)), /SET-ABCDEF/);
console.log('receipt ok');
