/**
 * GST Calculation Utilities
 * Handles all GST-related calculations and validations
 */

/**
 * Extract state code from GST number
 * GST Format: DDAAAAADDDDALDZ1
 * First 2 digits = State Code
 */
export const extractStateFromGST = (gstNumber) => {
  if (!gstNumber || gstNumber.length < 2) return null;
  return gstNumber.substr(0, 2);
};

/**
 * Validate GST number format
 * Valid format: 15 characters - 29AABCR1718E1ZL
 * Structure: 2 digits (state) + 5 letters (PAN) + 4 digits (entity) + 4 alphanumeric (check/filler)
 */
export const isValidGSTFormat = (gstNumber) => {
  if (!gstNumber) return false;
  const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z0-9]{4}$/;
  return gstRegex.test(gstNumber.toUpperCase());
};

/**
 * Calculate GST based on type (IGST or CGST+SGST)
 * @param {number} taxableAmount - Amount before GST
 * @param {number} gstRate - GST rate (0, 3, 5, 12, 18)
 * @param {string} gstType - 'IGST' or 'CGST_SGST'
 * @returns {object} - GST breakdown and total
 */
export const calculateGST = (taxableAmount, gstRate, gstType) => {
  if (!taxableAmount || !gstRate) {
    return {
      igst: 0,
      cgst: 0,
      sgst: 0,
      totalGST: 0,
      total: taxableAmount || 0
    };
  }

  if (gstType === 'IGST') {
    // IGST = Full rate
    const igst = (taxableAmount * gstRate) / 100;
    return {
      igst: parseFloat(igst.toFixed(2)),
      cgst: 0,
      sgst: 0,
      totalGST: parseFloat(igst.toFixed(2)),
      total: parseFloat((taxableAmount + igst).toFixed(2))
    };
  } else if (gstType === 'CGST_SGST') {
    // CGST + SGST = Half rate each
    const halfRate = gstRate / 2;
    const cgst = (taxableAmount * halfRate) / 100;
    const sgst = (taxableAmount * halfRate) / 100;
    const totalGST = cgst + sgst;
    
    return {
      igst: 0,
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      totalGST: parseFloat(totalGST.toFixed(2)),
      total: parseFloat((taxableAmount + totalGST).toFixed(2))
    };
  }

  return {
    igst: 0,
    cgst: 0,
    sgst: 0,
    totalGST: 0,
    total: taxableAmount
  };
};

/**
 * Determine GST type based on seller and customer state
 * Same state = CGST + SGST
 * Different state = IGST
 */
export const determineGSTType = (sellerState, customerState) => {
  if (!sellerState || !customerState) return null;
  
  if (sellerState === customerState) {
    return 'CGST_SGST';
  } else {
    return 'IGST';
  }
};

/**
 * Get state code from GST number
 * Used to auto-detect customer state when GST is entered
 */
export const getStateCodeFromGST = (gstNumber) => {
  if (!isValidGSTFormat(gstNumber)) return null;
  return gstNumber.substr(0, 2);
};

/**
 * Format GST number for display
 */
export const formatGSTNumber = (gstNumber) => {
  if (!gstNumber) return '';
  return gstNumber.toUpperCase();
};

/**
 * State code to name mapping for Indian states (GST State Codes 01-38)
 * Format: {stateCode: 'State Name'}
 */
export const STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction'
};

/**
 * Get state name from GST state code
 * @param {string} stateCode - GST state code (01-38, 97, 99)
 * @returns {string} - State name or the code if not found
 */
export const getStateName = (stateCode) => {
  return STATE_CODES[stateCode] || STATE_CODES[String(stateCode).padStart(2, '0')] || stateCode;
};

/**
 * Validate GST settings are complete
 */
export const isGSTSettingsComplete = (gstSettings) => {
  return (
    gstSettings &&
    gstSettings.gstNumber &&
    isValidGSTFormat(gstSettings.gstNumber) &&
    gstSettings.businessState &&
    gstSettings.defaultGSTRate !== undefined
  );
};

/**
 * Validate before creating GST invoice
 */
export const validateGSTInvoice = (sellerSettings, customerGST = null) => {
  const errors = [];

  // Seller must have complete GST settings
  if (!sellerSettings) {
    errors.push('Seller GST settings not found');
  } else {
    if (!sellerSettings.gstNumber) {
      errors.push('Seller GST Number is required');
    } else if (!isValidGSTFormat(sellerSettings.gstNumber)) {
      errors.push('Seller GST Number format is invalid');
    }

    if (!sellerSettings.businessState) {
      errors.push('Seller Business State is required');
    }

    if (sellerSettings.defaultGSTRate === undefined) {
      errors.push('Seller GST Rate is not set');
    }
  }

  // Customer GST (if provided) must be valid
  if (customerGST && !isValidGSTFormat(customerGST)) {
    errors.push('Customer GST Number format is invalid');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  extractStateFromGST,
  isValidGSTFormat,
  calculateGST,
  determineGSTType,
  getStateCodeFromGST,
  formatGSTNumber,
  STATE_CODES,
  getStateName,
  isGSTSettingsComplete,
  validateGSTInvoice
};
