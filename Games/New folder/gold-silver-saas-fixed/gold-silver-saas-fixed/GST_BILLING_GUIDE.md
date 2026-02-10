# GST Billing System - Complete Guide

## Overview

The GST Billing system is a dedicated module for creating professional Tax Invoices compliant with Indian GST regulations. This system is available only for users with GST enabled and provides comprehensive invoicing with automatic GST calculations.

---

## Features

### 1. **Dual Billing Modes**
- **Normal Billing**: Traditional vouchers for non-GST transactions
- **GST Billing**: Professional Tax Invoices with GST compliance

Users with GST enabled can toggle between modes using buttons in the top-right corner of the billing page.

### 2. **Tax Invoice Components**

Every GST invoice includes:

#### Header Section
- Shop/Business Name
- Business GSTIN
- "TAX INVOICE" label in red banner
- Professional formatting

#### Invoice Details
```
Invoice Number: GST-001, GST-002, etc.
Invoice Date: Automatically set to current date
Reference No: Optional field
E-Way Bill No: Optional field (for integrated logistics)
```

#### Customer Details  
```
Name: Auto-populated from selected customer
Phone: Auto-populated from selected customer
GSTIN: Customer's 15-character GST number
State: Auto-extracted from customer's GST number
```

#### Line Items Table
Premium formatting with:
- Sr. No. (Serial Number)
- Item Description with Metal Type (GOLD/SILVER)
- HSN/SAC Code (7108 for Gold, 7106 for Silver)
- Quantity (Pieces)
- Net Weight (grams)
- Fine Weight (grams) 
- Unit Price (₹/gram)
- Amount (₹)

#### GST Calculation Section
Automatic calculation based on location:

**IGST (Different State)**: Single rate applied
```
Taxable Amount: ₹10,000
IGST @ 18%: ₹1,800
Total (GST included): ₹11,800
```

**CGST + SGST (Same State)**: Split rate applied
```
Taxable Amount: ₹10,000
SGST @ 9%: ₹900
CGST @ 9%: ₹900
Total (GST included): ₹11,800
```

#### Additional Sections
- **Bank Details**: Account info for payment
- **Transportation**: Optional transport details
- **Terms & Conditions**: Invoice footer
- **Signature Areas**: For both customer and authorized signatory

---

## How to Use

### Step 1: Access GST Billing

1. Login to your account
2. Go to **Billing** menu
3. Click **📄 GST Billing** button (appears only if GST is enabled)

### Step 2: Select or Create Customer

**Option A: Select Existing Customer**
```
1. Click on "Select Customer" dropdown
2. Search by name or phone number
3. Click to select
4. Customer details auto-populate
```

**Option B: Add New Customer**
```
1. Click "+ Add Customer" button
2. Enter Name and Phone Number
3. Enable "Customer has GST?" checkbox
4. Enter 15-digit GST number (format: 29AABCR1718E1ZL)
5. Click "Create"
```

### Step 3: Fill Invoice Details

#### Required Fields
```
Invoice Number: e.g., GST-001, GST-2025-0001
Date: Auto-set to today (change if needed)
Gold Rate (₹/g): Current market rate
Silver Rate (₹/g): Current market rate
GST Rate (%): 0, 3, 5, 12, or 18
```

#### Optional Fields
```
Reference No: Previous order reference
E-Way Bill No: For logistics tracking
Stone Amount: Additional charges
Bank Details: For payment instructions
Transport: Courier/Logistics name
Narration: Special notes
```

### Step 4: Add Line Items

1. Click **+ Gold** or **+ Silver** button
2. Fill item details:
   - **Item Name**: Description (e.g., "Golden Bracelet")
   - **Pieces**: Number of items
   - **Gross Weight**: Total weight including impurities
   - **Less Weight**: Weight to deduct (wastage, packaging)
   - **Melting %**: Purity percentage
   - **Fine Weight**: Calculated automatically (shows actual pure metal content)
   - **Labour**: Labour charges for that item

3. **Automatic Calculations**:
   - Net Weight = Gross Weight - Less Weight
   - Fine Weight = (Net Weight × Melting%) + Wastage
   - Amount = (Fine Weight × Metal Rate) + Labour

4. Delete row: Click red **X** button

### Step 5: Review Totals

Right panel shows real-time calculations:
```
Subtotal (all items): ₹10,000
Stone Amount: ₹500
Taxable Amount: ₹10,500

--- GST Calculation ---
IGST @ 18%: ₹1,890
(or CGST 9% + SGST 9%: ₹945 each)

TOTAL (GST INCL.): ₹12,390
```

### Step 6: Generate/Print Invoice

**Create Invoice Button**
- Saves invoice to database
- Shows success message
- Redirects to billing page

**Print Button**
- Opens print preview
- Shows complete formatted invoice
- Ready for printer

**Download PDF Button** (if included)
- Generates professional PDF
- Ready for email/archiving

---

## GST Number Format

### Valid Format: `29AABCR1718E1ZL`

Breaking it down:
- **29**: State Code (2 digits: 01-37)
- **AABCR**: PAN (5 uppercase letters)
- **1718**: Entity Number (4 digits - year + serial)
- **E**: Check digit (1 letter: A-Z)
- **1**: Filler (1 alphanumeric)
- **ZL**: Last 2 characters (combination of letters/numbers)

### State Codes Reference
```
01: Jammu and Kashmir
07: Delhi
27: Maharashtra
32: Gujarat
33: Gujarat
...and 33 more states/UTs
```

---

## Invoice Type Selection

The system automatically determines GST type:

### Same State Transaction
```
Shop Location: Maharashtra (27)
Customer GST: 27AABCR1718E1ZL (Maharashtra)
Result: CGST + SGST
```

### Different State Transaction
```
Shop Location: Maharashtra (27)
Customer GST: 29AABCR1718E1ZL (Jammu & Kashmir)
Result: IGST
```

---

## Key Differences: Normal vs GST Billing

| Feature | Normal Billing | GST Billing |
|---------|----------------|------------|
| **Voucher Type** | Estimate/On Approval | Tax Invoice |
| **GST Details** | Optional | Mandatory |
| **Invoice Format** | Simple layout | Professional tax invoice |
| **HSN Codes** | Not included | Included (7108/7106) |
| **Tax Display** | Not shown | Detailed GST breakdown |
| **Legal Use** | Informal | Official tax records |
| **PDF Export** | Basic | Complete tax invoice format |

---

## Best Practices

### 1. **Customer Setup**
- Always register customers with accurate GST numbers
- Verify GST number format before saving
- Update customer details if they change location/GST status

### 2. **Item Naming**
- Use descriptive names: "Premium Gold Necklace", not just "Gold"
- Include size/weight where relevant
- Be consistent with naming conventions

### 3. **Weight Management**
- Gross Weight: Total weight as received
- Less Weight: Any packaging, stones, or non-metal items
- Melting %: Always between 50-99.9% (realistic purity)

### 4. **Rate Management**
- Update rates daily based on market prices
- Use consistent decimal places (0.01)
- Negative rates are allowed for adjustments

### 5. **Banking Details**
- Add UPI ID for digital payments
- Update account numbers if accounts change
- Include IFSC code for bank transfers

---

## Common Issues & Solutions

### Issue: "Customer GSTIN not auto-filled"
**Solution**: 
- Ensure customer has GST enabled
- Check that customer's GST number is saved correctly
- Verify GST number format is valid

### Issue: "Invalid GST Number" error
**Solution**:
- Check format: Must be exactly 15 characters
- First 2 characters must be valid state code (01-37)
- Characters 3-7 must be uppercase letters
- No spaces or special characters allowed

### Issue: "GST is not enabled for your account"
**Solution**:
- Contact admin to enable GST in account settings
- Verify business state is set correctly
- Ensure business GST number is entered

### Issue: PDF download not working
**Solution**:
- Use modern browser (Chrome, Firefox, Safari, Edge)
- Check browser's popup blocker settings
- Ensure all items have valid data
- Try different browser if issue persists

---

## API Integration

### Backend Endpoints

**Create GST Invoice**
```
POST /api/vouchers
Body: {
  ledgerId: "customer_id",
  invoiceNumber: "GST-001",
  date: "2025-02-09",
  goldRate: 7500,
  silverRate: 95,
  stoneAmount: 500,
  items: [...],
  gstDetails: {
    customerGSTNumber: "29AABCR1718E1ZL",
    gstRate: 18,
    gstType: "IGST"
  },
  invoiceType: "gst"
}
```

**Get GST Invoice**
```
GET /api/vouchers/:id
Response includes:
- Full invoice details
- GST calculations
- Customer information
```

---

## Data Fields Reference

### Invoice Header Fields
| Field | Type | Required | Format |
|-------|------|----------|--------|
| invoiceNumber | String | Yes | GST-001 |
| date | Date | Yes | YYYY-MM-DD |
| referenceNo | String | No | Any |
| eWayBillNo | String | No | 12 digits |

### GST Calculate Fields
| Field | Type | Required | Values |
|-------|------|----------|--------|
| customerGSTNumber | String | Yes | 15 char format |
| gstRate | Number | Yes | 0, 3, 5, 12, 18 |
| gstType | String | Auto | IGST, CGST_SGST |

### Item Fields
| Field | Type | Required | Calculation |
|-------|------|----------|-------------|
| grossWeight | Number | Yes | Manual input |
| lessWeight | Number | No | Manual input |
| netWeight | Number | Auto | Gross - Less |
| melting | Number | Yes | % value |
| fineWeight | Number | Auto | (Net × Melting%) + Wastage |
| amount | Number | Auto | (Fine Weight × Rate) + Labour |

---

## Print & Export

### Direct Print
1. Click **Print** button
2. Select printer
3. Choose pages to print
4. Click Print

### PDF Download
1. Click **Download PDF** button
2. Browser saves file with invoice number
3. File format: `GST-Invoice-{invoiceNumber}.pdf`

### Email/Share
1. Generate PDF (Click Print)
2. Right-click PDF
3. Choose "Share" or "Save Link As"

---

## Troubleshooting Checklist

- ✅ GST is enabled in account settings
- ✅ Business GSTIN is entered in account
- ✅ Customer has valid GST number
- ✅ GST number format is correct (15 chars)
- ✅ All required fields are filled
- ✅ At least one item is added
- ✅ Rates (Gold/Silver) are entered
- ✅ GST rate is selected (0-18%)

---

## Support & Documentation

- **Format Issues**: Review GST number format section
- **Customer Issues**: Check customer setup in LedgerManagement
- **Calculation Issues**: Verify rates and weights
- **Technical Issues**: Contact system administrator

---

## Latest Updates

- **v1.0**: Full GST billing implementation with dual-mode switching
- **Features**: HSN codes, detailed tax breakdown, professional formatting
- **Compatibility**: All browsers, mobile-friendly interface

---

**Last Updated**: February 9, 2025
