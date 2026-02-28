import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import PullToRefresh from '../../components/PullToRefresh';
import { SkeletonTable } from '../../components/Skeleton';
import { voucherAPI, settlementAPI, stockAPI, ledgerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function UserDashboard() {
  const [dueCredits, setDueCredits] = useState([]);
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingDueCredits, setLoadingDueCredits] = useState(true);

  const getValidTimestamp = useCallback((value) => {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }, []);

  // Get today's date stamp for faster comparison
  const getTodayDateStamp = useCallback(() => {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  }, []);

  const getDateStamp = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Single ledger fetch - both functions use this
        const ledgersRes = await ledgerAPI.getAll();
        const ledgers = ledgersRes.data.ledgers || [];

        // Process both sections in parallel
        await Promise.all([
          processDueCredits(),
          processTodayTransactions(ledgers)
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard');
      }
    };

    fetchAllData();
  }, []);

  const processDueCredits = async () => {
    try {
      const response = await voucherAPI.getDueCredits();
      setDueCredits(response?.data?.dueCredits || []);
    } catch (error) {
      console.error('Failed to process due credits:', error);
      setDueCredits([]);
    } finally {
      setLoadingDueCredits(false);
    }
  };

  const processTodayTransactions = async (ledgers) => {
    try {
      if (!Array.isArray(ledgers) || ledgers.length === 0) {
        setTodayTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      const todayStamp = getTodayDateStamp();
      const transactions = [];

      // Fetch vouchers and settlements in parallel
      const [vouchersRes, settlementsRes, stockRes] = await Promise.all([
        voucherAPI.getAll().catch(() => ({ data: { vouchers: [] } })),
        settlementAPI.getAll().catch(() => ({ data: { settlements: [] } })),
        stockAPI.getHistory().catch(() => ({ data: { history: [] } }))
      ]);

      const vouchers = vouchersRes.data.vouchers || [];
      const settlements = settlementsRes.data.settlements || [];
      const stock = stockRes.data.history || [];

      // Create ledger map for O(1) lookup
      const ledgerMap = new Map(ledgers.map(l => [l._id, l]));

      // Process vouchers
      vouchers.forEach(v => {
        const ledger = ledgerMap.get(typeof v.ledgerId === 'object' ? v.ledgerId?._id : v.ledgerId);
        if (!ledger || getDateStamp(v.date) !== todayStamp) return;

        const recordedTimestamp = getValidTimestamp(v.createdAt);
        transactions.push({
          type: 'voucher',
          date: v.date,
          description: `Voucher #${v.voucherNumber} - ${ledger.name}`,
          amount: parseFloat(v.total) || 0,
          paymentType: v.paymentType,
          timestamp: recordedTimestamp,
          sortTimestamp: recordedTimestamp ?? getValidTimestamp(v.date) ?? 0
        });
      });

      // Process settlements
      settlements.forEach(s => {
        const ledger = ledgerMap.get(typeof s.ledgerId === 'object' ? s.ledgerId?._id : s.ledgerId);
        if (!ledger || getDateStamp(s.date) !== todayStamp) return;

        const recordedTimestamp = getValidTimestamp(s.createdAt);
        transactions.push({
          type: 'settlement',
          date: s.date,
          description: `Settlement - ${ledger.name} (${s.metalType?.toUpperCase()} ${parseFloat(s.fineGiven).toFixed(3)}g)`,
          amount: parseFloat(s.amount),
          paymentType: 'settlement',
          timestamp: recordedTimestamp,
          sortTimestamp: recordedTimestamp ?? getValidTimestamp(s.date) ?? 0
        });
      });

      // Process stock changes
      stock.forEach(sh => {
        if (getDateStamp(sh.date) !== todayStamp) return;

        const recordedTimestamp = getValidTimestamp(sh.createdAt ?? sh.date);
        const sortTimestamp = recordedTimestamp ?? 0;

        if (parseFloat(sh.gold) !== 0) {
          transactions.push({
            type: 'stock',
            date: sh.date,
            description: `Stock Add - Gold ${parseFloat(sh.gold) >= 0 ? '+' : ''}${parseFloat(sh.gold).toFixed(3)}g`,
            amount: 0,
            paymentType: 'stock',
            timestamp: recordedTimestamp,
            sortTimestamp
          });
        }
        if (parseFloat(sh.silver) !== 0) {
          transactions.push({
            type: 'stock',
            date: sh.date,
            description: `Stock Add - Silver ${parseFloat(sh.silver) >= 0 ? '+' : ''}${parseFloat(sh.silver).toFixed(3)}g`,
            amount: 0,
            paymentType: 'stock',
            timestamp: recordedTimestamp,
            sortTimestamp
          });
        }
      });

      // Sort by timestamp descending
      transactions.sort((a, b) => (b.sortTimestamp || 0) - (a.sortTimestamp || 0));
      setTodayTransactions(transactions);
    } catch (error) {
      console.error('Error processing today transactions:', error);
      setTodayTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleRefresh = async () => {
    setLoadingDueCredits(true);
    setLoadingTransactions(true);
    
    try {
      const ledgersRes = await ledgerAPI.getAll();
      const ledgers = ledgersRes.data.ledgers || [];

      await Promise.all([
        processDueCredits(),
        processTodayTransactions(ledgers)
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh dashboard');
      setLoadingDueCredits(false);
      setLoadingTransactions(false);
    }
  };

  const showTimeColumn = todayTransactions.length > 0 && todayTransactions.every((transaction) => transaction.timestamp !== null);

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className={loadingTransactions || loadingDueCredits ? '' : 'fade-in'}>
          {/* Due Customers Section */}
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Due Customers </h1>

            {loadingDueCredits ? (
              <SkeletonTable rows={4} columns={5} />
            ) : dueCredits.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <p className="text-muted">No due customers right now</p>
              </div>
            ) : (
              <div className="card fade-in">
                <div className="table-container">
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Gold (g)</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Silver (g)</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dueCredits.map((due) => (
                        <tr key={due.ledgerId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px' }}>{due.name || 'N/A'}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                            ₹{(parseFloat(due.balanceAmount) || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#b7791f', fontWeight: '600' }}>
                            {(parseFloat(due.goldFineWeight) || 0).toFixed(3)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#4a5568', fontWeight: '600' }}>
                            {(parseFloat(due.silverFineWeight) || 0).toFixed(3)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {due.dueDate ? format(new Date(due.dueDate), 'dd MMM yyyy') : '-'}
                            {` (${parseInt(due.daysOverdue || 0, 10)}d)`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Today's Transaction Summary */}
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Today's Transactions</h1>

            {loadingTransactions ? (
              <SkeletonTable rows={5} columns={showTimeColumn ? 4 : 3} />
            ) : todayTransactions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p className="text-muted">No transactions today</p>
              </div>
            ) : (
              <div className="card fade-in">
                <div className="table-container">
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        {showTimeColumn && <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>}
                        <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayTransactions.map((transaction, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          {showTimeColumn && (
                            <td style={{ padding: '12px' }}>
                              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                {format(new Date(transaction.timestamp), 'hh:mm:ss a')}
                              </span>
                            </td>
                          )}
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              backgroundColor: transaction.type === 'voucher' ? '#e3f2fd' : transaction.type === 'settlement' ? '#f3e5f5' : '#e8f5e9',
                              color: transaction.type === 'voucher' ? '#1976d2' : transaction.type === 'settlement' ? '#7b1fa2' : '#388e3c'
                            }}>
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>{transaction.description}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                            {transaction.amount > 0 ? (
                              <span style={{ color: '#28a745' }}>+₹{transaction.amount.toFixed(2)}</span>
                            ) : transaction.amount < 0 ? (
                              <span style={{ color: '#dc3545' }}>-₹{Math.abs(transaction.amount).toFixed(2)}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px', borderTop: '2px solid var(--border-color)', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>Total Transactions:</span>
                  <span>{todayTransactions.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
}
