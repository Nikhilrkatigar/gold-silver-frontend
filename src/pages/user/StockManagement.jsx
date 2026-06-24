import React, { useEffect, useMemo, useState } from 'react';
import { expenseAPI, karigarAPI, settlementAPI, stockAPI, voucherAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { FiDownload, FiEye, FiPrinter, FiRotateCcw, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { SkeletonStat, SkeletonTable } from '../../components/Skeleton';
import PullToRefresh from '../../components/PullToRefresh';
import ItemStockManagement from './ItemStockManagement';

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

const getTodayLocalDate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

const getCurrentTimeParts = () => {
  const now = new Date();
  const rawHour = now.getHours();
  const minute = String(now.getMinutes()).padStart(2, '0');
  const meridiem = rawHour >= 12 ? 'PM' : 'AM';
  const hour12 = rawHour % 12 || 12;

  return {
    hour: String(hour12).padStart(2, '0'),
    minute,
    meridiem
  };
};

const buildDateTimeISO = (dateValue, hour, minute, meridiem) => {
  if (!dateValue) {
    return null;
  }
  const [year, month, day] = dateValue.split('-').map((value) => Number(value));
  if (!year || !month || !day) {
    return null;
  }

  let hour24 = Number(hour) % 12;
  if (meridiem === 'PM') {
    hour24 += 12;
  }

  const localDate = new Date(year, month - 1, day, hour24, Number(minute), 0, 0);
  if (Number.isNaN(localDate.getTime())) {
    return null;
  }
  return localDate.toISOString();
};

const formatDate12Hour = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatTime12Hour = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

// Must match /ledgers "Total Amount": include only positive billing vouchers.
// For vouchers with mixed positive/negative items, sum positive item amounts.
const getVoucherGrossBillAmount = (voucher) => {
  const paymentType = voucher?.paymentType;
  if (!['cash', 'credit'].includes(paymentType)) return 0;

  const explicitTotal = Number(voucher?.total);
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) {
    return explicitTotal;
  }

  // When voucher total is negative or zero, sum only positive item amounts
  // so that partial sales within the voucher still count
  const positiveItemsTotal = (voucher?.items || []).reduce((sum, item) => {
    const amt = parseFloat(item.amount) || 0;
    return sum + (amt > 0 ? amt : 0);
  }, 0);
  return positiveItemsTotal;
};

const formatCurrency = (amount) => {
  const value = toFiniteNumber(amount);
  const sign = value < 0 ? '-' : '';
  return `${sign}\u20B9${Math.abs(value).toFixed(2)}`;
};

const getKarigarAmountDelta = (transaction) => {
  const amount = toFiniteNumber(transaction?.chargeAmount);
  return transaction?.type === 'received' ? -amount : amount;
};

const getKarigarChargeBalance = (transactions = []) => (
  transactions.reduce((sum, transaction) => sum + getKarigarAmountDelta(transaction), 0)
);

const getCashBreakdownWithKarigar = (breakdown, backendNet, karigarCharges) => {
  const normalizedBreakdown = breakdown || {};
  const backendKarigarCharges = Object.prototype.hasOwnProperty.call(normalizedBreakdown, 'karigarCharges')
    ? toFiniteNumber(normalizedBreakdown.karigarCharges)
    : 0;
  const netBeforeKarigar = toFiniteNumber(backendNet) + backendKarigarCharges;
  const net = netBeforeKarigar + karigarCharges;

  return {
    ...normalizedBreakdown,
    cashFromSales: toFiniteNumber(normalizedBreakdown.cashFromSales),
    customerLiabilities: toFiniteNumber(normalizedBreakdown.customerLiabilities),
    paidForPurchases: toFiniteNumber(normalizedBreakdown.paidForPurchases),
    stockAndExpenses: toFiniteNumber(normalizedBreakdown.stockAndExpenses),
    karigarCharges,
    net
  };
};

const fetchAllPaginated = async (request, key) => {
  const allItems = [];
  let page = 1;
  let pages = 1;

  do {
    const response = await request({ page, limit: 100 });
    const data = response?.data || {};
    allItems.push(...(data[key] || []));
    pages = data.pagination?.pages || 1;
    page += 1;
  } while (page <= pages);

  return allItems;
};

const StockManagement = () => {
  const { user } = useAuth();

  // If user is in item mode, render ItemStockManagement instead
  if (user?.stockMode === 'item') {
    return (
      <Layout>
        <ItemStockManagement />
      </Layout>
    );
  }

  // Otherwise, render traditional bulk stock management
  const [goldStock, setGoldStock] = useState(0);
  const [silverStock, setSilverStock] = useState(0);
  const [goldInput, setGoldInput] = useState('');
  const [silverInput, setSilverInput] = useState('');
  const [goldAmount, setGoldAmount] = useState('');
  const [silverAmount, setSilverAmount] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cashInHand, setCashInHand] = useState(0);
  const [cashBreakdown, setCashBreakdown] = useState(null);
  const [cashDetailsOpen, setCashDetailsOpen] = useState(false);
  const [cashDetailsLoading, setCashDetailsLoading] = useState(false);
  const [cashDetails, setCashDetails] = useState([]);
  const [stockDate, setStockDate] = useState(getTodayLocalDate());
  const [stockHour, setStockHour] = useState(getCurrentTimeParts().hour);
  const [stockMinute, setStockMinute] = useState(getCurrentTimeParts().minute);
  const [stockMeridiem, setStockMeridiem] = useState(getCurrentTimeParts().meridiem);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'money'
  const [moneyInput, setMoneyInput] = useState('');

  const totalAmount = useMemo(
    () => (parseFloat(goldAmount) || 0) + (parseFloat(silverAmount) || 0),
    [goldAmount, silverAmount]
  );
  const customerLiabilities = cashBreakdown?.customerLiabilities || 0;
  const effectiveCashAfterLiabilities = cashInHand - customerLiabilities;

  const resetDateTimeSelection = () => {
    const nowTime = getCurrentTimeParts();
    setStockDate(getTodayLocalDate());
    setStockHour(nowTime.hour);
    setStockMinute(nowTime.minute);
    setStockMeridiem(nowTime.meridiem);
  };

  // Cash in Hand is now calculated server-side (stock.js GET route)
  // The backend separates sale cashReceived (IN) from purchase cashReceived (OUT)
  // and accounts for stock purchases and cash expenses via Stock.cashInHand
  const calculateCashInHand = async () => {
    try {
      const [stockRes, karigarRes] = await Promise.all([
        stockAPI.getStock(),
        fetchAllPaginated(karigarAPI.getAll, 'transactions')
      ]);
      const breakdown = stockRes?.data?.stock?.cashBreakdown;
      const backendNet = stockRes?.data?.stock?.calculatedCashInHand ?? 0;
      const karigarCharges = getKarigarChargeBalance(karigarRes);
      const normalizedBreakdown = getCashBreakdownWithKarigar(breakdown, backendNet, karigarCharges);
      setCashInHand(normalizedBreakdown.net);
      setCashBreakdown(normalizedBreakdown);
    } catch (err) {
      console.error('Error fetching cash in hand:', err);
      setCashInHand(0);
    }
  };

  const fetchStockAndHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const [stockRes, historyRes] = await Promise.all([
        stockAPI.getStock(),
        stockAPI.getHistory()
      ]);
      setGoldStock(stockRes.data.stock.gold);
      setSilverStock(stockRes.data.stock.silver);
      setHistory(historyRes.data.history || []);
    } catch (err) {
      setError('Failed to fetch stock data.');
    }
    setLoading(false);
  };

  const buildCashDetailGroups = ({ vouchers, expenses, stockInputs, karigarTransactions }) => {
    const activeVouchers = vouchers.filter((voucher) => voucher.status !== 'cancelled');
    const cashPaymentTypes = ['cash', 'add_cash', 'money_to_gold', 'money_to_silver'];

    const saleRows = activeVouchers
      .filter((voucher) => voucher.voucherType !== 'purchase' && cashPaymentTypes.includes(voucher.paymentType))
      .map((voucher) => ({
        id: voucher._id,
        date: voucher.date,
        title: voucher.customerName || voucher.ledgerId?.name || 'Customer cash',
        subtitle: `Voucher ${voucher.voucherNumber || '-'}`,
        amount: toFiniteNumber(voucher.cashReceived),
        tone: 'in'
      }))
      .filter((row) => row.amount !== 0);

    const purchaseRows = activeVouchers
      .filter((voucher) => voucher.voucherType === 'purchase')
      .map((voucher) => ({
        id: voucher._id,
        date: voucher.date,
        title: voucher.customerName || voucher.ledgerId?.name || 'Old gold purchase',
        subtitle: `Purchase voucher ${voucher.voucherNumber || '-'}`,
        amount: -toFiniteNumber(voucher.cashReceived),
        tone: 'out'
      }))
      .filter((row) => row.amount !== 0);

    const cashAdditionRows = stockInputs
      .filter((entry) => entry.type === 'cash_addition')
      .map((entry) => ({
        id: entry._id,
        date: entry.date,
        title: 'Cash Added',
        subtitle: 'Manual cash deposit/injection',
        amount: toFiniteNumber(entry.cashAmount),
        tone: 'in'
      }))
      .filter((row) => row.amount !== 0);

    const stockRows = stockInputs
      .filter((entry) => entry.type !== 'cash_addition')
      .map((entry) => ({
        id: entry._id,
        date: entry.date,
        title: 'Stock purchase',
        subtitle: `Gold ${toFiniteNumber(entry.gold).toFixed(3)}g, Silver ${toFiniteNumber(entry.silver).toFixed(3)}g`,
        amount: -toFiniteNumber(entry.cashAmount),
        tone: 'out'
      }))
      .filter((row) => row.amount !== 0);

    const expenseRows = expenses
      .filter((expense) => expense.paymentMethod === 'cash')
      .map((expense) => ({
        id: expense._id,
        date: expense.date,
        title: expense.category || 'Expense',
        subtitle: expense.description || 'Cash expense',
        amount: -toFiniteNumber(expense.amount),
        tone: 'out'
      }))
      .filter((row) => row.amount !== 0);

    const karigarRows = karigarTransactions
      .map((transaction) => {
        const amount = getKarigarAmountDelta(transaction);
        const name = transaction.karigarName || transaction.itemName || 'Karigar';
        return {
          id: transaction._id,
          date: transaction.date,
          title: name,
          subtitle: `${transaction.type === 'received' ? 'Received' : 'Given'} - ${transaction.itemName || 'work'}`,
          amount,
          tone: amount >= 0 ? 'in' : 'out'
        };
      })
      .filter((row) => row.amount !== 0);

    const groups = [
      { key: 'sales', title: 'Cash received from customers', rows: saleRows },
      { key: 'additions', title: 'Cash additions (injected)', rows: cashAdditionRows },
      { key: 'purchases', title: 'Paid for old gold purchases', rows: purchaseRows },
      { key: 'stock', title: 'Stock purchases', rows: stockRows },
      { key: 'expenses', title: 'Cash expenses', rows: expenseRows },
      { key: 'karigar', title: 'Karigar amount balance', rows: karigarRows }
    ];

    return groups.map((group) => ({
      ...group,
      total: group.rows.reduce((sum, row) => sum + row.amount, 0)
    }));
  };

  const loadCashDetails = async () => {
    setCashDetailsLoading(true);
    try {
      const [vouchers, expensesRes, stockInputs, karigarTransactions] = await Promise.all([
        fetchAllPaginated(voucherAPI.getAll, 'vouchers'),
        expenseAPI.getAll({}),
        fetchAllPaginated(stockAPI.getHistory, 'history'),
        fetchAllPaginated(karigarAPI.getAll, 'transactions')
      ]);

      const groups = buildCashDetailGroups({
        vouchers,
        expenses: expensesRes?.data?.expenses || [],
        stockInputs,
        karigarTransactions
      });
      setCashDetails(groups);
    } catch (err) {
      console.error('Failed to load cash details:', err);
      toast.error('Failed to load cash breakdown details.');
    } finally {
      setCashDetailsLoading(false);
    }
  };

  const handleCashBreakdownOpen = () => {
    setCashDetailsOpen(true);
    loadCashDetails();
  };

  useEffect(() => {
    fetchStockAndHistory();
    calculateCashInHand();
  }, []);

  const handleAddStock = async (e) => {
    e.preventDefault();
    setError('');

    if (!goldInput && !silverInput) {
      setError('Enter gold or silver amount.');
      return;
    }

    if (totalAmount > cashInHand) {
      setError(`Total amount (Rs ${totalAmount.toFixed(2)}) exceeds cash in hand (Rs ${cashInHand.toFixed(2)})`);
      return;
    }

    const dateTime = buildDateTimeISO(stockDate, stockHour, stockMinute, stockMeridiem);
    if (!dateTime) {
      setError('Please select a valid date and time.');
      return;
    }

    try {
      await stockAPI.addStock({
        gold: goldInput || 0,
        silver: silverInput || 0,
        cashAmount: totalAmount,
        dateTime
      });

      if (totalAmount > 0) {
        try {
          await settlementAPI.create({
            ledgerId: 'system',
            date: dateTime,
            narration: `Stock Purchase: Gold ${goldInput || 0}g, Silver ${silverInput || 0}g`,
            direction: 'payment',
            metalType: 'cash',
            fineGiven: 0,
            amount: totalAmount,
            balanceBefore: cashInHand,
            balanceAfter: {
              amount: cashInHand - totalAmount,
              fineWeight: 0
            },
            isStockPurchase: true
          });
        } catch (settleErr) {
          console.warn('Settlement entry creation failed but stock was added:', settleErr);
          toast.warning('Stock added but cash tracking entry failed.');
        }
      }

      toast.success('Stock added successfully.');
      setGoldInput('');
      setSilverInput('');
      setGoldAmount('');
      setSilverAmount('');
      resetDateTimeSelection();
      fetchStockAndHistory();
      calculateCashInHand();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add stock.');
      console.error(err);
    }
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(moneyInput);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    const dateTime = buildDateTimeISO(stockDate, stockHour, stockMinute, stockMeridiem);
    if (!dateTime) {
      setError('Please select a valid date and time.');
      return;
    }

    try {
      await stockAPI.addCash({
        amount,
        dateTime
      });

      toast.success('Money added successfully.');
      setMoneyInput('');
      resetDateTimeSelection();
      fetchStockAndHistory();
      calculateCashInHand();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add money.');
      console.error(err);
    }
  };

  const handleExportHistory = () => {
    if (history.length === 0) {
      toast.info('No stock history to export.');
      return;
    }

    const headers = ['Date', 'Time', 'Type', 'Gold Added (g)', 'Silver Added (g)', 'Cash Amount'];
    const rows = history.map((entry) => ([
      formatDate12Hour(entry.date),
      formatTime12Hour(entry.date),
      entry.type === 'cash_addition' ? 'Cash Addition' : 'Stock Purchase',
      entry.type === 'cash_addition' ? '-' : Number(entry.gold || 0).toFixed(3),
      entry.type === 'cash_addition' ? '-' : Number(entry.silver || 0).toFixed(2),
      (entry.type === 'cash_addition' ? '+' : '') + Number(entry.cashAmount || 0).toFixed(2)
    ]));

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `stock-history-${getTodayLocalDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Stock history exported.');
  };

  const handlePrintReport = () => {
    if (history.length === 0) {
      toast.info('No stock history to print.');
      return;
    }

    const rowsHtml = history.map((entry, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate12Hour(entry.date)}</td>
        <td>${formatTime12Hour(entry.date)}</td>
        <td>${entry.type === 'cash_addition' ? 'Cash Addition' : 'Stock Purchase'}</td>
        <td>${entry.type === 'cash_addition' ? '-' : Number(entry.gold || 0).toFixed(3)}</td>
        <td>${entry.type === 'cash_addition' ? '-' : Number(entry.silver || 0).toFixed(2)}</td>
        <td>${entry.type === 'cash_addition' ? '+' : ''}${Number(entry.cashAmount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print report.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
      <head>
        <title>Stock Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h2>Stock Input Report</h2>
        <div>Generated On: ${formatDate12Hour(new Date())} ${formatTime12Hour(new Date())}</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Time</th>
              <th>Type</th>
              <th>Gold Added (g)</th>
              <th>Silver Added (g)</th>
              <th>Cash Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchStockAndHistory(),
      calculateCashInHand()
    ]);
  };

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="card fade-in" style={{ maxWidth: 900, margin: '2rem auto', padding: 32, boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Stock Management</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleExportHistory} title="Export CSV">
                <FiDownload size={16} /> Export CSV
              </button>
              <button className="btn btn-secondary" onClick={handlePrintReport} title="Print Report">
                <FiPrinter size={16} /> Print Report
              </button>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    await stockAPI.undoStock();
                    toast.success('Last stock input undone');
                    fetchStockAndHistory();
                    calculateCashInHand();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Nothing to undo or failed to undo.');
                  }
                }}
                title="Undo last stock input"
              >
                <FiRotateCcw size={16} /> Undo
              </button>
            </div>
          </div>

          {/* â”€â”€ Current Stock â”€â”€ */}
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, border: '2px solid var(--color-primary)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12, marginTop: 0 }}>Current Stock</h3>
            {loading ? (
              <SkeletonStat count={2} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="fade-in">
                <div style={{ padding: 12, backgroundColor: 'var(--bg-primary)', borderRadius: 6, borderLeft: '4px solid #FFD700' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: 4 }}>Gold</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFD700' }}>{parseFloat(goldStock).toFixed(4)} g</div>
                </div>
                <div style={{ padding: 12, backgroundColor: 'var(--bg-primary)', borderRadius: 6, borderLeft: '4px solid #C0C0C0' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: 4 }}>Silver</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#C0C0C0' }}>{parseFloat(silverStock).toFixed(2)} g</div>
                </div>
              </div>
            )}
          </div>

          {/* â”€â”€ Cash in Hand â”€â”€ */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleCashBreakdownOpen}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleCashBreakdownOpen();
              }
            }}
            title="View cash breakdown"
            style={{
              marginBottom: 24,
              borderRadius: 10,
              overflow: 'hidden',
              border: `2px solid ${cashInHand < 0 ? '#ef4444' : '#22c55e'}`,
              cursor: 'pointer',
              boxShadow: cashDetailsOpen ? '0 0 0 3px rgba(34, 197, 94, 0.18)' : 'none'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 18px',
              background: cashInHand < 0 ? '#fee2e2' : '#dcfce7',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: `1px solid ${cashInHand < 0 ? '#fca5a5' : '#86efac'}`
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: cashInHand < 0 ? '#991b1b' : '#166534', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FiEye size={15} />
                Cash in Hand
              </span>
              <span style={{ fontSize: 22, fontWeight: 800, color: cashInHand < 0 ? '#dc2626' : '#16a34a' }}>
                {cashInHand < 0 ? '-' : ''}{'\u20B9'}{Math.abs(cashInHand).toFixed(2)}
              </span>
            </div>

            {/* Breakdown */}
            {cashBreakdown && (
              <div style={{ padding: '10px 18px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-muted)' }}>Cash received from customers</span>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>+{'\u20B9'}{(cashBreakdown.cashFromSales || 0).toFixed(2)}</span>
                </div>
                {(cashBreakdown.cashAdded || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-muted)' }}>Cash additions (injected)</span>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>+{'\u20B9'}{(cashBreakdown.cashAdded || 0).toFixed(2)}</span>
                  </div>
                )}
                {(cashBreakdown.customerLiabilities || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-muted)' }}>Customer liabilities (we owe)</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>-{'\u20B9'}{(cashBreakdown.customerLiabilities || 0).toFixed(2)}</span>
                  </div>
                )}
                {(cashBreakdown.paidForPurchases || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-muted)' }}>Paid for old gold purchases</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>-{'\u20B9'}{(cashBreakdown.paidForPurchases || 0).toFixed(2)}</span>
                  </div>
                )}
                {(cashBreakdown.stockPurchases || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-muted)' }}>Stock purchases</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>-{'\u20B9'}{(cashBreakdown.stockPurchases || 0).toFixed(2)}</span>
                  </div>
                )}
                {(cashBreakdown.cashExpenses || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-muted)' }}>Cash expenses</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>-{'\u20B9'}{(cashBreakdown.cashExpenses || 0).toFixed(2)}</span>
                  </div>
                )}
                {(cashBreakdown.karigarCharges || 0) !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-muted)' }}>Karigar amount balance</span>
                    <span style={{ fontWeight: 600, color: (cashBreakdown.karigarCharges || 0) < 0 ? '#dc2626' : '#16a34a' }}>
                      {(cashBreakdown.karigarCharges || 0) >= 0 ? '+' : ''}{formatCurrency(cashBreakdown.karigarCharges || 0)}
                    </span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span>Net Cash in Hand</span>
                  <span style={{ color: cashInHand < 0 ? '#dc2626' : '#16a34a' }}>
                    {cashInHand < 0 ? '-' : ''}{'\u20B9'}{Math.abs(cashInHand).toFixed(2)}
                  </span>
                </div>
                {customerLiabilities > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                    <span>Effective Cash After Liabilities</span>
                    <span style={{ color: effectiveCashAfterLiabilities < 0 ? '#dc2626' : '#16a34a' }}>
                      {effectiveCashAfterLiabilities < 0 ? '-' : ''}{'\u20B9'}{Math.abs(effectiveCashAfterLiabilities).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* —— Tabs for Add Stock vs Add Money —— */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
            <button
              onClick={() => { setActiveTab('stock'); setError(''); }}
              type="button"
              style={{
                padding: '8px 16px',
                fontWeight: 600,
                borderBottom: activeTab === 'stock' ? '3px solid var(--color-primary)' : 'none',
                background: 'none',
                border: 'none',
                color: activeTab === 'stock' ? 'var(--color-primary)' : 'var(--color-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Add Gold/Silver Stock
            </button>
            <button
              onClick={() => { setActiveTab('money'); setError(''); }}
              type="button"
              style={{
                padding: '8px 16px',
                fontWeight: 600,
                borderBottom: activeTab === 'money' ? '3px solid var(--color-primary)' : 'none',
                background: 'none',
                border: 'none',
                color: activeTab === 'money' ? 'var(--color-primary)' : 'var(--color-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              💰 Add Money (Cash)
            </button>
          </div>

          {activeTab === 'stock' ? (
            <form onSubmit={handleAddStock} style={{ marginBottom: 24, padding: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 8 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>Add Stock</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Stock Date</label>
                  <input
                    type="date"
                    className="input"
                    value={stockDate}
                    onChange={(e) => setStockDate(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Hour</label>
                  <select className="input" value={stockHour} onChange={(e) => setStockHour(e.target.value)} style={{ width: '100%' }}>
                    {HOUR_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Minute</label>
                  <select className="input" value={stockMinute} onChange={(e) => setStockMinute(e.target.value)} style={{ width: '100%' }}>
                    {MINUTE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16, maxWidth: 180 }}>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>AM / PM</label>
                <select className="input" value={stockMeridiem} onChange={(e) => setStockMeridiem(e.target.value)} style={{ width: '100%' }}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Gold Stock to Add (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={goldInput}
                    onChange={(e) => setGoldInput(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="Enter gold grams"
                    required={silverInput === ''}
                    style={{ width: '100%', marginBottom: 10 }}
                  />
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Gold Amount (Rs)</label>
                  <input
                    type="number"
                    className="input"
                    value={goldAmount}
                    onChange={(e) => setGoldAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="Enter gold cost"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Silver Stock to Add (g)</label>
                  <input
                    type="number"
                    className="input"
                    value={silverInput}
                    onChange={(e) => setSilverInput(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="Enter silver grams"
                    required={goldInput === ''}
                    style={{ width: '100%', marginBottom: 10 }}
                  />
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Silver Amount (Rs)</label>
                  <input
                    type="number"
                    className="input"
                    value={silverAmount}
                    onChange={(e) => setSilverAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="Enter silver cost"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {totalAmount > 0 && (
                <div style={{ padding: 12, backgroundColor: 'var(--bg-primary)', borderRadius: 6, marginBottom: 16 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: 4 }}>Total Purchase Cost</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>Rs {totalAmount.toFixed(2)}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: 8 }}>Available Cash: Rs {cashInHand.toFixed(2)}</div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ padding: '10px 32px', fontWeight: 600, fontSize: '1rem', borderRadius: 8 }}>
                Add Stock
              </button>
              {error && <div style={{ color: 'var(--color-danger)', marginTop: 8 }}>{error}</div>}
            </form>
          ) : (
            <form onSubmit={handleAddMoney} style={{ marginBottom: 24, padding: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 8 }}>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>Add Money (Cash)</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Date</label>
                  <input
                    type="date"
                    className="input"
                    value={stockDate}
                    onChange={(e) => setStockDate(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Hour</label>
                  <select className="input" value={stockHour} onChange={(e) => setStockHour(e.target.value)} style={{ width: '100%' }}>
                    {HOUR_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Minute</label>
                  <select className="input" value={stockMinute} onChange={(e) => setStockMinute(e.target.value)} style={{ width: '100%' }}>
                    {MINUTE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>AM / PM</label>
                  <select className="input" value={stockMeridiem} onChange={(e) => setStockMeridiem(e.target.value)} style={{ width: '100%' }}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Amount to Add (Rs) *</label>
                  <input
                    type="number"
                    className="input"
                    value={moneyInput}
                    onChange={(e) => setMoneyInput(e.target.value)}
                    step="0.01"
                    min="0.01"
                    placeholder="Enter amount to inject"
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '10px 32px', fontWeight: 600, fontSize: '1rem', borderRadius: 8 }}>
                Add Money
              </button>
              {error && <div style={{ color: 'var(--color-danger)', marginTop: 8 }}>{error}</div>}
            </form>
          )}

          <div>
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Stock Input History</h3>
            {loading ? (
              <SkeletonTable rows={5} columns={5} />
            ) : (
              <div className="table-container fade-in">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Date</th>
                      <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Time</th>
                      <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Gold Added (g)</th>
                      <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Silver Added (g)</th>
                      <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Cash Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={5}>No stock input history.</td></tr>
                    ) : history.map((entry) => (
                      <tr key={entry._id || `${entry.date}-${entry.gold}-${entry.silver}`}>
                        <td>{formatDate12Hour(entry.date)}</td>
                        <td>{formatTime12Hour(entry.date)}</td>
                        <td>{entry.type === 'cash_addition' ? (
                          <span style={{ fontSize: '0.8rem', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Cash Added</span>
                        ) : Number(entry.gold || 0).toFixed(3)}</td>
                        <td>{entry.type === 'cash_addition' ? '-' : Number(entry.silver || 0).toFixed(2)}</td>
                        <td style={{ color: entry.type === 'cash_addition' ? '#16a34a' : 'inherit', fontWeight: entry.type === 'cash_addition' ? 700 : 'normal' }}>
                          {entry.type === 'cash_addition' ? '+' : ''}{Number(entry.cashAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      {cashDetailsOpen && (
        <div
          onClick={() => setCashDetailsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '86vh',
              overflow: 'hidden',
              padding: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Cash in Hand</h2>
                <div style={{ marginTop: 4, fontSize: 13, color: 'var(--color-muted)' }}>
                  Net {formatCurrency(cashInHand)}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCashDetailsOpen(false)}
                title="Close"
                style={{ padding: 8, minWidth: 40, display: 'inline-flex', justifyContent: 'center' }}
              >
                <FiX size={18} />
              </button>
            </div>

            <div style={{ padding: 22, overflow: 'auto' }}>
              {cashDetailsLoading ? (
                <div style={{ color: 'var(--color-muted)', padding: '20px 0' }}>Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {cashDetails.map((group) => (
                    <div key={group.key} style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 700 }}>
                        <span>{group.title}</span>
                        <span style={{ color: group.total < 0 ? '#dc2626' : '#16a34a' }}>
                          {group.total >= 0 ? '+' : ''}{formatCurrency(group.total)}
                        </span>
                      </div>

                      {group.rows.length === 0 ? (
                        <div style={{ padding: '12px', color: 'var(--color-muted)', fontSize: 13 }}>No entries</div>
                      ) : (
                        <div>
                          {group.rows.map((row) => (
                            <div
                              key={row.id || `${group.key}-${row.date}-${row.title}-${row.amount}`}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '120px minmax(0, 1fr) auto',
                                gap: 12,
                                padding: '10px 12px',
                                borderTop: '1px solid var(--border-color)',
                                alignItems: 'center',
                                fontSize: 13
                              }}
                            >
                              <span style={{ color: 'var(--color-muted)' }}>{formatDate12Hour(row.date)}</span>
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</span>
                                <span style={{ display: 'block', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.subtitle}</span>
                              </span>
                              <span style={{ fontWeight: 700, color: row.amount < 0 ? '#dc2626' : '#16a34a' }}>
                                {row.amount >= 0 ? '+' : ''}{formatCurrency(row.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StockManagement;

