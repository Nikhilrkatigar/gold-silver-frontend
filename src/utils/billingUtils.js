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
