import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiX, FiSave, FiPrinter, FiShare2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import html2pdf from 'html2pdf.js';

// Voucher Print Template Component
const VoucherTemplate = ({ formData, items, ledgers, user }) => {
  const ledger = ledgers.find(l => l._id === formData.ledgerId);
  const totals = {
    pieces: items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0),
    grossWeight: items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0),
    lessWeight: items.reduce((sum, item) => sum + (parseFloat(item.lessWeight) || 0), 0),
    netWeight: items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0),
    fineWeight: items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0),
    labourRate: items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0),
    amount: items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  };

  const grandTotal = totals.amount + (parseFloat(formData.stoneAmount) || 0);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>{user?.shopName || 'ESTIMATE/ON APPROVAL'}</h2>
        <p style={{ margin: '5px 0', fontSize: '16px' }}>ESTIMATE/ON APPROVAL - Issue</p>
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
              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', color: item.metalType === 'gold' ? '#FFD700' : '#C0C0C0', fontWeight: 'bold' }}>{item.metalType === 'gold' ? 'GOLD' : 'SILVER'}</td>
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
          <div>Labour :</div>
          <div>{totals.labourRate.toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Net Balance :</div>
          <div></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Narration :</div>
          <div></div>
        </div>
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
          <div>Recept</div>
          <div>{parseFloat(formData.receiptGross || 0).toFixed(3)}</div>
        </div>

        {/* Balance Details - Separate Boxes */}
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <div>Cash Received</div>
            <div>₹{parseFloat(formData.cashReceived || 0).toFixed(2)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontWeight: 'bold' }}>
            <div>Net Balance</div>
            <div>₹{((totals.amount + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0)).toFixed(2)}</div>
          </div>

          {/* Old Balance Details Box */}
          <div style={{ border: '1px solid var(--border-color)', padding: '10px', marginBottom: '10px', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>Old Balance Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
              <div>Old Bal Amount</div>
              <div>₹{formData.paymentType === 'credit' ? (ledger?.balances?.creditBalance?.toFixed(2) || '0.00') : (ledger?.balances?.cashBalance?.toFixed(2) || '0.00')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
              <div>Old Bal Gold Fine Wt</div>
              <div style={{ color: '#FFD700', fontWeight: 'bold' }}>{formData.paymentType === 'credit' ? (ledger?.balances?.goldFineWeight?.toFixed(3) || '0.000') : '0.000'} g</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <div>Old Bal Silver Fine Wt</div>
              <div style={{ color: '#C0C0C0', fontWeight: 'bold' }}>{formData.paymentType === 'credit' ? (ledger?.balances?.silverFineWeight?.toFixed(3) || '0.000') : '0.000'} g</div>
            </div>
          </div>

          {/* Current Balance Details Box */}
          <div style={{ border: '1px solid var(--border-color)', padding: '10px', marginBottom: '10px', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>Current Balance Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
              <div>Cur Bal Amount</div>
              <div>₹{formData.paymentType === 'credit' ? ((parseFloat(ledger?.balances?.creditBalance || 0) + (totals.amount + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0))).toFixed(2) : ((parseFloat(ledger?.balances?.cashBalance || 0) + (totals.amount + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0))).toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
              <div>Cur Bal Gold Fine Wt</div>
              <div style={{ color: '#FFD700', fontWeight: 'bold' }}>{formData.paymentType === 'credit' ? ((parseFloat(ledger?.balances?.goldFineWeight || 0) + totals.fineWeight).toFixed(3)) : (totals.fineWeight).toFixed(3)} g</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
              <div>Cur Bal Silver Fine Wt</div>
              <div style={{ color: '#C0C0C0', fontWeight: 'bold' }}>{formData.paymentType === 'credit' ? ((parseFloat(ledger?.balances?.silverFineWeight || 0) + totals.fineWeight).toFixed(3)) : (totals.fineWeight).toFixed(3)} g</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
              <div>Receipt Gross (Entry Fine)</div>
              <div>{totals.fineWeight.toFixed(3)} g</div>
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
  const [ledgerFormData, setLedgerFormData] = useState({ name: '', phoneNumber: '' });
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
    issueGross: '',
    receiptGross: '',
    narration: '',
    cashReceived: ''
  });
  const [items, setItems] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState(null);

  useEffect(() => {
    fetchLedgers();
  }, []);

  // Load voucher data when voucherid is in URL query
  useEffect(() => {
    if (voucherid) {
      loadVoucherData(voucherid);
    }
  }, [voucherid]);

  const loadVoucherData = async (id) => {
    try {
      const response = await voucherAPI.getOne(id);
      const voucher = response.data.voucher;
      
      setEditingVoucherId(id);
      setFormData({
        ledgerId: voucher.ledgerId,
        date: voucher.date.split('T')[0],
        voucherNumber: voucher.voucherNumber,
        paymentType: voucher.paymentType,
        goldRate: voucher.goldRate || '',
        silverRate: voucher.silverRate || '',
        stoneAmount: voucher.stoneAmount || '',
        issueGross: voucher.issue?.gross || '',
        receiptGross: voucher.receipt?.gross || '',
        narration: voucher.narration || '',
        cashReceived: voucher.cashReceived || ''
      });
      
      setItems(voucher.items || []);
      setCustomerSearch(ledgers.find(l => l._id === voucher.ledgerId)?.name || '');
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
  }, [formData.ledgerId, ledgers]);

  // Recalculate all items when Gold/Silver rates change
  useEffect(() => {
    if (items.length > 0 && (formData.goldRate || formData.silverRate)) {
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
          
          const amount = (fineWeight * rate) + labourRate;
          
          return {
            ...item,
            netWeight: netWeight.toFixed(3),
            fineWeight: fineWeight.toFixed(3),
            amount: amount.toFixed(2)
          };
        });
      });
    }
  }, [formData.goldRate, formData.silverRate]);

  const fetchLedgers = async () => {
    try {
      const response = await ledgerAPI.getAll();
      if (response?.data?.ledgers) {
        setLedgers(response.data.ledgers);
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      toast.error('Failed to load ledgers');
    }
  };

  const handleAddLedgerSubmit = async (e) => {
    e.preventDefault();
    
    if (!ledgerFormData.name || !ledgerFormData.phoneNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    setAddingLedger(true);
    try {
      await ledgerAPI.create(ledgerFormData);
      toast.success('Ledger created successfully');
      setShowAddLedgerModal(false);
      setLedgerFormData({ name: '', phoneNumber: '' });
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
      
      const amount = (fineWeight * rate) + labourRate;

      newItems[index] = {
        ...item,
        netWeight: netWeight.toFixed(3),
        fineWeight: fineWeight.toFixed(3),
        amount: amount.toFixed(2)
      };
      
      return newItems;
    });
  }, [formData.goldRate, formData.silverRate]);

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
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  }, []);

  const calculateTotals = useCallback(() => {
    return items.reduce((acc, item) => {
      const pieces = parseInt(item.pieces) || 0;
      const grossWeight = parseFloat(item.grossWeight) || 0;
      const lessWeight = parseFloat(item.lessWeight) || 0;
      const netWeight = parseFloat(item.netWeight) || 0;
      const melting = parseFloat(item.melting) || 0;
      const wastage = parseFloat(item.wastage) || 0;
      const fineWeight = parseFloat(item.fineWeight) || 0;
      const labourRate = parseFloat(item.labourRate) || 0;
      const amount = parseFloat(item.amount) || 0;

      return {
        pieces: acc.pieces + pieces,
        grossWeight: acc.grossWeight + grossWeight,
        lessWeight: acc.lessWeight + lessWeight,
        netWeight: acc.netWeight + netWeight,
        melting: acc.melting + melting,
        wastage: acc.wastage + wastage,
        fineWeight: acc.fineWeight + fineWeight,
        labourRate: acc.labourRate + labourRate,
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
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ledgerId) {
      toast.error('Please select a customer');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate all items have required fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName || item.itemName.trim() === '') {
        toast.error(`Item ${i + 1}: Item name is required`);
        return;
      }
      if (!item.grossWeight || parseFloat(item.grossWeight) <= 0) {
        toast.error(`Item ${i + 1}: Gross weight must be greater than 0`);
        return;
      }
      if (item.metalType === 'gold' && !formData.goldRate) {
        toast.error(`Item ${i + 1}: Gold rate is required`);
        return;
      }
      if (item.metalType === 'silver' && !formData.silverRate) {
        toast.error(`Item ${i + 1}: Silver rate is required`);
        return;
      }
    }

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
      date: formData.date,
      voucherNumber: formData.voucherNumber,
      paymentType: formData.paymentType,
      goldRate: parseFloat(formData.goldRate) || 0,
      silverRate: parseFloat(formData.silverRate) || 0,
      stoneAmount: parseFloat(formData.stoneAmount) || 0,
      items: cleanedItems,
      issue: { gross: parseFloat(formData.issueGross) || 0 },
      receipt: { gross: parseFloat(formData.receiptGross) || 0 },
      narration: formData.narration,
      cashReceived: parseFloat(formData.cashReceived) || 0
    };

    try {
      if (editingVoucherId) {
        // Delete old voucher and create new one
        await voucherAPI.delete(editingVoucherId);
        await voucherAPI.create(voucherData);
        toast.success('Voucher updated successfully!');
      } else {
        // Create new voucher
        await voucherAPI.create(voucherData);
        toast.success('Voucher created successfully!');
      }
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving voucher:', error);
      toast.error(error.response?.data?.message || 'Failed to save voucher');
    }
  };

  const handlePrint = useCallback(() => {
    if (items.length === 0) {
      toast.error('Please add items before printing');
      return;
    }

    const selectedLedger = ledgers.find(l => l._id === formData.ledgerId);
    const totals = calculateTotals();

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
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .total-row { font-weight: bold; background-color: #f5f5f5; }
          .amount-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
          .section-label { font-weight: bold; margin-bottom: 5px; margin-top: 10px; }
          .voucher-container { max-width: 900px; margin: 0 auto; }
          @media print { body { margin: 0; padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <div style="font-size: 20px; font-weight: bold;">${user?.shopName || 'ESTIMATE/ON APPROVAL'}</div>
            <div style="font-size: 14px; margin-top: 5px;">ESTIMATE/ON APPROVAL - Issue</div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <div>Name : <strong>${selectedLedger?.name || 'N/A'}</strong></div>
              <div>Voucher No : <strong>${formData.voucherNumber}</strong></div>
            </div>
            <div style="text-align: right;">
              <div>Date : ${new Date(formData.date).toLocaleDateString('en-IN')}</div>
              <div>Page No : 1/1</div>
            </div>
          </div>

          <table style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="width: 5%;">Sr</th>
                <th style="width: 15%;">Item Name</th>
                <th style="width: 5%;">Pcs</th>
                <th style="width: 10%;">Gross</th>
                <th style="width: 10%;">Less</th>
                <th style="width: 10%;">Net Wt</th>
                <th style="width: 10%;">Melting</th>
                <th style="width: 10%;">Wastage</th>
                <th style="width: 10%;">Fine Wt</th>
                <th style="width: 10%;">Lab Rt</th>
                <th style="width: 10%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.itemName}</td>
                  <td>${item.pieces}</td>
                  <td>${parseFloat(item.grossWeight || 0).toFixed(3)}</td>
                  <td>${parseFloat(item.lessWeight || 0).toFixed(3)}</td>
                  <td>${parseFloat(item.netWeight || 0).toFixed(3)}</td>
                  <td>${parseFloat(item.melting || 0).toFixed(3)}</td>
                  <td>${parseFloat(item.wastage || 0).toFixed(3)}</td>
                  <td>${parseFloat(item.fineWeight || 0).toFixed(3)}</td>
                  <td>${parseFloat(item.labourRate || 0).toFixed(2)}</td>
                  <td>${parseFloat(item.amount || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">Total</td>
                <td>${totals.pieces}</td>
                <td>${totals.grossWeight.toFixed(3)}</td>
                <td>${totals.lessWeight.toFixed(3)}</td>
                <td>${totals.netWeight.toFixed(3)}</td>
                <td></td>
                <td></td>
                <td>${totals.fineWeight.toFixed(3)}</td>
                <td>${totals.labourRate.toFixed(2)}</td>
                <td>${totals.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="amount-section">
            <div>
              <div class="section-label">Stone Amount :</div>
              <div>${parseFloat(formData.stoneAmount || 0).toFixed(2)}</div>
              
              <div class="section-label">Labour :</div>
              <div>${totals.labourRate.toFixed(2)}</div>
            </div>

            <div>
              <div class="section-label">Gold Rate :</div>
              <div>${parseFloat(formData.goldRate || 0).toFixed(2)}</div>

              <div class="section-label">Silver Rate :</div>
              <div>${parseFloat(formData.silverRate || 0).toFixed(2)}</div>
              
              <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <div class="section-label">Issue</div>
                  <div>${parseFloat(formData.issueGross || 0).toFixed(3)}</div>
                </div>
                <div>
                  <div class="section-label">Receipt Gross (g)</div>
                  <div>${(items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)}</div>
                </div>
              </div>

              <div style="margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px;">
                <div class="section-label">Cash Received :</div>
                <div>${parseFloat(formData.cashReceived || 0).toFixed(2)}</div>

                <div class="section-label" style="margin-top: 10px;">Net Balance :</div>
                <div>${((items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0)).toFixed(2)}</div>
              </div>
            </div>

            <div style="margin-top: 10px; padding-top: 5px;">
              <div class="section-label">Old Bal Amount :</div>
              <div>${formData.paymentType === 'credit' ? (parseFloat(selectedLedger?.balances?.creditBalance || 0).toFixed(2)) : (parseFloat(selectedLedger?.balances?.cashBalance || 0).toFixed(2))}</div>

              <div class="section-label">Old Bal Gold Fine Wt :</div>
              <div>${formData.paymentType === 'credit' ? parseFloat(selectedLedger?.balances?.goldFineWeight || 0).toFixed(3) : '0.000'}</div>

              <div class="section-label">Old Bal Silver Fine Wt :</div>
              <div>${formData.paymentType === 'credit' ? parseFloat(selectedLedger?.balances?.silverFineWeight || 0).toFixed(3) : '0.000'}</div>

              <div style="margin-top: 10px; border-top: 1px solid #ccc; padding-top: 10px;">
                <div class="section-label">Cur Bal Amount :</div>
                <div>${(((items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0)) + (formData.paymentType === 'credit' ? (parseFloat(selectedLedger?.balances?.creditBalance) || 0) : (parseFloat(selectedLedger?.balances?.cashBalance) || 0))).toFixed(2)}</div>

                <div class="section-label">Cur Bal Gold Fine Wt :</div>
                <div>${formData.paymentType === 'credit' ? ((items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)) + (parseFloat(selectedLedger?.balances?.goldFineWeight) || 0)).toFixed(3) : (items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)}</div>

                <div class="section-label">Cur Bal Silver Fine Wt :</div>
                <div>${formData.paymentType === 'credit' ? ((items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)) + (parseFloat(selectedLedger?.balances?.silverFineWeight) || 0)).toFixed(3) : (items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)}</div>
              </div>
            </div>
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
  }, [items, ledgers, formData, user, calculateTotals]);

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
      const grandTotal = totals.amount + (parseFloat(formData.stoneAmount) || 0);

      // Create professional voucher content
      // IMPORTANT: Force light mode colors for PDF to work in both light and dark app themes
      const voucherContent = document.createElement('div');
      voucherContent.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background-color: #ffffff; color: #333333;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #000000;">${user?.shopName || 'ESTIMATE/ON APPROVAL'}</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; color: #333333;">ESTIMATE/ON APPROVAL - ISSUE</p>
          </div>

          <!-- Customer & Voucher Info -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #333333;">
            <div>
              <div style="font-weight: bold; margin-bottom: 5px; color: #000000;">Customer Name</div>
              <div style="font-size: 16px; font-weight: 600; color: #000000;">${ledger?.name || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; margin-bottom: 5px; color: #000000;">Voucher No</div>
              <div style="font-size: 16px; font-weight: 600; color: #000000;">${formData.voucherNumber}</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #444444; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
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
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; font-size: 14px; color: #333333;">
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #000000;">Amount Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
                <span>Labour Amount:</span>
                <strong style="color: #000000;">₹${items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
                <span>Stone Amount:</span>
                <strong style="color: #000000;">₹${parseFloat(formData.stoneAmount || 0).toFixed(2)}</strong>
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
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border: 2px solid #ffc107; margin-bottom: 20px; font-size: 14px; color: #333333;">
            <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #856404;">Balance Details</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div style="background-color: rgba(255,255,255,0.6); padding: 15px; border-radius: 4px;">
                <div style="color: #333333; margin-bottom: 5px; font-weight: bold;">Cash Received</div>
                <div style="font-size: 16px; font-weight: bold; color: #000000;">₹${parseFloat(formData.cashReceived || 0).toFixed(2)}</div>
              </div>
              <div style="background-color: rgba(255,255,255,0.6); padding: 15px; border-radius: 4px;">
                <div style="color: #333333; margin-bottom: 5px; font-weight: bold;">Net Balance</div>
                <div style="font-size: 16px; font-weight: bold; color: #c41c3b;">₹${(((items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0))).toFixed(2)}</div>
              </div>
            </div>

            <div style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px; margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">Old Balance Details</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div>
                  <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Old Bal Amount</div>
                  <div style="font-size: 14px; font-weight: bold; color: #000000;">₹${formData.paymentType === 'credit' ? (parseFloat(selectedLedger?.balances?.creditBalance || 0).toFixed(2)) : (parseFloat(selectedLedger?.balances?.cashBalance || 0).toFixed(2))}</div>
                </div>
                <div>
                  <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Old Bal Gold Fine Wt</div>
                  <div style="font-size: 14px; font-weight: bold; color: #FFD700;">${formData.paymentType === 'credit' ? parseFloat(selectedLedger?.balances?.goldFineWeight || 0).toFixed(3) : '0.000'} g</div>
                </div>
                <div>
                  <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Old Bal Silver Fine Wt</div>
                  <div style="font-size: 14px; font-weight: bold; color: #C0C0C0;">${formData.paymentType === 'credit' ? parseFloat(selectedLedger?.balances?.silverFineWeight || 0).toFixed(3) : '0.000'} g</div>
                </div>
              </div>
            </div>

            <div style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">Current Balance</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div style="background-color: #d4edda; padding: 15px; border-radius: 4px;">
                  <div style="color: #155724; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Cur Bal Amount</div>
                  <div style="font-size: 16px; font-weight: bold; color: #155724;">₹${(((items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0)) + (formData.paymentType === 'credit' ? (parseFloat(selectedLedger?.balances?.creditBalance) || 0) : (parseFloat(selectedLedger?.balances?.cashBalance) || 0))).toFixed(2)}</div>
                </div>
                <div style="background-color: #d4edda; padding: 15px; border-radius: 4px;">
                  <div style="color: #155724; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Cur Bal Gold Fine Wt</div>
                  <div style="font-size: 16px; font-weight: bold; color: #FFD700;">${formData.paymentType === 'credit' ? ((items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)) + (parseFloat(selectedLedger?.balances?.goldFineWeight) || 0)).toFixed(3) : (items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)} g</div>
                </div>
                <div style="background-color: #d4edda; padding: 15px; border-radius: 4px;">
                  <div style="color: #155724; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Cur Bal Silver Fine Wt</div>
                  <div style="font-size: 16px; font-weight: bold; color: #C0C0C0;">${formData.paymentType === 'credit' ? ((items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)) + (parseFloat(selectedLedger?.balances?.silverFineWeight) || 0)).toFixed(3) : (items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)} g</div>
                </div>
              </div>
              <div style="margin-top: 15px; padding: 15px; background-color: #e2e3e5; border-radius: 4px;">
                <div style="color: #383d41; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Receipt Gross (Entry Fine)</div>
                <div style="font-size: 16px; font-weight: bold; color: #383d41;">${(items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)} g</div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; border-top: 2px solid #ddd; padding-top: 20px; font-size: 12px; color: #666666;">
            <p style="margin: 0; color: #666666;">Generated on ${new Date().toLocaleString('en-IN')}</p>
            <p style="margin: 0; color: #666666;">This is an electronically generated document</p>
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
                    📱 WhatsApp
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
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: 'var(--color-primary)', marginBottom: '30px' }}>{editingVoucherId ? '✏️ Edit Voucher' : 'Create Voucher'}</h1>

        {/* Customer Selection */}
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ marginTop: 0 }}>Select Customer</h3>
            <button
              type="button"
              onClick={() => setShowAddLedgerModal(true)}
              style={{
                padding: '8px 15px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FiPlus /> Add Customer
            </button>
          </div>
          
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Search customer..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
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
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 10
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
                      }}
                      style={{
                        padding: '10px',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        backgroundColor: formData.ledgerId === ledger._id ? 'var(--bg-hover)' : 'transparent'
                      }}
                    >
                      {ledger.name} {ledger.phoneNumber && `(${ledger.phoneNumber})`}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Voucher Details */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Voucher Number</label>
              <input
                type="text"
                required
                value={formData.voucherNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, voucherNumber: e.target.value }))}
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

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
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

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Gold Rate (₹/g)</label>
              <input
                type="number"
                step="0.01"
                value={formData.goldRate}
                onChange={(e) => setFormData(prev => ({ ...prev, goldRate: e.target.value }))}
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

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Silver Rate (₹/g)</label>
              <input
                type="number"
                step="0.01"
                value={formData.silverRate}
                onChange={(e) => setFormData(prev => ({ ...prev, silverRate: e.target.value }))}
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

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Stone Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.stoneAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, stoneAmount: e.target.value }))}
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

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Issue Gross (g)</label>
              <input
                type="number"
                step="0.001"
                value={formData.issueGross}
                onChange={(e) => setFormData(prev => ({ ...prev, issueGross: e.target.value }))}
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

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Receipt Gross (g)</label>
              <input
                type="number"
                step="0.001"
                value={formData.receiptGross}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptGross: e.target.value }))}
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

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Payment Type</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--color-text)',
                  boxSizing: 'border-box'
                }}
              >
                <option value="cash">Cash</option>
                <option value="credit">Credit (On Balance)</option>
              </select>
              <small style={{ display: 'block', marginTop: '5px', color: 'var(--color-muted)', fontSize: '12px' }}>
                {formData.paymentType === 'credit' 
                  ? '📋 Credit: Amount will be added to customer balance. Bill issued every 5 days.' 
                  : '💰 Cash: Immediate payment settlement'}
              </small>
            </div>
          </div>

          {/* Cash Received Section - Moved above Balance Summary */}
          <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Cash Received (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.cashReceived}
                onChange={(e) => setFormData(prev => ({ ...prev, cashReceived: e.target.value }))}
                placeholder="0.00"
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
          </div>

          {/* Items Section */}
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <h3>Items</h3>
            
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => addRow('gold')} style={{
                padding: '10px 15px',
                backgroundColor: '#FFD700',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                <FiPlus /> Add Gold Item
              </button>
              <button type="button" onClick={() => addRow('silver')} style={{
                padding: '10px 15px',
                backgroundColor: '#C0C0C0',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                <FiPlus /> Add Silver Item
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>Item Name *</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Metal</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Pcs</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Gross (g) *</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Less (g)</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Melting %</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Wastage (g)</th>
                    <th style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>Labour (₹)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border-color)' }}>
                        <input
                          type="text"
                          required
                          value={item.itemName}
                          onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                          placeholder="Item name *"
                          style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '4px',
                            border: !item.itemName || item.itemName.trim() === '' ? '2px solid #ff4757' : '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <span style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          backgroundColor: item.metalType === 'gold' ? '#FFD700' : '#C0C0C0',
                          color: '#000',
                          fontWeight: 'bold'
                        }}>{item.metalType === 'gold' ? 'GOLD' : 'SILVER'}</span>
                      </td>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border-color)' }}>
                        <input
                          type="number"
                          min="1"
                          value={item.pieces}
                          onChange={(e) => updateItem(index, 'pieces', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            textAlign: 'center'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border-color)' }}>
                        <input
                          type="number"
                          step="0.001"
                          required
                          value={item.grossWeight}
                          onChange={(e) => {
                            updateItem(index, 'grossWeight', e.target.value);
                            calculateItem(index);
                          }}
                          placeholder="0.000 *"
                          style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '4px',
                            border: !item.grossWeight || parseFloat(item.grossWeight) <= 0 ? '2px solid #ff4757' : '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            textAlign: 'right'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border-color)' }}>
                        <input
                          type="number"
                          step="0.001"
                          value={item.lessWeight}
                          onChange={(e) => {
                            updateItem(index, 'lessWeight', e.target.value);
                            calculateItem(index);
                          }}
                          placeholder="0.000"
                          style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            textAlign: 'right'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border-color)' }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={item.melting}
                          onChange={(e) => {
                            updateItem(index, 'melting', e.target.value);
                            calculateItem(index);
                          }}
                          placeholder="0.0"
                          style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            textAlign: 'right'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border-color)' }}>
                        <input
                          type="number"
                          step="0.001"
                          value={item.wastage}
                          onChange={(e) => {
                            updateItem(index, 'wastage', e.target.value);
                            calculateItem(index);
                          }}
                          placeholder="0.000"
                          style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            textAlign: 'right'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', borderRight: '1px solid var(--border-color)' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.labourRate}
                          onChange={(e) => {
                            updateItem(index, 'labourRate', e.target.value);
                            calculateItem(index);
                          }}
                          placeholder="0.00"
                          style={{
                            width: '100%',
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                            textAlign: 'right'
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => deleteRow(index)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#ff4757',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <FiX /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(255, 71, 87, 0.1)', borderLeft: '3px solid #ff4757', borderRadius: '4px', fontSize: '12px', color: 'var(--color-text)' }}>
              <strong>Required fields:</strong> Item Name and Gross Weight marked with * (red border if empty)
            </div>

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
                    <strong>Total Amount:</strong> ₹{(calculateTotals().amount + (parseFloat(formData.stoneAmount) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Balance Summary Section - Now after Items, before Narration */}
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Balance Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', fontSize: '14px' }}>
              <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Net Balance</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  ₹{((items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0)).toFixed(2)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '3px' }}>Total - Cash Received</div>
              </div>

              <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Cur Bal Amount</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  ₹{(((items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0)) - (parseFloat(formData.cashReceived) || 0)) + (formData.paymentType === 'credit' ? (parseFloat(selectedLedger?.balances?.creditBalance) || 0) : (parseFloat(selectedLedger?.balances?.cashBalance) || 0))).toFixed(2)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '3px' }}>Net + Old Balance</div>
              </div>

              <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Cur Bal Gold Fine Wt</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFD700' }}>
                  {formData.paymentType === 'credit' ? ((items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)) + (parseFloat(selectedLedger?.balances?.goldFineWeight) || 0)).toFixed(3) : (items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)}g
                </div>
              </div>

              <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Cur Bal Silver Fine Wt</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#C0C0C0' }}>
                  {formData.paymentType === 'credit' ? ((items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)) + (parseFloat(selectedLedger?.balances?.silverFineWeight) || 0)).toFixed(3) : (items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)}g
                </div>
              </div>

              <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--color-muted)', marginBottom: '5px', fontSize: '12px' }}>Receipt Gross</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {(items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0)).toFixed(3)}g
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '3px' }}>Entry Fine</div>
              </div>
            </div>
          </div>

          {/* Old Balance Details Section - Moved after Balance Summary */}
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Old Balance Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', fontSize: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Old Bal Amount (₹)</label>
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
                    ? (selectedLedger?.balances?.creditBalance ? `₹${parseFloat(selectedLedger.balances.creditBalance).toFixed(2)}` : '₹0.00')
                    : (selectedLedger?.balances?.cashBalance ? `₹${parseFloat(selectedLedger.balances.cashBalance).toFixed(2)}` : '₹0.00')
                  }
                </div>
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--color-muted)', fontSize: '11px' }}>
                  {formData.paymentType === 'credit' ? 'Balance from previous credit bills' : 'Balance from cash bills only'}
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Old Bal Gold Fine Wt (g)</label>
                <div style={{
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: '#FFD700',
                  minHeight: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {formData.paymentType === 'credit' && selectedLedger?.balances?.goldFineWeight ? `${parseFloat(selectedLedger.balances.goldFineWeight).toFixed(3)}g` : '0.000g'}
                </div>
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--color-muted)', fontSize: '11px' }}>
                  {formData.paymentType === 'credit' ? 'Auto-fetched from credit bills' : 'Not applicable for cash bills'}
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Old Bal Silver Fine Wt (g)</label>
                <div style={{
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: '#C0C0C0',
                  minHeight: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {formData.paymentType === 'credit' && selectedLedger?.balances?.silverFineWeight ? `${parseFloat(selectedLedger.balances.silverFineWeight).toFixed(3)}g` : '0.000g'}
                </div>
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--color-muted)', fontSize: '11px' }}>
                  {formData.paymentType === 'credit' ? 'Auto-fetched from credit bills' : 'Not applicable for cash bills'}
                </small>
              </div>
            </div>
          </div>

          {/* Narration */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Narration</label>
            <textarea
              value={formData.narration}
              onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
              placeholder="Any additional notes..."
              rows="3"
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

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '12px 20px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px'
              }}
            >
              <FiPrinter /> Print
            </button>

            <button
              type="button"
              onClick={handleShare}
              style={{
                padding: '12px 20px',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px'
              }}
            >
              <FiShare2 /> Share PDF
            </button>

            <button
              type="submit"
              style={{
                padding: '12px 20px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px'
              }}
            >
              <FiSave /> {editingVoucherId ? 'Update Voucher' : 'Save Voucher'}
            </button>
          </div>
        </form>

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
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={ledgerFormData.phoneNumber}
                    onChange={(e) => setLedgerFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
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
    </Layout>
  );
}