import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { ledgerAPI, voucherAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiX, FiSave, FiPrinter, FiShare2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import html2pdf from 'html2pdf.js';

<<<<<<< HEAD
=======
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
            <td colSpan="2" style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>Total</td>
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
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Old Bal Amt :</div>
          <div>{ledger?.balances?.amount?.toFixed(2) || '0.00'}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Old Bal Fine Wt :</div>
          <div>{((ledger?.balances?.goldFineWeight || 0) + (ledger?.balances?.silverFineWeight || 0)).toFixed(3)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Cur Bal Amt :</div>
          <div>{(parseFloat(ledger?.balances?.amount || 0) - grandTotal).toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Cur Bal Net Wt :</div>
          <div>{(((ledger?.balances?.goldFineWeight || 0) + (ledger?.balances?.silverFineWeight || 0)) - totals.netWeight).toFixed(3)}</div>
        </div>
      </div>
    </div>
  );
};

>>>>>>> a7182a4 (Fixed and added some button)
export default function Billing() {
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [showAddLedgerModal, setShowAddLedgerModal] = useState(false);
  const [ledgerFormData, setLedgerFormData] = useState({ name: '', phoneNumber: '' });
  const [addingLedger, setAddingLedger] = useState(false);
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
    narration: ''
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchLedgers();
  }, []);

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

<<<<<<< HEAD
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
=======
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

  const calculateItem = (index) => {
    const item = items[index];
    const netWeight = (parseFloat(item.grossWeight) || 0) - (parseFloat(item.lessWeight) || 0);
    const fineWeight = netWeight * ((parseFloat(item.melting) || 0) / 100) + (parseFloat(item.wastage) || 0);
    const rate = item.metalType === 'gold' ? (parseFloat(formData.goldRate) || 0) : (parseFloat(formData.silverRate) || 0);
    const amount = (fineWeight * rate) + (parseFloat(item.labourRate) || 0);
>>>>>>> a7182a4 (Fixed and added some button)

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
      narration: formData.narration
    };

    try {
      await voucherAPI.create(voucherData);
      toast.success('Voucher created successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error creating voucher:', error);
      toast.error(error.response?.data?.message || 'Failed to create voucher');
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
                  <div class="section-label">Receipt</div>
                  <div>${parseFloat(formData.receiptGross || 0).toFixed(3)}</div>
                </div>
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

  const handleShare = useCallback(() => {
    if (items.length === 0) {
      toast.error('Please add items before sharing');
      return;
    }

<<<<<<< HEAD
    const ledger = ledgers.find(l => l._id === formData.ledgerId);
    const totals = calculateTotals();
    const grandTot = totals.amount + (parseFloat(formData.stoneAmount) || 0);
    
    const voucherText = `ESTIMATE/ON APPROVAL - Issue
=======
  const handleShare = async () => {
    try {
      const ledger = ledgers.find(l => l._id === formData.ledgerId);
      
      if (!ledger) {
        toast.error('Please select a customer');
        return;
      }

      const voucherHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 24px; font-weight: bold;">${user?.shopName || 'ESTIMATE/ON APPROVAL'}</h2>
            <p style="margin: 5px 0; font-size: 16px;">ESTIMATE/ON APPROVAL - Issue</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
            <div>Name : ${ledger?.name || 'N/A'}</div>
            <div>Voucher No : ${formData.voucherNumber}</div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
            <div>Date : ${new Date(formData.date).toLocaleDateString('en-IN')}</div>
            <div>Page No : 1/1</div>
          </div>
>>>>>>> a7182a4 (Fixed and added some button)

          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 5px;">Sr</th>
                <th style="border: 1px solid #000; padding: 5px;">Item Name</th>
                <th style="border: 1px solid #000; padding: 5px;">Pcs</th>
                <th style="border: 1px solid #000; padding: 5px;">Gross</th>
                <th style="border: 1px solid #000; padding: 5px;">Less</th>
                <th style="border: 1px solid #000; padding: 5px;">Net Wt</th>
                <th style="border: 1px solid #000; padding: 5px;">Wastage</th>
                <th style="border: 1px solid #000; padding: 5px;">Fine Wt</th>
                <th style="border: 1px solid #000; padding: 5px;">Lab Rt</th>
                <th style="border: 1px solid #000; padding: 5px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 5px;">${item.itemName}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: center;">${item.pieces}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${parseFloat(item.grossWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${parseFloat(item.lessWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${parseFloat(item.netWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${parseFloat(item.wastage).toFixed(3)}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${parseFloat(item.fineWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${parseFloat(item.labourRate).toFixed(2)}</td>
                  <td style="border: 1px solid #000; padding: 5px; text-align: right;">${parseFloat(item.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #f0f0f0;">
                <td colspan="2" style="border: 1px solid #000; padding: 5px; text-align: center;">Total</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center;">${items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.lessWeight) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.wastage) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0).toFixed(3)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 5px; text-align: right;">${items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

<<<<<<< HEAD
Items Summary:
- Total Pieces: ${totals.pieces}
- Total Net Wt: ${totals.netWeight.toFixed(3)}
- Total Fine Wt: ${totals.fineWeight.toFixed(3)}
- Total Amount: ₹${totals.amount.toFixed(2)}

Stone Amount: ₹${parseFloat(formData.stoneAmount || 0).toFixed(2)}
Grand Total: ₹${grandTot.toFixed(2)}

Gold Rate: ₹${parseFloat(formData.goldRate || 0).toFixed(2)}
Silver Rate: ₹${parseFloat(formData.silverRate || 0).toFixed(2)}`;

    if (navigator.share) {
      navigator.share({
        title: `Voucher #${formData.voucherNumber}`,
        text: voucherText
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
          toast.error('Error sharing voucher');
        }
      });
    } else {
      navigator.clipboard.writeText(voucherText).then(() => {
        toast.success('Voucher details copied to clipboard!');
      }).catch(() => {
        toast.error('Failed to copy to clipboard');
      });
=======
          <div style="margin-top: 20px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <div>Stone Amount :</div>
              <div>${parseFloat(formData.stoneAmount || 0).toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Labour :</div>
              <div>${items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Net Balance :</div>
              <div></div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Narration :</div>
              <div></div>
            </div>
          </div>

          <div style="margin-top: 20px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <div>Gold Rate :</div>
              <div>${parseFloat(formData.goldRate || 0).toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Silver Rate :</div>
              <div>${parseFloat(formData.silverRate || 0).toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Issue</div>
              <div>${parseFloat(formData.issueGross || 0).toFixed(3)}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Recept</div>
              <div>${parseFloat(formData.receiptGross || 0).toFixed(3)}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Old Bal Amt :</div>
              <div>${ledger?.balances?.amount?.toFixed(2) || '0.00'}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Old Bal Fine Wt :</div>
              <div>${(((ledger?.balances?.goldFineWeight || 0) + (ledger?.balances?.silverFineWeight || 0))).toFixed(3)}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Cur Bal Amt :</div>
              <div>${((parseFloat(ledger?.balances?.amount || 0)) - (items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) + (parseFloat(formData.stoneAmount) || 0))).toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Cur Bal Net Wt :</div>
              <div>${((((ledger?.balances?.goldFineWeight || 0) + (ledger?.balances?.silverFineWeight || 0))) - items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0)).toFixed(3)}</div>
            </div>
          </div>
        </div>
      `;

      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = voucherHTML;

      // PDF options
      const options = {
        margin: 10,
        filename: `Voucher-${formData.voucherNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCors: true },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      // Generate PDF using html2pdf
      html2pdf()
        .set(options)
        .from(tempContainer)
        .output('blob')
        .then((blob) => {
          // Try to share the PDF file if supported
          if (navigator.share && navigator.canShare) {
            const file = new File([blob], `Voucher-${formData.voucherNumber}.pdf`, { type: 'application/pdf' });
            
            if (navigator.canShare({ files: [file] })) {
              navigator.share({
                files: [file],
                title: `Voucher #${formData.voucherNumber}`,
                text: `Voucher for ${ledger?.name || 'N/A'}`
              }).then(() => {
                toast.success('Voucher PDF shared successfully!');
              }).catch(err => {
                if (err.name !== 'AbortError') {
                  // Fallback to download
                  downloadPDF(blob);
                }
              });
              return;
            }
          }

          // Fallback: Download the PDF
          downloadPDF(blob);
        })
        .catch(error => {
          console.error('PDF generation error:', error);
          toast.error('Failed to generate PDF');
        });
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate or share PDF');
>>>>>>> a7182a4 (Fixed and added some button)
    }
  }, [items, ledgers, formData, calculateTotals]);

  const totals = calculateTotals();
  const grandTotal = totals.amount + (parseFloat(formData.stoneAmount) || 0);

  const downloadPDF = (blob) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Voucher-${formData.voucherNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Voucher PDF downloaded successfully!');
  };

  return (
    <Layout>
<<<<<<< HEAD
      <div>
        <h1 style={{ marginBottom: '2rem' }}>Billing</h1>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Customer Name</label>
                <select
                  className="input"
                  value={formData.ledgerId}
                  onChange={(e) => setFormData({...formData, ledgerId: e.target.value})}
                  required
                >
                  <option value="">Select Customer</option>
                  {ledgers.map(ledger => (
                    <option key={ledger._id} value={ledger._id}>{ledger.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="input-group">
                <label className="input-label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Voucher Number</label>
                <input
                  type="text"
                  className="input"
                  value={formData.voucherNumber}
                  onChange={(e) => setFormData({...formData, voucherNumber: e.target.value})}
                  disabled={user?.voucherSettings?.autoIncrement}
                  required
                />
              </div>
            </div>

            <div className="grid grid-3">
              <div className="input-group">
                <label className="input-label">Payment Type</label>
                <select
                  className="input"
                  value={formData.paymentType}
                  onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              
              <div className="input-group">
                <label className="input-label">Gold Rate</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.goldRate}
                  onChange={(e) => setFormData({...formData, goldRate: e.target.value})}
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Silver Rate</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.silverRate}
                  onChange={(e) => setFormData({...formData, silverRate: e.target.value})}
                />
              </div>
            </div>
          </div>

          {items.length === 0 && (
            <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                No items added yet. Click below to add items:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button type="button" onClick={() => addRow('gold')} className="btn btn-primary">
                  <FiPlus /> Add Gold Row
                </button>
                <button type="button" onClick={() => addRow('silver')} className="btn btn-secondary">
                  <FiPlus /> Add Silver Row
                </button>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: '1200px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Sl</th>
                      <th style={{ minWidth: '150px' }}>Item Name</th>
                      <th style={{ width: '70px' }}>Pcs</th>
                      <th style={{ width: '90px' }}>Gross Wt</th>
                      <th style={{ width: '80px' }}>Less</th>
                      <th style={{ width: '90px' }}>Net Wt</th>
                      <th style={{ width: '80px' }}>Melting %</th>
                      <th style={{ width: '80px' }}>Wastage</th>
                      <th style={{ width: '90px' }}>Fine Wt</th>
                      <th style={{ width: '90px' }}>Lab Rate</th>
                      <th style={{ width: '100px' }}>Amount</th>
                      <th style={{ width: '80px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="input"
                            value={item.itemName}
                            onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                            style={{ minWidth: '140px' }}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input"
                            value={item.pieces}
                            onChange={(e) => updateItem(index, 'pieces', e.target.value)}
                            style={{ width: '70px' }}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            className="input"
                            value={item.grossWeight}
                            onChange={(e) => {
                              updateItem(index, 'grossWeight', e.target.value);
                              setTimeout(() => calculateItem(index), 0);
                            }}
                            style={{ width: '90px' }}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            className="input"
                            value={item.lessWeight}
                            onChange={(e) => {
                              updateItem(index, 'lessWeight', e.target.value);
                              setTimeout(() => calculateItem(index), 0);
                            }}
                            style={{ width: '80px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            className="input"
                            value={item.netWeight}
                            disabled
                            style={{ width: '90px', backgroundColor: '#f5f5f5' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={item.melting}
                            onChange={(e) => {
                              updateItem(index, 'melting', e.target.value);
                              setTimeout(() => calculateItem(index), 0);
                            }}
                            style={{ width: '80px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            className="input"
                            value={item.wastage}
                            onChange={(e) => {
                              updateItem(index, 'wastage', e.target.value);
                              setTimeout(() => calculateItem(index), 0);
                            }}
                            style={{ width: '80px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.001"
                            className="input"
                            value={item.fineWeight}
                            disabled
                            style={{ width: '90px', backgroundColor: '#f5f5f5' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={item.labourRate}
                            onChange={(e) => {
                              updateItem(index, 'labourRate', e.target.value);
                              setTimeout(() => calculateItem(index), 0);
                            }}
                            style={{ width: '90px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={item.amount}
                            disabled
                            style={{ width: '100px', backgroundColor: '#f5f5f5' }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => deleteRow(index)}
                            className="btn btn-sm btn-danger"
                          >
                            <FiX />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                      <td colSpan="2">Total</td>
                      <td>{totals.pieces}</td>
                      <td>{totals.grossWeight.toFixed(3)}</td>
                      <td>{totals.lessWeight.toFixed(3)}</td>
                      <td>{totals.netWeight.toFixed(3)}</td>
                      <td>{totals.melting.toFixed(2)}</td>
                      <td>{totals.wastage.toFixed(3)}</td>
                      <td>{totals.fineWeight.toFixed(3)}</td>
                      <td>{totals.labourRate.toFixed(2)}</td>
                      <td>{totals.amount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => addRow('gold')} className="btn btn-sm btn-primary">
                  <FiPlus /> Add Gold Row
                </button>
                <button type="button" onClick={() => addRow('silver')} className="btn btn-sm btn-secondary">
                  <FiPlus /> Add Silver Row
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Stone Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.stoneAmount}
                  onChange={(e) => setFormData({...formData, stoneAmount: e.target.value})}
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Issue (Gross) - Auto Calculated</label>
                <input
                  type="number"
                  step="0.001"
                  className="input"
                  value={formData.issueGross}
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Receipt (Gross)</label>
                <input
                  type="number"
                  step="0.001"
                  className="input"
                  value={formData.receiptGross}
                  onChange={(e) => setFormData({...formData, receiptGross: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="input-group">
                <label className="input-label">Narration</label>
                <textarea
                  className="input"
                  value={formData.narration}
                  onChange={(e) => setFormData({...formData, narration: e.target.value})}
                  rows="3"
                ></textarea>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                  Total: ₹{grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary">
                <FiSave /> Save
              </button>
              <button type="button" onClick={handlePrint} className="btn btn-secondary">
                <FiPrinter /> Print
              </button>
              <button type="button" onClick={handleShare} className="btn btn-secondary">
                <FiShare2 /> Share
              </button>
            </div>
          </div>
=======
      <style>
        {`
          .billing-container {
            padding: 20px;
            max-width: 100%;
          }
          
          .billing-header {
            margin-bottom: 25px;
          }
          
          .billing-header h2 {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
          }
          
          .form-row-custom {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          
          .form-group-custom {
            display: flex;
            flex-direction: column;
          }
          
          .form-group-custom label {
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 6px;
            color: #e0e0e0;
          }
          
          .form-group-custom input,
          .form-group-custom select,
          .form-group-custom textarea {
            padding: 8px 12px;
            border: 1px solid #444;
            border-radius: 4px;
            font-size: 14px;
            background-color: #2a2a2a;
            color: #fff;
          }
          
          .form-group-custom input:focus,
          .form-group-custom select:focus,
          .form-group-custom textarea:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
          }
          
          .table-responsive {
            margin: 20px 0;
            overflow-x: auto;
          }
          
          .billing-table {
            width: 100%;
            border-collapse: collapse;
            background-color: #1e1e1e;
            border: 1px solid #444;
          }
          
          .billing-table thead th {
            background-color: #2d3748;
            color: #fff;
            padding: 12px 8px;
            font-size: 13px;
            font-weight: 600;
            text-align: left;
            border: 1px solid #444;
            white-space: nowrap;
          }
          
          .billing-table tbody td {
            padding: 8px;
            border: 1px solid #444;
            background-color: #252525;
          }
          
          .billing-table tbody tr.totals-row {
            background-color: #2d3748;
            font-weight: 600;
          }
          
          .billing-table tbody tr.totals-row td {
            background-color: #2d3748;
            color: #fff;
          }
          
          .billing-table input {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #444;
            border-radius: 3px;
            font-size: 13px;
            background-color: #1a1a1a;
            color: #fff;
          }
          
          .billing-table input:focus {
            outline: none;
            border-color: #007bff;
          }
          
          .billing-table input:read-only {
            background-color: #2a2a2a;
            color: #aaa;
          }
          
          .item-name-input {
            min-width: 200px;
          }
          
          .text-center {
            text-align: center;
          }
          
          .btn-action-delete {
            background-color: #dc3545;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .btn-action-delete:disabled {
            background-color: #555;
            cursor: not-allowed;
            opacity: 0.5;
          }
          
          .btn-action-delete:hover:not(:disabled) {
            background-color: #c82333;
          }
          
          .add-row-buttons {
            display: flex;
            gap: 10px;
            margin: 15px 0;
          }
          
          .btn-add-row {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .btn-gold {
            background-color: #ffc107;
            color: #000;
          }
          
          .btn-gold:hover {
            background-color: #e0a800;
          }
          
          .btn-silver {
            background-color: #6c757d;
            color: #fff;
          }
          
          .btn-silver:hover {
            background-color: #5a6268;
          }
          
          .bottom-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
          }
          
          .grand-total {
            font-size: 20px;
            font-weight: 600;
            margin: 20px 0;
            color: #fff;
          }
          
          .action-buttons {
            display: flex;
            gap: 10px;
            margin: 20px 0;
          }
          
          .btn-primary-action {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .btn-save {
            background-color: #28a745;
            color: white;
          }
          
          .btn-save:hover {
            background-color: #218838;
          }
          
          .btn-print {
            background-color: #17a2b8;
            color: white;
          }
          
          .btn-print:hover {
            background-color: #138496;
          }
          
          .btn-share {
            background-color: #6c757d;
            color: white;
          }
          
          .btn-share:hover {
            background-color: #5a6268;
          }
          
          @media (max-width: 768px) {
            .billing-container {
              padding: 10px;
            }
            
            .form-row-custom {
              grid-template-columns: 1fr;
            }
            
            .billing-table {
              font-size: 12px;
            }
            
            .billing-table thead th,
            .billing-table tbody td {
              padding: 6px 4px;
            }
            
            .item-name-input {
              min-width: 150px;
            }
            
            .action-buttons {
              flex-direction: column;
            }
            
            .btn-primary-action {
              width: 100%;
              justify-content: center;
            }
          }
        `}
      </style>
      <div className="billing-container">
        <div className="billing-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: 0 }}>Billing</h2>
          <button
            onClick={() => setShowAddLedgerModal(true)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px'
            }}
          >
            <FiPlus /> Add Ledger
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row-custom">
            <div className="form-group-custom">
              <label>Customer Name</label>
              <select
                value={formData.ledgerId}
                onChange={(e) => setFormData({...formData, ledgerId: e.target.value})}
                required
              >
                <option value="">Select Customer</option>
                {ledgers.map(ledger => (
                  <option key={ledger._id} value={ledger._id}>{ledger.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group-custom">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>

            <div className="form-group-custom">
              <label>Voucher Number</label>
              <input
                type="text"
                value={formData.voucherNumber}
                onChange={(e) => setFormData({...formData, voucherNumber: e.target.value})}
                disabled={user?.voucherSettings?.autoIncrement}
                required
              />
            </div>

            <div className="form-group-custom">
              <label>Payment Type</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
              >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div className="form-group-custom">
              <label>Gold Rate</label>
              <input
                type="number"
                step="0.01"
                value={formData.goldRate}
                onChange={(e) => setFormData({...formData, goldRate: e.target.value})}
              />
            </div>

            <div className="form-group-custom">
              <label>Silver Rate</label>
              <input
                type="number"
                step="0.01"
                value={formData.silverRate}
                onChange={(e) => setFormData({...formData, silverRate: e.target.value})}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="billing-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', minWidth: '40px' }}>SL</th>
                  <th style={{ minWidth: '200px' }}>ITEM NAME</th>
                  <th style={{ width: '70px', minWidth: '70px' }}>PCS</th>
                  <th style={{ width: '90px', minWidth: '90px' }}>GROSS WT</th>
                  <th style={{ width: '80px', minWidth: '80px' }}>LESS</th>
                  <th style={{ width: '90px', minWidth: '90px' }}>NET WT</th>
                  <th style={{ width: '80px', minWidth: '80px' }}>MELTING %</th>
                  <th style={{ width: '80px', minWidth: '80px' }}>WASTAGE</th>
                  <th style={{ width: '90px', minWidth: '90px' }}>FINE WT</th>
                  <th style={{ width: '90px', minWidth: '90px' }}>LAB RATE</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>AMOUNT</th>
                  <th style={{ width: '80px', minWidth: '80px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="item-name-input"
                        value={item.itemName}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].itemName = e.target.value;
                          setItems(newItems);
                        }}
                        placeholder="Item name"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.pieces}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].pieces = e.target.value;
                          setItems(newItems);
                        }}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={item.grossWeight}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].grossWeight = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={item.lessWeight}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].lessWeight = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={item.netWeight}
                        readOnly
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={item.melting}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].melting = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={item.wastage}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].wastage = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={item.fineWeight}
                        readOnly
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={item.labourRate}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].labourRate = e.target.value;
                          setItems(newItems);
                          calculateItem(index);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        readOnly
                      />
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(index)}
                        className="btn-action-delete"
                        disabled={items.length === 1}
                      >
                        <FiX />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="totals-row">
                  <td className="text-center">Total</td>
                  <td></td>
                  <td className="text-center">{totals.pieces}</td>
                  <td>{totals.grossWeight.toFixed(3)}</td>
                  <td>{totals.lessWeight.toFixed(3)}</td>
                  <td>{totals.netWeight.toFixed(3)}</td>
                  <td>{totals.melting.toFixed(2)}</td>
                  <td>{totals.wastage.toFixed(3)}</td>
                  <td>{totals.fineWeight.toFixed(3)}</td>
                  <td>{totals.labourRate.toFixed(2)}</td>
                  <td>{totals.amount.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="add-row-buttons">
            <button type="button" onClick={() => addRow('gold')} className="btn-add-row btn-gold">
              <FiPlus /> Add Gold Row
            </button>
            <button type="button" onClick={() => addRow('silver')} className="btn-add-row btn-silver">
              <FiPlus /> Add Silver Row
            </button>
          </div>

          <div className="bottom-section">
            <div className="form-group-custom">
              <label>Stone Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.stoneAmount}
                onChange={(e) => setFormData({...formData, stoneAmount: e.target.value})}
              />
            </div>

            <div className="form-group-custom">
              <label>Issue (Gross)</label>
              <input
                type="number"
                step="0.001"
                value={formData.issueGross}
                onChange={(e) => setFormData({...formData, issueGross: e.target.value})}
              />
            </div>

            <div className="form-group-custom">
              <label>Receipt (Gross)</label>
              <input
                type="number"
                step="0.001"
                value={formData.receiptGross}
                onChange={(e) => setFormData({...formData, receiptGross: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group-custom" style={{ maxWidth: '500px' }}>
            <label>Narration</label>
            <textarea
              value={formData.narration}
              onChange={(e) => setFormData({...formData, narration: e.target.value})}
              rows="3"
            />
          </div>

          <div className="grand-total">
            Total: ₹{grandTotal.toFixed(2)}
          </div>

          <div className="action-buttons">
            <button type="submit" className="btn-primary-action btn-save">
              <FiSave /> Save
            </button>
            <button type="button" onClick={handlePrint} className="btn-primary-action btn-print">
              <FiPrinter /> Print
            </button>
            <button type="button" onClick={handleShare} className="btn-primary-action btn-share">
              <FiShare2 /> Share
            </button>
          </div>
>>>>>>> a7182a4 (Fixed and added some button)
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
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }} onClick={() => !addingLedger && setShowAddLedgerModal(false)}>
            <div style={{
              backgroundColor: '#1e1e1e',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              border: '1px solid #444'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Add New Ledger</h3>
                <button
                  onClick={() => setShowAddLedgerModal(false)}
                  disabled={addingLedger}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#999'
                  }}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleAddLedgerSubmit}>
                <div className="form-group-custom" style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label">Customer Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter customer name"
                    value={ledgerFormData.name}
                    onChange={(e) => setLedgerFormData({ ...ledgerFormData, name: e.target.value })}
                    disabled={addingLedger}
                    required
                  />
                </div>

                <div className="form-group-custom" style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label">Phone Number</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="Enter phone number"
                    value={ledgerFormData.phoneNumber}
                    onChange={(e) => setLedgerFormData({ ...ledgerFormData, phoneNumber: e.target.value })}
                    disabled={addingLedger}
                    required
                  />
                </div>

                <div style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowAddLedgerModal(false)}
                    disabled={addingLedger}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingLedger}
                    className="btn btn-primary"
                  >
                    {addingLedger ? 'Adding...' : 'Add Ledger'}
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
