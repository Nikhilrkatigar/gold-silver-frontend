import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import PullToRefresh from '../../components/PullToRefresh';
import { SkeletonStat, SkeletonTable } from '../../components/Skeleton';
import { voucherAPI, settlementAPI, stockAPI, ledgerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

export default function UserDashboard() {
  const [dueCredits, setDueCredits] = useState([]);
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const getValidTimestamp = (value) => {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  };

  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        fetchDueCredits(),
        fetchLedgersAndTransactions()
      ]);
      setLoading(false);
    };
    fetchAllData();
  }, []);

  const fetchLedgersAndTransactions = async () => {
    try {
      // Fetch all ledgers
      const ledgersRes = await ledgerAPI.getAll();

      if (!Array.isArray(ledgersRes.data.ledgers) || ledgersRes.data.ledgers.length === 0) {
        setTodayTransactions([]);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const transactions = [];

      // Fetch transactions for each ledger
      for (const ledger of ledgersRes.data.ledgers) {
        try {
          const transRes = await ledgerAPI.getTransactions(ledger._id, {});

          // Process today's transactions for this ledger
          if (Array.isArray(transRes.data.transactions)) {
            transRes.data.transactions
              .filter(t => {
                const tDate = new Date(t.date);
                tDate.setHours(0, 0, 0, 0);
                return tDate.getTime() === today.getTime();
              })
              .forEach(t => {
                const recordedTimestamp = getValidTimestamp(t.createdAt);
                const sortTimestamp = recordedTimestamp ?? getValidTimestamp(t.date) ?? 0;

                if (t.type === 'voucher') {
                  transactions.push({
                    type: 'voucher',
                    date: t.date,
                    description: `Voucher #${t.voucherNumber} - ${ledger.name}`,
                    amount: parseFloat(t.total) || 0,
                    paymentType: t.paymentType,
                    timestamp: recordedTimestamp,
                    sortTimestamp
                  });
                } else if (t.type === 'settlement') {
                  transactions.push({
                    type: 'settlement',
                    date: t.date,
                    description: `Settlement - ${ledger.name} (${t.metalType.toUpperCase()} ${parseFloat(t.fineGiven).toFixed(3)}g)`,
                    amount: parseFloat(t.amount),
                    paymentType: 'settlement',
                    timestamp: recordedTimestamp,
                    sortTimestamp
                  });
                }
              });
          }
        } catch (error) {
          console.error(`Error fetching transactions for ledger:`, error);
        }
      }

      // Add stock changes
      try {
        const stockRes = await stockAPI.getHistory().catch(() => ({ data: { history: [] } }));
        if (stockRes.data.history) {
          stockRes.data.history
            .filter(sh => {
              const shDate = new Date(sh.date);
              shDate.setHours(0, 0, 0, 0);
              return shDate.getTime() === today.getTime();
            })
            .forEach(sh => {
              const recordedTimestamp = getValidTimestamp(sh.date) ?? getValidTimestamp(sh.createdAt);
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
        }
      } catch (error) {
        console.error('Error fetching stock history:', error);
      }

      // Sort by timestamp descending (newest first)
      transactions.sort((a, b) => (b.sortTimestamp || 0) - (a.sortTimestamp || 0));
      setTodayTransactions(transactions);
    } catch (error) {
      console.error('Error in fetchLedgersAndTransactions:', error);
    }
  };

  const fetchDueCredits = async () => {
    try {
      // Fetch all ledgers and filter those with outstanding credit balance
      const ledgersRes = await ledgerAPI.getAll();
      
      if (Array.isArray(ledgersRes.data.ledgers)) {
        const dueLedgers = ledgersRes.data.ledgers
          .filter(ledger => {
            const creditBalance = parseFloat(ledger.balances?.creditBalance) || 0;
            return creditBalance > 0; // Only show ledgers with positive credit balance
          })
          .map(ledger => ({
            name: ledger.name,
            phoneNumber: ledger.phoneNumber,
            balanceAmount: parseFloat(ledger.balances?.creditBalance) || 0,
            goldFineWeight: parseFloat(ledger.balances?.goldFineWeight) || 0,
            silverFineWeight: parseFloat(ledger.balances?.silverFineWeight) || 0
          }));
        
        setDueCredits(dueLedgers);
      } else {
        setDueCredits([]);
      }
    } catch (error) {
      console.error('Failed to load due credits:', error);
      setDueCredits([]);
    }
  };



  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      fetchDueCredits(),
      fetchLedgersAndTransactions()
    ]);
    setLoading(false);
  };

  const showTimeColumn = todayTransactions.length > 0 && todayTransactions.every((transaction) => transaction.timestamp !== null);

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className={loading ? '' : 'fade-in'}>
          {/* Today's Transaction Summary */}
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Today's Transactions</h1>

            {loading ? (
              <SkeletonTable rows={5} columns={showTimeColumn ? 4 : 3} />
            ) : todayTransactions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p className="text-muted">No transactions today</p>
              </div>
            ) : (
              <div className="card">
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
