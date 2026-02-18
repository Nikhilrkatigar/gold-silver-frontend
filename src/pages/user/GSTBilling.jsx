import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiX, FiSave, FiPrinter, FiDownload, FiRefreshCw, FiShare2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { isValidGSTFormat, calculateGST, extractStateFromGST, determineGSTType } from '../../utils/gstCalculations';
import html2pdf from 'html2pdf.js';

// Convert number to words
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakhs', 'Crores'];

  if (num === 0) return 'Zero';

  const convertHundreds = (n) => {
    let result = '';
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundred > 0) {
      result += ones[hundred] + ' Hundred ';
    }

    if (remainder >= 20) {
      result += tens[Math.floor(remainder / 10)] + ' ';
      if (remainder % 10 > 0) {
        result += ones[remainder % 10] + ' ';
      }
    } else if (remainder >= 10) {
      result += teens[remainder - 10] + ' ';
    } else if (remainder > 0) {
      result += ones[remainder] + ' ';
    }

    return result;
  };

  let numStr = Math.floor(num).toString().padStart(9, '0');
  let words = '';

  const crores = parseInt(numStr.slice(0, 2));
  const lakhs = parseInt(numStr.slice(2, 4));
  const thousands_num = parseInt(numStr.slice(4, 7));

  if (crores > 0) words += convertHundreds(crores) + 'Crore ';
  if (lakhs > 0) words += convertHundreds(lakhs) + 'Lakh ';
  if (thousands_num > 0) words += convertHundreds(thousands_num) + '';

  const decimal = Math.round((num % 1) * 100);
  if (decimal > 0) {
    words += 'and ' + decimal + ' Paise';
  }

  return words.trim() + ' Only';
};

// GST Invoice Template
const GSTInvoiceTemplate = ({ formData, items, ledgers, user, gstType, gstBreakdown, totals }) => {
  const ledger = ledgers.find(l => l._id === formData.ledgerId);
  const stoneAmount = parseFloat(formData.stoneAmount) || 0;
  const taxableAmount = totals.amount + stoneAmount;
  const finalTotal = gstBreakdown.total;

  return (
    <div style={{
      padding: '25px',
      fontFamily: '"Arial", sans-serif',
      backgroundColor: '#fff',
      maxWidth: '850px',
      margin: '0 auto',
      borderRadius: '4px'
    }}>
      {/* Header Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        borderBottom: '3px solid #2c3e50',
        paddingBottom: '15px'
      }}>
        <h1 style={{
          margin: '0 0 5px 0',
          fontSize: '24px',
          fontWeight: '900',
          color: '#2c3e50',
          letterSpacing: '1px'
        }}>
          {user?.shopName || 'BUSINESS HOUSE'}
        </h1>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
          {user?.gstSettings?.gstNumber && `GSTIN: ${user.gstSettings.gstNumber}`}
        </div>
        <p style={{
          margin: '0',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#c41e3a',
          backgroundColor: '#fff3cd',
          padding: '8px 15px',
          display: 'inline-block',
          borderRadius: '4px'
        }}>
          📄 TAX INVOICE
        </p>
      </div>

      {/* GST Party Details Section */}
      <div style={{
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: '#e8f4f8',
        border: '2px solid #0066cc',
        borderRadius: '4px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
      }}>
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 'bold', color: '#0066cc', marginBottom: '4px' }}>SELLER GSTIN</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
            {user?.gstSettings?.gstNumber || 'N/A'}
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{user?.shopName}</div>
        </div>
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: 'bold', color: '#c41e3a', marginBottom: '4px' }}>CUSTOMER GSTIN</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#c41e3a' }}>
            {formData.customerGSTNumber || 'N/A'}
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{ledger?.name}</div>
        </div>
      </div>

      {/* Invoice Details Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '20px',
        fontSize: '12px'
      }}>
        {/* Left Side - Invoice Info */}
        <div style={{ borderRight: '1px solid #ddd', paddingRight: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', width: '40%' }}>Invoice No.</td>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{formData.invoiceNumber || 'GST-' + formData.voucherNumber}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Invoice Date</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{new Date(formData.date).toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Reference No.</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{formData.referenceNo || '-'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>E-Way Bill No.</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{formData.eWayBillNo || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Side - Customer Info */}
        <div style={{ paddingLeft: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <td colSpan="2" style={{ fontWeight: 'bold', fontSize: '12px', padding: '5px' }}>BILL TO (CUSTOMER)</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', width: '35%' }}>Name</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{ledger?.name}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Phone</td>
                <td style={{ border: '1px solid #000', padding: '4px' }}>{ledger?.phoneNumber}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>GSTIN</td>
                <td style={{ border: '2px solid #c41e3a', padding: '4px', fontWeight: 'bold', color: '#c41e3a' }}>
                  {formData.customerGSTNumber}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>State</td>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>
                  {extractStateFromGST(formData.customerGSTNumber)} - {getStateName(extractStateFromGST(formData.customerGSTNumber))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '15px',
        fontSize: '11px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#34495e', color: '#fff' }}>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>Sr.</th>
            <th style={{ border: '1px solid #000', padding: '6px' }}>Item Description / Metal</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>HSN/SAC</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Qty (Pcs)</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Net Weight (g)</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Fine Weight (g)</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Unit Price</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} style={{ height: '25px' }}>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{index + 1}</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>
                {item.itemName} ({item.metalType === 'gold' ? 'GOLD' : 'SILVER'})
              </td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                {item.metalType === 'gold' ? '7108' : '7106'}
              </td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{item.pieces}</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{parseFloat(item.netWeight).toFixed(3)}</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{parseFloat(item.fineWeight).toFixed(3)}</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                {(item.metalType === 'gold' ? parseFloat(formData.goldRate) : parseFloat(formData.silverRate)).toFixed(2)}
              </td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                {parseFloat(item.amount).toFixed(2)}
              </td>
            </tr>
          ))}
          {/* Stone Amount Row */}
          {stoneAmount > 0 && (
            <tr style={{ height: '25px' }}>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Additional Charges / Stone Amount</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>N/A</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                {stoneAmount.toFixed(2)}
              </td>
            </tr>
          )}
          {/* Round Off Row */}
          {formData.roundOff && parseFloat(formData.roundOff) !== 0 && (
            <tr style={{ height: '25px', backgroundColor: parseFloat(formData.roundOff) > 0 ? '#d4efdf' : '#fadbd8' }}>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Round Off Adjustment</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>N/A</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>-</td>
              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold', color: parseFloat(formData.roundOff) > 0 ? '#27ae60' : '#e74c3c' }}>
                {parseFloat(formData.roundOff).toFixed(2)}
              </td>
            </tr>
          )}
          {/* Subtotal Row */}
          <tr style={{ backgroundColor: '#ecf0f1', fontWeight: 'bold', height: '25px' }}>
            <td colSpan="7" style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>
              Subtotal (Taxable Amount)
            </td>
            <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>₹ {taxableAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* GST Calculation Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Left - Terms */}
        <div style={{
          fontSize: '10px',
          lineHeight: '1.6',
          padding: '10px',
          backgroundColor: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <strong style={{ fontSize: '11px', display: 'block', marginBottom: '5px' }}>Terms & Conditions:</strong>
          <div>1. Total in Words: <strong>{numberToWords(finalTotal)}</strong></div>
          <div style={{ marginTop: '8px' }}>2. Payment Terms: As per agreement</div>
          <div>3. Subject to jurisdiction of the court at {getStateName(user?.gstSettings?.businessState)}</div>
        </div>

        {/* Right - GST Breakdown */}
        <div style={{
          backgroundColor: '#f0f8ff',
          border: '2px solid #2c3e50',
          borderRadius: '4px',
          padding: '10px'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr style={{ backgroundColor: '#34495e', color: '#fff' }}>
                <td colSpan="2" style={{ padding: '5px', fontWeight: 'bold', textAlign: 'center' }}>
                  {gstType === 'IGST' ? 'IGST Calculation' : 'SGST & CGST Calculation'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px' }}>Taxable Amount</td>
                <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>₹ {taxableAmount.toFixed(2)}</td>
              </tr>
              {gstType === 'IGST' ? (
                <>
                  <tr style={{ backgroundColor: '#fff9e6' }}>
                    <td style={{ padding: '4px' }}>IGST @ {formData.gstRate}%</td>
                    <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', color: '#c41e3a' }}>
                      ₹ {gstBreakdown.igst.toFixed(2)}
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr style={{ backgroundColor: '#fff9e6' }}>
                    <td style={{ padding: '4px' }}>SGST @ {formData.gstRate / 2}%</td>
                    <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', color: '#c41e3a' }}>
                      ₹ {gstBreakdown.sgst.toFixed(2)}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#fff9e6' }}>
                    <td style={{ padding: '4px' }}>CGST @ {formData.gstRate / 2}%</td>
                    <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', color: '#c41e3a' }}>
                      ₹ {gstBreakdown.cgst.toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
              <tr style={{ backgroundColor: '#27ae60', color: '#fff', fontWeight: 'bold' }}>
                <td style={{ padding: '6px' }}>TOTAL (GST Incl.)</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>₹ {finalTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Details Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '20px',
        fontSize: '11px'
      }}>
        <div style={{
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#f5f5f5'
        }}>
          <strong style={{ display: 'block', marginBottom: '5px' }}>Bank Details</strong>
          <div>Bank Name: {formData.bankName || '-'}</div>
          <div>Account No.: {formData.accountNumber || '-'}</div>
          <div>IFSC Code: {formData.ifscCode || '-'}</div>
          <div>UPI: {formData.upiId || '-'}</div>
        </div>

        <div style={{
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#f5f5f5'
        }}>
          <strong style={{ display: 'block', marginBottom: '5px' }}>Additional Info</strong>
          <div>Transportation: {formData.transport || '-'}</div>
          <div>Transport ID: {formData.transportId || '-'}</div>
          <div>Delivery: {formData.deliveryLocation || '-'}</div>
          <div>Narration: {formData.narration || '-'}</div>
        </div>
      </div>

      {/* Signature Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '30px',
        marginTop: '30px',
        fontSize: '11px'
      }}>
        <div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '20px', textAlign: 'center' }}>Customer Signature</div>
        </div>
        <div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '20px', textAlign: 'center' }}>Authorized Signatory</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '20px',
        paddingTop: '15px',
        borderTop: '2px solid #ddd',
        textAlign: 'center',
        fontSize: '10px',
        color: '#666'
      }}>
        <p style={{ margin: '0' }}>This is a computer generated invoice. No signature required.</p>
        <p style={{ margin: '5px 0 0 0' }}>{new Date().toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
};

// State Code to Name Mapping
const STATE_MAPPING = {
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

const getStateName = (stateCode) => {
  return STATE_MAPPING[stateCode] || 'Unknown';
};

export default function GSTBilling() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ledgers, setLedgers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [showAddLedgerModal, setShowAddLedgerModal] = useState(false);
  const [addingLedger, setAddingLedger] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState({
    ledgerId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    referenceNo: '',
    eWayBillNo: '',
    voucherNumber: '',
    goldRate: '',
    silverRate: '',
    stoneAmount: '0',
    roundOff: '0',
    narration: '',
    customerGSTNumber: '',
    gstRate: user?.gstSettings?.defaultGSTRate || 18,
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    transport: '',
    transportId: '',
    deliveryLocation: '',
    paymentType: 'cash'
  });

  const [ledgerFormData, setLedgerFormData] = useState({
    name: '',
    phoneNumber: '',
    hasGST: false,
    gstNumber: '',
    stateCode: ''
  });

  useEffect(() => {
    // Check if GST is enabled for user
    if (!user?.gstEnabled) {
      toast.error('GST is not enabled for your account');
      window.history.back();
      return;
    }
    fetchLedgers();
  }, [user]);

  useEffect(() => {
    const voucherId = searchParams.get('voucherid') || searchParams.get('edit');
    const action = searchParams.get('action');

    if (voucherId) {
      loadVoucher(voucherId);
      setEditingVoucherId(voucherId);

      // Auto-trigger print/share/preview after loading
      if (action === 'print' || action === 'share' || action === 'preview') {
        // Store action for later execution
        sessionStorage.setItem('pendingAction', action);
        sessionStorage.setItem('pendingVoucherId', voucherId);
      }
    } else {
      if (user?.voucherSettings?.autoIncrement) {
        setFormData(prev => ({
          ...prev,
          voucherNumber: user.voucherSettings.currentVoucherNumber || ''
        }));
      }
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (formData.ledgerId && ledgers.length > 0) {
      const ledger = ledgers.find(l => l._id === formData.ledgerId);
      if (ledger) {
        setSelectedLedger(ledger);
        // Preload customer name in search field
        setCustomerSearch(ledger.name);
        if (ledger.gstDetails?.hasGST && ledger.gstDetails?.gstNumber) {
          setFormData(prev => ({
            ...prev,
            customerGSTNumber: ledger.gstDetails.gstNumber
          }));
        }
      }
    }
  }, [formData.ledgerId, ledgers]);

  // Handle auto-print/share/preview from LedgerDetail
  useEffect(() => {
    const pendingAction = sessionStorage.getItem('pendingAction');

    if (pendingAction && items.length > 0 && editingVoucherId) {
      // Wait a moment for all data to be ready
      const timer = setTimeout(() => {
        if (pendingAction === 'print') {
          handlePrint();
        } else if (pendingAction === 'share') {
          handleShareGST();
        } else if (pendingAction === 'preview') {
          // Preview will just stay on the page, no action needed
          toast.info('Invoice loaded for preview');
        }
        // Clear the pending action
        sessionStorage.removeItem('pendingAction');
        sessionStorage.removeItem('pendingVoucherId');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [items, editingVoucherId]);

  const fetchLedgers = async () => {
    try {
      const response = await ledgerAPI.getAll({ type: 'gst' });
      console.log('📊 GST Ledgers fetched:', response?.data?.ledgers?.length || 0);
      console.log('📋 Ledger Types:', response?.data?.ledgers?.map(l => ({ name: l.name, type: l.ledgerType })));
      if (response?.data?.ledgers) {
        setLedgers(response.data.ledgers);
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      toast.error('Failed to load customers');
    }
  };

  // Check if invoice number already exists
  const checkInvoiceNumberExists = async (invoiceNumber, excludeVoucherId = null) => {
    try {
      const response = await voucherAPI.getAll();
      if (response?.data?.vouchers) {
        const existingInvoice = response.data.vouchers.find(
          v => v.status !== 'cancelled' &&
            v.invoiceNumber === invoiceNumber &&
            (!excludeVoucherId || v._id !== excludeVoucherId)
        );
        return !!existingInvoice;
      }
      return false;
    } catch (error) {
      console.error('Error checking invoice number:', error);
      return false;
    }
  };

  const loadVoucher = async (voucherId) => {
    try {
      const response = await voucherAPI.getOne(voucherId);
      const voucher = response.data.voucher;

      setFormData({
        ledgerId: voucher.ledgerId,
        invoiceNumber: voucher.invoiceNumber || 'GST-' + voucher.voucherNumber,
        date: voucher.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        referenceNo: voucher.referenceNo || '',
        eWayBillNo: voucher.eWayBillNo || '',
        voucherNumber: voucher.voucherNumber,
        goldRate: voucher.goldRate || '',
        silverRate: voucher.silverRate || '',
        stoneAmount: voucher.stoneAmount || '0',
        roundOff: voucher.roundOff || '0',
        narration: voucher.narration || '',
        customerGSTNumber: voucher.gstDetails?.customerGSTNumber || '',
        gstRate: voucher.gstDetails?.gstRate || 18,
        bankName: voucher.bankName || '',
        accountNumber: voucher.accountNumber || '',
        ifscCode: voucher.ifscCode || '',
        upiId: voucher.upiId || '',
        transport: voucher.transport || '',
        transportId: voucher.transportId || '',
        deliveryLocation: voucher.deliveryLocation || '',
      });

      setItems(voucher.items || []);

      // Set customer search - will be updated by useEffect when ledgers are loaded
      // This ensures customer name shows even if ledgers aren't loaded yet
      if (voucher.customerName) {
        setCustomerSearch(voucher.customerName);
      }

      toast.success('Invoice loaded');
    } catch (error) {
      console.error('Error loading voucher:', error);
      toast.error('Failed to load invoice');
    }
  };

  const handleAddLedgerSubmit = async (e) => {
    e.preventDefault();

    if (!ledgerFormData.name) {
      toast.error('Please enter customer name');
      return;
    }

    if (ledgerFormData.hasGST && (!ledgerFormData.gstNumber || !isValidGSTFormat(ledgerFormData.gstNumber))) {
      toast.error('Please enter a valid GST number (29AABCR1718E1ZL format)');
      return;
    }

    setAddingLedger(true);
    try {
      const submitData = {
        name: ledgerFormData.name,
        phoneNumber: ledgerFormData.phoneNumber,
        ledgerType: 'gst', // Ensure new ledgers created here are GST type
        ...(ledgerFormData.hasGST && {
          gstDetails: {
            hasGST: true,
            gstNumber: ledgerFormData.gstNumber,
            stateCode: ledgerFormData.stateCode
          }
        })
      };

      await ledgerAPI.create(submitData);
      toast.success('Customer created successfully');
      setShowAddLedgerModal(false);
      setLedgerFormData({ name: '', phoneNumber: '', hasGST: false, gstNumber: '', stateCode: '' });
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create customer');
    } finally {
      setAddingLedger(false);
    }
  };

  const addRow = useCallback((metalType) => {
    setItems(prev => [...prev, {
      metalType,
      itemName: '',
      pieces: 1,
      grossWeight: '',
      lessWeight: '',
      netWeight: '',
      melting: 100,
      wastage: '0',
      fineWeight: '',
      labourRate: '0',
      amount: '0'
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

      return newItems;
    });
  }, [formData.goldRate, formData.silverRate, user?.labourChargeSettings?.type]);

  const calculateTotals = useCallback(() => {
    return items.reduce((acc, item) => {
      const amount = parseFloat(item.amount) || 0;
      return { ...acc, amount: acc.amount + amount };
    }, { amount: 0 });
  }, [items]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await fetchLedgers();
      toast.success('Data refreshed!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ledgerId) {
      toast.error('Please select a customer');
      return;
    }

    if (!formData.invoiceNumber || formData.invoiceNumber.trim() === '') {
      toast.error('Please enter an invoice number');
      return;
    }

    // Check if invoice number already exists (excluding current if editing)
    const invoiceExists = await checkInvoiceNumberExists(formData.invoiceNumber, editingVoucherId);
    if (invoiceExists) {
      toast.error(`Invoice number "${formData.invoiceNumber}" already exists. Please use a different number.`);
      return;
    }

    if (!formData.customerGSTNumber || !isValidGSTFormat(formData.customerGSTNumber)) {
      toast.error('Please enter a valid customer GST number');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName || item.itemName.trim() === '') {
        toast.error(`Item ${i + 1}: Item name is required`);
        return;
      }
      if (item.grossWeight === '' || item.grossWeight === null || item.grossWeight === undefined) {
        toast.error(`Item ${i + 1}: Gross weight is required`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const cleanedItems = items.map(item => ({
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

      const voucherData = {
        ledgerId: formData.ledgerId,
        invoiceNumber: formData.invoiceNumber,
        date: formData.date,
        referenceNo: formData.referenceNo,
        eWayBillNo: formData.eWayBillNo,
        voucherNumber: formData.voucherNumber,
        goldRate: parseFloat(formData.goldRate) || 0,
        silverRate: parseFloat(formData.silverRate) || 0,
        stoneAmount: parseFloat(formData.stoneAmount) || 0,
        items: cleanedItems,
        narration: formData.narration,
        invoiceType: 'gst',
        paymentType: formData.paymentType,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        upiId: formData.upiId,
        transport: formData.transport,
        transportId: formData.transportId,
        deliveryLocation: formData.deliveryLocation,
        gstDetails: {
          customerGSTNumber: formData.customerGSTNumber,
          gstRate: parseFloat(formData.gstRate) || 18,
          gstType: determineGSTType(user?.gstSettings?.businessState, extractStateFromGST(formData.customerGSTNumber))
        }
      };

      if (editingVoucherId) {
        await voucherAPI.update(editingVoucherId, voucherData);
        toast.success('Invoice updated successfully.');
      } else {
        const response = await voucherAPI.create(voucherData);
        console.log('✅ GST Voucher created:', response.data);
        console.log('📋 Invoice Type:', response.data.voucher?.invoiceType);
        console.log('🆔 Ledger ID:', response.data.voucher?.ledgerId);
        toast.success('Invoice created successfully!');
      }

      // Reset form after save
      setFormData({
        ledgerId: '',
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        referenceNo: '',
        eWayBillNo: '',
        voucherNumber: user?.voucherSettings?.currentVoucherNumber || '',
        goldRate: '',
        silverRate: '',
        stoneAmount: '0',
        roundOff: '0',
        narration: '',
        customerGSTNumber: '',
        gstRate: user?.gstSettings?.defaultGSTRate || 18,
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        transport: '',
        transportId: '',
        deliveryLocation: '',
        paymentType: 'cash'
      });
      setItems([]);
      setCustomerSearch('');
      setSelectedLedger(null);
      setEditingVoucherId(null);
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = useCallback(() => {
    if (items.length === 0) {
      toast.error('Please add items before printing');
      return;
    }

    if (!formData.customerGSTNumber || !isValidGSTFormat(formData.customerGSTNumber)) {
      toast.error('Please enter a valid customer GST number');
      return;
    }

    const totals = calculateTotals();
    const stoneAmount = parseFloat(formData.stoneAmount) || 0;
    const roundOff = parseFloat(formData.roundOff) || 0;
    const taxableAmount = totals.amount + stoneAmount + roundOff;
    const gstType = determineGSTType(user?.gstSettings?.businessState, extractStateFromGST(formData.customerGSTNumber));
    const gstBreakdown = calculateGST(taxableAmount, parseFloat(formData.gstRate) || 18, gstType);

    // Create temporary container for rendering
    const tempContainer = document.createElement('div');
    document.body.appendChild(tempContainer);

    const root = ReactDOM.createRoot(tempContainer);
    root.render(
      <GSTInvoiceTemplate
        formData={formData}
        items={items}
        ledgers={ledgers}
        user={user}
        gstType={gstType}
        gstBreakdown={gstBreakdown}
        totals={totals}
      />
    );

    // Wait for rendering to complete, then print
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(tempContainer.innerHTML);
      printWindow.document.close();
      printWindow.print();

      // Cleanup
      root.unmount();
      document.body.removeChild(tempContainer);
    }, 500);
  }, [items, formData, ledgers, user, calculateTotals]);

  const handleDownloadPDF = useCallback(() => {
    if (items.length === 0) {
      toast.error('Please add items before downloading');
      return;
    }

    const totals = calculateTotals();
    const stoneAmount = parseFloat(formData.stoneAmount) || 0;
    const roundOff = parseFloat(formData.roundOff) || 0;
    const taxableAmount = totals.amount + stoneAmount + roundOff;
    const gstType = determineGSTType(user?.gstSettings?.businessState, extractStateFromGST(formData.customerGSTNumber));
    const gstBreakdown = calculateGST(taxableAmount, parseFloat(formData.gstRate) || 18, gstType);

    const element = document.createElement('div');
    const root = ReactDOM.createRoot(element);
    root.render(
      <GSTInvoiceTemplate
        formData={formData}
        items={items}
        ledgers={ledgers}
        user={user}
        gstType={gstType}
        gstBreakdown={gstBreakdown}
        totals={totals}
      />
    );

    // Wait for rendering, then generate PDF
    setTimeout(() => {
      const opt = {
        margin: 5,
        filename: `GST-Invoice-${formData.invoiceNumber}.pdf`,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(element).save();
      root.unmount();
    }, 500);
  }, [items, formData, ledgers, user, calculateTotals]);

  const handleShareGST = useCallback(async () => {
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

      const totals = calculateTotals();
      const stoneAmount = parseFloat(formData.stoneAmount) || 0;
      const roundOff = parseFloat(formData.roundOff) || 0;
      const taxableAmount = totals.amount + stoneAmount + roundOff;
      const gstTypeVal = determineGSTType(user?.gstSettings?.businessState, extractStateFromGST(formData.customerGSTNumber));
      const gstBreakdownVal = calculateGST(taxableAmount, parseFloat(formData.gstRate) || 18, gstTypeVal);
      const totalAmount = taxableAmount + gstBreakdownVal.totalGST;

      // Create container for React component
      const container = document.createElement('div');
      const root = ReactDOM.createRoot(container);
      root.render(
        <GSTInvoiceTemplate
          formData={formData}
          items={items}
          ledgers={ledgers}
          user={user}
          gstType={gstTypeVal}
          gstBreakdown={gstBreakdownVal}
          totals={totals}
        />
      );

      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate PDF blob
      const options = {
        margin: 5,
        filename: `GST-Invoice-${formData.invoiceNumber}.pdf`,
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf()
        .set(options)
        .from(container)
        .output('blob')
        .then((blob) => {
          root.unmount();

          const fileName = `GST-Invoice-${formData.invoiceNumber}.pdf`;
          const file = new File([blob], fileName, { type: 'application/pdf' });

          // Check if Web Share API is available with file sharing support
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
              files: [file],
              title: `GST Invoice #${formData.invoiceNumber}`,
              text: `GST Tax Invoice for ${ledger?.name || 'N/A'}`
            }).then(() => {
              toast.success('GST Invoice PDF shared successfully!');
            }).catch(err => {
              if (err.name !== 'AbortError') {
                downloadPDFFile(blob, fileName);
              }
            });
          } else {
            // Fallback: Download + Show sharing options
            downloadPDFFile(blob, fileName);

            // Show WhatsApp and other sharing options
            const whatsappText = `Check out this GST Tax Invoice for ${ledger?.name}. Invoice #${formData.invoiceNumber}. Total: ₹${totalAmount.toFixed(2)}`;
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

            toast.info(
              <div>
                <p>PDF downloaded! Share it via:</p>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: '10px', color: '#25D366', textDecoration: 'none', fontWeight: 'bold' }}>
                  📱 WhatsApp
                </a>
              </div>,
              { autoClose: 5000 }
            );
          }
        })
        .catch(error => {
          console.error('PDF generation error:', error);
          root.unmount();
          toast.error('Failed to generate PDF. Please try again.');
        });
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate or share PDF');
    }
  }, [items, formData, ledgers, user, calculateTotals]);

  const downloadPDFFile = (blob, fileName) => {
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

  const filteredLedgers = ledgers.filter(l =>
    l.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    l.phoneNumber.includes(customerSearch)
  );

  const totals = calculateTotals();
  const stoneAmount = parseFloat(formData.stoneAmount) || 0;
  const roundOff = parseFloat(formData.roundOff) || 0;
  const taxableAmount = totals.amount + stoneAmount + roundOff;
  const gstType = formData.customerGSTNumber ? determineGSTType(user?.gstSettings?.businessState, extractStateFromGST(formData.customerGSTNumber)) : null;
  const gstBreakdown = gstType ? calculateGST(taxableAmount, parseFloat(formData.gstRate) || 18, gstType) : { igst: 0, cgst: 0, sgst: 0, totalGST: 0, total: taxableAmount };

  return (
    <Layout>
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
          <h1 style={{ marginBottom: 0, color: 'var(--color-text)' }}>📄 GST Tax Invoice</h1>
          
          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              backgroundColor: isLoading ? '#95a5a6' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s'
            }}
            title="Refresh data"
          >
            <FiRefreshCw style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'var(--bg-primary)',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid var(--border-color)'
        }}>
          {/* Invoice Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                Invoice Number *
                <span style={{ fontSize: '12px', color: 'var(--color-warning)', fontWeight: 'normal', display: 'block' }}>
                  Must be unique and manually entered
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g., GST-001 (Set your own number)"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value.trim() })}
                style={{
                  padding: '10px',
                  border: formData.invoiceNumber ? '2px solid var(--color-success)' : '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--color-text)',
                  fontWeight: formData.invoiceNumber ? 'bold' : 'normal'
                }}
              />
            </div>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--color-text)'
              }}
            />
            <input
              type="text"
              placeholder="Reference No."
              value={formData.referenceNo}
              onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--color-text)'
              }}
            />
            <input
              type="text"
              placeholder="E-Way Bill No."
              value={formData.eWayBillNo}
              onChange={(e) => setFormData({ ...formData, eWayBillNo: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          {/* Customer Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--color-text)' }}>
              Select Customer *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  style={{
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--color-text)'
                  }}
                />
                {showDropdown && customerSearch && filteredLedgers.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderTop: 'none',
                    borderRadius: '0 0 4px 4px',
                    zIndex: 10,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                    {filteredLedgers.map(ledger => (
                      <div
                        key={ledger._id}
                        onClick={() => {
                          setFormData({ ...formData, ledgerId: ledger._id });
                          setCustomerSearch(ledger.name);
                          setShowDropdown(false);
                        }}
                        style={{
                          padding: '10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: formData.ledgerId === ledger._id ? 'var(--bg-hover)' : 'var(--bg-primary)',
                          color: 'var(--color-text)',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <strong>{ledger.name}</strong> - {ledger.phoneNumber}
                        {ledger.gstDetails?.hasGST && (
                          <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '10px' }}>
                            GST: {ledger.gstDetails.gstNumber}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAddLedgerModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                <FiPlus style={{ marginRight: '5px' }} /> Add Customer
              </button>
            </div>
          </div>

          {/* Customer GST Details */}
          {formData.ledgerId && selectedLedger && (
            <div style={{
              padding: '15px',
              backgroundColor: 'var(--bg-secondary)',
              border: '2px solid var(--color-primary)',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-primary)' }}>Customer Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px', color: 'var(--color-text)' }}>
                <div><strong>Name:</strong> {selectedLedger.name}</div>
                <div><strong>Phone:</strong> {selectedLedger.phoneNumber}</div>
                {selectedLedger.gstDetails?.hasGST && (
                  <>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong>Customer GSTIN:</strong>
                      <input
                        type="text"
                        value={formData.customerGSTNumber}
                        onChange={(e) => setFormData({ ...formData, customerGSTNumber: e.target.value.toUpperCase() })}
                        placeholder="29AABCR1718E1ZL"
                        style={{
                          width: '100%',
                          padding: '8px',
                          marginTop: '5px',
                          border: '2px solid var(--color-primary)',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Metal Rate Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>Gold Rate (₹/g) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.goldRate}
                onChange={(e) => setFormData({ ...formData, goldRate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>Silver Rate (₹/g) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.silverRate}
                onChange={(e) => setFormData({ ...formData, silverRate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>Stone Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.stoneAmount}
                onChange={(e) => setFormData({ ...formData, stoneAmount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--color-text)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>Round Off (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.roundOff}
                onChange={(e) => setFormData({ ...formData, roundOff: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--color-text)'
                }}
              />
              <small style={{ display: 'block', marginTop: '3px', color: 'var(--color-muted)', fontSize: '11px' }}>
                (adjustment for final amount - positive or negative)
              </small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>GST Rate (%) *</label>
              <select
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--color-text)'
                }}
              >
                <option value="0">0%</option>
                <option value="3">3%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Line Items</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => addRow('gold')}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#FFD700',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  + Gold
                </button>
                <button
                  type="button"
                  onClick={() => addRow('silver')}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#C0C0C0',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  + Silver
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)'
              }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'right' }}>Pieces</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'right' }}>Gross Wt (g)</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'right' }}>Less Wt (g)</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'right' }}>Net Wt (g)</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'right' }}>Melting %</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'right' }}>Fine Wt (g)</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'right' }}>Labour (₹)</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ border: '1px solid var(--border-color)', padding: '10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '5px' }}>
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                          placeholder="Item name"
                          style={{
                            width: '100%',
                            padding: '5px',
                            border: '1px solid #ddd',
                            borderRadius: '3px',
                            fontSize: '12px'
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '5px' }}>
                        <input
                          type="number"
                          value={item.pieces}
                          onChange={(e) => updateItem(index, 'pieces', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '5px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '3px',
                            fontSize: '12px',
                            textAlign: 'right',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '5px' }}>
                        <input
                          type="number"
                          step="0.001"
                          value={item.grossWeight}
                          onChange={(e) => updateItem(index, 'grossWeight', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '5px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '3px',
                            fontSize: '12px',
                            textAlign: 'right',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '5px' }}>
                        <input
                          type="number"
                          step="0.001"
                          value={item.lessWeight}
                          onChange={(e) => updateItem(index, 'lessWeight', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '5px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '3px',
                            fontSize: '12px',
                            textAlign: 'right',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '5px', backgroundColor: 'var(--bg-secondary)', textAlign: 'right', fontSize: '12px', color: 'var(--color-text)' }}>
                        {parseFloat(item.netWeight).toFixed(3)}
                      </td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '5px' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.melting}
                          onChange={(e) => updateItem(index, 'melting', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '5px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '3px',
                            fontSize: '12px',
                            textAlign: 'right',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '5px', backgroundColor: 'var(--bg-secondary)', textAlign: 'right', fontSize: '12px', color: 'var(--color-text)' }}>
                        {parseFloat(item.fineWeight).toFixed(3)}
                      </td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '5px' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.labourRate}
                          onChange={(e) => updateItem(index, 'labourRate', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '5px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '3px',
                            fontSize: '12px',
                            textAlign: 'right',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)'
                          }}
                        />
                      </td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '5px', backgroundColor: 'var(--bg-secondary)', fontWeight: 'bold', textAlign: 'right', fontSize: '12px', color: 'var(--color-text)' }}>
                        {parseFloat(item.amount).toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '5px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => deleteRow(index)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--color-danger)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <FiX />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank & Additional Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <input
              type="text"
              placeholder="Bank Name"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              placeholder="Account Number"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              placeholder="IFSC Code"
              value={formData.ifscCode}
              onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              placeholder="UPI ID"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              placeholder="Transport Name"
              value={formData.transport}
              onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              placeholder="Transport ID"
              value={formData.transportId}
              onChange={(e) => setFormData({ ...formData, transportId: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              placeholder="Delivery Location"
              value={formData.deliveryLocation}
              onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
              style={{
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--color-text)'
              }}
            />
            <textarea
              placeholder="Narration / Notes"
              value={formData.narration}
              onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
              rows="2"
              style={{
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'Arial',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--color-text)'
              }}
            />
          </div>

          {/* Totals Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div></div>
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid var(--color-primary)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-text)' }}>Subtotal</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-text)' }}>₹ {totals.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-text)' }}>Stone Amount</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-text)' }}>₹ {stoneAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-text)' }}>Taxable Amount</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-text)' }}>₹ {taxableAmount.toFixed(2)}</td>
                  </tr>
                  {gstType === 'IGST' ? (
                    <tr style={{ backgroundColor: 'var(--bg-hover)', borderLeft: '4px solid var(--color-warning)' }}>
                      <td style={{ fontWeight: 'bold', color: 'var(--color-warning)' }}>IGST @ {formData.gstRate}%</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-warning)' }}>₹ {gstBreakdown.igst.toFixed(2)}</td>
                    </tr>
                  ) : (
                    <>
                      <tr style={{ backgroundColor: 'var(--bg-hover)', borderLeft: '4px solid var(--color-warning)' }}>
                        <td style={{ fontWeight: 'bold', color: 'var(--color-warning)' }}>SGST @ {formData.gstRate / 2}%</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-warning)' }}>₹ {gstBreakdown.sgst.toFixed(2)}</td>
                      </tr>
                      <tr style={{ backgroundColor: 'var(--bg-hover)', borderLeft: '4px solid var(--color-warning)' }}>
                        <td style={{ fontWeight: 'bold', color: 'var(--color-warning)' }}>CGST @ {formData.gstRate / 2}%</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-warning)' }}>₹ {gstBreakdown.cgst.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                  <tr style={{ backgroundColor: 'var(--color-success)', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                    <td>TOTAL (GST INCL.)</td>
                    <td style={{ textAlign: 'right' }}>₹ {gstBreakdown.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--color-info)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <FiPrinter /> Print
            </button>
            <button
              type="button"
              onClick={handleShareGST}
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--color-warning)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isSubmitting ? 0.7 : 1
              }}
              title="Share GST Invoice via PDF"
            >
              📤 Share
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--color-success)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <FiSave /> {editingVoucherId ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>

        {/* Add Ledger Modal */}
        {showAddLedgerModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'var(--bg-primary)',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Add New Customer</h2>
                <button
                  onClick={() => setShowAddLedgerModal(false)}
                  style={{
                    backgroundColor: 'transparent',
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
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>Customer Name *</label>
                  <input
                    type="text"
                    value={ledgerFormData.name}
                    onChange={(e) => setLedgerFormData({ ...ledgerFormData, name: e.target.value })}
                    placeholder="Enter customer name"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={ledgerFormData.phoneNumber}
                    onChange={(e) => setLedgerFormData({ ...ledgerFormData, phoneNumber: e.target.value })}
                    placeholder="10 digits (optional)"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--color-text)'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-text)' }}>
                    <input
                      type="checkbox"
                      checked={ledgerFormData.hasGST}
                      onChange={(e) => setLedgerFormData({ ...ledgerFormData, hasGST: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    Customer has GST?
                  </label>
                </div>

                {ledgerFormData.hasGST && (
                  <>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>GST Number *</label>
                      <input
                        type="text"
                        value={ledgerFormData.gstNumber}
                        onChange={(e) => setLedgerFormData({ ...ledgerFormData, gstNumber: e.target.value.toUpperCase() })}
                        placeholder="29AABCR1718E1ZL"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid var(--color-danger)',
                          borderRadius: '4px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          fontWeight: 'bold',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--color-text)' }}>State Code (First 2 digits of GST)</label>
                      <input
                        type="text"
                        value={ledgerFormData.stateCode}
                        placeholder="27"
                        disabled
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          fontSize: '14px',
                          backgroundColor: 'var(--bg-secondary)',
                          boxSizing: 'border-box',
                          color: 'var(--color-text)'
                        }}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddLedgerModal(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--color-secondary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingLedger}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--color-success)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: addingLedger ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      opacity: addingLedger ? 0.7 : 1
                    }}
                  >
                    {addingLedger ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
