// Run: node src/utils/billingUtils.check.mjs — real cases from Manoj Jewellery / Kunal Durgesh.
import assert from 'node:assert/strict';
import { buildBalanceSnapshot } from './billingUtils.js';

const bal = { cashBalance: 1150, creditBalance: 0, goldFineWeight: 0, silverFineWeight: 38.58 };
const s = buildBalanceSnapshot('add_silver', bal, [{ metalType: 'silver', fineWeight: 15 }], {});
assert.deepEqual([s.oldBalance.silverFineWeight, +s.currentBalance.silverFineWeight.toFixed(3), s.currentBalance.amount], [38.58, 23.58, 1150]);

const c = buildBalanceSnapshot('credit', { cashBalance: 8450, silverFineWeight: 35.5 }, [{ metalType: 'silver', fineWeight: 3.08, amount: 700 }], {});
assert.deepEqual([c.currentBalance.amount, +c.currentBalance.silverFineWeight.toFixed(2)], [9150, 38.58]);

const a = buildBalanceSnapshot('add_cash', { cashBalance: 3100 }, [], { cashReceived: 3000 });
assert.equal(a.currentBalance.amount, 100);

// money_to_gold: ₹6000 at ₹6000/g clears 1 g gold, cash balance unchanged (matches backend applyVoucherToBalances)
const m = buildBalanceSnapshot('money_to_gold', { cashBalance: 500, goldFineWeight: 2 }, [], { cashReceived: 6000, goldRate: 6000 });
assert.deepEqual([m.currentBalance.amount, m.currentBalance.goldFineWeight], [500, 1]);
console.log('ok');

import { getEntryWarnings } from './billingUtils.js';
const kunal = { cashBalance: 1150, creditBalance: 0, silverFineWeight: 38.58 };
const today = new Date(2026, 9, 8);
assert.equal(getEntryWarnings('add_cash', kunal, [], { cashReceived: 1000, date: '2026-10-08' }, today).length, 0);
assert.match(getEntryWarnings('add_cash', kunal, [], { cashReceived: 5000 }, today)[0], /extra ₹3850\.00 will be kept as the customer's advance/);
assert.match(getEntryWarnings('add_cash', kunal, [], { cashReceived: -2000 }, today)[0], /adds ₹2000\.00 to what the customer owes/);
assert.match(getEntryWarnings('add_silver', kunal, [{ fineWeight: 40 }], {}, today)[0], /shop will then owe the customer 1\.420 g silver/);
assert.match(getEntryWarnings('credit', null, [{ itemName: 'Nk', grossWeight: 10, fineWeight: 12, amount: 100 }], {}, today)[0], /more fine weight/);
assert.match(getEntryWarnings('cash', null, [{ itemName: 'Nk', grossWeight: 10, fineWeight: 9, amount: 100 }], { date: '2026-10-09' }, today)[0], /in the future/);
assert.equal(getEntryWarnings('add_cash', null, [], { cashReceived: -2000 }, today).length, 0); // editing: balance checks skipped
console.log('warnings ok');
