import React, { useEffect, useState } from 'react';
import { stockAPI } from '../../services/api';
import Layout from '../../components/Layout';
import { FiRotateCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';

const StockManagement = () => {
  const [goldStock, setGoldStock] = useState(0);
  const [silverStock, setSilverStock] = useState(0);
  const [goldInput, setGoldInput] = useState('');
  const [silverInput, setSilverInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    // eslint-disable-next-line
  }, []);

  const handleAddStock = async (e) => {
    e.preventDefault();
    setError('');
    if (!goldInput && !silverInput) {
      setError('Enter gold or silver amount.');
      return;
    }
    try {
      await stockAPI.addStock({
        gold: goldInput || 0,
        silver: silverInput || 0
      });
      setGoldInput('');
      setSilverInput('');
      fetchStockAndHistory();
    } catch (err) {
      setError('Failed to add stock.');
    }
  };

  return (
    <Layout>
      <div className="card" style={{ maxWidth: 600, margin: '2rem auto', padding: 32, boxShadow: 'var(--shadow-md)' }}>
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
              } catch (err) {
                toast.error('Nothing to undo or failed to undo.');
              }
            }}
            title="Undo last stock input"
          >
            <FiRotateCcw size={18} /> Undo
          </button>
        </div>
        <form onSubmit={handleAddStock} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 500 }}>Gold Stock to Add (g):</label>
              <input
                type="number"
                className="input"
                value={goldInput}
                onChange={e => setGoldInput(e.target.value)}
                step="0.01"
                placeholder="Can be negative"
                required={silverInput === ''}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 500 }}>Silver Stock to Add (g):</label>
              <input
                type="number"
                className="input"
                value={silverInput}
                onChange={e => setSilverInput(e.target.value)}
                step="0.01"
                placeholder="Can be negative"
                required={goldInput === ''}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 32px', fontWeight: 600, fontSize: '1rem', borderRadius: 8 }}>Add Stock</button>
          {error && <div style={{ color: 'var(--color-danger)', marginTop: 8 }}>{error}</div>}
        </form>
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Current Stock</h3>
          {loading ? <div>Loading...</div> : (
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '1.1rem' }}>
              <li>Gold: <b>{goldStock}</b> g</li>
              <li>Silver: <b>{silverStock}</b> g</li>
            </ul>
          )}
        </div>
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Stock Input History</h3>
          {loading ? <div>Loading...</div> : (
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
