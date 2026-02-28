import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiX, FiSave, FiPrinter } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { calculateNetWeight, calculateFineWeight, calculateLabourCharge, calculateItemAmount } from '../../utils/billingUtils';

const emptyItem = () => ({
    metalType: 'gold',
    itemName: '',
    pieces: '1',
    grossWeight: '',
    lessWeight: '0',
    netWeight: '',
    melting: '',
    wastage: '0',
    fineWeight: '',
    labourRate: '0',
    amount: '',
    hsnCode: '7108',
});

export default function PurchaseBilling() {
    const { user } = useAuth();
    const [ledgers, setLedgers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState(null);
    const [items, setItems] = useState([emptyItem()]);
    const [formErrors, setFormErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        ledgerId: '',
        date: new Date().toISOString().split('T')[0],
        goldRate: '',
        silverRate: '',
        cashPaid: '',
        narration: '',
        paymentType: 'cash',
        invoiceType: 'normal',      // 'normal' | 'gst'
        invoiceNumber: '',
        // GST fields (only when invoiceType === 'gst')
        gstType: 'CGST_SGST',       // 'IGST' | 'CGST_SGST'
        gstRate: '3',
        sellerGSTNumber: user?.gstNumber || '',
        sellerState: '',
        customerGSTNumber: '',
        customerState: '',
    });

    useEffect(() => {
        ledgerAPI.getAll({ limit: 1000 }).then(r => setLedgers(r.data?.ledgers || [])).catch(() => { });
    }, []);

    const labourType = user?.labourChargeSettings?.type || 'full';

    const calcItem = useCallback((item) => {
        const net = calculateNetWeight(item.grossWeight, item.lessWeight);
        const fine = calculateFineWeight(net, item.melting, item.wastage);
        const rate = item.metalType === 'gold' ? parseFloat(formData.goldRate) || 0 : parseFloat(formData.silverRate) || 0;
        const labour = calculateLabourCharge(item.labourRate, item.grossWeight, labourType);
        const amount = calculateItemAmount(fine, rate, labour);
        return {
            ...item,
            netWeight: net.toFixed(3),
            fineWeight: fine.toFixed(3),
            amount: amount.toFixed(2),
            hsnCode: item.metalType === 'silver' ? '7106' : '7108',
        };
    }, [formData.goldRate, formData.silverRate, labourType]);

    const updateItem = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = calcItem({ ...updated[index], [field]: value });
            return updated;
        });
    };

    const addItem = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const totals = items.reduce((acc, item) => ({
        gross: acc.gross + (parseFloat(item.grossWeight) || 0),
        net: acc.net + (parseFloat(item.netWeight) || 0),
        fine: acc.fine + (parseFloat(item.fineWeight) || 0),
        amount: acc.amount + (parseFloat(item.amount) || 0),
    }), { gross: 0, net: 0, fine: 0, amount: 0 });

    // GST calculation
    const isGST = formData.invoiceType === 'gst';
    const gstRate = parseFloat(formData.gstRate) || 0;
    const taxableValue = totals.amount;
    const gstAmount = isGST ? (taxableValue * gstRate) / 100 : 0;
    const cgst = isGST && formData.gstType === 'CGST_SGST' ? gstAmount / 2 : 0;
    const sgst = isGST && formData.gstType === 'CGST_SGST' ? gstAmount / 2 : 0;
    const igst = isGST && formData.gstType === 'IGST' ? gstAmount : 0;
    const grandTotal = totals.amount + (isGST ? gstAmount : 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = {};
        if (!formData.ledgerId) errors.ledgerId = 'Please select a customer';
        if (items.length === 0) errors.items = 'Add at least one item';
        if (isGST && !formData.sellerGSTNumber) errors.sellerGST = 'Seller GST number required for GST purchase';
        items.forEach((item, i) => {
            if (!item.itemName) errors[`${i}_name`] = 'Item name required';
            if (!item.grossWeight) errors[`${i}_gross`] = 'Gross weight required';
        });
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            toast.error(Object.values(errors)[0]);
            return;
        }
        setFormErrors({});
        setIsLoading(true);
        try {
            const cashPaid = parseFloat(formData.cashPaid) || 0;
            const payload = {
                ledgerId: formData.ledgerId,
                date: formData.date,
                paymentType: formData.paymentType,
                invoiceType: formData.invoiceType,
                invoiceNumber: formData.invoiceNumber || undefined,
                goldRate: parseFloat(formData.goldRate) || 0,
                silverRate: parseFloat(formData.silverRate) || 0,
                items: items.map(item => ({
                    itemName: item.itemName,
                    metalType: item.metalType,
                    pieces: parseInt(item.pieces) || 1,
                    grossWeight: parseFloat(item.grossWeight) || 0,
                    lessWeight: parseFloat(item.lessWeight) || 0,
                    netWeight: parseFloat(item.netWeight) || 0,
                    melting: parseFloat(item.melting) || 0,
                    wastage: parseFloat(item.wastage) || 0,
                    fineWeight: parseFloat(item.fineWeight) || 0,
                    labourRate: parseFloat(item.labourRate) || 0,
                    amount: parseFloat(item.amount) || 0,
                    hsnCode: item.hsnCode || (item.metalType === 'silver' ? '7106' : '7108'),
                })),
                total: grandTotal,
                cashReceived: cashPaid,
                narration: formData.narration || 'Old Gold Purchase',
                voucherType: 'purchase',
                ...(isGST && {
                    gstDetails: {
                        sellerGSTNumber: formData.sellerGSTNumber,
                        sellerState: formData.sellerState,
                        customerGSTNumber: formData.customerGSTNumber,
                        customerState: formData.customerState,
                        gstType: formData.gstType,
                        gstRate,
                        taxableValue,
                        igst,
                        cgst,
                        sgst,
                        totalGST: gstAmount,
                    }
                }),
            };
            await voucherAPI.create(payload);
            toast.success('✅ Purchase voucher created successfully');
            setItems([emptyItem()]);
            setCustomerSearch('');
            setSelectedLedger(null);
            setFormData(prev => ({ ...prev, ledgerId: '', cashPaid: '', narration: '', invoiceNumber: '' }));
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create purchase voucher');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        if (!formData.ledgerId) { toast.error('Select a customer first'); return; }
        const w = window.open('', '_blank');
        const itemsHtml = items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.itemName}</td>
        <td style="text-transform:capitalize">${item.metalType}</td>
        <td>${item.hsnCode || ''}</td>
        <td>${item.grossWeight}</td>
        <td>${item.lessWeight}</td>
        <td>${item.netWeight}</td>
        <td>${item.melting}%</td>
        <td>${item.fineWeight}</td>
        <td style="text-align:right">₹${item.amount}</td>
      </tr>`).join('');

        const gstSection = isGST ? `
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <tr><td style="border:1px solid #000;padding:5px">Taxable Value</td><td style="border:1px solid #000;padding:5px;text-align:right">₹${taxableValue.toFixed(2)}</td></tr>
        ${formData.gstType === 'CGST_SGST' ? `
          <tr><td style="border:1px solid #000;padding:5px">CGST @ ${gstRate / 2}%</td><td style="border:1px solid #000;padding:5px;text-align:right">₹${cgst.toFixed(2)}</td></tr>
          <tr><td style="border:1px solid #000;padding:5px">SGST @ ${gstRate / 2}%</td><td style="border:1px solid #000;padding:5px;text-align:right">₹${sgst.toFixed(2)}</td></tr>
        ` : `
          <tr><td style="border:1px solid #000;padding:5px">IGST @ ${gstRate}%</td><td style="border:1px solid #000;padding:5px;text-align:right">₹${igst.toFixed(2)}</td></tr>
        `}
        <tr style="font-weight:bold"><td style="border:1px solid #000;padding:5px">Grand Total</td><td style="border:1px solid #000;padding:5px;text-align:right">₹${grandTotal.toFixed(2)}</td></tr>
      </table>` : `<p><b>Total: ₹${grandTotal.toFixed(2)}</b></p>`;

        w.document.write(`<!DOCTYPE html><html><head><title>Purchase Receipt</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:5px;font-size:12px}
      th{background:#f0f0f0}.hdr{text-align:center;margin-bottom:12px}.info{display:flex;justify-content:space-between;margin-bottom:10px}
      </style></head><body>
      <div class="hdr">
        <h2 style="margin:0">${user?.shopName || 'JEWELLERY SHOP'}</h2>
        <p style="margin:4px 0">${isGST ? 'GST PURCHASE RECEIPT' : 'PURCHASE RECEIPT / OLD GOLD RECEIPT'}</p>
        ${formData.sellerGSTNumber ? `<p style="margin:2px 0;font-size:11px">GSTIN: ${formData.sellerGSTNumber}</p>` : ''}
        ${formData.invoiceNumber ? `<p style="margin:2px 0;font-size:11px">Invoice No: ${formData.invoiceNumber}</p>` : ''}
      </div>
      <div class="info">
        <div><b>Customer:</b> ${selectedLedger?.name}
          ${formData.customerGSTNumber ? `<br><span style="font-size:11px">GSTIN: ${formData.customerGSTNumber}</span>` : ''}
        </div>
        <div><b>Date:</b> ${new Date(formData.date).toLocaleDateString('en-IN')}</div>
      </div>
      <table><thead><tr><th>Sr</th><th>Item</th><th>Metal</th><th>HSN</th><th>Gross</th><th>Less</th>
        <th>Net</th><th>Melting</th><th>Fine(g)</th><th>Amount</th></tr></thead>
      <tbody>${itemsHtml}</tbody></table>
      <div style="margin-top:12px">${gstSection}</div>
      <p>Amount Paid to Customer: ₹${parseFloat(formData.cashPaid || 0).toFixed(2)}</p>
      ${formData.narration ? `<p>Narration: ${formData.narration}</p>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px;text-align:center">
        <div style="border-top:1px solid #000;padding-top:8px">Customer Signature</div>
        <div style="border-top:1px solid #000;padding-top:8px">Authorised Signatory</div>
      </div>
      <p style="text-align:center;font-size:11px;color:#666;margin-top:20px">Thank you for your business!</p>
      </body></html>`);
        w.document.close();
        setTimeout(() => { w.print(); }, 400);
    };

    const inputStyle = (err) => ({
        padding: '8px 10px',
        borderRadius: 4,
        border: err ? '2px solid #e74c3c' : '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
        color: 'var(--color-text)',
        fontSize: 13,
        width: '100%',
        boxSizing: 'border-box',
    });

    const filteredLedgers = ledgers.filter(l => l.name.toLowerCase().includes(customerSearch.toLowerCase()));

    const canUseGST = user?.gstEnabled !== false; // show GST option if user has GST enabled

    return (
        <Layout>
            <div style={{ padding: 20, maxWidth: 1060, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🛒 Purchase Billing</h1>
                        <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 13 }}>Buy old gold / silver from customers</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {/* Invoice Type Toggle */}
                        {canUseGST && (
                            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
                                {['normal', 'gst'].map(t => (
                                    <button key={t} type="button"
                                        onClick={() => setFormData(f => ({ ...f, invoiceType: t }))}
                                        style={{ padding: '8px 14px', border: 'none', background: formData.invoiceType === t ? 'var(--color-primary)' : 'var(--bg-primary)', color: formData.invoiceType === t ? '#fff' : 'var(--color-text)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                                        {t === 'normal' ? 'Normal' : 'GST Invoice'}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={handlePrint} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <FiPrinter /> Print
                        </button>
                        <button onClick={handleSubmit} disabled={isLoading} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiSave /> {isLoading ? 'Saving...' : 'Save Voucher'}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Top Section */}
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                            {/* Customer */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Customer *</label>
                                <input
                                    placeholder="Search customer..."
                                    value={customerSearch}
                                    onChange={e => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
                                    onFocus={() => setShowDropdown(true)}
                                    style={inputStyle(formErrors.ledgerId)}
                                />
                                {formErrors.ledgerId && <div style={{ color: '#e74c3c', fontSize: 11, marginTop: 3 }}>⚠ {formErrors.ledgerId}</div>}
                                {showDropdown && filteredLedgers.length > 0 && (
                                    <div style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 6, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                        {filteredLedgers.map(l => (
                                            <div key={l._id} onClick={() => { setFormData(f => ({ ...f, ledgerId: l._id, customerGSTNumber: l.gstNumber || '' })); setSelectedLedger(l); setCustomerSearch(l.name); setShowDropdown(false); setFormErrors(e => ({ ...e, ledgerId: undefined })); }}
                                                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
                                                {l.name} {l.phoneNumber && <span style={{ color: 'var(--color-muted)', fontSize: 11 }}>· {l.phoneNumber}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Date */}
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Date</label>
                                <input type="date" value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))} style={inputStyle()} />
                            </div>
                            {/* Invoice # */}
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Invoice Number</label>
                                <input type="text" placeholder="e.g. P-001 (optional)" value={formData.invoiceNumber} onChange={e => setFormData(f => ({ ...f, invoiceNumber: e.target.value }))} style={inputStyle()} />
                            </div>
                            {/* Payment */}
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Payment Mode</label>
                                <select value={formData.paymentType} onChange={e => setFormData(f => ({ ...f, paymentType: e.target.value }))} style={inputStyle()}>
                                    <option value="cash">Cash Payment</option>
                                    <option value="credit">Credit (Pay Later)</option>
                                </select>
                            </div>
                            {/* Rates */}
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Gold Rate (₹/g)</label>
                                <input type="number" placeholder="e.g. 6000" value={formData.goldRate} onChange={e => setFormData(f => ({ ...f, goldRate: e.target.value }))} style={inputStyle()} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Silver Rate (₹/g)</label>
                                <input type="number" placeholder="e.g. 75" value={formData.silverRate} onChange={e => setFormData(f => ({ ...f, silverRate: e.target.value }))} style={inputStyle()} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Cash Paid to Customer (₹)</label>
                                <input type="number" placeholder="0.00" value={formData.cashPaid} onChange={e => setFormData(f => ({ ...f, cashPaid: e.target.value }))} style={inputStyle()} />
                            </div>
                        </div>

                        {/* GST Fields — shown only when GST invoice selected */}
                        {isGST && (
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--border-color)' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-primary)' }}>🧾 GST Details</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>GST Type</label>
                                        <select value={formData.gstType} onChange={e => setFormData(f => ({ ...f, gstType: e.target.value }))} style={inputStyle()}>
                                            <option value="CGST_SGST">CGST + SGST</option>
                                            <option value="IGST">IGST</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>GST Rate (%)</label>
                                        <select value={formData.gstRate} onChange={e => setFormData(f => ({ ...f, gstRate: e.target.value }))} style={inputStyle()}>
                                            <option value="1.5">1.5%</option>
                                            <option value="3">3%</option>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Seller GSTIN *</label>
                                        <input type="text" placeholder="27XXXXX..." value={formData.sellerGSTNumber} onChange={e => setFormData(f => ({ ...f, sellerGSTNumber: e.target.value.toUpperCase() }))} style={inputStyle(formErrors.sellerGST)} maxLength={15} />
                                        {formErrors.sellerGST && <div style={{ color: '#e74c3c', fontSize: 11, marginTop: 3 }}>⚠ {formErrors.sellerGST}</div>}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Seller State</label>
                                        <input type="text" placeholder="Maharashtra" value={formData.sellerState} onChange={e => setFormData(f => ({ ...f, sellerState: e.target.value }))} style={inputStyle()} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Customer GSTIN</label>
                                        <input type="text" placeholder="Customer GSTIN (optional)" value={formData.customerGSTNumber} onChange={e => setFormData(f => ({ ...f, customerGSTNumber: e.target.value.toUpperCase() }))} style={inputStyle()} maxLength={15} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Customer State</label>
                                        <input type="text" placeholder="Customer state" value={formData.customerState} onChange={e => setFormData(f => ({ ...f, customerState: e.target.value }))} style={inputStyle()} />
                                    </div>
                                </div>

                                {/* GST Summary */}
                                <div style={{ marginTop: 12, background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                    <span>Taxable: <b>₹{taxableValue.toFixed(2)}</b></span>
                                    {formData.gstType === 'CGST_SGST' ? (
                                        <>
                                            <span>CGST ({gstRate / 2}%): <b>₹{cgst.toFixed(2)}</b></span>
                                            <span>SGST ({gstRate / 2}%): <b>₹{sgst.toFixed(2)}</b></span>
                                        </>
                                    ) : (
                                        <span>IGST ({gstRate}%): <b>₹{igst.toFixed(2)}</b></span>
                                    )}
                                    <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Grand Total: ₹{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Items Purchased</h3>
                            <button type="button" onClick={addItem} style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <FiPlus /> Add Item
                            </button>
                        </div>
                        {formErrors.items && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 10 }}>⚠ {formErrors.items}</div>}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        {['Metal', 'Item Name', 'Pcs', 'Gross(g)', 'Less(g)', 'Net(g)', 'Melting%', 'Fine(g)', 'Labour', 'Amount(₹)', ''].map(h => (
                                            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '6px 4px' }}>
                                                <select value={item.metalType} onChange={e => updateItem(i, 'metalType', e.target.value)}
                                                    style={{ ...inputStyle(), width: 70, padding: '6px 4px' }}>
                                                    <option value="gold">Gold</option>
                                                    <option value="silver">Silver</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '6px 4px', minWidth: 100 }}>
                                                <input value={item.itemName} onChange={e => updateItem(i, 'itemName', e.target.value)}
                                                    placeholder="Old chain..." style={{ ...inputStyle(formErrors[`${i}_name`]), width: 120 }} />
                                            </td>
                                            {['pieces', 'grossWeight', 'lessWeight', 'netWeight', 'melting', 'fineWeight', 'labourRate', 'amount'].map(field => (
                                                <td key={field} style={{ padding: '6px 4px' }}>
                                                    <input type="number" step="any" value={item[field]}
                                                        onChange={e => updateItem(i, field, e.target.value)}
                                                        readOnly={['netWeight', 'fineWeight', 'amount'].includes(field)}
                                                        style={{ ...inputStyle(formErrors[`${i}_gross`] && field === 'grossWeight'), width: 72, background: ['netWeight', 'fineWeight', 'amount'].includes(field) ? 'var(--bg-secondary)' : undefined }} />
                                                </td>
                                            ))}
                                            <td style={{ padding: '6px 4px' }}>
                                                <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: 4 }}><FiX /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ fontWeight: 700, background: 'var(--bg-secondary)' }}>
                                        <td colSpan={3} style={{ padding: '8px 6px' }}>Totals</td>
                                        <td style={{ padding: '8px 6px' }}>{totals.gross.toFixed(3)}</td>
                                        <td />
                                        <td style={{ padding: '8px 6px' }}>{totals.net.toFixed(3)}</td>
                                        <td />
                                        <td style={{ padding: '8px 6px' }}>{totals.fine.toFixed(3)}</td>
                                        <td />
                                        <td style={{ padding: '8px 6px', color: 'var(--color-primary)' }}>₹{totals.amount.toFixed(2)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Narration & Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Narration</label>
                            <input type="text" placeholder="Old gold purchase..." value={formData.narration} onChange={e => setFormData(f => ({ ...f, narration: e.target.value }))} style={inputStyle()} />
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 200 }}>
                            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>TOTAL PURCHASE VALUE</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-primary)' }}>₹{grandTotal.toFixed(2)}</div>
                            {isGST && <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>incl. GST ₹{gstAmount.toFixed(2)}</div>}
                            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
                                Gold: {items.filter(i => i.metalType === 'gold').reduce((s, i) => s + (parseFloat(i.fineWeight) || 0), 0).toFixed(3)}g &nbsp;
                                Silver: {items.filter(i => i.metalType === 'silver').reduce((s, i) => s + (parseFloat(i.fineWeight) || 0), 0).toFixed(3)}g
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
