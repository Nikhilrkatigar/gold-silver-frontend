import React, { useEffect, useMemo, useState } from 'react';
import { stockAPI, ledgerAPI, voucherAPI, settlementAPI, expenseAPI, karigarAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { FiDownload, FiPrinter, FiRotateCcw } from 'react-icons/fi';
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
  const [stockDate, setStockDate] = useState(getTodayLocalDate());
  const [stockHour, setStockHour] = useState(getCurrentTimeParts().hour);
  const [stockMinute, setStockMinute] = useState(getCurrentTimeParts().minute);
  const [stockMeridiem, setStockMeridiem] = useState(getCurrentTimeParts().meridiem);

  const totalAmount = useMemo(
    () => (parseFloat(goldAmount) || 0) + (parseFloat(silverAmount) || 0),
    [goldAmount, silverAmount]
  );

  const resetDateTimeSelection = () => {
    const nowTime = getCurrentTimeParts();
    setStockDate(getTodayLocalDate());
    setStockHour(nowTime.hour);
    setStockMinute(nowTime.minute);
    setStockMeridiem(nowTime.meridiem);
  };

  const calculateCashInHand = async () => {
    try {
      const [regularLedgersRes, gstLedgersRes, vouchersRes, expensesRes, karigarRes] = await Promise.all([
        ledgerAPI.getAll({ type: 'regular' }),
        ledgerAPI.getAll({ type: 'gst' }),
        voucherAPI.getAll(),
        expenseAPI.getAll(),
        karigarAPI.getAll()
      ]);

      const regularLedgers = regularLedgersRes.data.ledgers || [];
      const gstLedgers = gstLedgersRes.data.ledgers || [];
      const allVouchers = vouchersRes.data.vouchers || [];
      const allExpenses = expensesRes.data.expenses || [];
      const allKarigar = karigarRes.data.transactions || karigarRes.data.karigars || [];

      const regularLedgerIds = regularLedgers.map((ledger) => ledger._id);
      const totalAmountRegular = allVouchers
        .filter((voucher) => {
          const voucherLedgerId = typeof voucher.ledgerId === 'object' ? voucher.ledgerId?._id : voucher.ledgerId;
          return regularLedgerIds.includes(voucherLedgerId) && voucher.invoiceType !== 'gst';
        })
        .reduce((sum, voucher) => {
          const itemsTotal = (voucher.items || []).reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);
          const stoneAmountValue = parseFloat(voucher.stoneAmount) || 0;
          const fineAmountValue = parseFloat(voucher.fineAmount) || 0;
          return sum + itemsTotal + stoneAmountValue + fineAmountValue;
        }, 0);

      const gstLedgerIds = gstLedgers.map((ledger) => ledger._id);
      const totalAmountGST = allVouchers
        .filter((voucher) => {
          const voucherLedgerId = typeof voucher.ledgerId === 'object' ? voucher.ledgerId?._id : voucher.ledgerId;
          return gstLedgerIds.includes(voucherLedgerId) && voucher.invoiceType === 'gst';
        })
        .reduce((sum, voucher) => {
          const itemsTotal = (voucher.items || []).reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);
          const stoneAmountValue = parseFloat(voucher.stoneAmount) || 0;
          const fineAmountValue = parseFloat(voucher.fineAmount) || 0;
          return sum + itemsTotal + stoneAmountValue + fineAmountValue;
        }, 0);

      const balanceAmount = regularLedgers.reduce((sum, ledger) => {
        const creditBalance = parseFloat(ledger.balances?.creditBalance || 0);
        const cashBalance = parseFloat(ledger.balances?.cashBalance || 0);
        return sum + creditBalance + cashBalance;
      }, 0);

      const totalExpenses = allExpenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
      const totalCharges = allKarigar.reduce((sum, karigar) => sum + (parseFloat(karigar.chargeAmount) || 0), 0);

      const cash = totalAmountRegular + totalAmountGST - balanceAmount - totalExpenses - totalCharges;
      setCashInHand(cash);
    } catch (err) {
      console.error('Error calculating cash in hand:', err);
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

  const handleExportHistory = () => {
    if (history.length === 0) {
      toast.info('No stock history to export.');
      return;
    }

    const headers = ['Date', 'Time', 'Gold Added (g)', 'Silver Added (g)', 'Cash Amount'];
    const rows = history.map((entry) => ([
      formatDate12Hour(entry.date),
      formatTime12Hour(entry.date),
      Number(entry.gold || 0).toFixed(3),
      Number(entry.silver || 0).toFixed(3),
      Number(entry.cashAmount || 0).toFixed(2)
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
        <td>${Number(entry.gold || 0).toFixed(3)}</td>
        <td>${Number(entry.silver || 0).toFixed(3)}</td>
        <td>${Number(entry.cashAmount || 0).toFixed(2)}</td>
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

          <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#e8f5e9', borderRadius: 8, border: '2px solid #4caf50' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 12, marginTop: 0, color: '#2e7d32' }}>Cash in Hand</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>Rs {cashInHand.toFixed(2)}</div>
          </div>

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
                        <td>{Number(entry.gold || 0).toFixed(3)}</td>
                        <td>{Number(entry.silver || 0).toFixed(3)}</td>
                        <td>{Number(entry.cashAmount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default StockManagement;
