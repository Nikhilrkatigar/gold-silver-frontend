import React, { useEffect, useState } from 'react';
import { stockAPI, ledgerAPI, voucherAPI, settlementAPI, expenseAPI } from '../../services/api';
import Layout from '../../components/Layout';
import { FiRotateCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';

const StockManagement = () => {
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
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  const calculateCashInHand = async () => {
    try {
      // Fetch all vouchers, ledgers, and expenses
      const [ledgersRes, vouchersRes, expensesRes] = await Promise.all([
        ledgerAPI.getAll(),
        voucherAPI.getAll(),
        expenseAPI.getAll()
      ]);

      const allLedgers = ledgersRes.data.ledgers || [];
      const allVouchers = vouchersRes.data.vouchers || [];
      const allExpenses = expensesRes.data.expenses || [];

      setLedgers(allLedgers);
      setVouchers(allVouchers);

      // Calculate total voucher amounts
      const totalVoucherAmount = allVouchers.reduce((sum, voucher) => {
        const amount = parseFloat(voucher.items?.reduce((itemSum, item) => itemSum + (parseFloat(item.amount) || 0), 0) || 0);
        const stoneAmount = parseFloat(voucher.stoneAmount || 0);
        const roundOff = parseFloat(voucher.roundOff || 0);
        const cashReceived = parseFloat(voucher.cashReceived || 0);
        const balance = amount + stoneAmount + roundOff - cashReceived;
        return sum + balance;
      }, 0);

      // Calculate total ledger balances (what customers owe)
      const totalLedgerBalance = allLedgers.reduce((sum, ledger) => {
        const creditBalance = parseFloat(ledger.balances?.creditBalance || 0);
        const cashBalance = parseFloat(ledger.balances?.cashBalance || 0);
        return sum + creditBalance + cashBalance;
      }, 0);

      // Calculate total cash expenses (only cash payment method)
      const totalCashExpenses = allExpenses.reduce((sum, expense) => {
        if (expense.paymentMethod === 'cash') {
          return sum + parseFloat(expense.amount || 0);
        }
        return sum;
      }, 0);

      // Cash in hand = Total voucher amounts - Total ledger balances - Cash expenses
      const cash = totalVoucherAmount - totalLedgerBalance - totalCashExpenses;
      setCashInHand(cash); // Allow negative values
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
    // eslint-disable-next-line
  }, []);

  const handleAddStock = async (e) => {
    e.preventDefault();
    setError('');

    if (!goldInput && !silverInput) {
      setError('Enter gold or silver amount.');
      return;
    }

    const totalAmount = (parseFloat(goldAmount) || 0) + (parseFloat(silverAmount) || 0);

    if (totalAmount > cashInHand) {
      setError(`Total amount (₹${totalAmount.toFixed(2)}) exceeds cash in hand (₹${cashInHand.toFixed(2)})`);
      return;
    }

    try {
      // Add stock to inventory
      await stockAPI.addStock({
        gold: goldInput || 0,
        silver: silverInput || 0,
        amount: totalAmount
      });

      // If amount is entered, create a settlement/ledger entry to deduct from cash
      if (totalAmount > 0) {
        // Create an internal ledger entry to track stock purchase
        try {
          await settlementAPI.create({
            ledgerId: 'system', // System entry for stock purchases
            date: new Date().toISOString(),
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
          toast.warning('Stock added but cash tracking entry failed. You may need to manually adjust.');
        }
      }

      toast.success('Stock added successfully!');
      setGoldInput('');
      setSilverInput('');
      setGoldAmount('');
      setSilverAmount('');
      fetchStockAndHistory();
      calculateCashInHand();
    } catch (err) {
      setError('Failed to add stock.');
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="card" style={{ maxWidth: 800, margin: '2rem auto', padding: 32, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Stock Management</h1>
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--bg-secondary)', color: 'var(--color-primary)', cursor: 'pointer' }}
            onClick={async () => {
              try {
                await stockAPI.undoStock();
                toast.success('Last stock input undone');
                fetchStockAndHistory();
                calculateCashInHand();
              } catch (err) {
                toast.error('Nothing to undo or failed to undo.');
              }
            }}
            title="Undo last stock input"
          >
            <FiRotateCcw size={18} /> Undo
          </button>
        </div>

        {/* Current Stock Display */}
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, border: '2px solid var(--color-primary)' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12, marginTop: 0 }}>📊 Current Stock</h3>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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

        {/* Cash in Hand Display */}
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#e8f5e9', borderRadius: 8, border: '2px solid #4caf50' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12, marginTop: 0, color: '#2e7d32' }}>💰 Cash in Hand</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>
            ₹ {cashInHand.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#558b2f', marginTop: 8 }}>
            <span>Total Vouchers: ₹ {vouchers.reduce((sum, v) => {
              const amount = parseFloat(v.items?.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || 0);
              const stoneAmount = parseFloat(v.stoneAmount || 0);
              const roundOff = parseFloat(v.roundOff || 0);
              const cashReceived = parseFloat(v.cashReceived || 0);
              return sum + (amount + stoneAmount + roundOff - cashReceived);
            }, 0).toFixed(2)}</span>
            <span style={{ margin: '0 10px' }}>-</span>
            <span>Ledger Balance: ₹ {ledgers.reduce((sum, l) => sum + (parseFloat(l.balances?.creditBalance || 0) + parseFloat(l.balances?.cashBalance || 0)), 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Add Stock Form */}
        <form onSubmit={handleAddStock} style={{ marginBottom: 24, padding: 16, backgroundColor: 'var(--bg-secondary)', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>📦 Add Stock</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Gold Section */}
            <div>
              <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Gold Stock to Add (g):</label>
              <input
                type="number"
                className="input"
                value={goldInput}
                onChange={e => setGoldInput(e.target.value)}
                step="0.01"
                min="0"
                placeholder="Enter gold grams"
                required={silverInput === ''}
                style={{ width: '100%', marginBottom: 10 }}
              />
              <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Gold Amount (₹):</label>
              <input
                type="number"
                className="input"
                value={goldAmount}
                onChange={e => setGoldAmount(e.target.value)}
                step="0.01"
                min="0"
                placeholder="Enter cost of gold"
                style={{ width: '100%' }}
              />
            </div>

            {/* Silver Section */}
            <div>
              <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Silver Stock to Add (g):</label>
              <input
                type="number"
                className="input"
                value={silverInput}
                onChange={e => setSilverInput(e.target.value)}
                step="0.01"
                min="0"
                placeholder="Enter silver grams"
                required={goldInput === ''}
                style={{ width: '100%', marginBottom: 10 }}
              />
              <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Silver Amount (₹):</label>
              <input
                type="number"
                className="input"
                value={silverAmount}
                onChange={e => setSilverAmount(e.target.value)}
                step="0.01"
                min="0"
                placeholder="Enter cost of silver"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {((parseFloat(goldAmount) || 0) + (parseFloat(silverAmount) || 0)) > 0 && (
            <div style={{ padding: 12, backgroundColor: 'var(--bg-primary)', borderRadius: 6, marginBottom: 16 }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: 4 }}>Total Purchase Cost</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                ₹ {((parseFloat(goldAmount) || 0) + (parseFloat(silverAmount) || 0)).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: 8 }}>
                Available Cash: ₹ {cashInHand.toFixed(2)}
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ padding: '10px 32px', fontWeight: 600, fontSize: '1rem', borderRadius: 8 }}>Add Stock</button>
          {error && <div style={{ color: 'var(--color-danger)', marginTop: 8 }}>{error}</div>}
        </form>

        {/* Stock Input History */}
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: 12 }}>📋 Stock Input History</h3>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="table-container">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Date</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Gold Added (g)</th>
                    <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Silver Added (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={3}>No stock input history.</td></tr>
                  ) : history.map((entry, idx) => (
                    <tr key={idx}>
                      <td>{new Date(entry.date).toLocaleString()}</td>
                      <td>{entry.gold}</td>
                      <td>{entry.silver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StockManagement;
