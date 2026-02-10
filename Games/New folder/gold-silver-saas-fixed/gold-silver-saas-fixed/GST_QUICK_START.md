# GST Billing - Quick Start (5 Minutes)

## ⚡ Get Started Immediately

### Step 1: Navigate (30 seconds)
```
1. Login to your account
2. Click "Billing" in navigation menu
3. Located at: /billing or from dashboard
```

### Step 2: Switch to GST Mode (10 seconds)
```
Look at top-right of page
Click "📄 GST Billing" button
(Only appears if GST is enabled)
```

### Step 3: Select Customer (1 minute)
**Option A: Existing Customer**
```
1. Type customer name in search box
2. Click to select
3. Details auto-fill
```

**Option B: New Customer**
```
1. Click "+ Add Customer"
2. Name: Enter customer name
3. Phone: Enter phone number
4. Check: "Customer has GST?"
5. GSTIN: Enter 15-digit number (29AABCR1718E1ZL)
6. Click "Create"
```

### Step 4: Fill Rates & Details (1 minute)
```
Invoice Number: GST-001
Date: Auto-filled (change if needed)
Gold Rate: Enter current rate (e.g., 7500)
Silver Rate: Enter current rate (e.g., 95)
GST Rate: Choose from dropdown (0, 3, 5, 12, 18%)
```

### Step 5: Add Items (2 minutes)
```
1. Click "+ Gold" or "+ Silver"
2. Item Name: Type item description
3. Pieces: How many items
4. Gross Weight: Total weight
5. Less Weight: Weight to subtract (optional)
6. Melting %: Purity (usually 95-99)
7. Labour: Labor charges (optional)
8. Amount: Auto-calculated

Repeat for each item
```

### Step 6: Generate Invoice (30 seconds)
```
Review right panel - shows all totals
Click "Create Invoice" button
Done! ✅

To Print:
Click "Print" button instead
Opens print preview
```

---

## 📝 GST Number Format

**MUST BE**: Exactly 15 characters  
**FORMAT**: `29AABCR1718E1ZL`

Breaking down:
- `29` = State code (01 to 37)
- `AABCR` = 5 uppercase letters
- `1718` = 4 digits
- `E1ZL` = Last 4 characters

---

## 💡 Pro Tips

### Tip 1: Auto-Fill from Customer
If customer has saved GST number → it auto-fills! 🎯

### Tip 2: Easy Item Addition
- Gold items use HSN code 7108 (auto)
- Silver items use HSN code 7106 (auto)
- No manual HSN entry needed

### Tip 3: Weight Calculations
```
Gross: 100g
Less: 5g (packaging)
Net: 95g (auto-calculated)
```

### Tip 4: GST Type Auto-Detection
- **Same State**: CGST (9%) + SGST (9%)
- **Different State**: IGST (18%)
- No choice needed - automatic!

### Tip 5: Mobile Friendly
Can use on phone! Layout adapts automatically.

---

## 🚨 Common Mistakes (Avoid These)

❌ **WRONG**: GSTIN has only 14 characters
✅ **RIGHT**: GSTIN has exactly 15 characters (29AABCR1718E1ZL)

❌ **WRONG**: Spacing in GSTIN (29 AABCR 1718 E1ZL)
✅ **RIGHT**: No spaces (29AABCR1718E1ZL)

❌ **WRONG**: Mixing case (29aabcr1718e1zl)
✅ **RIGHT**: Capitals (29AABCR1718E1ZL)

❌ **WRONG**: Negative weights
✅ **RIGHT**: All weights positive

❌ **WRONG**: Melting % over 100%
✅ **RIGHT**: Melting between 50-99.9%

---

## 🎯 Real Example

### Scenario: Create GST Invoice

**Customer**: Apple Export Ltd.  
**GSTIN**: 27AAJCR5055K2Z5  
**Gold Rate**: ₹7,500/gram  
**Silver Rate**: ₹95/gram  
**GST Rate**: 18%

**Item 1: Gold Necklace**
- Pieces: 1
- Gross Weight: 50g
- Less Weight: 2g (packaging)
- Melting: 99%
- Labour: ₹500

**Item 2: Silver Bracelet**
- Pieces: 1
- Gross Weight: 120g
- Less Weight: 5g
- Melting: 98%
- Labour: ₹300

**Calculation**:
```
Item 1 Amount = (50-2) × 0.99 × 7500 + 500 = ₹365,250
Item 2 Amount = (120-5) × 0.98 × 95 + 300 = ₹11,009

Subtotal = ₹376,259
GST (18%) = ₹67,726
TOTAL = ₹443,985
```

---

## 📊 Invoice Preview

When you click "Print", you see:

```
═════════════════════════════════
APPLE EXPORT HOUSE
GST: 27AAJCR5055K2Z5
      TAX INVOICE
═════════════════════════════════
Invoice No: GST-001
Date: Feb 09, 2025

BILL TO:
Apple Export Ltd.
GSTIN: 27AAJCR5055K2Z5
═════════════════════════════════

| Item | Qty | Net Wt | Fine Wt | Rate | Amount |
|------|-----|--------|---------|------|--------|
| Gold Necklace | 1 | 48g | 47.52g | 7500 | 365,250 |
| Silver Bracelet | 1 | 115g | 112.7g | 95 | 11,009 |

Subtotal: ₹376,259
CGST (9%): ₹33,863
SGST (9%): ₹33,863
───────────────────
TOTAL: ₹443,985
═════════════════════════════════
```

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "GST Billing button not visible" | Ask admin to enable GST in your account |
| "Customer GSTIN invalid format" | Check it's 15 chars: 29AABCR1718E1ZL |
| "Can't find customer" | Create new customer with + button |
| "Print button doesn't work" | Add items first, then try |
| "Calculations look wrong" | Verify GST Rate is selected (not empty) |

---

## 📱 Mobile Tips

✅ **Works on mobile!**
- Responsive design
- Touch-friendly buttons
- Scrollable tables
- Full-featured

**Recommended**: Use landscape mode for better table view

---

## 🔄 Switching Between Modes

**Normal Billing to GST:**
```
Click "📄 GST Billing" in top-right
```

**GST to Normal Billing:**
```
Click "Normal Billing" button
```

Both have same customer & rates base,  
but different invoice formats!

---

## 📞 Need Help?

1. **Full Guide**: Read `GST_BILLING_GUIDE.md`
2. **Setup Help**: See `GST_BILLING_IMPLEMENTATION.md`
3. **Browser Issue**: Check console (F12)
4. **Contact Admin** for account permissions

---

## ✨ Features at a Glance

| Feature | Status |
|---------|--------|
| Create Tax Invoice | ✅ |
| Multiple Items | ✅ |
| Auto GST Calculation | ✅ |
| Print Ready | ✅ |
| PDF Export | ✅ |
| Customer Database | ✅ |
| Edit Saved Invoice | ✅ |
| Mobile Support | ✅ |
| Dark/Light Mode | ✅ |

---

## 🎉 You're Ready!

1. Go to Billing
2. Click "📄 GST Billing"
3. Select customer
4. Add items
5. Click "Create Invoice"
6. Done! ✅

**Time to create invoice**: ~5-10 minutes

---

**Last Updated**: February 9, 2025
