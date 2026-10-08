import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI, settlementAPI, itemAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiX, FiSave, FiPrinter, FiShare2, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import html2pdf from 'html2pdf.js';
import { isValidGSTFormat, extractStateFromGST, calculateGST } from '../../utils/gstCalculations';
import { calculateTotals, buildBalanceSnapshot, getEntryWarnings } from '../../utils/billingUtils';
import ConfirmDialog from '../../components/ConfirmDialog';
import PullToRefresh from '../../components/PullToRefresh';
import { SkeletonTable, SkeletonStat } from '../../components/Skeleton';
import ItemScanner from '../../components/ItemScanner';

const SETTLEMENT_PAYMENT_TYPES = ['add_cash', 'add_gold', 'add_silver', 'money_to_gold', 'money_to_silver'];
const FINE_WEIGHT_SETTLEMENT_TYPES = ['add_gold', 'add_silver'];
const DIRECT_SETTLEMENT_PAYMENT_TYPES = ['add_cash', 'money_to_gold', 'money_to_silver'];

// Numeric columns of the items table (cards on phones). Pieces don't change fine or amount.
const ITEM_FIELDS = [
  { key: 'pieces', label: 'Pcs', step: '1', min: '1', inputMode: 'numeric' },
  { key: 'grossWeight', label: 'Gross (g) *', step: '0.001', placeholder: '0.000', required: true },
  { key: 'lessWeight', label: 'Less (g)', step: '0.001', placeholder: '0.000' },
  { key: 'melting', label: 'Melting %', step: '0.1', min: '0', max: '100', placeholder: '0.0' },
  { key: 'wastage', label: 'Wastage (g)', step: '0.001', placeholder: '0.000' },
  { key: 'labourRate', label: 'Labour (₹)', step: '0.01', placeholder: '0.00' }
];

// Voucher Print Template Component
const VoucherTemplate = ({ formData, items, ledgers, user, voucherData }) => {
  const ledger = ledgers.find(l => l._id === formData.ledgerId);

  // Calculate labour charge based on type
  const labourChargeType = user?.labourChargeSettings?.type || 'full';
  let totalLabourCharge = 0;

  items.forEach(item => {
    const labourRate = parseFloat(item.labourRate) || 0;
    const grossWeight = parseFloat(item.grossWeight) || 0;
    const itemLabourCharge = labourChargeType === 'per-gram'
      ? labourRate * grossWeight
      : labourRate;
    totalLabourCharge += itemLabourCharge;
  });

  // Use shared utility — includes wastage total (was previously missing, causing NaN in totals row)
  const totals = {
    ...calculateTotals(items, labourChargeType),
    // keep existing pieces count (calculateTotals already does this but ensure compatibility)
  };

  // Use saved balance snapshot if available (for viewing saved vouchers), otherwise use calculated values
  const snap = voucherData?.balanceSnapshot ?? buildBalanceSnapshot(formData.paymentType, ledger?.balances, items, formData);
  const oldBalanceAmount = snap.oldBalance.totalAmount;
  const oldBalanceGold = snap.oldBalance.goldFineWeight;
  const oldBalanceSilver = snap.oldBalance.silverFineWeight;
  const curBalanceAmount = snap.currentBalance.amount;
  const curBalanceGold = snap.currentBalance.goldFineWeight;
  const curBalanceSilver = snap.currentBalance.silverFineWeight;

  const grandTotal = totals.amount + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0) + (parseFloat(formData.roundOff) || 0);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>{user?.shopName || 'JEWELLERY SHOP'}</h2>
        {user?.phoneNumber && (
          <p style={{ margin: '2px 0', fontSize: '14px', color: '#666' }}>Ph: {user.phoneNumber}</p>
        )}
        <p style={{ margin: '5px 0', fontSize: '16px' }}>SALE RECEIPT</p>
        {formData.invoiceType === 'gst' && (
          <div style={{ margin: '10px 0', padding: '5px 10px', backgroundColor: '#e8f5e9', border: '2px solid #4caf50', borderRadius: '4px', display: 'inline-block', fontSize: '14px', fontWeight: 'bold', color: '#2e7d32' }}>
            GST INVOICE
          </div>
        )}
      </div>

      {/* Top Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
        <div>Name : {ledger?.name || 'N/A'}</div>
        <div>Voucher No : {formData.voucherNumber}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px' }}>
        <div>Date : {new Date(formData.date).toLocaleDateString('en-IN')}</div>
        <div>Page No : 1/1</div>
      </div>



      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Sr</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Item Name</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Metal</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Pcs</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Gross</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Less</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Net Wt</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Wastage</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Fine Wt</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Lab Rt</th>
            <th style={{ border: '1px solid #000', padding: '5px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{index + 1}</td>
              <td style={{ border: '1px solid #000', padding: '5px' }}>{item.itemName}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', color: item.metalType === 'gold' ? 'var(--metal-gold)' : 'var(--metal-silver)', fontWeight: 'bold' }}>{item.metalType === 'gold' ? 'GOLD' : 'SILVER'}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{item.pieces}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.grossWeight).toFixed(3)}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.lessWeight).toFixed(3)}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.netWeight).toFixed(3)}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.wastage).toFixed(3)}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.fineWeight).toFixed(3)}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.labourRate).toFixed(2)}</td>
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.amount).toFixed(2)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
            <td colSpan="3" style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>Total</td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{totals.pieces}</td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{totals.grossWeight.toFixed(3)}</td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{totals.lessWeight.toFixed(3)}</td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{totals.netWeight.toFixed(3)}</td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{totals.wastage.toFixed(3)}</td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{totals.fineWeight.toFixed(3)}</td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{totals.labourRate.toFixed(2)}</td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{totals.amount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Amount Section */}
      <div style={{ marginTop: '20px', fontSize: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Stone Amount :</div>
          <div>{parseFloat(formData.stoneAmount || 0).toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Fine Amount :</div>
          <div>{parseFloat(formData.fineAmount || 0).toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Labour :</div>
          <div>{totals.labourRate.toFixed(2)}</div>
        </div>

        {/* GST Details Section */}
        {formData.invoiceType === 'gst' && formData.gstRate && (
          <div style={{ marginTop: '10px', borderTop: '1px solid #000', paddingTop: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>GST Details</div>
            {(() => {
              const taxableAmount = totals.amount + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0);
              // Determine GST type: same state = CGST+SGST, different state = IGST
              const sellerState = user?.gstSettings?.businessState || null;
              const customerState = ledger?.stateCode || null;
              const gstType = (sellerState && customerState && sellerState === customerState)
                ? 'CGST_SGST'
                : 'IGST';
              const gstCalc = calculateGST(taxableAmount, parseFloat(formData.gstRate), gstType);

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div>Taxable Amount :</div>
                    <div>₹{taxableAmount.toFixed(2)}</div>
                  </div>
                  {gstType === 'IGST' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <div>IGST ({formData.gstRate}%) :</div>
                      <div>₹{gstCalc.igst.toFixed(2)}</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div>CGST ({formData.gstRate / 2}%) :</div>
                        <div>₹{gstCalc.cgst.toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div>SGST ({formData.gstRate / 2}%) :</div>
                        <div>₹{gstCalc.sgst.toFixed(2)}</div>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                    <div>Total GST :</div>
                    <div>₹{gstCalc.totalGST.toFixed(2)}</div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <div>Net Balance :</div>
          <div>₹{((totals.amount + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0) + (parseFloat(formData.roundOff) || 0)) - (parseFloat(formData.cashReceived) || 0)).toFixed(2)}</div>
        </div>
        {formData.narration && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <div>Narration :</div>
            <div style={{ maxWidth: '60%', textAlign: 'right' }}>{formData.narration}</div>
          </div>
        )}
      </div>

      {/* Rates and Balance Section */}
      <div style={{ marginTop: '20px', fontSize: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Gold Rate :</div>
          <div>{parseFloat(formData.goldRate || 0).toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Silver Rate :</div>
          <div>{parseFloat(formData.silverRate || 0).toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Issue</div>
          <div>{parseFloat(formData.issueGross || 0).toFixed(3)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Receipt</div>
          <div>{parseFloat(formData.receiptGross || 0).toFixed(3)}</div>
        </div>

        {/* Balance Details - Separate Boxes */}
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <div>Cash Received</div>
            <div>₹{parseFloat(formData.cashReceived || 0).toFixed(2)}</div>
          </div>
          {parseFloat(formData.roundOff || 0) !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <div>Round Off</div>
              <div style={{ color: parseFloat(formData.roundOff) > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>₹{parseFloat(formData.roundOff || 0).toFixed(2)}</div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontWeight: 'bold' }}>
            <div>Net Balance</div>
            <div>₹{((totals.amount + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0) + (parseFloat(formData.roundOff) || 0)) - (parseFloat(formData.cashReceived) || 0)).toFixed(2)}</div>
          </div>

          {/* Balance Details Section - Side by Side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
            {/* Old Balance Details Box — hardcoded colors for print safety (no CSS vars) */}
            <div style={{ border: '1px solid #000000', padding: '10px', backgroundColor: '#ffffff' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>Old Balance Details</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                <div>Old Bal Amount</div>
                <div>₹{oldBalanceAmount?.toFixed(2) || '0.00'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                <div>Old Bal Gold Fine Wt</div>
                {/* Dark gold — visible on white paper (#FFD700 is invisible) */}
                <div style={{ color: 'var(--metal-gold)', fontWeight: 'bold' }}>{oldBalanceGold?.toFixed(3) || '0.000'} g</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <div>Old Bal Silver Fine Wt</div>
                {/* Dark grey — visible on white paper (#C0C0C0 is invisible) */}
                <div style={{ color: '#555555', fontWeight: 'bold' }}>{oldBalanceSilver?.toFixed(3) || '0.000'} g</div>
              </div>
            </div>

            {/* Current Balance Details Box */}
            <div style={{ border: '1px solid #000000', padding: '10px', backgroundColor: '#ffffff' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>Current Balance Details ({formData.paymentType === 'credit' ? 'Credit Bill' : 'Cash Bill'})</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                <div>Cur Bal Amount</div>
                <div>₹{curBalanceAmount?.toFixed(2) || '0.00'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                <div>Cur Bal Gold Fine Wt</div>
                <div style={{ color: 'var(--metal-gold)', fontWeight: 'bold' }}>{curBalanceGold?.toFixed(3) || '0.000'} g</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                <div>Cur Bal Silver Fine Wt</div>
                <div style={{ color: '#555555', fontWeight: 'bold' }}>{curBalanceSilver?.toFixed(3) || '0.000'} g</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                <div>Receipt Gross (Entry Fine)</div>
                <div>{totals.fineWeight.toFixed(3)} g</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Billing() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const voucherid = searchParams.get('voucherid');
  const [ledgers, setLedgers] = useState([]);
  const [showAddLedgerModal, setShowAddLedgerModal] = useState(false);
  const [ledgerFormData, setLedgerFormData] = useState({
    name: '',
    phoneNumber: '',
    oldBalAmount: '',
    oldBalGold: '',
    oldBalSilver: '',
    hasGST: false,
    gstNumber: '',
    stateCode: ''
  });
  const [addingLedger, setAddingLedger] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [formData, setFormData] = useState({
    ledgerId: '',
    date: new Date().toISOString().split('T')[0],
    voucherNumber: '',
    paymentType: 'cash',
    goldRate: '',
    silverRate: '',
    stoneAmount: '',
    fineAmount: '',
    issueGross: '',
    receiptGross: '',
    narration: '',
    cashReceived: '',
    roundOff: '0',
    invoiceType: 'normal',
    gstRate: ''
  });
  const [items, setItems] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [savedVoucherData, setSavedVoucherData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [entryWarnings, setEntryWarnings] = useState(null);
  // Inline form validation errors — keyed by field name
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchLedgers();
  }, []);

  // Load voucher data when voucherid is in URL query
  useEffect(() => {
    if (voucherid) {
      loadVoucherData(voucherid);
    }
  }, [voucherid]);

  // Update customer search when ledgerId changes (fixes customer name not showing on edit/preview)
  useEffect(() => {
    if (formData.ledgerId && ledgers.length > 0) {
      const selectedCustomer = ledgers.find(l => l._id === formData.ledgerId);
      if (selectedCustomer) {
        setCustomerSearch(selectedCustomer.name);
      }
    }
  }, [formData.ledgerId, ledgers]);

  const loadVoucherData = async (id) => {
    try {
      const response = await voucherAPI.getOne(id);
      const voucher = response.data.voucher;

      setEditingVoucherId(id);
      setSavedVoucherData(voucher);
      setFormData({
        ledgerId: voucher.ledgerId,
        date: voucher.date.split('T')[0],
        voucherNumber: voucher.voucherNumber,
        paymentType: voucher.paymentType,
        goldRate: voucher.goldRate || '',
        silverRate: voucher.silverRate || '',
        stoneAmount: voucher.stoneAmount || '',
        fineAmount: voucher.fineAmount || '',
        issueGross: voucher.issue?.gross || '',
        receiptGross: voucher.receipt?.gross || '',
        narration: voucher.narration || '',
        cashReceived: voucher.cashReceived || '',
        roundOff: voucher.roundOff || '0',
        invoiceType: voucher.invoiceType || 'normal',
        gstRate: voucher.gstDetails?.gstRate || ''
      });

      setItems(voucher.items || []);
      toast.success('Voucher loaded successfully');
    } catch (error) {
      console.error('Error loading voucher:', error);
      toast.error('Failed to load voucher data');
    }
  };

  useEffect(() => {
    if (user?.voucherSettings?.autoIncrement) {
      setFormData(prev => ({
        ...prev,
        voucherNumber: user.voucherSettings.currentVoucherNumber || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const totalGross = items.reduce((sum, item) => {
      const gross = parseFloat(item.grossWeight);
      return sum + (isNaN(gross) ? 0 : gross);
    }, 0);

    setFormData(prev => ({
      ...prev,
      issueGross: totalGross.toFixed(3)
    }));
  }, [items]);

  useEffect(() => {
    // Auto-fetch ledger data when ledgerId changes
    if (formData.ledgerId && ledgers.length > 0) {
      const ledger = ledgers.find(l => l._id === formData.ledgerId);
      if (ledger) {
        setSelectedLedger(ledger);


      }
    } else {
      setSelectedLedger(null);
    }
  }, [formData.ledgerId, ledgers, user?.gstEnabled]);

  // Close dropdown when clicking outside (fixes dropdown getting stuck)
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const customerDropdownContainer = document.querySelector('[data-customer-dropdown]');
      if (customerDropdownContainer && !customerDropdownContainer.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [showCustomerDropdown]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showCustomerDropdown) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [showCustomerDropdown]);

  // Recalculate all items when Gold/Silver rates change
  useEffect(() => {
    if (items.length > 0) {
      setItems(prevItems => {
        return prevItems.map((item) => {
          const grossWeight = parseFloat(item.grossWeight) || 0;
          const lessWeight = parseFloat(item.lessWeight) || 0;
          const melting = parseFloat(item.melting) || 0;
          const wastage = parseFloat(item.wastage) || 0;
          const labourRate = parseFloat(item.labourRate) || 0;

          const netWeight = grossWeight - lessWeight;
          const fineWeight = (netWeight * (melting / 100)) + wastage;

          const rate = item.metalType === 'gold'
            ? (parseFloat(formData.goldRate) || 0)
            : (parseFloat(formData.silverRate) || 0);

          // Apply labour charge type setting
          const labourChargeType = user?.labourChargeSettings?.type || 'full';
          const calculatedLabourCharge = labourChargeType === 'per-gram'
            ? labourRate * grossWeight
            : labourRate;

          const amount = (fineWeight * rate) + calculatedLabourCharge;

          return {
            ...item,
            netWeight: netWeight.toFixed(3),
            fineWeight: fineWeight.toFixed(3),
            amount: amount.toFixed(2)
          };
        });
      });
    }
  }, [formData.goldRate, formData.silverRate, user?.labourChargeSettings?.type]);

  const fetchLedgers = async () => {
    setIsLoading(true);
    try {
      const response = await ledgerAPI.getAll({ type: 'regular' });
      if (response?.data?.ledgers) {
        setLedgers(response.data.ledgers);
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      toast.error('Failed to load ledgers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchLedgers();
    toast.success('Data refreshed!');
  };

  const handleAddLedgerSubmit = async (e) => {
    e.preventDefault();

    if (!ledgerFormData.name) {
      toast.error('Please enter customer name');
      return;
    }

    // GST validation removed from regular billing

    setAddingLedger(true);
    try {
      const submitData = {
        name: ledgerFormData.name,
        phoneNumber: ledgerFormData.phoneNumber,
        openingBalance: {
          amount: parseFloat(ledgerFormData.oldBalAmount) || 0,
          goldFineWeight: parseFloat(ledgerFormData.oldBalGold) || 0,
          silverFineWeight: parseFloat(ledgerFormData.oldBalSilver) || 0
        },
        ledgerType: 'regular' // Ensure new ledgers created here are regular
      };

      await ledgerAPI.create(submitData);
      toast.success('Ledger created successfully');
      setShowAddLedgerModal(false);
      setLedgerFormData({
        name: '',
        phoneNumber: '',
        oldBalAmount: '',
        oldBalGold: '',
        oldBalSilver: '',
        hasGST: false,
        gstNumber: '',
        stateCode: ''
      });
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ledger');
    } finally {
      setAddingLedger(false);
    }
  };

  const calculateItem = useCallback((index) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const item = newItems[index];

      const grossWeight = parseFloat(item.grossWeight) || 0;
      const lessWeight = parseFloat(item.lessWeight) || 0;
      const melting = parseFloat(item.melting) || 0;
      const wastage = parseFloat(item.wastage) || 0;
      const labourRate = parseFloat(item.labourRate) || 0;

      const netWeight = grossWeight - lessWeight;
      const fineWeight = (netWeight * (melting / 100)) + wastage;

      const rate = item.metalType === 'gold'
        ? (parseFloat(formData.goldRate) || 0)
        : (parseFloat(formData.silverRate) || 0);

      // Apply labour charge type setting
      const labourChargeType = user?.labourChargeSettings?.type || 'full';
      const calculatedLabourCharge = labourChargeType === 'per-gram'
        ? labourRate * grossWeight
        : labourRate;

      const amount = (fineWeight * rate) + calculatedLabourCharge;

      newItems[index] = {
        ...item,
        netWeight: netWeight.toFixed(3),
        fineWeight: fineWeight.toFixed(3),
        amount: amount.toFixed(2)
      };

      return newItems;
    });
  }, [formData.goldRate, formData.silverRate, user?.labourChargeSettings?.type]);

  const addRow = useCallback((metalType) => {
    setItems(prev => [...prev, {
      metalType,
      itemName: '',
      pieces: 1,
      grossWeight: '',
      lessWeight: '',
      netWeight: '',
      melting: '',
      wastage: '',
      fineWeight: '',
      labourRate: '',
      amount: ''
    }]);
  }, []);

  const deleteRow = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = newItems[index];
      item[field] = value;

      // Recalculate amount when relevant fields change
      if (['grossWeight', 'lessWeight', 'melting', 'wastage', 'labourRate'].includes(field)) {
        const grossWeight = parseFloat(item.grossWeight) || 0;
        const lessWeight = parseFloat(item.lessWeight) || 0;
        const melting = parseFloat(item.melting) || 0;
        const wastage = parseFloat(item.wastage) || 0;
        const labourRate = parseFloat(item.labourRate) || 0;

        const netWeight = grossWeight - lessWeight;
        const fineWeight = (netWeight * (melting / 100)) + wastage;

        const rate = item.metalType === 'gold'
          ? (parseFloat(formData.goldRate) || 0)
          : (parseFloat(formData.silverRate) || 0);

        // Apply labour charge type setting
        const labourChargeType = user?.labourChargeSettings?.type || 'full';
        const calculatedLabourCharge = labourChargeType === 'per-gram'
          ? labourRate * grossWeight
          : labourRate;

        const amount = (fineWeight * rate) + calculatedLabourCharge;

        item.netWeight = netWeight.toFixed(3);
        item.fineWeight = fineWeight.toFixed(3);
        item.amount = amount.toFixed(2);
      }

      newItems[index] = item;
      return newItems;
    });
  }, [formData.goldRate, formData.silverRate, user?.labourChargeSettings?.type]);

  // Handle scanned item from item scanner (item mode only)
  const handleItemScanned = useCallback((scannedItem) => {
    // Convert database item to invoice item format
    const newInvoiceItem = {
      metalType: scannedItem.metal,
      itemName: scannedItem.name,
      pieces: 1,
      grossWeight: scannedItem.grossWeight.toString(),
      lessWeight: scannedItem.lessWeight.toString(),
      netWeight: scannedItem.netWeight.toFixed(3),
      melting: scannedItem.meltingPercent ? scannedItem.meltingPercent.toString() : '0',
      wastage: scannedItem.wastage ? scannedItem.wastage.toString() : '0',
      fineWeight: '',
      labourRate: scannedItem.labour ? scannedItem.labour.toString() : '0',
      amount: '',
      hsnCode: scannedItem.hsnCode || (scannedItem.metal === 'gold' ? '7113' : '7114'),
      _itemId: scannedItem._id // Track original item ID for marking as sold
    };

    // Calculate net weight and fine weight using updateItem logic
    const grossWeight = parseFloat(newInvoiceItem.grossWeight) || 0;
    const lessWeight = parseFloat(newInvoiceItem.lessWeight) || 0;
    const melting = parseFloat(newInvoiceItem.melting) || 0;
    const wastage = parseFloat(newInvoiceItem.wastage) || 0;
    const labourRate = parseFloat(newInvoiceItem.labourRate) || 0;

    const netWeight = grossWeight - lessWeight;
    const fineWeight = (netWeight * (melting / 100)) + wastage;

    const rate = newInvoiceItem.metalType === 'gold'
      ? (parseFloat(formData.goldRate) || 0)
      : (parseFloat(formData.silverRate) || 0);

    const labourChargeType = user?.labourChargeSettings?.type || 'full';
    const calculatedLabourCharge = labourChargeType === 'per-gram'
      ? labourRate * grossWeight
      : labourRate;

    const amount = (fineWeight * rate) + calculatedLabourCharge;

    newInvoiceItem.netWeight = netWeight.toFixed(3);
    newInvoiceItem.fineWeight = fineWeight.toFixed(3);
    newInvoiceItem.amount = amount.toFixed(2);

    // Add to items array
    setItems(prev => [...prev, newInvoiceItem]);
    toast.success(`✓ ${scannedItem.name} added to invoice`);
  }, [formData.goldRate, formData.silverRate, user?.labourChargeSettings?.type]);

  const calculateTotals = useCallback(() => {
    // Calculate labour charge based on type
    const labourChargeType = user?.labourChargeSettings?.type || 'full';
    let totalLabourCharge = 0;

    items.forEach(item => {
      const labourRate = parseFloat(item.labourRate) || 0;
      const grossWeight = parseFloat(item.grossWeight) || 0;
      const itemLabourCharge = labourChargeType === 'per-gram'
        ? labourRate * grossWeight
        : labourRate;
      totalLabourCharge += itemLabourCharge;
    });

    return items.reduce((acc, item) => {
      const pieces = parseInt(item.pieces) || 0;
      const grossWeight = parseFloat(item.grossWeight) || 0;
      const lessWeight = parseFloat(item.lessWeight) || 0;
      const netWeight = parseFloat(item.netWeight) || 0;
      const melting = parseFloat(item.melting) || 0;
      const wastage = parseFloat(item.wastage) || 0;
      const fineWeight = parseFloat(item.fineWeight) || 0;
      const amount = parseFloat(item.amount) || 0;

      return {
        pieces: acc.pieces + pieces,
        grossWeight: acc.grossWeight + grossWeight,
        lessWeight: acc.lessWeight + lessWeight,
        netWeight: acc.netWeight + netWeight,
        melting: acc.melting + melting,
        wastage: acc.wastage + wastage,
        fineWeight: acc.fineWeight + fineWeight,
        labourRate: totalLabourCharge,
        amount: acc.amount + amount
      };
    }, {
      pieces: 0,
      grossWeight: 0,
      lessWeight: 0,
      netWeight: 0,
      melting: 0,
      wastage: 0,
      fineWeight: 0,
      labourRate: 0,
      amount: 0
    });
  }, [items, user?.labourChargeSettings?.type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.ledgerId) {
      errors.ledgerId = 'Please select a customer';
    }

    // Gold/silver fine settlement modes use the same item table as cash bills.
    const isSettlementType = SETTLEMENT_PAYMENT_TYPES.includes(formData.paymentType);
    const isFineWeightSettlement = FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType);
    const usesItemTable = !isSettlementType || isFineWeightSettlement;

    if (usesItemTable) {
      if (items.length === 0) {
        errors.items = isFineWeightSettlement ? 'Please add at least one fine weight row' : 'Please add at least one item';
      } else {
        const itemErrors = {};
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item.itemName || item.itemName.trim() === '') {
            itemErrors[`${i}_itemName`] = 'Item name is required';
          }
          if (item.grossWeight === '' || item.grossWeight === null || item.grossWeight === undefined) {
            itemErrors[`${i}_grossWeight`] = 'Gross weight is required';
          }
        }
        if (Object.keys(itemErrors).length > 0) {
          Object.assign(errors, itemErrors);
        }
      }

      if (isFineWeightSettlement && calculateTotals().fineWeight <= 0) {
        errors.items = 'Fine weight must be greater than 0';
      }
    } else {
      const settlementValue = parseFloat(formData.cashReceived);
      if (!Number.isFinite(settlementValue) || settlementValue === 0) {
        errors.cashReceived = 'Please enter a valid amount';
      }
      if (formData.paymentType === 'money_to_gold' && (parseFloat(formData.goldRate) || 0) <= 0) {
        errors.goldRate = 'Gold rate must be greater than 0';
      }
      if (formData.paymentType === 'money_to_silver' && (parseFloat(formData.silverRate) || 0) <= 0) {
        errors.silverRate = 'Silver rate must be greater than 0';
      }
    }

    // Validate GST fields if GST invoice is selected
    if (formData.invoiceType === 'gst') {
      if (!formData.gstRate || parseFloat(formData.gstRate) < 0) {
        errors.gstRate = 'Please select a valid GST rate';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Show first error as toast for quick feedback
      toast.error(Object.values(errors)[0]);
      return;
    }

    // Clear errors on successful validation
    setFormErrors({});

    const cleanedItems = items.map(item => ({
      sourceItemId: item._itemId || undefined,
      metalType: item.metalType,
      itemName: item.itemName,
      pieces: parseInt(item.pieces) || 0,
      grossWeight: parseFloat(item.grossWeight) || 0,
      lessWeight: parseFloat(item.lessWeight) || 0,
      netWeight: parseFloat(item.netWeight) || 0,
      melting: parseFloat(item.melting) || 0,
      wastage: parseFloat(item.wastage) || 0,
      fineWeight: parseFloat(item.fineWeight) || 0,
      labourRate: parseFloat(item.labourRate) || 0,
      amount: parseFloat(item.amount) || 0
    }));

    const cashReceivedValue = isFineWeightSettlement
      ? calculateTotals().fineWeight
      : (parseFloat(formData.cashReceived) || 0);

    const voucherData = {
      ledgerId: formData.ledgerId,
      date: formData.date,
      voucherNumber: formData.voucherNumber,
      paymentType: formData.paymentType,
      goldRate: parseFloat(formData.goldRate) || 0,
      silverRate: parseFloat(formData.silverRate) || 0,
      stoneAmount: parseFloat(formData.stoneAmount) || 0,
      fineAmount: parseFloat(formData.fineAmount) || 0,
      items: cleanedItems,
      issue: { gross: parseFloat(formData.issueGross) || 0 },
      receipt: { gross: parseFloat(formData.receiptGross) || 0 },
      narration: formData.narration,
      cashReceived: cashReceivedValue,
      roundOff: parseFloat(formData.roundOff) || 0,
      invoiceType: formData.invoiceType,
      ...(formData.invoiceType === 'gst' && {
        gstDetails: {
          gstRate: parseFloat(formData.gstRate) || 0
        }
      })
    };

    // Likely mistakes (overpayment, wrong weights, future date): explain and let the user decide
    const warnings = getEntryWarnings(formData.paymentType, editingVoucherId ? null : selectedLedger?.balances, cleanedItems, formData);
    if (warnings.length > 0) {
      setEntryWarnings({ warnings, onConfirm: () => saveVoucher(voucherData) });
      return;
    }
    await saveVoucher(voucherData);
  };

  const saveVoucher = async (voucherData) => {
    // Ref, not state: two quick taps can both run before a re-render
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    let saved = false;
    try {
      const isSettlementType = SETTLEMENT_PAYMENT_TYPES.includes(formData.paymentType);
      const isItemModeBilling = user?.stockMode === 'item' && !isSettlementType;

      let voucherId;
      let createdNewVoucher = false;
      if (editingVoucherId) {
        await voucherAPI.update(editingVoucherId, voucherData);
        voucherId = editingVoucherId;
      } else {
        const response = await voucherAPI.create(voucherData);
        voucherId = response.data.voucher?._id;
        createdNewVoucher = true;
      }

      // Mark items as sold (item mode only)
      if (isItemModeBilling && voucherId) {
        const itemIdsToMarkSold = items
          .filter(item => item._itemId)
          .map(item => item._itemId);

        if (itemIdsToMarkSold.length > 0) {
          try {
            const markSoldRes = await itemAPI.markSoldBatch(itemIdsToMarkSold, voucherId);
            const failedItems = markSoldRes?.data?.results?.failed || [];
            if (failedItems.length > 0) {
              throw new Error(failedItems[0]?.reason || 'Failed to mark one or more items as sold');
            }
          } catch (itemError) {
            console.error('Failed to mark items as sold:', itemError);
            const markSoldErrorMessage = itemError?.response?.data?.message || itemError?.message || 'Failed to mark items as sold';

            if (createdNewVoucher) {
              try {
                await voucherAPI.delete(voucherId);
                toast.error(`Voucher was not saved: ${markSoldErrorMessage}`);
                return;
              } catch (rollbackError) {
                console.error('Voucher rollback failed after item mark-sold failure:', rollbackError);
                toast.warning('Voucher saved, but item sale sync failed. Please resolve from stock/invoice records.');
                return;
              }
            }

            toast.warning(`Voucher updated, but item sale sync failed: ${markSoldErrorMessage}`);
            return;
          }
        }
      }

      toast.success(
        editingVoucherId
          ? (isSettlementType ? 'Settlement updated successfully!' : 'Voucher updated successfully!')
          : (isSettlementType ? 'Settlement created successfully! Balance updated.' : 'Voucher created successfully!')
      );

      // Stay locked until the reload so the same entry can't be saved twice
      saved = true;
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving voucher:', error);
      toast.error(error.response?.data?.message || 'Failed to save voucher');
    } finally {
      if (!saved) {
        savingRef.current = false;
        setIsSaving(false);
      }
    }
  };

  // WhatsApp share — generates plain-text summary and opens wa.me
  const handleWhatsAppShare = useCallback(() => {
    const ledger = selectedLedger || ledgers.find(l => l._id === formData.ledgerId);
    if (!ledger) { toast.error('Please select a customer first'); return; }
    const t = calculateTotals();
    const phone = ledger.phoneNumber ? String(ledger.phoneNumber).replace(/\D/g, '') : '';
    const lines = [
      `*${user?.shopName || 'JEWELLERY SHOP'} — SALE RECEIPT*`,
      `Date: ${new Date(formData.date).toLocaleDateString('en-IN')}`,
      `Customer: ${ledger.name}`,
      formData.voucherNumber ? `Voucher No: ${formData.voucherNumber}` : '',
      ``,
      ...items.map((item, i) =>
        `${i + 1}. ${item.itemName} (${item.metalType}) | Fine: ${parseFloat(item.fineWeight || 0).toFixed(3)}g | ₹${parseFloat(item.amount || 0).toFixed(2)}`
      ),
      ``,
      `*Total: \u20b9${(t.amount + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0)).toFixed(2)}*`,
      formData.cashReceived ? `Cash Received: ₹${parseFloat(formData.cashReceived).toFixed(2)}` : '',
      formData.narration ? `Note: ${formData.narration}` : '',
      ``,
      `Thank you for your business! 🙏`,
    ].filter(Boolean).join('\n');
    const waUrl = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(lines)}`
      : `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(waUrl, '_blank');
  }, [selectedLedger, ledgers, formData, items, user, calculateTotals]);

  const handlePrint = useCallback(() => {
    if (items.length === 0) {
      toast.error('Please add items before printing');
      return;
    }

    const selectedLedger = ledgers.find(l => l._id === formData.ledgerId);
    const totals = calculateTotals();

    // Use saved balance snapshot if available, otherwise calculate
    const snap = savedVoucherData?.balanceSnapshot ?? buildBalanceSnapshot(formData.paymentType, selectedLedger?.balances, items, formData);
    const oldBalanceAmount = snap.oldBalance.totalAmount;
    const oldBalanceGold = snap.oldBalance.goldFineWeight;
    const oldBalanceSilver = snap.oldBalance.silverFineWeight;
    const curBalanceAmount = snap.currentBalance.amount;
    const curBalanceGold = snap.currentBalance.goldFineWeight;
    const curBalanceSilver = snap.currentBalance.silverFineWeight;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    const voucherHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; font-size: 12px; }
          tr, th, td { page-break-inside: avoid; break-inside: avoid; }
          thead { display: table-header-group; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f0f0f0; }
          .balance-box { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; background-color: #fafafa; page-break-inside: avoid; break-inside: avoid; }
          .balance-label { font-weight: bold; margin-bottom: 8px; font-size: 12px; }
          .balance-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
          @media print { body { margin: 0; padding: 10px; } }
        </style>
      </head>
      <body>
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 24px; font-weight: bold;">${user?.shopName || 'JEWELLERY SHOP'}</h2>
            ${user?.phoneNumber ? `<p style="margin: 2px 0; font-size: 14px; color: #666;">Ph: ${user.phoneNumber}</p>` : ''}
            <p style="margin: 5px 0; font-size: 16px;">SALE RECEIPT</p>
            ${formData.invoiceType === 'gst' ? '<div style="margin: 10px 0; padding: 5px 10px; background-color: #e8f5e9; border: 2px solid #4caf50; border-radius: 4px; display: inline-block; font-size: 14px; font-weight: bold; color: #2e7d32;">📄 GST INVOICE</div>' : ''}
          </div>

          <!-- Top Info -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
            <div>
              <div>Customer Name</div>
              <div style="font-weight: bold;">${selectedLedger?.name || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div>Voucher No</div>
              <div style="font-weight: bold;">${formData.voucherNumber}</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
            <div>Date: ${new Date(formData.date).toLocaleDateString('en-IN')}</div>
            <div>Time: ${new Date(formData.date).toLocaleTimeString('en-IN')}</div>
          </div>

          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th>Sr</th>
                <th>Item Name</th>
                <th>Metal</th>
                <th>Pcs</th>
                <th>Gross (g)</th>
                <th>Less (g)</th>
                <th>Net (g)</th>
                <th>Wastage</th>
                <th>Fine (g)</th>
                <th>Labour (₹)</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${item.itemName}</td>
                  <td style="text-align: center; color: ${item.metalType === 'gold' ? '#B8860B' : '#555555'}; font-weight: bold;">${item.metalType === 'gold' ? 'GOLD' : 'SILVER'}</td>
                  <td style="text-align: center;">${item.pieces}</td>
                  <td style="text-align: right;">${parseFloat(item.grossWeight).toFixed(3)}</td>
                  <td style="text-align: right;">${parseFloat(item.lessWeight).toFixed(3)}</td>
                  <td style="text-align: right;">${parseFloat(item.netWeight).toFixed(3)}</td>
                  <td style="text-align: right;">${parseFloat(item.wastage).toFixed(3)}</td>
                  <td style="text-align: right;">${parseFloat(item.fineWeight).toFixed(3)}</td>
                  <td style="text-align: right;">${parseFloat(item.labourRate).toFixed(2)}</td>
                  <td style="text-align: right;">${parseFloat(item.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: center;">TOTAL</td>
                <td style="text-align: center;">${totals.pieces}</td>
                <td style="text-align: right;">${totals.grossWeight.toFixed(3)}</td>
                <td style="text-align: right;">${totals.lessWeight.toFixed(3)}</td>
                <td style="text-align: right;">${totals.netWeight.toFixed(3)}</td>
                <td style="text-align: right;">${totals.wastage.toFixed(3)}</td>
                <td style="text-align: right;">${totals.fineWeight.toFixed(3)}</td>
                <td style="text-align: right;">${totals.labourRate.toFixed(2)}</td>
                <td style="text-align: right;">${totals.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Amount Summary and Rates -->
          <div class="avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 14px;">
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Amount Summary</div>
              <div style="display: flex; justify-content: space-between;">
                <div>Labour Amount:</div>
                <div>₹${totals.labourRate.toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <div>Stone Amount:</div>
                <div>\u20b9${parseFloat(formData.stoneAmount || 0).toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <div>Fine Amount:</div>
                <div>\u20b9${parseFloat(formData.fineAmount || 0).toFixed(2)}</div>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px; padding-top: 5px; border-top: 1px solid #ddd;">
                <div>Grand Total:</div>
                <div style="color: #e74c3c;">₹${totals.amount.toFixed(2)}</div>
              </div>
            </div>
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Rates</div>
              <div style="display: flex; justify-content: space-between;">
                <div>Gold Rate:</div>
                <div>₹${parseFloat(formData.goldRate || 0).toFixed(2)}/g</div>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <div>Silver Rate:</div>
                <div>₹${parseFloat(formData.silverRate || 0).toFixed(2)}/g</div>
              </div>
            </div>
          </div>

          <!-- Balance Details Section -->
          <div class="avoid-break" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #000;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div>Cash Received</div>
              <div>₹${parseFloat(formData.cashReceived || 0).toFixed(2)}</div>
            </div>
            ${parseFloat(formData.roundOff || 0) !== 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div>Round Off</div>
                <div style="color: ${parseFloat(formData.roundOff) > 0 ? '#27ae60' : '#e74c3c'};">₹${parseFloat(formData.roundOff || 0).toFixed(2)}</div>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-weight: bold;">
              <div>Net Balance</div>
              <div>\u20b9${((totals.amount + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0) + (parseFloat(formData.roundOff) || 0)) - (parseFloat(formData.cashReceived) || 0)).toFixed(2)}</div>
            </div>

            <!-- Rates and Cash Received Section -->
            <div class="avoid-break" style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div style="font-weight: bold;">Gold Rate:</div>
                <div>₹${parseFloat(formData.goldRate || 0).toFixed(2)}/g</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <div style="font-weight: bold;">Silver Rate:</div>
                <div>₹${parseFloat(formData.silverRate || 0).toFixed(2)}/g</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                <div style="font-weight: bold;">Cash Received:</div>
                <div style="font-weight: bold; color: #27ae60;">₹${parseFloat(formData.cashReceived || 0).toFixed(2)}</div>
              </div>
            </div>

            <!-- Old Balance Details Box -->
            <div class="balance-box">
              <div class="balance-label">Old Balance Details</div>
              <div class="balance-row">
                <div>Old Bal Amount</div>
                <div>₹${oldBalanceAmount?.toFixed(2) || '0.00'}</div>
              </div>
              <div class="balance-row">
                <div>Old Bal Gold Fine Wt</div>
                <div style="color: #B8860B; font-weight: bold;">${oldBalanceGold?.toFixed(3) || '0.000'} g</div>
              </div>
              <div class="balance-row">
                <div>Old Bal Silver Fine Wt</div>
                <div style="color: #555555; font-weight: bold;">${oldBalanceSilver?.toFixed(3) || '0.000'} g</div>
              </div>
            </div>

            <!-- Current Balance Details Box -->
            <div class="balance-box">
              <div class="balance-label">Current Balance Details (${formData.paymentType === 'credit' ? 'Credit Bill' : 'Cash Bill'})</div>
              <div class="balance-row">
                <div>Cur Bal Amount</div>
                <div>₹${curBalanceAmount?.toFixed(2) || '0.00'}</div>
              </div>
              <div class="balance-row">
                <div>Cur Bal Gold Fine Wt</div>
                <div style="color: #B8860B; font-weight: bold;">${curBalanceGold?.toFixed(3) || '0.000'} g</div>
              </div>
              <div class="balance-row">
                <div>Cur Bal Silver Fine Wt</div>
                <div style="color: #555555; font-weight: bold;">${curBalanceSilver?.toFixed(3) || '0.000'} g</div>
              </div>
              <div class="balance-row" style="font-weight: bold;">
                <div>Receipt Gross (Entry Fine)</div>
                <div>${totals.fineWeight.toFixed(3)} g</div>
              </div>
            </div>
          </div>
        </div>
          <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div style="text-align: center; border-top: 1px solid #000; padding-top: 12px; font-size: 13px; color: #666;">Customer Signature</div>
            <div style="text-align: center; border-top: 1px solid #000; padding-top: 12px; font-size: 13px; color: #666;">Authorised Signatory</div>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
            <p style="margin: 2px 0;">Thank you for your business!</p>
            <p style="margin: 2px 0;">Generated on ${new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(voucherHTML);
    printWindow.document.close();
  }, [items, ledgers, formData, user, calculateTotals, savedVoucherData, selectedLedger]);

  const handleShare = async () => {
    if (items.length === 0) {
      toast.error('Please add items before sharing');
      return;
    }

    if (!formData.ledgerId) {
      toast.error('Please select a customer');
      return;
    }

    try {
      const ledger = ledgers.find(l => l._id === formData.ledgerId);

      if (!ledger) {
        toast.error('Please select a customer');
        return;
      }

      // Calculate grandTotal
      const totals = calculateTotals();
      const grandTotal = totals.amount + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0);
      const shareSnap = savedVoucherData?.balanceSnapshot ?? buildBalanceSnapshot(formData.paymentType, ledger.balances, items, formData);

      // Create professional voucher content
      // IMPORTANT: Force light mode colors for PDF to work in both light and dark app themes
      const voucherContent = document.createElement('div');
      voucherContent.innerHTML = `
        <style>
          .pdf-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
            -webkit-column-break-inside: avoid;
          }
          tr, th, td {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead { display: table-header-group; }
        </style>
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background-color: #ffffff; color: #333333;">
          <!-- Header -->
          <div class="pdf-avoid-break" style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #000000;">${user?.shopName || 'JEWELLERY SHOP'}</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; color: #333333;">SALE RECEIPT</p>
          </div>

          <!-- Customer & Voucher Info -->
          <div class="pdf-avoid-break" style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #333333;">
            <div>
              <div style="font-weight: bold; margin-bottom: 5px; color: #000000;">Customer Name</div>
              <div style="font-size: 16px; font-weight: 600; color: #000000;">${ledger?.name || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; margin-bottom: 5px; color: #000000;">Voucher No</div>
              <div style="font-size: 16px; font-weight: 600; color: #000000;">${formData.voucherNumber}</div>
            </div>
          </div>

          <div class="pdf-avoid-break" style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #444444; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
            <div>Date: <strong style="color: #000000;">${new Date(formData.date).toLocaleDateString('en-IN')}</strong></div>
            <div>Time: <strong style="color: #000000;">${new Date().toLocaleTimeString('en-IN')}</strong></div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; color: #333333;">
            <thead>
              <tr style="background-color: #f5f5f5; border: 1px solid #ddd;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #000000;">Sr</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; color: #000000;">Item Name</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #000000;">Pcs</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Gross (g)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Less (g)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Net (g)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Fine (g)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Labour (₹)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr style="border: 1px solid #ddd; color: #333333;">
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">${item.itemName}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${item.pieces}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.grossWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.lessWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.netWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.fineWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.labourRate).toFixed(2)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f5f5f5; border: 1px solid #ddd; font-weight: bold; color: #000000;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px; text-align: center;">TOTAL</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.lessWeight) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Summary Section -->
          <div class="pdf-avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; font-size: 14px; color: #333333;">
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #000000;">Amount Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
                <span>Labour Amount:</span>
                <strong style="color: #000000;">₹${items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
                <span>Stone Amount:</span>
                <strong style="color: #000000;">\u20b9${parseFloat(formData.stoneAmount || 0).toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
                <span>Fine Amount:</span>
                <strong style="color: #000000;">\u20b9${parseFloat(formData.fineAmount || 0).toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #ddd; font-size: 16px; font-weight: bold; color: #000000;">
                <span>Grand Total:</span>
                <span style="color: #d32f2f;">₹${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #000000;">Rates</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
                <span>Gold Rate:</span>
                <strong style="color: #000000;">₹${parseFloat(formData.goldRate || 0).toFixed(2)}/g</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #333333;">
                <span>Silver Rate:</span>
                <strong style="color: #000000;">₹${parseFloat(formData.silverRate || 0).toFixed(2)}/g</strong>
              </div>
              <div style="border-top: 2px solid #ddd; padding-top: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
                  <span>Issue Gross:</span>
                  <strong style="color: #000000;">${parseFloat(formData.issueGross || 0).toFixed(3)} g</strong>
                </div>
                <div style="display: flex; justify-content: space-between; color: #333333;">
                  <span>Receipt Gross (Entry Fine):</span>
                  <strong style="color: #000000;">${(items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)} g</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Balance Section -->
          <div class="pdf-avoid-break" style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border: 2px solid #ffc107; margin-bottom: 20px; font-size: 14px; color: #333333;">
            <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #856404;">Balance Details</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div style="background-color: rgba(255,255,255,0.6); padding: 15px; border-radius: 4px;">
                <div style="color: #333333; margin-bottom: 5px; font-weight: bold;">Cash Received</div>
                <div style="font-size: 16px; font-weight: bold; color: #000000;">₹${parseFloat(formData.cashReceived || 0).toFixed(2)}</div>
              </div>
              <div style="background-color: rgba(255,255,255,0.6); padding: 15px; border-radius: 4px;">
                <div style="color: #333333; margin-bottom: 5px; font-weight: bold;">Net Balance</div>
                <div style="font-size: 16px; font-weight: bold; color: #c41c3b;">₹${(((items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0)) - (parseFloat(formData.cashReceived) || 0))).toFixed(2)}</div>
              </div>
            </div>

            <div class="pdf-avoid-break" style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px; margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">Old Balance Details (${formData.paymentType === 'credit' ? 'Credit Bill' : 'Cash Bill'})</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div>
                  <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Old Bal Amount</div>
                  <div style="font-size: 14px; font-weight: bold; color: #000000;">₹${shareSnap.oldBalance.totalAmount.toFixed(2)}</div>
                </div>
                <div>
                  <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Old Bal Gold Fine Wt</div>
                  <div style="font-size: 14px; font-weight: bold; color: #B8860B;">${shareSnap.oldBalance.goldFineWeight.toFixed(3)} g</div>
                </div>
                <div>
                  <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Old Bal Silver Fine Wt</div>
                  <div style="font-size: 14px; font-weight: bold; color: #555555;">${shareSnap.oldBalance.silverFineWeight.toFixed(3)} g</div>
                </div>
              </div>
            </div>

            <div class="pdf-avoid-break" style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">Current Balance</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div style="background-color: #d4edda; padding: 15px; border-radius: 4px;">
                  <div style="color: #155724; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Cur Bal Amount</div>
                  <div style="font-size: 16px; font-weight: bold; color: #155724;">₹${shareSnap.currentBalance.amount.toFixed(2)}</div>
                </div>
                <div style="background-color: #d4edda; padding: 15px; border-radius: 4px;">
                  <div style="color: #155724; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Cur Bal Gold Fine Wt</div>
                  <div style="font-size: 16px; font-weight: bold; color: #B8860B;">${shareSnap.currentBalance.goldFineWeight.toFixed(3)} g</div>
                </div>
                <div style="background-color: #d4edda; padding: 15px; border-radius: 4px;">
                  <div style="color: #155724; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Cur Bal Silver Fine Wt</div>
                  <div style="font-size: 16px; font-weight: bold; color: #555555;">${shareSnap.currentBalance.silverFineWeight.toFixed(3)} g</div>
                </div>
              </div>
              <div style="margin-top: 15px; padding: 15px; background-color: #e2e3e5; border-radius: 4px;">
                <div style="color: #383d41; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Receipt Gross (Entry Fine)</div>
                <div style="font-size: 16px; font-weight: bold; color: #383d41;">${(items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)} g</div>
              </div>
            </div>
          </div>

          <!-- GST Section -->
          ${formData.invoiceType === 'gst' && formData.gstRate ? (() => {
          const taxableAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0);
          // Determine GST type: same state = CGST+SGST, different state = IGST
          const sellerStatePdf = user?.gstSettings?.businessState || null;
          const customerStatePdf = selectedLedger?.stateCode || null;
          const gstType = (sellerStatePdf && customerStatePdf && sellerStatePdf === customerStatePdf)
            ? 'CGST_SGST'
            : 'IGST';
          const rate = parseFloat(formData.gstRate) || 0;
          let igst = 0, cgst = 0, sgst = 0, totalGST = 0;

          if (gstType === 'IGST') {
            igst = (taxableAmount * rate) / 100;
            totalGST = igst;
          } else {
            cgst = (taxableAmount * (rate / 2)) / 100;
            sgst = (taxableAmount * (rate / 2)) / 100;
            totalGST = cgst + sgst;
          }

          let html = '<div class="pdf-avoid-break" style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border: 2px solid #2196f3; margin-bottom: 20px; font-size: 14px; color: #333333;"><h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #1565c0;">📄 GST Details (Tax Invoice)</h3>';

          html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div style="background-color: rgba(255,255,255,0.6); padding: 12px; border-radius: 4px;"><div style="color: #666; font-size: 12px; margin-bottom: 3px;">Taxable Amount</div><div style="font-size: 14px; font-weight: bold; color: #000000;">₹' + taxableAmount.toFixed(2) + '</div></div><div style="background-color: rgba(255,255,255,0.6); padding: 12px; border-radius: 4px;"><div style="color: #666; font-size: 12px; margin-bottom: 3px;">GST Rate</div><div style="font-size: 14px; font-weight: bold; color: #000000;">' + rate + '%</div></div>';
          if (gstType === 'IGST') {
            html += '<div style="background-color: rgba(255,255,255,0.6); padding: 12px; border-radius: 4px;"><div style="color: #666; font-size: 12px; margin-bottom: 3px;">IGST (' + rate + '%)</div><div style="font-size: 14px; font-weight: bold; color: #1565c0;">₹' + igst.toFixed(2) + '</div></div>';
          } else {
            html += '<div style="background-color: rgba(255,255,255,0.6); padding: 12px; border-radius: 4px;"><div style="color: #666; font-size: 12px; margin-bottom: 3px;">CGST (' + (rate / 2) + '%)</div><div style="font-size: 14px; font-weight: bold; color: #1565c0;">₹' + cgst.toFixed(2) + '</div></div><div style="background-color: rgba(255,255,255,0.6); padding: 12px; border-radius: 4px;"><div style="color: #666; font-size: 12px; margin-bottom: 3px;">SGST (' + (rate / 2) + '%)</div><div style="font-size: 14px; font-weight: bold; color: #1565c0;">₹' + sgst.toFixed(2) + '</div></div>';
          }
          html += '</div><div style="margin-top: 12px; padding: 12px; background-color: rgba(33, 150, 243, 0.1); border-radius: 4px; border-left: 4px solid #2196f3;"><div style="color: #666; font-size: 12px; margin-bottom: 3px;">Total GST Amount</div><div style="font-size: 16px; font-weight: bold; color: #1565c0;">₹' + totalGST.toFixed(2) + '</div></div></div>';
          return html;
        })() : ''}

          <div style="text-align: center; border-top: 2px solid #ddd; padding-top: 20px; font-size: 12px; color: #666666;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 24px;">
              <div style="text-align: center; border-top: 1px solid #000; padding-top: 10px;">Customer Signature</div>
              <div style="text-align: center; border-top: 1px solid #000; padding-top: 10px;">Authorised Signatory</div>
            </div>
            <p style="margin: 4px 0; color: #666666;">Thank you for your business!</p>
            <p style="margin: 4px 0; color: #666666;">Generated on ${new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
      `;

      // CRITICAL: Append to body so html2pdf can properly render and measure the element
      // This is essential for the PDF to contain actual content data
      document.body.appendChild(voucherContent);

      // Add delay to ensure browser finishes rendering the element
      setTimeout(() => {
        // PDF options with backgroundColor to ensure proper rendering in hosted environments
        const options = {
          margin: [10, 10, 10, 10],
          filename: `Voucher-${formData.voucherNumber}-${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['.pdf-avoid-break', '.balance-box', 'tr']
          },
          html2canvas: {
            scale: 2,
            useCors: true,
            allowTaint: true,
            backgroundColor: '#ffffff'  // Critical for hosted environments
          },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        // Generate PDF
        html2pdf()
          .set(options)
          .from(voucherContent)
          .output('blob')
          .then((blob) => {
            // Remove element from DOM after PDF generation
            document.body.removeChild(voucherContent);

            const fileName = `Voucher-${formData.voucherNumber}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            // Check if Web Share API is available with file sharing support
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              navigator.share({
                files: [file],
                title: `Voucher #${formData.voucherNumber}`,
                text: `Voucher for ${ledger?.name || 'N/A'}`
              }).then(() => {
                toast.success('Voucher PDF shared successfully!');
              }).catch(err => {
                if (err.name !== 'AbortError') {
                  downloadPDF(blob, fileName);
                }
              });
            } else {
              // Fallback: Generate shareable link option
              downloadPDF(blob, fileName);

              // Show WhatsApp and other sharing options
              const whatsappText = `Check out this voucher for ${ledger?.name}. Voucher #${formData.voucherNumber}. Amount: ₹${grandTotal.toFixed(2)}`;
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

              toast.info(
                <div>
                  <p>PDF downloaded! Share it via:</p>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: '10px', color: '#25D366', textDecoration: 'none', fontWeight: 'bold' }}>
                    WhatsApp
                  </a>
                </div>,
                { autoClose: 5000 }
              );
            }
          })
          .catch(error => {
            console.error('PDF generation error:', error);
            // Clean up DOM even on error
            if (document.body.contains(voucherContent)) {
              document.body.removeChild(voucherContent);
            }
            toast.error('Failed to generate PDF. Please try again.');
          });
      }, 500);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate or share PDF');
    }
  };

  const downloadPDF = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success(`${fileName} downloaded successfully!`);
  };

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '15px' }} className="fade-in">
            <h1 style={{ color: 'var(--text-primary)', marginBottom: 0, margin: 0 }}>{editingVoucherId ? 'Edit Voucher' : 'Create Voucher'}</h1>

            {/* GST Billing Mode Selector & Refresh Button */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Manual Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="btn btn-secondary btn-icon"
                aria-label="Refresh"
                title="Refresh data (or pull down to refresh)"
              >
                <FiRefreshCw style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              </button>

              {/* GST Billing Mode Selector - Only show for GST-enabled users */}
              {user?.gstEnabled && (
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <button
                    onClick={() => window.location.href = '/billing'}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: editingVoucherId || !editingVoucherId ? 'var(--color-primary)' : 'transparent',
                      color: 'var(--color-on-primary)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      transition: 'all 0.3s'
                    }}
                  >
                    Normal Billing
                  </button>
                  <button
                    onClick={() => window.location.href = '/gst-billing'}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      color: 'var(--color-text)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      transition: 'all 0.3s'
                    }}
                  >
                    GST Billing
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div style={{ marginBottom: '30px' }}>
              <SkeletonStat count={3} />
              <SkeletonTable rows={5} columns={5} />
            </div>
          )}

          {/* Customer Selection */}
          {!isLoading && (
            <div className="card fade-in" style={{ marginBottom: '1rem' }} data-tour="bill-customer">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Customer</h3>
                <button
                  type="button"
                  onClick={() => {
                    setLedgerFormData({
                      name: '',
                      phoneNumber: '',
                      oldBalAmount: '',
                      oldBalGold: '',
                      oldBalSilver: '',
                      hasGST: false,
                      gstNumber: '',
                      stateCode: ''
                    });
                    setShowAddLedgerModal(true);
                  }}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '13px'
                  }}
                >
                  <FiPlus /> Add Customer
                </button>
              </div>

              <div style={{ position: 'relative', maxWidth: '500px' }} data-customer-dropdown>
                <input
                  type="text"
                  placeholder="Search or select customer..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="input"
                  style={formErrors.ledgerId ? { borderColor: 'var(--color-danger)' } : undefined}
                />
                {formErrors.ledgerId && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⚠</span> {formErrors.ledgerId}
                  </div>
                )}

                {showCustomerDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderTop: 'none',
                    borderRadius: '0 0 4px 4px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                    {ledgers
                      .filter(ledger => ledger.name.toLowerCase().includes(customerSearch.toLowerCase()))
                      .map(ledger => (
                        <div
                          key={ledger._id}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, ledgerId: ledger._id }));
                            setCustomerSearch(ledger.name);
                            setShowCustomerDropdown(false);
                            // Clear the customer validation error on selection
                            setFormErrors(prev => ({ ...prev, ledgerId: undefined }));
                          }}
                          style={{
                            padding: '12px 10px',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            backgroundColor: formData.ledgerId === ledger._id ? 'var(--bg-hover)' : 'transparent',
                            transition: 'background-color 0.2s',
                            fontSize: '13px'
                          }}
                        >
                          <div style={{ fontWeight: formData.ledgerId === ledger._id ? 'bold' : 'normal' }}>
                            {ledger.name}
                          </div>
                          {ledger.phoneNumber && (
                            <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                              {ledger.phoneNumber}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voucher Details */}
          {!isLoading && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }} className="fade-in">
              <div className="card" style={{ marginBottom: '1rem' }} data-tour="bill-voucher">
              <h3 className="section-title">Voucher</h3>
              <div className="form-grid">
                <div>
                  <label className="input-label">Voucher Number</label>
                  <input
                    type="text"
                    required
                    value={formData.voucherNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, voucherNumber: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="input-label">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="input"
                  />
                </div>

                <div className="span-2">
                  <div>
                    <label className="input-label">Payment Type</label>
                    <select
                      className="input"
                      value={formData.paymentType}
                      onChange={(e) => {
                        setFormData({ ...formData, paymentType: e.target.value });
                        setItems([]);
                      }}
                    >
                      <optgroup label="Billing">
                        <option value="cash">Cash Bill (No Balance)</option>
                        <option value="credit">Credit Bill (Tracks Balance)</option>
                      </optgroup>
                      <optgroup label="Settlement">
                        <option value="add_cash">Add Cash to Balance</option>
                        <option value="add_gold">Add Gold Fine Weight</option>
                        <option value="add_silver">Add Silver Fine Weight</option>
                        <option value="money_to_gold">Money to Gold Fine</option>
                        <option value="money_to_silver">Money to Silver Fine</option>
                      </optgroup>
                    </select>
                  </div>
                  <small className="field-hint">
                    {FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType)
                      ? 'Settlement: use item table to calculate fine weight'
                      : (SETTLEMENT_PAYMENT_TYPES.includes(formData.paymentType) ? 'Settlement: Enter amount to adjust balance' : (formData.paymentType === 'credit' ? 'On Balance' : 'Immediate'))}
                  </small>
                </div>
              </div>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }} data-tour="bill-rates">
              <h3 className="section-title">Rates &amp; Amounts</h3>
              <div className="form-grid">
                <div>
                  <label className="input-label">Gold Rate (₹/g)</label>
                  <input
                    type="number" inputMode="decimal"
                    step="0.01"
                    value={formData.goldRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, goldRate: e.target.value }))}
                    placeholder="0"
                    className="input"
                  />
                  <small className="field-hint">
                    Negative allowed
                  </small>
                </div>

                <div>
                  <label className="input-label">Silver Rate (₹/g)</label>
                  <input
                    type="number" inputMode="decimal"
                    step="0.01"
                    value={formData.silverRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, silverRate: e.target.value }))}
                    placeholder="0"
                    className="input"
                  />
                  <small className="field-hint">
                    Negative allowed
                  </small>
                </div>

                <div>
                  <label className="input-label">Stone Amount (₹)</label>
                  <input
                    type="number" inputMode="decimal"
                    step="0.01"
                    value={formData.stoneAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, stoneAmount: e.target.value }))}
                    placeholder="0.00"
                    className="input"
                  />
                </div>

                <div>
                  <label className="input-label">Fine Amount (₹)</label>
                  <input
                    type="number" inputMode="decimal"
                    step="0.01"
                    value={formData.fineAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, fineAmount: e.target.value }))}
                    placeholder="0.00"
                    className="input"
                  />
                </div>

                <div>
                  <label className="input-label">Issue Gross (g)</label>
                  <input
                    type="number" inputMode="decimal"
                    step="0.001"
                    value={formData.issueGross}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueGross: e.target.value }))}
                    placeholder="0.000"
                    className="input"
                  />
                </div>

                <div>
                  <label className="input-label">Receipt Gross (g)</label>
                  <input
                    type="number" inputMode="decimal"
                    step="0.001"
                    value={formData.receiptGross}
                    onChange={(e) => setFormData(prev => ({ ...prev, receiptGross: e.target.value }))}
                    placeholder="0.000"
                    className="input"
                  />
                </div>

                <div>
                  <label className="input-label">Cash Received (₹)</label>
                  <input
                    type="number" inputMode="decimal"
                    step="0.01"
                    value={FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType) ? calculateTotals().fineWeight.toFixed(3) : formData.cashReceived}
                    onChange={(e) => {
                      if (!FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType)) {
                        setFormData(prev => ({ ...prev, cashReceived: e.target.value }));
                      }
                    }}
                    placeholder={FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType) ? '0.000' : '0.00'}
                    readOnly={FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType)}
                    className="input"
                    style={formErrors.cashReceived ? { borderColor: 'var(--color-danger)' } : undefined}
                  />
                  {formErrors.cashReceived && (
                    <small className="field-hint" style={{ color: 'var(--color-danger)' }}>
                      {formErrors.cashReceived}
                    </small>
                  )}
                </div>

                <div>
                  <label className="input-label">Round Off (₹)</label>
                  <input
                    type="number" inputMode="decimal"
                    step="0.01"
                    value={formData.roundOff}
                    onChange={(e) => setFormData(prev => ({ ...prev, roundOff: e.target.value }))}
                    placeholder="0.00"
                    className="input"
                  />
                  <small className="field-hint">
                    ± adjustment to final amount
                  </small>
                </div>

              </div>
              </div>

              {/* Items Section - Cash/credit plus gold/silver fine settlement modes */}
              {(!SETTLEMENT_PAYMENT_TYPES.includes(formData.paymentType) || FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType)) && (
                <div className="card" style={{ marginBottom: '1rem' }} data-tour="bill-items">
                  <h3 className="section-title">{FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType) ? 'Fine Weight Entries' : 'Items'}</h3>

                  {/* Item Scanner for Item Mode */}
                  {user?.stockMode === 'item' && !FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType) && (
                    <ItemScanner
                      onItemSelected={handleItemScanned}
                      existingItems={items.filter(item => item._itemId)}
                    />
                  )}

                  <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {formData.paymentType !== 'add_silver' && (
                      <button type="button" onClick={() => addRow('gold')} className="btn btn-secondary">
                        <FiPlus style={{ color: 'var(--metal-gold)' }} /> Add Gold Item
                      </button>
                    )}
                    {formData.paymentType !== 'add_gold' && (
                      <button type="button" onClick={() => addRow('silver')} className="btn btn-secondary">
                        <FiPlus style={{ color: 'var(--metal-silver)' }} /> Add Silver Item
                      </button>
                    )}
                  </div>

                  <div className="items-table-wrap">
                    <table className="items-table no-scroll">
                      <thead>
                        <tr>
                          <th>Item Name *</th>
                          <th>Metal</th>
                          {ITEM_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)}
                          <th>Fine (g)</th>
                          <th>Amount (₹)</th>
                          <th><span className="sr-only">Remove</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index}>
                            <td className="cell-name" data-label="Item name *">
                              <input
                                type="text"
                                required
                                className="input"
                                value={item.itemName}
                                onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                                placeholder="Item name"
                                aria-label={`Item ${index + 1} name`}
                                aria-invalid={!item.itemName?.trim()}
                              />
                            </td>
                            <td className="cell-metal">
                              <span className={`metal-badge ${item.metalType}`}>{item.metalType === 'gold' ? 'Gold' : 'Silver'}</span>
                            </td>
                            {ITEM_FIELDS.map((field) => (
                              <td key={field.key} data-label={field.label}>
                                <input
                                  type="number" inputMode="decimal"
                                  inputMode={field.inputMode || 'decimal'}
                                  className="input num"
                                  step={field.step}
                                  min={field.min}
                                  max={field.max}
                                  required={field.required}
                                  placeholder={field.placeholder}
                                  value={item[field.key]}
                                  aria-label={`Item ${index + 1} ${field.label}`}
                                  aria-invalid={field.required ? !(parseFloat(item[field.key]) > 0) : undefined}
                                  onChange={(e) => {
                                    updateItem(index, field.key, e.target.value);
                                    if (field.key !== 'pieces') calculateItem(index);
                                  }}
                                />
                              </td>
                            ))}
                            <td className="cell-out num" data-label="Fine (g)">{(parseFloat(item.fineWeight) || 0).toFixed(3)}</td>
                            <td className="cell-out num" data-label="Amount (₹)">{(parseFloat(item.amount) || 0).toFixed(2)}</td>
                            <td className="cell-action">
                              <button type="button" onClick={() => deleteRow(index)} className="btn btn-secondary btn-sm item-remove" aria-label={`Remove item ${index + 1}`}>
                                <FiX aria-hidden="true" /> Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="field-hint">Fields marked * are required. Fine weight and amount update as you type.</p>

                  {items.length > 0 && (
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                      <h4 style={{ marginTop: 0 }}>Summary</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', fontSize: '14px' }}>
                        <div>
                          <strong>Total Pieces:</strong> {calculateTotals().pieces}
                        </div>
                        <div>
                          <strong>Total Gross:</strong> {calculateTotals().grossWeight.toFixed(3)}g
                        </div>
                        <div>
                          <strong>Total Net:</strong> {calculateTotals().netWeight.toFixed(3)}g
                        </div>
                        <div>
                          <strong>Total Fine:</strong> {calculateTotals().fineWeight.toFixed(3)}g
                        </div>
                        <div>
                          <strong>Total Labour:</strong> ₹{calculateTotals().labourRate.toFixed(2)}
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '16px' }}>
                          <strong>Total Amount:</strong> ₹{(calculateTotals().amount + (parseFloat(formData.stoneAmount) || 0) + (parseFloat(formData.fineAmount) || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Direct settlement section - gold/silver fine modes use the item table above */}
              {DIRECT_SETTLEMENT_PAYMENT_TYPES.includes(formData.paymentType) && (
                <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '2px solid var(--color-primary)' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>
                    {formData.paymentType === 'add_cash' && 'Add Cash to Balance'}
                    {formData.paymentType === 'add_gold' && 'Add Gold Fine Weight'}
                    {formData.paymentType === 'add_silver' && 'Add Silver Fine Weight'}
                    {formData.paymentType === 'money_to_gold' && 'Money to Gold Fine'}
                    {formData.paymentType === 'money_to_silver' && 'Money to Silver Fine'}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    {formData.paymentType === 'add_cash' && (
                      <div>
                        <label className="input-label">Amount to Add (₹)</label>
                        <input
                          type="number" inputMode="decimal"
                          step="0.01"
                          value={formData.cashReceived}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cashReceived: e.target.value }))}
                          placeholder="Enter amount"
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            fontSize: '14px'
                          }}
                        />
                        <small className="field-hint">
                          Positive value: subtract from balance | Negative value: add to balance (allowed)
                        </small>
                      </div>
                    )}
                    {formData.paymentType === 'add_gold' && (
                      <div>
                        <label className="input-label">Gold Fine Weight to Add (g)</label>
                        <input
                          type="number" inputMode="decimal"
                          step="0.001"
                          value={formData.cashReceived}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cashReceived: e.target.value }))}
                          placeholder="Enter weight"
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            fontSize: '14px'
                          }}
                        />
                        <small className="field-hint">
                          This weight will be added to customer's gold balance
                        </small>
                      </div>
                    )}
                    {formData.paymentType === 'add_silver' && (
                      <div>
                        <label className="input-label">Silver Fine Weight to Add (g)</label>
                        <input
                          type="number" inputMode="decimal"
                          step="0.001"
                          value={formData.cashReceived}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cashReceived: e.target.value }))}
                          placeholder="Enter weight"
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            fontSize: '14px'
                          }}
                        />
                        <small className="field-hint">
                          This weight will be added to customer's silver balance
                        </small>
                      </div>
                    )}
                    {formData.paymentType === 'money_to_gold' && (
                      <div>
                        <label className="input-label">Cash Payment (₹)</label>
                        <input
                          type="number" inputMode="decimal"
                          step="0.01"
                          value={formData.cashReceived}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cashReceived: e.target.value }))}
                          placeholder="Enter amount"
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            fontSize: '14px'
                          }}
                        />
                        <small className="field-hint">
                          Customer pays to settle gold fine dues at ₹{parseFloat(formData.goldRate || 0).toFixed(2)}/g rate
                        </small>
                      </div>
                    )}
                    {formData.paymentType === 'money_to_silver' && (
                      <div>
                        <label className="input-label">Cash Payment (₹)</label>
                        <input
                          type="number" inputMode="decimal"
                          step="0.01"
                          value={formData.cashReceived}
                          onChange={(e) => setFormData((prev) => ({ ...prev, cashReceived: e.target.value }))}
                          placeholder="Enter amount"
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            fontSize: '14px'
                          }}
                        />
                        <small className="field-hint">
                          Customer pays to settle silver fine dues at ₹{parseFloat(formData.silverRate || 0).toFixed(2)}/g rate
                        </small>
                      </div>
                    )}
                    {(formData.paymentType === 'money_to_gold' || formData.paymentType === 'money_to_silver') && (
                      <div>
                        <label className="input-label">Calculated Fine Weight</label>
                        <div style={{
                          padding: '10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--color-text)',
                          minHeight: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {formData.paymentType === 'money_to_gold' &&
                            `${((parseFloat(formData.cashReceived) || 0) / (parseFloat(formData.goldRate) || 1)).toFixed(3)}g`}
                          {formData.paymentType === 'money_to_silver' &&
                            `${((parseFloat(formData.cashReceived) || 0) / (parseFloat(formData.silverRate) || 1)).toFixed(3)}g`}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="input-label">Current Balance</label>
                      <div style={{
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--color-text)',
                        minHeight: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        {formData.paymentType === 'add_cash' && `₹${(selectedLedger?.balances?.cashBalance !== undefined ? selectedLedger.balances.cashBalance : (selectedLedger?.balances?.creditBalance || 0))}`}
                        {formData.paymentType === 'add_gold' && `${(selectedLedger?.balances?.goldFineWeight || 0).toFixed(3)}g`}
                        {formData.paymentType === 'add_silver' && `${(selectedLedger?.balances?.silverFineWeight || 0).toFixed(3)}g`}
                        {formData.paymentType === 'money_to_gold' && `Cash: ₹${(selectedLedger?.balances?.cashBalance !== undefined ? selectedLedger.balances.cashBalance : (selectedLedger?.balances?.creditBalance || 0)).toFixed(2)} | Gold: ${(selectedLedger?.balances?.goldFineWeight || 0).toFixed(3)}g`}
                        {formData.paymentType === 'money_to_silver' && `Cash: ₹${(selectedLedger?.balances?.cashBalance !== undefined ? selectedLedger.balances.cashBalance : (selectedLedger?.balances?.creditBalance || 0)).toFixed(2)} | Silver: ${(selectedLedger?.balances?.silverFineWeight || 0).toFixed(3)}g`}
                      </div>
                    </div>
                    <div>
                      <label className="input-label">New Balance</label>
                      <div style={{
                        padding: '10px',
                        borderRadius: '4px',
                        border: '2px solid var(--color-primary)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--color-primary)',
                        minHeight: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        {formData.paymentType === 'add_cash' && `₹${((selectedLedger?.balances?.cashBalance !== undefined ? selectedLedger.balances.cashBalance : (selectedLedger?.balances?.creditBalance || 0)) - (parseFloat(formData.cashReceived) || 0)).toFixed(2)}`}
                        {formData.paymentType === 'add_gold' && `${((selectedLedger?.balances?.goldFineWeight || 0) - (parseFloat(formData.cashReceived) || 0)).toFixed(3)}g`}
                        {formData.paymentType === 'add_silver' && `${((selectedLedger?.balances?.silverFineWeight || 0) - (parseFloat(formData.cashReceived) || 0)).toFixed(3)}g`}
                        {formData.paymentType === 'money_to_gold' && `Cash: ₹${(selectedLedger?.balances?.cashBalance !== undefined ? selectedLedger.balances.cashBalance : (selectedLedger?.balances?.creditBalance || 0)).toFixed(2)} | Gold: ${((selectedLedger?.balances?.goldFineWeight || 0) - ((parseFloat(formData.cashReceived) || 0) / (parseFloat(formData.goldRate) || 1))).toFixed(3)}g`}
                        {formData.paymentType === 'money_to_silver' && `Cash: ₹${(selectedLedger?.balances?.cashBalance !== undefined ? selectedLedger.balances.cashBalance : (selectedLedger?.balances?.creditBalance || 0)).toFixed(2)} | Silver: ${((selectedLedger?.balances?.silverFineWeight || 0) - ((parseFloat(formData.cashReceived) || 0) / (parseFloat(formData.silverRate) || 1))).toFixed(3)}g`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Balance Summary Section - Now after Items, before Narration - Only for billing and fine weight settlement types */}
              {!['add_cash'].includes(formData.paymentType) && (
                <div className="card" style={{ marginBottom: '1rem' }} data-tour="bill-summary">
                  <h3 className="section-title">Balance Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', fontSize: '14px' }}>
                    <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Net Balance</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        ₹{(
                          (items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + 
                          (parseFloat(formData.stoneAmount) || 0) + 
                          (parseFloat(formData.fineAmount) || 0)) - 
                          (FINE_WEIGHT_SETTLEMENT_TYPES.includes(formData.paymentType) ? 0 : (parseFloat(formData.cashReceived) || 0))
                        ).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '3px' }}>Total - Cash Received</div>
                    </div>

                    <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Cur Bal Amount</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        ₹{buildBalanceSnapshot(formData.paymentType, selectedLedger?.balances, items, formData).currentBalance.amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '3px' }}>Net + Old Balance</div>
                    </div>

                    <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Cur Bal Gold Fine Wt</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--metal-gold)' }}>
                        {buildBalanceSnapshot(formData.paymentType, selectedLedger?.balances, items, formData).currentBalance.goldFineWeight.toFixed(3)}g
                      </div>
                    </div>

                    <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Cur Bal Silver Fine Wt</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--metal-silver)' }}>
                        {buildBalanceSnapshot(formData.paymentType, selectedLedger?.balances, items, formData).currentBalance.silverFineWeight.toFixed(3)}g
                      </div>
                    </div>

                    <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Receipt Gross</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        {(items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)}g
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '3px' }}>Entry Fine</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Old Balance Details Section - Moved after Balance Summary - Only for billing and fine weight settlement types */}
              {!['add_cash'].includes(formData.paymentType) && (
                <div className="card" style={{ marginBottom: '1rem', borderLeft: `3px solid ${formData.paymentType === 'credit' ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
                  <h3 className="section-title">
                    Old Balance Details ({
                      formData.paymentType === 'credit' 
                        ? 'Credit Bill' 
                        : formData.paymentType === 'add_gold'
                          ? 'Add Gold Fine Weight'
                          : formData.paymentType === 'add_silver'
                            ? 'Add Silver Fine Weight'
                            : 'Cash Bill'
                    })
                  </h3>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div>
                      <label className="input-label">Old Bal Amount (₹)</label>
                      <div style={{
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--color-text)',
                        minHeight: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        {formData.paymentType === 'credit'
                          ? (() => {
                            const creditBal = parseFloat(selectedLedger?.balances?.creditBalance) || 0;
                            const cashBal = parseFloat(selectedLedger?.balances?.cashBalance) || 0;
                            const totalBal = creditBal + cashBal;
                            return totalBal > 0 ? `₹${totalBal.toFixed(2)} (Credit: ₹${creditBal.toFixed(2)} + Cash: ₹${cashBal.toFixed(2)})` : '₹0.00';
                          })()
                          : (selectedLedger?.balances?.cashBalance ? `₹${parseFloat(selectedLedger.balances.cashBalance).toFixed(2)}` : '₹0.00')
                        }
                      </div>
                      <small className="field-hint">
                        {formData.paymentType === 'credit' ? 'Balance from previous credit bills and cash bills' : 'Balance from cash bills only'}
                      </small>
                    </div>

                    <div>
                      <label className="input-label">Old Bal Gold Fine Wt (g)</label>
                      <div style={{
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--metal-gold)',
                        minHeight: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        {selectedLedger?.balances?.goldFineWeight !== undefined ? `${parseFloat(selectedLedger.balances.goldFineWeight).toFixed(3)}g` : '0.000g'}
                      </div>
                      <small className="field-hint">
                        {['credit', 'add_gold', 'add_silver', 'money_to_gold', 'money_to_silver'].includes(formData.paymentType) 
                          ? 'Auto-fetched from customer ledger' 
                          : 'Not applicable for cash bills'}
                      </small>
                    </div>

                    <div>
                      <label className="input-label">Old Bal Silver Fine Wt (g)</label>
                      <div style={{
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--metal-silver)',
                        minHeight: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        {selectedLedger?.balances?.silverFineWeight !== undefined ? `${parseFloat(selectedLedger.balances.silverFineWeight).toFixed(3)}g` : '0.000g'}
                      </div>
                      <small className="field-hint">
                        {['credit', 'add_gold', 'add_silver', 'money_to_gold', 'money_to_silver'].includes(formData.paymentType) 
                          ? 'Auto-fetched from customer ledger' 
                          : 'Not applicable for cash bills'}
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* Narration */}
              <div className="card" style={{ marginBottom: '1rem' }}>
                <label className="section-title" htmlFor="voucher-narration" style={{ display: 'block' }}>Narration</label>
                <textarea
                  value={formData.narration}
                  onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows="3"
                  id="voucher-narration"
                  className="input"
                />
              </div>

              {/* Action Buttons */}
              <div className="bill-actions" data-tour="bill-save">
                <button type="button" onClick={handlePrint} className="btn btn-secondary">
                  <FiPrinter /> Print
                </button>
                <button type="button" onClick={handleShare} className="btn btn-secondary">
                  <FiShare2 /> Share PDF
                </button>
                <button type="button" onClick={handleWhatsAppShare} title="Share receipt via WhatsApp" className="btn btn-secondary">
                  WhatsApp
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving} aria-busy={isSaving}>
                  <FiSave /> {isSaving ? 'Saving…' : editingVoucherId ? 'Update Voucher' : 'Save Voucher'}
                </button>
              </div>
            </form>
          )}

          <ConfirmDialog
            isOpen={Boolean(entryWarnings)}
            title="Please check this entry"
            message={entryWarnings?.warnings.map((w) => `• ${w}`).join('\n\n')}
            confirmText="Save anyway"
            cancelText="Go back and fix"
            onConfirm={() => entryWarnings?.onConfirm()}
            onClose={() => setEntryWarnings(null)}
          />

          {/* Add Customer Modal */}
          {showAddLedgerModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100
            }}>
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '30px',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ marginTop: 0 }}>Create New Customer</h2>
                  <button
                    onClick={() => setShowAddLedgerModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer'
                    }}
                  >
                    <FiX />
                  </button>
                </div>

                <form onSubmit={handleAddLedgerSubmit}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Customer Name</label>
                    <input
                      type="text"
                      required
                      value={ledgerFormData.name}
                      onChange={(e) => setLedgerFormData(prev => ({ ...prev, name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--color-text)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={ledgerFormData.phoneNumber}
                      onChange={(e) => setLedgerFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="10 digits (optional)"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--color-text)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Opening Balance Fields */}
                  <div style={{ marginBottom: '15px', padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Opening Balance (Optional)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Amount (₹)</label>
                        <input
                          type="number" inputMode="decimal"
                          value={ledgerFormData.oldBalAmount}
                          onChange={(e) => setLedgerFormData(prev => ({ ...prev, oldBalAmount: e.target.value }))}
                          placeholder="₹0.00"
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--metal-gold)', display: 'block', marginBottom: '3px' }}>Gold Fine (g)</label>
                        <input
                          type="number" inputMode="decimal"
                          value={ledgerFormData.oldBalGold}
                          onChange={(e) => setLedgerFormData(prev => ({ ...prev, oldBalGold: e.target.value }))}
                          placeholder="0.000g"
                          step="0.001"
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--metal-silver)', display: 'block', marginBottom: '3px' }}>Silver Fine (g)</label>
                        <input
                          type="number" inputMode="decimal"
                          value={ledgerFormData.oldBalSilver}
                          onChange={(e) => setLedgerFormData(prev => ({ ...prev, oldBalSilver: e.target.value }))}
                          placeholder="0.000g"
                          step="0.001"
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={addingLedger}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: addingLedger ? '#95a5a6' : 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: addingLedger ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {addingLedger ? 'Creating...' : 'Create Customer'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>
    </Layout>
  );
}
