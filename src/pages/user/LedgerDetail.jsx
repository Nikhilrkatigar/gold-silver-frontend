import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ledgerAPI, voucherAPI, settlementAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiTrash2, FiArrowLeft, FiEye, FiX, FiPrinter, FiShare2, FiEdit2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import html2pdf from 'html2pdf.js';

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatSignedCurrency = (value) => {
  const amount = toFiniteNumber(value);
  return `${amount > 0 ? '+' : ''}${amount.toFixed(2)}`;
};

const pickFirstFinite = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const getLedgerAmountBalance = (ledger) => {
  const rawCash = Number(ledger?.balances?.cashBalance);
  const rawCredit = Number(ledger?.balances?.creditBalance);
  const hasSplitBalances = Number.isFinite(rawCash) || Number.isFinite(rawCredit);

  if (hasSplitBalances) {
    return toFiniteNumber(rawCash) + toFiniteNumber(rawCredit);
  }

  return toFiniteNumber(ledger?.balances?.amount);
};

const getVoucherTotals = (voucher) => {
  const items = voucher?.items || [];
  const amountFromItems = items.reduce((sum, item) => sum + toFiniteNumber(item.amount), 0);
  const stoneAmount = toFiniteNumber(voucher?.stoneAmount);
  const fineAmount = toFiniteNumber(voucher?.fineAmount);
  const voucherTotal = toFiniteNumber(voucher?.total, amountFromItems + stoneAmount + fineAmount);
  const goldFineWeight = items
    .filter((item) => item.metalType === 'gold')
    .reduce((sum, item) => sum + toFiniteNumber(item.fineWeight), 0);
  const silverFineWeight = items
    .filter((item) => item.metalType === 'silver')
    .reduce((sum, item) => sum + toFiniteNumber(item.fineWeight), 0);
  const receiptGross = items.reduce((sum, item) => sum + toFiniteNumber(item.fineWeight), 0);

  return { voucherTotal, goldFineWeight, silverFineWeight, receiptGross };
};

const getVoucherBalanceDetails = (voucher, ledger) => {
  const { voucherTotal, goldFineWeight, silverFineWeight, receiptGross } = getVoucherTotals(voucher);
  const oldAmount = pickFirstFinite(
    voucher?.balanceSnapshot?.oldBalance?.totalAmount,
    voucher?.oldBalance?.amount,
    toFiniteNumber(ledger?.balances?.amount) - voucherTotal
  );
  const oldGold = pickFirstFinite(
    voucher?.balanceSnapshot?.oldBalance?.goldFineWeight,
    toFiniteNumber(ledger?.balances?.goldFineWeight) - goldFineWeight
  );
  const oldSilver = pickFirstFinite(
    voucher?.balanceSnapshot?.oldBalance?.silverFineWeight,
    toFiniteNumber(ledger?.balances?.silverFineWeight) - silverFineWeight
  );
  // Always use current ledger balance for display (not historical balance snapshot)
  const currentAmount = getLedgerAmountBalance(ledger);
  const currentGold = toFiniteNumber(ledger?.balances?.goldFineWeight);
  const currentSilver = toFiniteNumber(ledger?.balances?.silverFineWeight);

  return {
    oldAmount,
    oldGold,
    oldSilver,
    currentAmount,
    currentGold,
    currentSilver,
    voucherTotal,
    receiptGross
  };
};

export default function LedgerDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState(null); // 'voucher' or 'settlement'
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    danger: false
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDates, setExportDates] = useState({ from: '', to: '' });

  useEffect(() => {
    fetchLedgerDetails();
  }, [id, filters]);

  const fetchLedgerDetails = async () => {
    try {
      // Only send filters if they have values
      const queryFilters = {};
      if (filters.startDate) queryFilters.startDate = filters.startDate;
      if (filters.endDate) queryFilters.endDate = filters.endDate;

      const response = await ledgerAPI.getTransactions(id, queryFilters);
      setLedger(response.data.ledger);
      console.log('📊 Ledger Type:', response.data.ledger.ledgerType);
      console.log('📦 Total Transactions:', response.data.transactions.length);

      // Transactions are already filtered by invoice type on backend based on ledger type
      // Regular ledgers get only 'normal' invoices
      // GST ledgers get only 'gst' invoices
      const filteredTransactions = response.data.transactions;

      console.log('✅ Total Transactions (filtered by type):', filteredTransactions.length);
      console.log('📋 Voucher Types:', filteredTransactions.filter(t => t.type === 'voucher').map(v => ({ invoiceType: v.invoiceType, voucherNumber: v.voucherNumber })));
      setTransactions(filteredTransactions);
    } catch (error) {
      toast.error('Failed to load ledger details');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({ startDate: '', endDate: '' });
    setTransactions([]);
    fetchLedgerDetails();
  };

  const handleRecalculateBalance = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Recalculate Balance',
      message: 'This will recalculate the balance from all transactions. Continue?',
      danger: false,
      confirmText: 'Recalculate',
      onConfirm: async () => {
        try {
          const response = await ledgerAPI.recalculateBalance(id);
          setLedger(response.data.ledger);
          toast.success('Balance recalculated successfully');
          fetchLedgerDetails();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to recalculate balance');
        }
      }
    });
  };

  const handleDeleteVoucher = async (voucherId) => {
    const voucher = transactions.find(t => t._id === voucherId);

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Voucher',
      message: 'Permanently delete this voucher? This cannot be undone!',
      danger: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await voucherAPI.delete(voucherId);
          toast.success('Voucher deleted successfully!');
          fetchLedgerDetails();
        } catch (error) {
          toast.error('Failed to delete voucher');
        }
      }
    });
  };

  const handlePreviewVoucher = (voucher) => {
    // Use invoiceType as source of truth
    if (voucher.invoiceType === 'gst') {
      // Use GST invoice format - redirect to GSTBilling with preview action
      sessionStorage.setItem('gstPreviewVoucherId', voucher._id);
      navigate(`/gst-billing?voucherid=${voucher._id}&action=preview`);
      return;
    }

    // Otherwise show modal preview
    setPreviewType('voucher');
    setSelectedItem(voucher);
    setShowPreview(true);
  };

  const handlePrintVoucher = (voucher) => {
    // Use invoiceType as source of truth
    if (voucher.invoiceType === 'gst') {
      // Use GST invoice format - redirect to GSTBilling with print action
      sessionStorage.setItem('gstPrintVoucherId', voucher._id);
      navigate(`/gst-billing?voucherid=${voucher._id}&action=print`);
      return;
    }

    const balanceDetails = getVoucherBalanceDetails(voucher, ledger);

    // Otherwise use old format
    const printWindow = window.open('', '_blank');
    const voucherHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher Print</title>
        <meta name="color-scheme" content="light dark">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #fff; color: #000; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          tr, th, td { page-break-inside: avoid; break-inside: avoid; }
          thead { display: table-header-group; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .shop-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .total-row { font-weight: bold; background-color: #d0d0d0; color: #000; border-top: 2px solid #000; border-bottom: 2px solid #000; }
          .amount-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
          .section-label { font-weight: bold; margin-bottom: 5px; margin-top: 10px; }
          .line-height { height: 30px; border-bottom: 1px solid #000; }
          .voucher-container { max-width: 900px; margin: 0 auto; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
          @media print { body { margin: 0; padding: 0; background-color: #fff; } }
        </style>
      </head>
      <body>
        <div class="voucher-container">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <div class="shop-name">${user?.shopName || 'JEWELLERY SHOP'}</div>
            ${user?.phoneNumber ? `<div style="font-size: 12px; margin-top: 2px; color: #666;">Ph: ${user.phoneNumber}</div>` : ''}
            <div style="font-size: 14px; margin-top: 5px;">SALE RECEIPT</div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <div>Name : <strong>${ledger?.name || 'N/A'}</strong></div>
              <div>Voucher No : <strong>${voucher.voucherNumber}</strong></div>
            </div>
            <div style="text-align: right;">
              <div>Date : ${new Date(voucher.date).toLocaleDateString('en-IN')}</div>
              <div>Page No : 1/1</div>
            </div>
          </div>

          <table style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="width: 5%;">Sr</th>
                <th style="width: 15%;">Item Name</th>
                <th style="width: 8%;">Metal</th>
                <th style="width: 5%;">Pcs</th>
                <th style="width: 10%;">Gross</th>
                <th style="width: 10%;">Less</th>
                <th style="width: 10%;">Net Wt</th>
                <th style="width: 10%;">Wastage</th>
                <th style="width: 10%;">Fine Wt</th>
                <th style="width: 10%;">Lab Rt</th>
                <th style="width: 10%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${voucher.items && voucher.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.itemName}</td>
                  <td style="text-align: center; color: ${item.metalType === 'gold' ? '#FFD700' : '#C0C0C0'}; font-weight: bold;">${item.metalType === 'gold' ? 'GOLD' : 'SILVER'}</td>
                  <td>${item.pieces}</td>
                  <td>${parseFloat(item.grossWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.lessWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.netWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.wastage).toFixed(3)}</td>
                  <td>${parseFloat(item.fineWeight).toFixed(3)}</td>
                  <td>${parseFloat(item.labourRate).toFixed(2)}</td>
                  <td>${parseFloat(item.amount).toFixed(2)}</td>
                </tr>
              `).join('') || ''}
              <tr class="total-row">
                <td colspan="3">Total</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0) : 0}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.lessWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td></td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2) : '0.00'}</td>
                <td>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2) : '0.00'}</td>
              </tr>
            </tbody>
          </table>

          <div class="avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Stone Amount :</div>
              <div>${parseFloat(voucher.stoneAmount || 0).toFixed(2)}</div>
              
              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Fine Amount :</div>
              <div>${parseFloat(voucher.fineAmount || 0).toFixed(2)}</div>
              
              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Labour :</div>
              <div>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2) : '0.00'}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 20px;">Net Balance :</div>
              <div style="height: 30px; border-bottom: 1px solid #000;"></div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 20px;">Narration :</div>
              <div style="height: 60px; border-bottom: 1px solid #000;"></div>
            </div>

            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Gold Rate :</div>
              <div>${parseFloat(voucher.goldRate || 0).toFixed(2)}</div>

              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Silver Rate :</div>
              <div>${parseFloat(voucher.silverRate || 0).toFixed(2)}</div>
              
              <div style="font-weight: bold; margin-bottom: 5px; margin-top: 10px;">Cash Received :</div>
              <div style="color: #27ae60; font-weight: bold;">${parseFloat(voucher.cashReceived || 0).toFixed(2)}</div>
              
              <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <div style="font-weight: bold; margin-bottom: 5px;">Issue</div>
                  <div>${parseFloat(voucher.issue?.gross || 0).toFixed(3)}</div>
                </div>
                <div>
                  <div style="font-weight: bold; margin-bottom: 5px;">Recept</div>
                  <div>${parseFloat(voucher.receipt?.gross || 0).toFixed(3)}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Old Balance Details Box -->
          <div class="avoid-break" style="border: 1px solid #000; padding: 10px; margin-top: 15px; margin-bottom: 10px;">
            <div style="font-weight: bold; margin-bottom: 10px;">Customer Balance</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div>Fine Gold</div>
              <div style="color: #FFD700; font-weight: bold;">${(-balanceDetails.currentGold).toFixed(3)} g</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div>Fine Silver</div>
              <div style="color: #C0C0C0; font-weight: bold;">${(-balanceDetails.currentSilver).toFixed(3)} g</div>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <div>Cash Balance</div>
              <div style="font-weight: bold;">${formatSignedCurrency(-balanceDetails.currentAmount)}</div>
            </div>
          </div>


          <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div style="text-align: center; border-top: 1px solid #000; padding-top: 12px; font-size: 13px; color: #666;">Customer Signature</div>
            <div style="text-align: center; border-top: 1px solid #000; padding-top: 12px; font-size: 13px; color: #666;">Authorised Signatory</div>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
            <p style="margin: 2px 0;">Thank you for your business!</p>
          </div>
        </div>
        <script>
          window.print();
          setTimeout(() => window.close(), 1000);
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(voucherHTML);
    printWindow.document.close();
  };

  const handlePreviewSettlement = (settlement) => {
    setPreviewType('settlement');
    setSelectedItem(settlement);
    setShowPreview(true);
  };

  // Helper function to extract settlement properties based on type
  const extractSettlementProperties = (settlement) => {
    const isTrueSettlement = settlement.type === 'settlement';
    let metalType, metalRate, fineGiven, amount;

    if (isTrueSettlement) {
      // True Settlement from Settlement Collection
      metalType = settlement.metalType;
      metalRate = settlement.metalRate;
      fineGiven = settlement.fineGiven;
      amount = settlement.amount;
    } else {
      // Settlement-type Voucher - map from paymentType
      const paymentType = settlement.paymentType;

      if (paymentType === 'add_cash') {
        metalType = 'Cash';
        metalRate = null;
        fineGiven = null;
        amount = settlement.cashReceived || 0;
      } else if (paymentType === 'add_gold') {
        metalType = 'gold';
        metalRate = settlement.goldRate || 0;
        fineGiven = settlement.cashReceived || 0;
        amount = (settlement.cashReceived || 0) * (settlement.goldRate || 0);
      } else if (paymentType === 'add_silver') {
        metalType = 'silver';
        metalRate = settlement.silverRate || 0;
        fineGiven = settlement.cashReceived || 0;
        amount = (settlement.cashReceived || 0) * (settlement.silverRate || 0);
      } else if (paymentType === 'money_to_gold') {
        metalType = 'gold';
        metalRate = settlement.goldRate || 0;
        fineGiven = settlement.goldRate ? (settlement.cashReceived || 0) / settlement.goldRate : 0;
        amount = settlement.cashReceived || 0;
      } else if (paymentType === 'money_to_silver') {
        metalType = 'silver';
        metalRate = settlement.silverRate || 0;
        fineGiven = settlement.silverRate ? (settlement.cashReceived || 0) / settlement.silverRate : 0;
        amount = settlement.cashReceived || 0;
      } else {
        metalType = 'Unknown';
        metalRate = 0;
        fineGiven = 0;
        amount = settlement.cashReceived || 0;
      }
    }

    return { metalType, metalRate, fineGiven, amount };
  };

  const handlePrintSettlement = (settlement) => {
    const { metalType, metalRate, fineGiven, amount } = extractSettlementProperties(settlement);

    const printWindow = window.open('', '_blank');
    const settlementHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Settlement Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .detail-item { margin-bottom: 10px; }
          .label { font-weight: bold; font-size: 0.9rem; color: #666; }
          .value { font-size: 1.1rem; margin-top: 3px; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">${user?.shopName || 'SETTLEMENT'}</div>

        <div class="details">
          <div>
            <div class="detail-item">
              <div class="label">Customer Name</div>
              <div class="value">${ledger?.name || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="label">Metal Type</div>
              <div class="value" style="text-transform: capitalize;">${metalType || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="label">Fine Given</div>
              <div class="value">${fineGiven !== null ? parseFloat(fineGiven).toFixed(3) + ' g' : 'N/A'}</div>
            </div>
          </div>
          <div>
            <div class="detail-item">
              <div class="label">Date</div>
              <div class="value">${new Date(settlement.date).toLocaleDateString('en-IN')}</div>
            </div>
            <div class="detail-item">
              <div class="label">Metal Rate</div>
              <div class="value">${metalRate !== null ? '' + parseFloat(metalRate).toFixed(2) : 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="label">Settlement Amount</div>
              <div class="value" style="font-weight: bold; font-size: 1.3rem;">${parseFloat(amount || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        ${settlement.narration ? `
          <div style="margin-top: 20px;">
            <div class="label">Narration</div>
            <div style="padding: 10px; background: #f5f5f5; border-radius: 4px; margin-top: 5px;">
              ${settlement.narration}
            </div>
          </div>
        ` : ''}

        <script>
          window.print();
          setTimeout(() => window.close(), 1000);
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(settlementHTML);
    printWindow.document.close();
  };

  const handleDeleteSettlement = async (settlementId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Settlement',
      message: 'Permanently delete this settlement?',
      danger: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          // Settlement vouchers are now stored in Voucher collection, not Settlement collection
          await voucherAPI.delete(settlementId);
          toast.success('Settlement deleted successfully');
          fetchLedgerDetails();
        } catch (error) {
          toast.error('Failed to delete settlement');
        }
      }
    });
  };

  const handleDeleteAllVouchers = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete All Vouchers',
      message: 'Delete ALL vouchers for this ledger? This cannot be undone!',
      danger: true,
      confirmText: 'Delete All',
      onConfirm: async () => {
        try {
          await ledgerAPI.deleteAllVouchers(id);
          toast.success('All vouchers deleted successfully');
          fetchLedgerDetails();
        } catch (error) {
          toast.error('Failed to delete vouchers');
        }
      }
    });
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

  const handleShareVoucher = async (voucher) => {
    try {
      // Use invoiceType as source of truth
      if (voucher.invoiceType === 'gst') {
        // Use GST invoice format - redirect to GSTBilling with share action
        sessionStorage.setItem('gstShareVoucherId', voucher._id);
        navigate(`/gst-billing?voucherid=${voucher._id}&action=share`);
        return;
      }

      const balanceDetails = getVoucherBalanceDetails(voucher, ledger);
      const voucherTotal = balanceDetails.voucherTotal;

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
            ${user?.phoneNumber ? `<p style="margin: 2px 0; font-size: 14px; color: #666;">Ph: ${user.phoneNumber}</p>` : ''}
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
              <div style="font-size: 16px; font-weight: 600; color: #000000;">${voucher.voucherNumber}</div>
            </div>
          </div>

          <div class="pdf-avoid-break" style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #444444; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
            <div>Date: <strong style="color: #000000;">${new Date(voucher.date).toLocaleDateString('en-IN')}</strong></div>
            <div>Time: <strong style="color: #000000;">${new Date().toLocaleTimeString('en-IN')}</strong></div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; color: #333333;">
            <thead>
              <tr style="background-color: #f5f5f5; border: 1px solid #ddd;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #000000;">Sr</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; color: #000000;">Item Name</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #000000;">Metal</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; color: #000000;">Pcs</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Gross (g)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Less (g)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Net (g)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Fine (g)</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Labour ()</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #000000;">Amount ()</th>
              </tr>
            </thead>
            <tbody>
              ${voucher.items ? voucher.items.map((item, index) => `
                <tr style="border: 1px solid #ddd; color: #333333;">
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid #ddd; padding: 10px;">${item.itemName}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold; background-color: ${item.metalType === 'gold' ? '#fff9e6' : '#f0f0f0'}; color: #000000;">${item.metalType === 'gold' ? '🟡 GOLD' : '⚪ SILVER'}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${item.pieces}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.grossWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.lessWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.netWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.fineWeight).toFixed(3)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.labourRate).toFixed(2)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${parseFloat(item.amount).toFixed(2)}</td>
                </tr>
              `).join('') : ''}
              <tr style="background-color: #f5f5f5; border: 1px solid #ddd; font-weight: bold;">
                <td colspan="3" style="border: 1px solid #ddd; padding: 10px; text-align: center;">TOTAL</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseInt(item.pieces) || 0), 0) : 0}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.lessWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0).toFixed(3) : '0.000'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2) : '0.00'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2) : '0.00'}</td>
              </tr>
            </tbody>
          </table>

          <!-- Summary Section -->
          <div class="pdf-avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; font-size: 14px;">
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #333;">Amount Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Labour Amount:</span>
                <strong>${voucher.items ? voucher.items.reduce((sum, item) => sum + (parseFloat(item.labourRate) || 0), 0).toFixed(2) : '0.00'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>Stone Amount:</span>
                <strong>${parseFloat(voucher.stoneAmount || 0).toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #ddd; font-size: 16px; font-weight: bold; color: #000000;">
                <span>Grand Total:</span>
                <span style="color: #d32f2f;">${voucherTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
              <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold; color: #000000;">Rates</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #333333;">
                <span>Gold Rate:</span>
                <strong style="color: #000000;">${parseFloat(voucher.goldRate || 0).toFixed(2)}/g</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #333333;">
                <span>Silver Rate:</span>
                <strong style="color: #000000;">${parseFloat(voucher.silverRate || 0).toFixed(2)}/g</strong>
              </div>
            </div>
          </div>

          <!-- Balance Details Section -->
          <div class="pdf-avoid-break" style="margin-top: 30px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #000000;">
              <span>Cash Received</span>
              <span>${parseFloat(voucher.cashReceived || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; font-weight: bold; color: #d32f2f;">
              <span>Net Balance</span>
              <span>${(voucherTotal - (parseFloat(voucher.cashReceived || 0))).toFixed(2)}</span>
            </div>

            <!-- Balance Details Section - Side by Side -->
            <!-- Customer Profile Balance -->
            <div class="pdf-avoid-break" style="border: 1px solid #000; padding: 15px; background-color: #ffffff;">
              <div style="font-weight: bold; margin-bottom: 10px; font-size: 13px; color: #000000;">Customer Balance</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; color: #333333;">
                <span>Fine Gold</span>
                <span style="color: #FFD700; font-weight: bold;">${(-balanceDetails.currentGold).toFixed(3)} g</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; color: #333333;">
                <span>Fine Silver</span>
                <span style="color: #C0C0C0; font-weight: bold;">${(-balanceDetails.currentSilver).toFixed(3)} g</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #333333;">
                <span>Cash Balance</span>
                <span style="font-weight: bold;">${formatSignedCurrency(-balanceDetails.currentAmount)}</span>
              </div>
            </div>
          </div>

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

      // CRITICAL: Append to DOM so html2pdf can properly render the element
      document.body.appendChild(voucherContent);

      // Add delay for browser rendering
      setTimeout(() => {
        const options = {
          margin: [10, 10, 10, 10],
          filename: `Voucher-${voucher.voucherNumber}-${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['.pdf-avoid-break', 'tr']
          },
          html2canvas: {
            scale: 2,
            useCors: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf()
          .set(options)
          .from(voucherContent)
          .output('blob')
          .then((blob) => {
            // Remove from DOM after PDF generation
            document.body.removeChild(voucherContent);

            const fileName = `Voucher-${voucher.voucherNumber}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              navigator.share({
                files: [file],
                title: `Voucher #${voucher.voucherNumber}`,
                text: `Voucher for ${ledger?.name || 'N/A'}`
              }).then(() => {
                toast.success('Voucher PDF shared successfully!');
              }).catch(err => {
                if (err.name !== 'AbortError') {
                  downloadPDF(blob, fileName);
                }
              });
            } else {
              downloadPDF(blob, fileName);
              const whatsappText = `Check out this voucher for ${ledger?.name}. Voucher #${voucher.voucherNumber}. Amount: ${voucherTotal.toFixed(2)}`;
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
            // Clean up DOM on error
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

  const handleShareSettlement = async (settlement) => {
    try {
      const { metalType, metalRate, fineGiven, amount } = extractSettlementProperties(settlement);

      const settlementContent = document.createElement('div');
      settlementContent.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background-color: #ffffff; color: #333333;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000000; padding-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #000000;">${user?.shopName || 'SETTLEMENT'}</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; color: #333333;">SETTLEMENT RECEIPT</p>
          </div>

          <!-- Customer & Settlement Info -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #333333;">
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">Customer Name</div>
              <div style="font-size: 16px; font-weight: 600;">${ledger?.name || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; margin-bottom: 5px;">Settlement Date</div>
              <div style="font-size: 16px; font-weight: 600;">${new Date(settlement.date).toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <!-- Settlement Details -->
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 30px;">
            <h3 style="margin: 0 0 20px 0; font-size: 14px; font-weight: bold; color: #000000;">Settlement Details</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div>
                <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Metal Type</div>
                <div style="font-size: 16px; font-weight: 600; color: #000000;">${metalType === 'gold' ? '🟡 Gold' : metalType === 'silver' ? '⚪ Silver' : metalType || 'N/A'}</div>
              </div>
              <div>
                <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Metal Rate</div>
                <div style="font-size: 16px; font-weight: 600; color: #000000;">${metalRate !== null ? '' + parseFloat(metalRate).toFixed(2) + '/g' : 'N/A'}</div>
              </div>
              <div>
                <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Fine Given</div>
                <div style="font-size: 16px; font-weight: 600; color: #000000;">${fineGiven !== null ? parseFloat(fineGiven).toFixed(3) + ' g' : 'N/A'}</div>
              </div>
              <div>
                <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Settlement Amount</div>
                <div style="font-size: 16px; font-weight: 600; color: #d32f2f;">${parseFloat(amount || 0).toFixed(2)}</div>
              </div>
            </div>

            ${settlement.narration ? `
              <div style="border-top: 1px solid #ddd; padding-top: 15px;">
                <div style="color: #333333; margin-bottom: 5px; font-size: 12px;">Remarks</div>
                <div style="color: #000000;">${settlement.narration}</div>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="text-align: center; border-top: 2px solid #ddd; padding-top: 20px; font-size: 12px; color: #666666;">
            <p style="margin: 0;">Generated on ${new Date().toLocaleString('en-IN')}</p>
            <p style="margin: 0;">This is an electronically generated document</p>
          </div>
        </div>
      `;

      const options = {
        margin: [10, 10, 10, 10],
        filename: `Settlement-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCors: true, allowTaint: true },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      // CRITICAL: Append to DOM so html2pdf can properly render the element
      document.body.appendChild(settlementContent);

      // Add delay for browser rendering
      setTimeout(() => {
        const options = {
          margin: [10, 10, 10, 10],
          filename: `Settlement-${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCors: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf()
          .set(options)
          .from(settlementContent)
          .output('blob')
          .then((blob) => {
            // Remove from DOM after PDF generation
            document.body.removeChild(settlementContent);

            const fileName = `Settlement-${new Date().toISOString().split('T')[0]}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              navigator.share({
                files: [file],
                title: 'Settlement Receipt',
                text: `Settlement for ${ledger?.name || 'N/A'}`
              }).then(() => {
                toast.success('Settlement PDF shared successfully!');
              }).catch(err => {
                if (err.name !== 'AbortError') {
                  downloadPDF(blob, fileName);
                }
              });
            } else {
              downloadPDF(blob, fileName);
              const whatsappText = `Settlement Receipt for ${ledger?.name}. Amount: ${parseFloat(settlement.amount).toFixed(2)}`;
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
            // Clean up DOM on error
            if (document.body.contains(settlementContent)) {
              document.body.removeChild(settlementContent);
            }
            toast.error('Failed to generate PDF. Please try again.');
          });
      }, 500);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate or share PDF');
    }
  };

  // ─── EXPORT: CSV (for CA / accountant) ──────────────────────────
  const handleExportCSV = useCallback(() => {
    if (!ledger || transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const shopName = user?.shopName || 'JEWELLERY SHOP';
    const customerName = ledger.name || 'Customer';
    const phone = ledger.phoneNumber || '';

    const metaRows = [
      [`${shopName} - CUSTOMER LEDGER STATEMENT`],
      [`Customer: ${customerName}`, `Phone: ${phone}`],
      [`Ledger Type: ${ledger.ledgerType === 'gst' ? 'GST' : 'Regular'}`],
      [`Period: ${filters.startDate || 'All'} to ${filters.endDate || 'All'}`],
      [`Exported: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`],
      [],
      ['--- CURRENT BALANCE ---'],
      [`Cash Balance: Rs ${toFiniteNumber(getLedgerAmountBalance(ledger)).toFixed(2)}`],
      [`Gold Fine Weight: ${toFiniteNumber(ledger?.balances?.goldFineWeight).toFixed(3)} g`],
      [`Silver Fine Weight: ${toFiniteNumber(ledger?.balances?.silverFineWeight).toFixed(3)} g`],
      [],
    ];

    const headers = [
      'Date', 'Type', 'Bill No', 'Payment', 'Item Name', 'Metal',
      'Pcs', 'Gross Wt (g)', 'Net Wt (g)', 'Melting %', 'Fine Wt (g)',
      'Rate (Rs/g)', 'Labour (Rs)', 'Item Amount (Rs)',
      'Stone Amt (Rs)', 'Bill Total (Rs)', 'Cash Received (Rs)', 'Narration'
    ];

    const dataRows = [];
    transactions.forEach(txn => {
      const isSettlementVoucher = ['add_cash', 'add_gold', 'add_silver', 'money_to_gold', 'money_to_silver'].includes(txn.paymentType);
      const isSettlement = txn.type === 'settlement' || isSettlementVoucher;
      const txnType = isSettlement ? 'Settlement'
        : txn.voucherType === 'purchase' ? 'Purchase'
          : txn.invoiceType === 'gst' ? 'GST Sale' : 'Sale';
      const billNo = isSettlement
        ? `SET-${txn._id.substring(0, 6).toUpperCase()}`
        : txn.voucherNumber || '';
      const dateStr = format(new Date(txn.date), 'dd-MM-yyyy');
      const items = txn.items || [];
      const total = toFiniteNumber(txn.total || txn.amount);
      const cashReceived = toFiniteNumber(txn.cashReceived);
      const stoneAmount = toFiniteNumber(txn.stoneAmount);
      const narration = txn.narration || '';

      if (items.length > 0) {
        items.forEach((item, idx) => {
          dataRows.push([
            idx === 0 ? dateStr : '', idx === 0 ? txnType : '',
            idx === 0 ? billNo : '', idx === 0 ? (txn.paymentType || '') : '',
            item.itemName || '', item.metalType || '', item.pieces || '',
            toFiniteNumber(item.grossWeight).toFixed(3),
            toFiniteNumber(item.netWeight).toFixed(3),
            toFiniteNumber(item.melting).toFixed(2),
            toFiniteNumber(item.fineWeight).toFixed(3),
            item.metalType === 'gold' ? toFiniteNumber(txn.goldRate).toFixed(2)
              : item.metalType === 'silver' ? toFiniteNumber(txn.silverRate).toFixed(2) : '',
            toFiniteNumber(item.labourRate).toFixed(2),
            toFiniteNumber(item.amount).toFixed(2),
            idx === 0 ? stoneAmount.toFixed(2) : '',
            idx === 0 ? total.toFixed(2) : '',
            idx === 0 ? cashReceived.toFixed(2) : '',
            idx === 0 ? narration : ''
          ]);
        });
      } else {
        dataRows.push([
          dateStr, txnType, billNo, txn.paymentType || '',
          '', '', '', '', '', '', '', '', '', '',
          '', total.toFixed(2), cashReceived.toFixed(2), narration
        ]);
      }
    });

    const summaryRows = [
      [],
      ['--- SUMMARY ---'],
      [`Total Transactions: ${transactions.length}`],
      [`Sales: ${transactions.filter(t => t.type === 'voucher' && !['add_cash', 'add_gold', 'add_silver', 'money_to_gold', 'money_to_silver'].includes(t.paymentType) && t.voucherType !== 'purchase').length}`],
      [`Purchases: ${transactions.filter(t => t.voucherType === 'purchase').length}`],
      [`Settlements: ${transactions.filter(t => t.type === 'settlement' || ['add_cash', 'add_gold', 'add_silver', 'money_to_gold', 'money_to_silver'].includes(t.paymentType)).length}`],
    ];

    const allRows = [...metaRows, [headers], ...dataRows, ...summaryRows];
    const csvContent = allRows.map(row =>
      (Array.isArray(row) ? row : [row]).map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  }, [ledger, transactions, filters, user]);

  // ─── EXPORT: Premium PDF Statement ──────────────────────────────────────
  const handleExportPDF = useCallback((fromDate, toDate) => {
    // Filter transactions by export date range
    let exportTxns = [...transactions];
    if (fromDate) {
      exportTxns = exportTxns.filter(t => new Date(t.date) >= new Date(fromDate));
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      exportTxns = exportTxns.filter(t => new Date(t.date) <= endOfDay);
    }

    if (exportTxns.length === 0) {
      toast.error('No transactions in the selected period');
      return;
    }

    // Sort chronologically for running balance
    exportTxns.sort((a, b) => new Date(a.date) - new Date(b.date));

    const shopName = user?.shopName || 'JEWELLERY SHOP';
    const customerName = ledger.name || 'Customer';
    const phone = ledger.phoneNumber || '';
    const cashBal = toFiniteNumber(getLedgerAmountBalance(ledger));
    const goldBal = toFiniteNumber(ledger?.balances?.goldFineWeight);
    const silverBal = toFiniteNumber(ledger?.balances?.silverFineWeight);

    // Opening balance (from ledger or zero)
    const openingCash = toFiniteNumber(ledger?.openingBalance?.amount);
    const openingGold = toFiniteNumber(ledger?.openingBalance?.goldFineWeight);
    const openingSilver = toFiniteNumber(ledger?.openingBalance?.silverFineWeight);

    // Compute running balance
    let runCash = openingCash;
    let runGold = openingGold;
    let runSilver = openingSilver;

    const periodFrom = fromDate || (exportTxns.length > 0 ? format(new Date(exportTxns[0].date), 'dd-MM-yyyy') : '-');
    const periodTo = toDate || (exportTxns.length > 0 ? format(new Date(exportTxns[exportTxns.length - 1].date), 'dd-MM-yyyy') : '-');

    const txnRows = exportTxns.map(txn => {
      const isSettlementVoucher = ['add_cash', 'add_gold', 'add_silver', 'money_to_gold', 'money_to_silver'].includes(txn.paymentType);
      const isSettlement = txn.type === 'settlement' || isSettlementVoucher;
      const isPurchase = txn.voucherType === 'purchase';
      const isGST = txn.invoiceType === 'gst';
      const txnType = isSettlement ? 'Settlement' : isPurchase ? 'Purchase' : isGST ? 'GST Sale' : 'Sale';
      const badgeColor = isSettlement ? '#16a34a' : isPurchase ? '#7c3aed' : isGST ? '#ea580c' : '#2563eb';
      const billNo = isSettlement ? `SET-${txn._id.substring(0, 6).toUpperCase()}` : txn.voucherNumber || '-';
      const items = txn.items || [];
      const goldFine = items.filter(i => i.metalType === 'gold').reduce((s, i) => s + toFiniteNumber(i.fineWeight), 0);
      const silverFine = items.filter(i => i.metalType === 'silver').reduce((s, i) => s + toFiniteNumber(i.fineWeight), 0);
      const total = toFiniteNumber(txn.total || txn.amount);
      const cashRcvd = toFiniteNumber(txn.cashReceived);
      const itemNames = items.map(i => i.itemName).filter(Boolean).join(', ') || (isSettlement ? txn.paymentType?.replace('_', ' ') : '-');
      // Gold rate or silver rate displayed
      const rate = items.length > 0
        ? (items[0].metalType === 'gold' ? toFiniteNumber(txn.goldRate) : toFiniteNumber(txn.silverRate))
        : 0;

      // Update running balance
      if (isPurchase) {
        runCash -= cashRcvd;
        runGold += goldFine;
        runSilver += silverFine;
      } else if (isSettlement) {
        if (txn.paymentType === 'add_cash') runCash += total;
        else if (txn.paymentType === 'add_gold') runGold += goldFine;
        else if (txn.paymentType === 'add_silver') runSilver += silverFine;
        else if (txn.paymentType === 'money_to_gold') { runCash += total; runGold -= goldFine; }
        else if (txn.paymentType === 'money_to_silver') { runCash += total; runSilver -= silverFine; }
      } else {
        // Sale
        runCash += total;
        runGold += goldFine;
        runSilver += silverFine;
      }

      const runBalText = `\u20b9${runCash.toFixed(0)}${runGold !== 0 ? ' | G:' + runGold.toFixed(3) + 'g' : ''}${runSilver !== 0 ? ' | S:' + runSilver.toFixed(3) + 'g' : ''}`;

      return `<tr style="font-size:9px">
        <td style="border:1px solid #e0e0e0;padding:4px 5px">${format(new Date(txn.date), 'dd-MM-yy')}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px"><span style="background:${badgeColor};color:#fff;padding:1px 6px;border-radius:8px;font-size:8px;white-space:nowrap">${txnType}</span></td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px">${billNo}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${itemNames}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px;text-align:right">${goldFine ? goldFine.toFixed(3) : '-'}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px;text-align:right">${silverFine ? silverFine.toFixed(3) : '-'}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px;text-align:right">${items.length > 0 ? toFiniteNumber(items[0].melting).toFixed(2) + '%' : '-'}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px;text-align:right">${rate ? '\u20b9' + rate.toFixed(0) : '-'}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px;text-align:right;font-weight:600">${total.toFixed(2)}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px;text-align:right">${cashRcvd ? cashRcvd.toFixed(2) : '-'}</td>
        <td style="border:1px solid #e0e0e0;padding:4px 5px;text-align:right;font-size:8px;color:#555">${runBalText}</td>
      </tr>`;
    }).join('');

    const html = `
    <div id="pdf-export" style="font-family:'Segoe UI',Arial,sans-serif;padding:0;font-size:11px;color:#222">
      <!-- HEADER: Blue gradient branded bar -->
      <div style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:15px;font-weight:800;letter-spacing:0.5px">\ud83d\udc8e Katigar Softwares</div>
          <div style="font-size:9px;opacity:0.85;margin-top:2px">JEWELLERY MANAGEMENT SOFTWARE</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;font-weight:600">Software Support</div>
          <div style="font-size:11px">\ud83d\udcde 8904286980</div>
        </div>
      </div>

      <!-- SHOP DETAILS ROW -->
      <div style="border:1px solid #e0e0e0;border-top:none;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;background:#f0f4ff">
        <div>
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Shop Name</div>
          <div style="font-size:13px;font-weight:800;margin-top:2px">${shopName}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Shop Phone</div>
          <div style="font-size:13px;font-weight:600;margin-top:2px">\ud83d\udcde ${user?.phoneNumber || '-'}</div>
        </div>
      </div>

      <!-- CUSTOMER INFO ROW -->
      <div style="border:1px solid #e0e0e0;border-top:none;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;background:#fff">
        <div>
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Customer / Shop</div>
          <div style="font-size:13px;font-weight:700;margin-top:2px">${customerName}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Phone</div>
          <div style="font-size:13px;font-weight:600;margin-top:2px">\ud83d\udcde ${phone || '-'}</div>
        </div>
      </div>

      <!-- STATEMENT STRIP -->
      <div style="border:1px dashed #bbb;border-top:none;padding:6px 18px;background:#fafafa;font-size:10px;color:#555;display:flex;justify-content:space-between">
        <span><b>CUSTOMER LEDGER STATEMENT</b></span>
        <span>Type: <b>${ledger.ledgerType === 'gst' ? 'GST' : 'Regular'}</b> &nbsp;|&nbsp; Period: <b>${periodFrom}</b> to <b>${periodTo}</b></span>
      </div>

      <!-- BALANCE CARDS -->
      <div style="display:flex;gap:8px;margin:12px 0;padding:0 2px">
        <div style="flex:1;border:1.5px solid ${cashBal < 0 ? '#fca5a5' : '#bbf7d0'};border-radius:8px;padding:8px 10px;text-align:center;background:${cashBal < 0 ? '#fef2f2' : '#f0fdf4'}">
          <div style="font-size:8px;color:#888;text-transform:uppercase">Cash Balance</div>
          <div style="font-size:15px;font-weight:800;color:${cashBal < 0 ? '#dc2626' : '#16a34a'};margin-top:3px">\u20b9${cashBal.toFixed(2)}</div>
        </div>
        <div style="flex:1;border:1.5px solid #fde68a;border-radius:8px;padding:8px 10px;text-align:center;background:#fffbeb">
          <div style="font-size:8px;color:#888;text-transform:uppercase">\ud83d\udfe1 Gold Fine</div>
          <div style="font-size:15px;font-weight:800;color:#b45309;margin-top:3px">${goldBal.toFixed(3)} g</div>
        </div>
        <div style="flex:1;border:1.5px solid #d1d5db;border-radius:8px;padding:8px 10px;text-align:center;background:#f9fafb">
          <div style="font-size:8px;color:#888;text-transform:uppercase">\u26aa Silver Fine</div>
          <div style="font-size:15px;font-weight:800;color:#6b7280;margin-top:3px">${silverBal.toFixed(3)} g</div>
        </div>
      </div>

      <!-- TRANSACTION TABLE -->
      <table style="width:100%;border-collapse:collapse;font-size:9px;margin-top:4px">
        <thead>
          <tr style="background:#1e3a8a;color:#fff">
            <th style="border:1px solid #1e3a8a;padding:5px">Date</th>
            <th style="border:1px solid #1e3a8a;padding:5px">Type</th>
            <th style="border:1px solid #1e3a8a;padding:5px">Bill #</th>
            <th style="border:1px solid #1e3a8a;padding:5px">Items</th>
            <th style="border:1px solid #1e3a8a;padding:5px;text-align:right">Gold(g)</th>
            <th style="border:1px solid #1e3a8a;padding:5px;text-align:right">Silver(g)</th>
            <th style="border:1px solid #1e3a8a;padding:5px;text-align:right">Melt%</th>
            <th style="border:1px solid #1e3a8a;padding:5px;text-align:right">Rate</th>
            <th style="border:1px solid #1e3a8a;padding:5px;text-align:right">Amount</th>
            <th style="border:1px solid #1e3a8a;padding:5px;text-align:right">Cash Rcvd</th>
            <th style="border:1px solid #1e3a8a;padding:5px;text-align:right">Running Bal</th>
          </tr>
        </thead>
        <tbody>${txnRows}</tbody>
        <tfoot>
          <tr style="background:#f0f4ff;font-weight:700;font-size:10px">
            <td colspan="8" style="border:1px solid #e0e0e0;padding:5px;text-align:right">CLOSING BALANCE:</td>
            <td style="border:1px solid #e0e0e0;padding:5px;text-align:right;color:${cashBal < 0 ? '#dc2626' : '#16a34a'}">\u20b9${cashBal.toFixed(2)}</td>
            <td colspan="2" style="border:1px solid #e0e0e0;padding:5px;text-align:right;font-size:8px">Gold: ${goldBal.toFixed(3)}g | Silver: ${silverBal.toFixed(3)}g</td>
          </tr>
        </tfoot>
      </table>

      <!-- FOOTER -->
      <div style="margin-top:14px;padding-top:8px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:8px;color:#999">
        <span>\ud83d\udc8e Katigar Softwares | 8904286980</span>
        <span>Computer-generated statement</span>
        <span>${format(new Date(), 'dd-MMM-yyyy')}</span>
      </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    html2pdf()
      .set({
        margin: [5, 5, 5, 5],
        filename: `Statement_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(container.querySelector('#pdf-export'))
      .save()
      .then(() => {
        document.body.removeChild(container);
        toast.success('Statement PDF downloaded!');
      })
      .catch(() => {
        document.body.removeChild(container);
        toast.error('PDF export failed');
      });

    setShowExportModal(false);
  }, [ledger, transactions, user]);

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading" style={{ width: '40px', height: '40px' }}></div>
        </div>
      </Layout>
    );
  }

  const totalCredit = transactions
    .filter(t => t.type === 'voucher' && t.paymentType === 'credit')
    .reduce((sum, t) => sum + (t.total || 0), 0);

  const totalCash = transactions
    .filter(t => t.type === 'voucher' && t.paymentType === 'cash')
    .reduce((sum, t) => sum + (t.total || 0), 0);

  const totalAmount = totalCash + totalCredit;

  const goldCreditAmount = transactions
    .filter(t => t.type === 'voucher' && t.paymentType === 'credit')
    .reduce((sum, t) => {
      const items = t.items || [];
      const goldAmount = items
        .filter(item => item.metalType === 'gold')
        .reduce((itemSum, item) => itemSum + (item.amount || 0), 0);
      return sum + goldAmount;
    }, 0);

  const silverCreditAmount = transactions
    .filter(t => t.type === 'voucher' && t.paymentType === 'credit')
    .reduce((sum, t) => {
      const items = t.items || [];
      const silverAmount = items
        .filter(item => item.metalType === 'silver')
        .reduce((itemSum, item) => itemSum + (item.amount || 0), 0);
      return sum + silverAmount;
    }, 0);

  const goldCreditFineWeight = transactions
    .filter(t => t.type === 'voucher' && t.paymentType === 'credit')
    .reduce((sum, t) => {
      const items = t.items || [];
      const goldFine = items
        .filter(item => item.metalType === 'gold')
        .reduce((itemSum, item) => itemSum + (item.fineWeight || 0), 0);
      return sum + goldFine;
    }, 0);

  const silverCreditFineWeight = transactions
    .filter(t => t.type === 'voucher' && t.paymentType === 'credit')
    .reduce((sum, t) => {
      const items = t.items || [];
      const silverFine = items
        .filter(item => item.metalType === 'silver')
        .reduce((itemSum, item) => itemSum + (item.fineWeight || 0), 0);
      return sum + silverFine;
    }, 0);

  const amountBalance = getLedgerAmountBalance(ledger);
  const displayCashBalance = -amountBalance;
  const previewBalanceDetails = previewType === 'voucher' && selectedItem
    ? getVoucherBalanceDetails(selectedItem, ledger)
    : null;

  return (
    <Layout>
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => navigate('/ledgers')} className="btn btn-secondary mb-2">
            <FiArrowLeft /> Back to Ledgers
          </button>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>{ledger?.name}</h2>
          <p className="text-muted">{ledger?.phoneNumber}</p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '13px'
          }}>
            <div>
              <span style={{ color: 'var(--color-muted)', fontWeight: '500' }}>Ledger Type:</span>
              <span className={`badge ${ledger?.ledgerType === 'gst' ? 'badge-success' : 'badge-info'}`} style={{ marginLeft: '8px' }}>
                {ledger?.ledgerType === 'gst' ? '📄 GST' : '💰 Regular'}
              </span>
            </div>
            {ledger?.gstDetails?.hasGST && (
              <>
                <div>
                  <span style={{ color: 'var(--color-muted)', fontWeight: '500' }}>GST Status:</span>
                  <span style={{ marginLeft: '8px', padding: '2px 8px', backgroundColor: 'var(--color-success)', color: '#fff', borderRadius: '4px', fontWeight: 'bold' }}>
                    ✅ Yes
                  </span>
                </div>
                {ledger?.gstDetails?.gstNumber && (
                  <div>
                    <span style={{ color: 'var(--color-muted)', fontWeight: '500' }}>GST Number:</span>
                    <span style={{ marginLeft: '8px', fontWeight: '600', fontFamily: 'monospace' }}>
                      {ledger.gstDetails.gstNumber}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {ledger?.ledgerType === 'gst' ? (
            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                ℹ️ <strong>GST Ledger:</strong> This ledger is in Full Payment mode (like Tally).
                Balance tracking and fine weights are disabled. All GST invoices are stored as independent records.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-2" style={{ marginTop: '1.5rem' }}>

                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}> Fine Gold</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: ledger?.balances?.goldFineWeight > 0 ? 'red' : undefined }}>
                    {ledger?.balances?.goldFineWeight > 0 ? '-' : ''}{Math.abs(ledger?.balances?.goldFineWeight || 0).toFixed(3)} g
                  </div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}> Fine Silver</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: ledger?.balances?.silverFineWeight > 0 ? 'red' : undefined }}>
                    {ledger?.balances?.silverFineWeight > 0 ? '-' : ''}{Math.abs(ledger?.balances?.silverFineWeight || 0).toFixed(3)} g
                  </div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Cash Balance</div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: displayCashBalance < 0 ? 'red' : displayCashBalance > 0 ? 'green' : undefined
                  }}>
                    {formatSignedCurrency(displayCashBalance)}
                  </div>
                </div>
              </div>

              {/* ─── OUR BALANCE TO CUSTOMER (clear direction indicator) ─── */}
              {(() => {
                const cashBal = displayCashBalance;               // positive = shop owes customer, negative = customer owes shop
                const goldBal = -(ledger?.balances?.goldFineWeight || 0); // positive = shop owes, negative = customer owes
                const silverBal = -(ledger?.balances?.silverFineWeight || 0);

                const shopOwesCash = cashBal > 0;
                const shopOwesGold = goldBal > 0;
                const shopOwesSilver = silverBal > 0;

                const customerOwesCash = cashBal < 0;
                const customerOwesGold = goldBal < 0;
                const customerOwesSilver = silverBal < 0;

                const allClear = cashBal === 0 && goldBal === 0 && silverBal === 0;

                return (
                  <div style={{ marginTop: '1.25rem', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {/* Header */}
                    <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      ⚖️ Our Balance to Customer
                    </div>

                    {allClear ? (
                      <div style={{ padding: '14px 16px', background: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>
                        ✅ All Clear — No dues on either side
                      </div>
                    ) : (
                      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                        {/* Cash */}
                        {cashBal !== 0 && (
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 16px', borderRadius: 8, fontWeight: 600,
                            background: shopOwesCash ? '#f0fdf4' : '#fff7ed',
                            border: `1px solid ${shopOwesCash ? '#86efac' : '#fdba74'}`,
                            color: shopOwesCash ? '#166534' : '#9a3412',
                          }}>
                            <span style={{ fontSize: 13 }}>
                              {shopOwesCash
                                ? '🟢 We owe customer (Cash)'
                                : '🔴 Customer owes us (Cash)'}
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 800 }}>
                              ₹{Math.abs(cashBal).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Gold */}
                        {goldBal !== 0 && (
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 16px', borderRadius: 8, fontWeight: 600,
                            background: shopOwesGold ? '#fefce8' : '#fff7ed',
                            border: `1px solid ${shopOwesGold ? '#fde047' : '#fdba74'}`,
                            color: shopOwesGold ? '#854d0e' : '#9a3412',
                          }}>
                            <span style={{ fontSize: 13 }}>
                              {shopOwesGold
                                ? '🟡 We owe customer (Gold Fine Wt)'
                                : '🔴 Customer owes us (Gold Fine Wt)'}
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 800 }}>
                              {Math.abs(goldBal).toFixed(3)} g
                            </span>
                          </div>
                        )}

                        {/* Silver */}
                        {silverBal !== 0 && (
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 16px', borderRadius: 8, fontWeight: 600,
                            background: shopOwesSilver ? '#f8fafc' : '#fff7ed',
                            border: `1px solid ${shopOwesSilver ? '#cbd5e1' : '#fdba74'}`,
                            color: shopOwesSilver ? '#334155' : '#9a3412',
                          }}>
                            <span style={{ fontSize: 13 }}>
                              {shopOwesSilver
                                ? '⚪ We owe customer (Silver Fine Wt)'
                                : '🔴 Customer owes us (Silver Fine Wt)'}
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 800 }}>
                              {Math.abs(silverBal).toFixed(3)} g
                            </span>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Opening Balance Section - show if any opening balance was set */}
              {(ledger?.openingBalance?.amount || ledger?.openingBalance?.goldFineWeight || ledger?.openingBalance?.silverFineWeight) ? (
                <div style={{ marginTop: '1rem', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    📋 Opening Balance (set during creation)
                  </div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                    {ledger.openingBalance.amount ? (
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Amount: </span>
                        <strong>₹{parseFloat(ledger.openingBalance.amount).toFixed(2)}</strong>
                      </div>
                    ) : null}
                    {ledger.openingBalance.goldFineWeight ? (
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Gold Fine: </span>
                        <strong style={{ color: '#FFD700' }}>{parseFloat(ledger.openingBalance.goldFineWeight).toFixed(3)}g</strong>
                      </div>
                    ) : null}
                    {ledger.openingBalance.silverFineWeight ? (
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Silver Fine: </span>
                        <strong style={{ color: '#C0C0C0' }}>{parseFloat(ledger.openingBalance.silverFineWeight).toFixed(3)}g</strong>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Transactions</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleRecalculateBalance} className="btn btn-sm btn-secondary">
                🔄 Recalculate Balance
              </button>
              <button onClick={handleDeleteAllVouchers} className="btn btn-sm btn-danger">
                <FiTrash2 /> Delete All Vouchers
              </button>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Start Date</label>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">End Date</label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleClearFilters}
              className="btn btn-sm btn-secondary"
              style={{ padding: '6px 16px' }}
            >
              Clear Filters
            </button>
            <button
              onClick={handleExportCSV}
              className="btn btn-sm"
              style={{ padding: '6px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px' }}
            >
              📊 Export CSV
            </button>
            <button
              onClick={() => { setExportDates({ from: '', to: '' }); setShowExportModal(true); }}
              className="btn btn-sm"
              style={{ padding: '6px 16px', background: 'linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600 }}
            >
              📄 Export Statement
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Voucher/Settlement #</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  // Check if it's a settlement voucher (created via Voucher API with settlement paymentType)
                  const isSettlementVoucher = ['add_cash', 'add_gold', 'add_silver', 'money_to_gold', 'money_to_silver'].includes(txn.paymentType);
                  const isSettlementType = txn.type === 'settlement' || isSettlementVoucher;

                  return (
                    <tr key={txn._id}>
                      <td>{format(new Date(txn.date), 'dd MMM yyyy')}</td>
                      <td>
                        {isSettlementType ? (
                          <span className="badge badge-success">Settlement</span>
                        ) : txn.voucherType === 'purchase' ? (
                          <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>🛒 Purchase</span>
                        ) : txn.invoiceType === 'gst' ? (
                          <span className="badge badge-warning">📄 GST Sale</span>
                        ) : (
                          <span className="badge badge-info">🛍️ Sale</span>
                        )}
                      </td>
                      <td>
                        {isSettlementType
                          ? `SET-${txn._id.substring(0, 6).toUpperCase()} (${txn.paymentType})`
                          : txn.voucherNumber}
                      </td>
                      <td>{txn.total?.toFixed(2) || txn.amount?.toFixed(2) || '0.00'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {!isSettlementType && txn.type === 'voucher' && (
                            <button
                              onClick={() => {
                                // Use invoiceType as the source of truth
                                if (txn.invoiceType === 'gst') {
                                  navigate(`/gst-billing?voucherid=${txn._id}`);
                                } else {
                                  navigate(`/billing?voucherid=${txn._id}`);
                                }
                              }}
                              className="btn btn-sm btn-secondary"
                              title="Edit"
                            >
                              <FiEdit2 />
                            </button>
                          )}
                          <button
                            onClick={() => isSettlementType ? handlePreviewSettlement(txn) : handlePreviewVoucher(txn)}
                            className="btn btn-sm btn-secondary"
                            title="Preview"
                          >
                            <FiEye />
                          </button>
                          <button
                            onClick={() => isSettlementType ? handlePrintSettlement(txn) : handlePrintVoucher(txn)}
                            className="btn btn-sm btn-secondary"
                            title="Print"
                          >
                            <FiPrinter />
                          </button>
                          <button
                            onClick={() => isSettlementType ? handleShareSettlement(txn) : handleShareVoucher(txn)}
                            className="btn btn-sm btn-secondary"
                            title="Share"
                          >
                            <FiShare2 />
                          </button>
                          <button
                            onClick={() => isSettlementType ? handleDeleteSettlement(txn._id) : handleDeleteVoucher(txn._id)}
                            className="btn btn-sm btn-danger"
                            title={isSettlementType ? 'Delete Settlement' : 'Delete Voucher'}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {ledger?.ledgerType === 'gst' ? (
                  <></>
                ) : (
                  <></>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {showPreview && selectedItem && (
          <div className="modal-overlay" onClick={() => setShowPreview(false)}>
            <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">
                  {previewType === 'voucher'
                    ? `Voucher Preview - #${selectedItem.voucherNumber}`
                    : `Settlement Preview`}
                </h3>
                <button onClick={() => setShowPreview(false)} className="btn btn-sm" style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                {previewType === 'voucher' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Date</div>
                        <div>{format(new Date(selectedItem.date), 'dd MMM yyyy')}</div>
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Payment Type</div>
                        <div className="text-capitalize">{selectedItem.paymentType}</div>
                      </div>
                      {selectedItem.goldRate && (
                        <div>
                          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Gold Rate</div>
                          <div>{parseFloat(selectedItem.goldRate).toFixed(2)}</div>
                        </div>
                      )}
                      {selectedItem.silverRate && (
                        <div>
                          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Silver Rate</div>
                          <div>{parseFloat(selectedItem.silverRate).toFixed(2)}</div>
                        </div>
                      )}
                    </div>

                    {selectedItem.items && selectedItem.items.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4>Items</h4>
                        <div className="table-container">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Metal</th>
                                <th>Pcs</th>
                                <th>Net Wt</th>
                                <th>Fine Wt</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedItem.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.itemName}</td>
                                  <td style={{ fontWeight: 'bold', color: item.metalType === 'gold' ? '#ffa500' : '#c0c0c0' }}>
                                    {item.metalType === 'gold' ? '🟡 GOLD' : '⚪ SILVER'}
                                  </td>
                                  <td>{item.pieces}</td>
                                  <td>{parseFloat(item.netWeight).toFixed(3)}</td>
                                  <td>{parseFloat(item.fineWeight).toFixed(3)}</td>
                                  <td>{parseFloat(item.amount).toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--bg-hover)' }}>
                                <td colSpan="3">Total</td>
                                <td>{selectedItem.items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0).toFixed(3)}</td>
                                <td>{selectedItem.items.reduce((sum, item) => sum + (parseFloat(item.fineWeight) || 0), 0).toFixed(3)}</td>
                                <td>{selectedItem.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        {selectedItem.stoneAmount && (
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Stone Amount</div>
                            <div>{parseFloat(selectedItem.stoneAmount).toFixed(2)}</div>
                          </div>
                        )}
                        {selectedItem.fineAmount && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Fine Amount</div>
                            <div>{parseFloat(selectedItem.fineAmount).toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Total Amount</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                          {selectedItem.total?.toFixed(2) || (
                            (selectedItem.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0) +
                            (parseFloat(selectedItem.stoneAmount) || 0) +
                            (parseFloat(selectedItem.fineAmount) || 0)
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Balance Summary Section */}
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>Balance Summary</h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Cash Received</div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{parseFloat(selectedItem.cashReceived || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-muted" style={{ fontSize: '0.875rem' }}>Net Balance</div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {(
                              (selectedItem.total?.toFixed(2) || (
                                (selectedItem.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0) +
                                (parseFloat(selectedItem.stoneAmount) || 0) +
                                (parseFloat(selectedItem.fineAmount) || 0)
                              )) - (parseFloat(selectedItem.cashReceived || 0))
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Customer Balance Box */}
                      <div style={{ border: '1px solid var(--border-color)', padding: '1rem', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Customer Balance</div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#FFD700', fontWeight: 500 }}>Fine Gold: {(-previewBalanceDetails?.currentGold)?.toFixed(3) || '0.000'} g</div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#C0C0C0', fontWeight: 500 }}>Fine Silver: {(-previewBalanceDetails?.currentSilver)?.toFixed(3) || '0.000'} g</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Cash Balance: {formatSignedCurrency(-previewBalanceDetails?.currentAmount)}</div>
                      </div>
                    </div>

                    {selectedItem.narration && (
                      <div style={{ marginTop: '1rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Narration</div>
                        <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                          {selectedItem.narration}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(() => {
                      // Detect if this is a true Settlement or a settlement-type Voucher
                      const isTrueSettlement = selectedItem.type === 'settlement';

                      // Extract properties based on type
                      let metalType, metalRate, fineGiven, amount;

                      if (isTrueSettlement) {
                        // True Settlement from Settlement Collection
                        metalType = selectedItem.metalType;
                        metalRate = selectedItem.metalRate;
                        fineGiven = selectedItem.fineGiven;
                        amount = selectedItem.amount;
                      } else {
                        // Settlement-type Voucher - map from paymentType
                        const paymentType = selectedItem.paymentType;

                        if (paymentType === 'add_cash') {
                          metalType = 'Cash';
                          metalRate = null; // N/A for cash
                          fineGiven = null; // N/A for cash
                          amount = selectedItem.cashReceived || 0;
                        } else if (paymentType === 'add_gold') {
                          metalType = 'gold';
                          metalRate = selectedItem.goldRate || 0;
                          fineGiven = selectedItem.cashReceived || 0; // cashReceived holds the fine weight
                          amount = (selectedItem.cashReceived || 0) * (selectedItem.goldRate || 0);
                        } else if (paymentType === 'add_silver') {
                          metalType = 'silver';
                          metalRate = selectedItem.silverRate || 0;
                          fineGiven = selectedItem.cashReceived || 0; // cashReceived holds the fine weight
                          amount = (selectedItem.cashReceived || 0) * (selectedItem.silverRate || 0);
                        } else if (paymentType === 'money_to_gold') {
                          metalType = 'gold';
                          metalRate = selectedItem.goldRate || 0;
                          fineGiven = selectedItem.goldRate ? (selectedItem.cashReceived || 0) / selectedItem.goldRate : 0;
                          amount = selectedItem.cashReceived || 0;
                        } else if (paymentType === 'money_to_silver') {
                          metalType = 'silver';
                          metalRate = selectedItem.silverRate || 0;
                          fineGiven = selectedItem.silverRate ? (selectedItem.cashReceived || 0) / selectedItem.silverRate : 0;
                          amount = selectedItem.cashReceived || 0;
                        } else {
                          // Fallback for unknown types
                          metalType = 'Unknown';
                          metalRate = 0;
                          fineGiven = 0;
                          amount = selectedItem.cashReceived || 0;
                        }
                      }

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Customer</div>
                            <div>{ledger?.name}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Date</div>
                            <div>{format(new Date(selectedItem.date), 'dd MMM yyyy')}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Metal Type</div>
                            <div className="text-capitalize">{metalType || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Rate</div>
                            <div>{metalRate !== null ? `${parseFloat(metalRate).toFixed(2)}` : 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Fine Given</div>
                            <div>{fineGiven !== null ? `${parseFloat(fineGiven).toFixed(3)} g` : 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>Amount</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{parseFloat(amount || 0).toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {selectedItem.narration && (
                      <div style={{ marginTop: '1rem' }}>
                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>Narration</div>
                        <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                          {selectedItem.narration}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowPreview(false)} className="btn btn-secondary">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Statement Date Range Modal */}
        {showExportModal && (
          <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
            <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">📄 Export Statement</h3>
                <button onClick={() => setShowExportModal(false)} className="btn btn-sm" style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Select the period for your ledger statement. Leave empty to export all transactions.
                </p>
                <div className="grid grid-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="input-group">
                    <label className="input-label">From Date</label>
                    <input
                      type="date"
                      className="input"
                      value={exportDates.from}
                      onChange={(e) => setExportDates({ ...exportDates, from: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">To Date</label>
                    <input
                      type="date"
                      className="input"
                      value={exportDates.to}
                      onChange={(e) => setExportDates({ ...exportDates, to: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleExportPDF('', '')}
                    className="btn"
                    style={{ backgroundColor: '#6b7280', color: '#fff', border: 'none' }}
                  >
                    Export All
                  </button>
                  <button
                    onClick={() => handleExportPDF(exportDates.from, exportDates.to)}
                    className="btn"
                    style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)', color: '#fff', border: 'none', fontWeight: 600 }}
                  >
                    📄 Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          danger={confirmDialog.danger}
          confirmText={confirmDialog.confirmText || 'Confirm'}
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />
      </div>
    </Layout>
  );
}


