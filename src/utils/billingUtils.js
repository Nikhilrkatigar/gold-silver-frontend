/**
 * Billing Calculation Utilities
 * Single source of truth for all item weight and amount calculations.
 * These formulas were previously duplicated 5+ times in Billing.jsx.
 */

/**
 * Calculate net weight from gross and less weights.
 * @param {number} grossWeight
 * @param {number} lessWeight
 * @returns {number}
 */
export const calculateNetWeight = (grossWeight, lessWeight) => {
    return (parseFloat(grossWeight) || 0) - (parseFloat(lessWeight) || 0);
};

/**
 * Calculate fine weight.
 * Formula: (netWeight × meltingPercent / 100) + wastage
 * Wastage is entered in GRAMS (not percentage).
 * @param {number} netWeight
 * @param {number} meltingPercent  e.g. 92 for 22K gold
 * @param {number} wastage         in grams
 * @returns {number}
 */
export const calculateFineWeight = (netWeight, meltingPercent, wastage) => {
    const net = parseFloat(netWeight) || 0;
    const melting = parseFloat(meltingPercent) || 0;
    const wast = parseFloat(wastage) || 0;
    return (net * (melting / 100)) + wast;
};

/**
 * Calculate labour charge based on charge type setting.
 * @param {number} labourRate      per-item rate or per-gram rate
 * @param {number} grossWeight     used only for 'per-gram' type
 * @param {'full'|'per-gram'} chargeType
 * @returns {number}
 */
export const calculateLabourCharge = (labourRate, grossWeight, chargeType = 'full') => {
    const rate = parseFloat(labourRate) || 0;
    if (chargeType === 'per-gram') {
        return rate * (parseFloat(grossWeight) || 0);
    }
    return rate; // 'full' — flat amount per item
};

/**
 * Calculate total amount for a single invoice item.
 * @param {number} fineWeight
 * @param {number} metalRate    gold or silver rate per gram
 * @param {number} labourCharge already computed labour charge
 * @returns {number}
 */
export const calculateItemAmount = (fineWeight, metalRate, labourCharge) => {
    return (parseFloat(fineWeight) || 0) * (parseFloat(metalRate) || 0) + (parseFloat(labourCharge) || 0);
};

/**
 * Recalculate a single item given current rates and user settings.
 * Returns a new item object with updated netWeight, fineWeight, amount.
 * @param {object} item
 * @param {number} goldRate
 * @param {number} silverRate
 * @param {'full'|'per-gram'} labourChargeType
 * @returns {object} updated item
 */
export const recalculateItem = (item, goldRate, silverRate, labourChargeType = 'full') => {
    const grossWeight = parseFloat(item.grossWeight) || 0;
    const lessWeight = parseFloat(item.lessWeight) || 0;
    const meltingPercent = parseFloat(item.melting) || 0;
    const wastage = parseFloat(item.wastage) || 0;
    const labourRate = parseFloat(item.labourRate) || 0;

    const netWeight = calculateNetWeight(grossWeight, lessWeight);
    const fineWeight = calculateFineWeight(netWeight, meltingPercent, wastage);
    const rate = item.metalType === 'gold' ? (parseFloat(goldRate) || 0) : (parseFloat(silverRate) || 0);
    const labourCharge = calculateLabourCharge(labourRate, grossWeight, labourChargeType);
    const amount = calculateItemAmount(fineWeight, rate, labourCharge);

    return {
        ...item,
        netWeight: netWeight.toFixed(3),
        fineWeight: fineWeight.toFixed(3),
        amount: amount.toFixed(2),
    };
};

/**
 * Compute totals row across all items.
 * @param {object[]} items
 * @param {'full'|'per-gram'} labourChargeType
 * @returns {object} totals
 */
export const calculateTotals = (items, labourChargeType = 'full') => {
    let totalLabourCharge = 0;
    let totalWastage = 0;

    items.forEach(item => {
        totalLabourCharge += calculateLabourCharge(
            parseFloat(item.labourRate) || 0,
            parseFloat(item.grossWeight) || 0,
            labourChargeType
        );
        totalWastage += parseFloat(item.wastage) || 0;
    });

    return items.reduce((acc, item) => ({
        pieces: acc.pieces + (parseInt(item.pieces) || 0),
        grossWeight: acc.grossWeight + (parseFloat(item.grossWeight) || 0),
        lessWeight: acc.lessWeight + (parseFloat(item.lessWeight) || 0),
        netWeight: acc.netWeight + (parseFloat(item.netWeight) || 0),
        wastage: totalWastage,          // set from pre-loop (same value every iteration)
        fineWeight: acc.fineWeight + (parseFloat(item.fineWeight) || 0),
        labourRate: totalLabourCharge,  // set from pre-loop (same value every iteration)
        amount: acc.amount + (parseFloat(item.amount) || 0),
    }), {
        pieces: 0,
        grossWeight: 0,
        lessWeight: 0,
        netWeight: 0,
        wastage: 0,
        fineWeight: 0,
        labourRate: 0,
        amount: 0,
    });
};

/**
 * Why the shop bought metal on a purchase voucher (stored as voucher.purchaseType).
 */
export const PURCHASE_TYPES = [
  { value: 'old_purchase', label: 'Old Gold / Silver Purchase', short: 'Old Purchase' },
  { value: 'exchange', label: 'Exchange (Old for New)', short: 'Exchange' },
  { value: 'new_purchase', label: 'New Gold / Silver Purchase', short: 'New Purchase' },
];

export const getPurchaseType = (value) => PURCHASE_TYPES.find((t) => t.value === value);

// Ledger balance before/after this entry. Used when saving and for print/share of an unsaved entry,
// so the printed old/current balance always matches what gets saved.
export const buildBalanceSnapshot = (paymentType, balances = {}, items = [], formData = {}) => {
  const n = (v) => parseFloat(v) || 0;
  const credit = n(balances.creditBalance);
  const cash = n(balances.cashBalance);
  const gold = n(balances.goldFineWeight);
  const silver = n(balances.silverFineWeight);
  const fine = (metal) => items.filter(i => !metal || i.metalType === metal).reduce((s, i) => s + n(i.fineWeight), 0);
  const billNet = items.reduce((s, i) => s + n(i.amount), 0) + n(formData.stoneAmount) + n(formData.fineAmount) - n(formData.cashReceived);

  const metalAfter = (old, metal, addType, moneyType, rate) => {
    if (paymentType === 'credit') return old + fine(metal);
    if (paymentType === addType) return old - fine();
    if (paymentType === moneyType) return old - n(formData.cashReceived) / (n(rate) || 1);
    return old;
  };

  return {
    oldBalance: { creditAmount: credit, cashAmount: cash, totalAmount: credit + cash, goldFineWeight: gold, silverFineWeight: silver },
    currentBalance: {
      // Metal settlements (add_gold/silver, money_to_gold/silver) leave the cash balance unchanged on the ledger.
      amount: credit + cash + (['credit', 'cash', 'add_cash'].includes(paymentType) ? billNet : 0),
      goldFineWeight: metalAfter(gold, 'gold', 'add_gold', 'money_to_gold', formData.goldRate),
      silverFineWeight: metalAfter(silver, 'silver', 'add_silver', 'money_to_silver', formData.silverRate)
    }
  };
};

// Plain-language warnings for entries that are probably a mistake. The user can still save after reading them.
// Pass balances = null when editing an existing entry (its own effect is already inside the balance).
export const getEntryWarnings = (paymentType, balances, items = [], formData = {}, today = new Date()) => {
  const n = (v) => parseFloat(v) || 0;
  const rs = (v) => `₹${Math.abs(v).toFixed(2)}`;
  const g = (v) => `${Math.abs(v).toFixed(3)} g`;
  const received = n(formData.cashReceived);
  const warnings = [];

  const checkMetal = (metal, incoming) => {
    const owed = n(balances[metal === 'gold' ? 'goldFineWeight' : 'silverFineWeight']);
    if (incoming <= owed) return;
    warnings.push(owed > 0
      ? `Customer owes ${g(owed)} ${metal} but you are receiving ${g(incoming)}. The shop will then owe the customer ${g(incoming - owed)} ${metal}.`
      : `Customer doesn't owe any ${metal} right now. After this entry the shop will owe the customer ${g(incoming - owed)} ${metal}.`);
  };

  if (balances) {
    const owedCash = n(balances.cashBalance) + n(balances.creditBalance);
    if (paymentType === 'add_cash' && received < 0) {
      warnings.push(`A negative amount adds ${rs(received)} to what the customer owes. Use it only to correct a mistake. If the wrong entry was made recently, deleting it is cleaner.`);
    } else if (paymentType === 'add_cash' && received > owedCash) {
      warnings.push(owedCash > 0
        ? `Customer owes ${rs(owedCash)} but you are entering ${rs(received)}. The extra ${rs(received - owedCash)} will be kept as the customer's advance.`
        : `Customer doesn't owe any cash right now. The full ${rs(received)} will be kept as the customer's advance.`);
    }
    const fineIn = items.reduce((s, i) => s + n(i.fineWeight), 0);
    if (paymentType === 'add_gold') checkMetal('gold', fineIn);
    if (paymentType === 'add_silver') checkMetal('silver', fineIn);
    if (paymentType === 'money_to_gold' && n(formData.goldRate) > 0) checkMetal('gold', received / n(formData.goldRate));
    if (paymentType === 'money_to_silver' && n(formData.silverRate) > 0) checkMetal('silver', received / n(formData.silverRate));
  }

  if (paymentType === 'credit' || paymentType === 'cash') {
    items.forEach((item) => {
      const name = item.itemName || 'An item';
      if (n(item.fineWeight) <= 0) warnings.push(`"${name}" has ${g(n(item.fineWeight))} fine weight. Check the weight and melting %.`);
      else if (n(item.fineWeight) > n(item.grossWeight) && n(item.grossWeight) > 0) warnings.push(`"${name}" has more fine weight (${g(n(item.fineWeight))}) than its gross weight (${g(n(item.grossWeight))}). Check melting % and wastage.`);
    });
    const billTotal = items.reduce((s, i) => s + n(i.amount), 0) + n(formData.stoneAmount) + n(formData.fineAmount);
    if (paymentType === 'cash' && received > billTotal) {
      warnings.push(`Customer paid ${rs(received)} for a bill of ${rs(billTotal)}. The extra ${rs(received - billTotal)} will be kept as the customer's advance.`);
    }
  }

  const pad = (v) => String(v).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (formData.date && formData.date > todayStr) {
    warnings.push(`The entry date (${formData.date}) is in the future.`);
  }

  return warnings;
};
