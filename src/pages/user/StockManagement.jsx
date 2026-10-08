import React, { useEffect, useMemo, useState } from 'react';
import { expenseAPI, karigarAPI, stockAPI, voucherAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { FiDownload, FiEye, FiPrinter, FiRotateCcw, FiX } from 'react-icons/fi';
import { AnimatePresence, motion } from 'motion/react';
import { overlayMotion, panelMotion } from '../../components/ConfirmDialog';
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
  return transaction?.type === 'received' ? -amount : 0;
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

  // Same date/time block in both forms
  const dateTimeFields = (
    <div className="stock-datetime">
      <div className="stock-date">
        <label className="input-label" htmlFor="stock-date">Date</label>
        <input id="stock-date" type="date" className="input" value={stockDate} onChange={(e) => setStockDate(e.target.value)} required />
      </div>
      <div>
        <label className="input-label" htmlFor="stock-hour">Hour</label>
        <select id="stock-hour" className="input" value={stockHour} onChange={(e) => setStockHour(e.target.value)}>
          {HOUR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      <div>
        <label className="input-label" htmlFor="stock-minute">Minute</label>
        <select id="stock-minute" className="input" value={stockMinute} onChange={(e) => setStockMinute(e.target.value)}>
          {MINUTE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      <div>
        <label className="input-label" htmlFor="stock-meridiem">AM / PM</label>
        <select id="stock-meridiem" className="input" value={stockMeridiem} onChange={(e) => setStockMeridiem(e.target.value)}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );

  const cashTone = cashInHand < 0 ? 'negative' : 'positive';
  const money = (value) => `${value < 0 ? '−' : ''}₹${Math.abs(value).toFixed(2)}`;
  const breakdownRows = cashBreakdown ? [
    ['Cash received from customers', cashBreakdown.cashFromSales || 0, true],
    ['Cash additions', cashBreakdown.cashAdded || 0],
    ['Customer liabilities (we owe)', -(cashBreakdown.customerLiabilities || 0)],
    ['Paid for old gold purchases', -(cashBreakdown.paidForPurchases || 0)],
    ['Stock purchases', -(cashBreakdown.stockPurchases || 0)],
    ['Cash expenses', -(cashBreakdown.cashExpenses || 0)],
    ['Karigar amount balance', cashBreakdown.karigarCharges || 0]
  ].filter(([, value, always]) => always || value !== 0) : [];

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="card fade-in stock-page">
          <div className="stock-header">
            <h1>Stock Management</h1>
            <div className="stock-toolbar">
              <button className="btn btn-secondary" onClick={handleExportHistory}>
                <FiDownload size={16} aria-hidden="true" /> Export CSV
              </button>
              <button className="btn btn-secondary" onClick={handlePrintReport}>
                <FiPrinter size={16} aria-hidden="true" /> Print
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
                <FiRotateCcw size={16} aria-hidden="true" /> Undo
              </button>
            </div>
          </div>

          {/* ── Current Stock ── */}
          <section data-tour="stock-current" className="stock-section" aria-labelledby="stock-current-title">
            <h3 id="stock-current-title">Current Stock</h3>
            {loading ? (
              <SkeletonStat count={2} />
            ) : (
              <div className="stock-metals fade-in">
                <div className="stock-metal gold">
                  <div className="stock-metal-label">Gold</div>
                  <div className="stock-metal-value num">{parseFloat(goldStock).toFixed(4)} g</div>
                </div>
                <div className="stock-metal silver">
                  <div className="stock-metal-label">Silver</div>
                  <div className="stock-metal-value num">{parseFloat(silverStock).toFixed(2)} g</div>
                </div>
              </div>
            )}
          </section>

          {/* ── Cash in Hand (tap for details) ── */}
          <button
            type="button"
            data-tour="stock-cash"
            className={`cash-card ${cashTone}`}
            onClick={handleCashBreakdownOpen}
            aria-haspopup="dialog"
          >
            <span className="cash-card-head">
              <span className="cash-card-title"><FiEye size={15} aria-hidden="true" /> Cash in Hand</span>
              <span className="cash-card-total num">{money(cashInHand)}</span>
            </span>
            {cashBreakdown && (
              <span className="cash-card-rows">
                {breakdownRows.map(([label, value]) => (
                  <span key={label} className="cash-row-line">
                    <span>{label}</span>
                    <span className={`num ${value < 0 ? 'neg' : 'pos'}`}>{value > 0 ? '+' : ''}{money(value)}</span>
                  </span>
                ))}
                <span className="cash-row-line total">
                  <span>Net Cash in Hand</span>
                  <span className={`num ${cashInHand < 0 ? 'neg' : 'pos'}`}>{money(cashInHand)}</span>
                </span>
                {customerLiabilities > 0 && (
                  <span className="cash-row-line total">
                    <span>Effective cash after liabilities</span>
                    <span className={`num ${effectiveCashAfterLiabilities < 0 ? 'neg' : 'pos'}`}>{money(effectiveCashAfterLiabilities)}</span>
                  </span>
                )}
                <span className="cash-card-hint">Tap to see every entry</span>
              </span>
            )}
          </button>

          {/* ── Add Stock / Add Money ── */}
          <div data-tour="stock-add" className="seg-tabs" role="tablist" aria-label="What to add">
            {[['stock', 'Gold / Silver'], ['money', 'Cash']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`seg-tab${activeTab === key ? ' active' : ''}`}
                onClick={() => { setActiveTab(key); setError(''); }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'stock' ? (
            <form onSubmit={handleAddStock} className="stock-section stock-form">
              <h3>Add Stock</h3>
              {dateTimeFields}

              <div className="stock-metal-inputs">
                <fieldset>
                  <legend>Gold</legend>
                  <label className="input-label" htmlFor="gold-grams">Grams to add</label>
                  <input id="gold-grams" type="number" inputMode="decimal" className="input" value={goldInput} onChange={(e) => setGoldInput(e.target.value)} step="0.01" min="0" placeholder="0.00" required={silverInput === ''} />
                  <label className="input-label" htmlFor="gold-cost">Cost (₹)</label>
                  <input id="gold-cost" type="number" inputMode="decimal" className="input" value={goldAmount} onChange={(e) => setGoldAmount(e.target.value)} step="0.01" min="0" placeholder="0.00" />
                </fieldset>
                <fieldset>
                  <legend>Silver</legend>
                  <label className="input-label" htmlFor="silver-grams">Grams to add</label>
                  <input id="silver-grams" type="number" inputMode="decimal" className="input" value={silverInput} onChange={(e) => setSilverInput(e.target.value)} step="0.01" min="0" placeholder="0.00" required={goldInput === ''} />
                  <label className="input-label" htmlFor="silver-cost">Cost (₹)</label>
                  <input id="silver-cost" type="number" inputMode="decimal" className="input" value={silverAmount} onChange={(e) => setSilverAmount(e.target.value)} step="0.01" min="0" placeholder="0.00" />
                </fieldset>
              </div>

              {totalAmount > 0 && (
                <div className="stock-total">
                  <div className="stock-metal-label">Total purchase cost</div>
                  <div className="stock-total-value num">₹{totalAmount.toFixed(2)}</div>
                  <div className="field-hint">Available cash: {money(cashInHand)}</div>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg stock-submit">Add Stock</button>
              {error && <div role="alert" className="stock-error">{error}</div>}
            </form>
          ) : (
            <form onSubmit={handleAddMoney} className="stock-section stock-form">
              <h3>Add Money (Cash)</h3>
              {dateTimeFields}

              <label className="input-label" htmlFor="money-amount">Amount to add (₹) *</label>
              <input id="money-amount" type="number" inputMode="decimal" className="input" value={moneyInput} onChange={(e) => setMoneyInput(e.target.value)} step="0.01" min="0.01" placeholder="0.00" required />

              <button type="submit" className="btn btn-primary btn-lg stock-submit">Add Money</button>
              {error && <div role="alert" className="stock-error">{error}</div>}
            </form>
          )}

          <section data-tour="stock-history" aria-labelledby="stock-history-title">
            <h3 id="stock-history-title">Stock Input History</h3>
            {loading ? (
              <SkeletonTable rows={5} columns={5} />
            ) : (
              <div className="table-container fade-in">
                <table className="table stock-history no-scroll">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th style={{ textAlign: 'right' }}>Gold (g)</th>
                      <th style={{ textAlign: 'right' }}>Silver (g)</th>
                      <th style={{ textAlign: 'right' }}>Cash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={5} className="sh-empty">No stock added yet. Use the form above to add gold, silver or cash.</td></tr>
                    ) : history.map((entry) => {
                      const isCash = entry.type === 'cash_addition';
                      return (
                        <tr key={entry._id || `${entry.date}-${entry.gold}-${entry.silver}`}>
                          <td className="sh-date">{formatDate12Hour(entry.date)}</td>
                          <td className="sh-time">{formatTime12Hour(entry.date)}</td>
                          {isCash ? (
                            <td className="sh-cash-tag" colSpan={2}><span className="badge badge-success">Cash added</span></td>
                          ) : (
                            <>
                              <td className="sh-gold num" data-label="Gold">{Number(entry.gold || 0).toFixed(3)}</td>
                              <td className="sh-silver num" data-label="Silver">{Number(entry.silver || 0).toFixed(2)}</td>
                            </>
                          )}
                          <td className={`sh-cash num${isCash ? ' pos' : ''}`}>{isCash ? '+' : ''}₹{Number(entry.cashAmount || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </PullToRefresh>

      <AnimatePresence>
        {cashDetailsOpen && (
          <motion.div className="modal-overlay" onClick={() => setCashDetailsOpen(false)} style={{ animation: 'none' }} {...overlayMotion}>
            <motion.div
              className="modal cash-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cash-sheet-title"
              onClick={(event) => event.stopPropagation()}
              style={{ animation: 'none' }}
              {...panelMotion}
            >
              <div className="modal-header">
                <div>
                  <h2 id="cash-sheet-title" className="modal-title">Cash in Hand</h2>
                  <div className="field-hint">Net {formatCurrency(cashInHand)}</div>
                </div>
                <button type="button" className="btn btn-icon" onClick={() => setCashDetailsOpen(false)} aria-label="Close">
                  <FiX size={20} />
                </button>
              </div>

              <div className="modal-body cash-sheet-body">
                {cashDetailsLoading ? (
                  <div className="field-hint">Loading…</div>
                ) : cashDetails.map((group) => (
                  <div key={group.key} className="cash-group">
                    <div className="cash-group-head">
                      <span>{group.title}</span>
                      <span className={`num ${group.total < 0 ? 'neg' : 'pos'}`}>{group.total >= 0 ? '+' : ''}{formatCurrency(group.total)}</span>
                    </div>
                    {group.rows.length === 0 ? (
                      <div className="cash-entry-empty">No entries</div>
                    ) : group.rows.map((row) => (
                      <div key={row.id || `${group.key}-${row.date}-${row.title}-${row.amount}`} className="cash-entry">
                        <span className="cash-entry-date">{formatDate12Hour(row.date)}</span>
                        <span className="cash-entry-text">
                          <span className="cash-entry-title">{row.title}</span>
                          <span className="cash-entry-sub">{row.subtitle}</span>
                        </span>
                        <span className={`cash-entry-amount num ${row.amount < 0 ? 'neg' : 'pos'}`}>{row.amount >= 0 ? '+' : ''}{formatCurrency(row.amount)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default StockManagement;

