# GST Implementation Guide (v1.7)

## Overview
Complete GST (Goods and Services Tax) feature implementation for Gold-Silver SaaS platform.

---

## ✅ COMPLETED IMPLEMENTATIONS

### 1. Database Models Updated
- ✅ **User Model** - Added GST fields:
  - `gstEnabled` (Boolean)
  - `gstSettings` object with:
    - `gstNumber` (15-char validation)
    - `businessState` (dropdown of Indian states)
    - `defaultGSTRate` (0, 3, 5, 12, 18)
    - `gstEditPermission` (user/admin)

- ✅ **Ledger Model** - Added GST fields:
  - `gstDetails.hasGST` (Boolean)
  - `gstDetails.gstNumber` (15-char)
  - `gstDetails.stateCode` (extracted from GST)

- ✅ **Voucher Model** - Added GST fields:
  - `invoiceType` (normal/gst)
  - Complete `gstDetails` object with:
    - Seller/Customer GST numbers
    - Seller/Customer state codes
    - `gstType` (IGST or CGST_SGST)
    - Tax calculations (IGST/CGST/SGST)

### 2. Frontend UI Components Updated
- ✅ **AccountInfo Page** - GST Settings section now functional:
  - Edit button to manage GST settings
  - GST Number input with format validation
  - Business State dropdown (all 34 Indian states)
  - Default GST Rate selector (5 options)
  - Save/Cancel functionality
  - Display mode showing current settings

- ✅ **AuthContext** - Added:
  - `updateGSTSettings()` function
  - GST settings state management

---

## 🔄 IN PROGRESS - NEXT STEPS

### 3. Admin Panel Updates (PENDING)

#### A. Add New User Page
- [ ] Add "GST Enabled" toggle (Yes/No)
- [ ] Add "GST Edit Permission" dropdown (User/Admin)
- [ ] Conditionally show GST fields when enabled
- [ ] Save GST settings during user creation

**File to modify:** `frontend/src/pages/admin/AddUser.jsx`

```jsx
// Add these fields to AddUser form:
<div>
  <label>Enable GST for this user?</label>
  <select onChange={(e) => setFormData({...formData, gstEnabled: e.target.value === 'yes'})}>
    <option value="no">No</option>
    <option value="yes">Yes</option>
  </select>
</div>

{gstEnabled && (
  <div>
    <label>GST Edit Permission</label>
    <select>
      <option value="user">User can edit</option>
      <option value="admin">Admin only</option>
    </select>
  </div>
)}
```

#### B. User List Page
- [ ] Add "Edit" action column
- [ ] Show GST badges:
  - "✅ GST Enabled" (green badge)
  - "❌ Non-GST" (gray badge)
- [ ] Modal to enable/disable GST for existing users
- [ ] Update GST settings for specific user

**File to modify:** `frontend/src/pages/admin/UserList.jsx`

---

### 4. Billing Page Updates (PENDING)

#### Step 1: Invoice Type Selection
- [ ] Add toggle: "Normal Invoice" / "GST Invoice"
- [ ] Block GST if seller settings incomplete

#### Step 2: Customer GST Details
- [ ] Add optional "Customer GST Number" field
- [ ] Auto-extract state code from GST number
- [ ] Validate 15-character format

#### Step 3: GST Type Auto-Detection
- [ ] Logic: Compare seller state vs customer state
  ```javascript
  if (sellerState === customerState) {
    gstType = 'CGST_SGST'
  } else {
    gstType = 'IGST'
  }
  ```
- [ ] Display as read-only badge (not editable)

#### Step 4: GST Calculation
- [ ] Fetch rate from user's `defaultGSTRate`
- [ ] Calculate:
  - **IGST:** `amount × rate%`
  - **CGST:** `amount × (rate/2)%`
  - **SGST:** `amount × (rate/2)%`

#### Step 5: Billing Summary Display
- [ ] Show "Taxable Value" (total amount before GST)
- [ ] Show GST breakup:
  - IGST amount OR
  - CGST + SGST amounts
- [ ] Show "Total Invoice Amount" (taxable + GST)

**File to modify:** `frontend/src/pages/user/Billing.jsx`

---

### 5. Ledger Management Updates (PENDING)

#### Add / Edit Ledger Dialog
- [ ] Add "Does this party have GST?" Yes/No toggle
- [ ] If Yes:
  - [ ] Make GST Number mandatory
  - [ ] Extract and store state code
- [ ] If No:
  - [ ] Hide GST fields
  - [ ] Set `hasGST: false`

**File to modify:** `frontend/src/pages/user/LedgerManagement.jsx`

---

### 6. Invoice Templates (PENDING)

#### GST Invoice Print Template
Must show:
- ✅ Seller Name
- ✅ Seller GST Number
- ✅ Seller State
- ✅ Customer Name
- ✅ Customer GST Number (only if provided)
- ✅ Customer State
- ✅ Invoice Number
- ✅ Invoice Date
- ✅ Taxable Value
- ✅ GST Details:
  - IGST amount (if applicable)
  - CGST + SGST amounts (if applicable)
- ✅ Total Invoice Amount

#### Normal Invoice
- Hide all GST fields

**Files to modify:**
- `frontend/src/pages/user/Billing.jsx` (VoucherTemplate component)
- Print/PDF generation logic

---

### 7. Backend API Updates (PENDING)

#### Routes to create:
1. `PATCH /api/admin/users/{id}` - Update GST settings
2. `PATCH /api/ledger/{id}` - Update ledger GST details
3. `POST /api/voucher` - Create GST invoice (validation)

#### Validation needed:
- GST format validation (15 characters)
- State code must be valid
- Block GST invoice if seller settings missing
- Prevent mixing IGST with CGST/SGST

---

## 📋 IMPLEMENTATION CHECKLIST

### Frontend
- [x] User model with GST fields in backend
- [x] Ledger model with GST fields in backend
- [x] Voucher model with GST fields in backend
- [x] AccountInfo page GST Settings section
- [x] AuthContext GST update function
- [ ] Admin AddUser page - GST toggle
- [ ] Admin UserList page - GST badges & edit
- [ ] Billing page - Invoice type selection
- [ ] Ledger management - GST Yes/No toggle
- [ ] Invoice template - GST details display

### Backend
- [ ] Update auth routes to handle GST settings
- [ ] Create admin routes for GST management
- [ ] Add GST validation middleware
- [ ] Create Voucher routes with GST support
- [ ] Add GST calculation utilities

### Database
- [x] User schema updates
- [x] Ledger schema updates
- [x] Voucher schema updates

---

## 🔧 GST Calculation Utility (Helper Function)

Create file: `frontend/src/utils/gstCalculations.js`

```javascript
// Helper functions for GST calculations
export const extractStateFromGST = (gstNumber) => {
  if (!gstNumber || gstNumber.length < 2) return null;
  return gstNumber.substr(0, 2);
};

export const calculateGST = (taxableAmount, gstRate, gstType) => {
  if (gstType === 'IGST') {
    const igst = (taxableAmount * gstRate) / 100;
    return {
      igst: parseFloat(igst.toFixed(2)),
      cgst: 0,
      sgst: 0,
      totalGST: parseFloat(igst.toFixed(2)),
      total: parseFloat((taxableAmount + igst).toFixed(2))
    };
  } else if (gstType === 'CGST_SGST') {
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
  return null;
};

export const determineGSTType = (sellerState, customerState) => {
  if (sellerState === customerState) {
    return 'CGST_SGST';
  } else {
    return 'IGST';
  }
};

export const isValidGSTFormat = (gstNumber) => {
  const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z\d{1}$/;
  return gstRegex.test(gstNumber);
};
```

---

## 📝 Form Validation Rules

### GST Number
- **Length:** Exactly 15 characters
- **Format:** `DDAAAAADDDDALDZ1`
  - DD = State Code (2 digits)
  - AAAAA = PAN characters (5 uppercase)
  - DDDD = Registration number (4 digits)
  - A = Check digit (1 letter)
  - L = Business type (1 letter/digit)
  - Z = Filler (always Z)
  - 1 = Check digit (1 digit)

### Business State
- Dropdown of all 34 Indian states/UTs
- Must match states in User model

### GST Rate
- Only options: 0%, 3%, 5%, 12%, 18%

---

## 🔐 Safety Rules

1. **Block GST Invoice if:**
   - Seller GST Number missing
   - Seller Business State missing
   - Customer GST format invalid

2. **Do NOT allow:**
   - Mixing IGST with CGST/SGST
   - Invalid state codes
   - Incomplete GST settings

3. **Hide GST fields if:**
   - User has `gstEnabled: false`
   - Invoice type is "Normal"

---

## 🎯 Testing Checklist

- [ ] Test GST Number validation (valid and invalid)
- [ ] Test GST calculation for IGST
- [ ] Test GST calculation for CGST+SGST
- [ ] Test state auto-detection from GST
- [ ] Test blocking invoice if GST incomplete
- [ ] Test print/PDF with GST details
- [ ] Test normal invoices (GST hidden)
- [ ] Test ledger with and without GST

---

## 📦 Dependencies
- Existing: React, Axios, date-fns, react-toastify
- New: None required (using native regex validation)

---

## 🚀 Deployment Notes
- Backend: Add new routes before deploying
- Database: Run migrations to add GST fields
- Frontend: Build and deploy after backend ready
- Test in staging before production

---

**Version:** 1.7
**Last Updated:** February 8, 2026
**Status:** In Progress - 40% Complete
