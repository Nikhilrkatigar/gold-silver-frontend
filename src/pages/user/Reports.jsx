import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { reportAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { SkeletonStat, SkeletonCard, SkeletonTable } from '../../components/Skeleton';

// Date helpers
const fmt = (d) => new Date(d).toLocaleDateString('en-IN');
const todayISO = () => new Date().toISOString().split('T')[0];
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
};
const startOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

const PRESETS = [
    { label: 'Today', from: todayISO(), to: todayISO() },
    { label: 'Last 7 Days', from: daysAgo(6), to: todayISO() },
    { label: 'This Month', from: startOfMonth(), to: todayISO() },
    { label: 'Last 30 Days', from: daysAgo(29), to: todayISO() },
];

// Mini bar chart using CSS widths only
const MiniBar = ({ value, max, color = '#f59e0b' }) => (
    <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
        <div style={{
            height: '100%',
            width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 0.5s ease'
        }} />
    </div>
);

const StatCard = ({ label, value, sub, color = 'var(--color-primary)' }) => (
    <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 10,
        padding: '16px 20px',
        borderLeft: `4px solid ${color}`
    }}>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
);

export default function Reports() {
    const { user } = useAuth();
    const [preset, setPreset] = useState(0); // index into PRESETS
    const [fromDate, setFromDate] = useState(PRESETS[2].from);
    const [toDate, setToDate] = useState(PRESETS[2].to);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [vRes, eRes, sRes, lRes] = await Promise.all([
                reportAPI.getVouchers({ limit: 2000, dateFrom: fromDate, dateTo: toDate }),
                reportAPI.getExpenses({ limit: 2000 }),
                reportAPI.getSettlements({ limit: 2000 }),
                reportAPI.getLedgers({ limit: 2000 }),
            ]);
            const vouchers = vRes.data?.vouchers || [];
            const expenses = eRes.data?.expenses || [];
            const settlements = sRes.data?.settlements || [];
            const ledgers = lRes.data?.ledgers || [];

            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);

            // Filter by date range
            const inRange = (dateStr) => {
                const d = new Date(dateStr);
                return d >= from && d <= to;
            };

            const rangeVouchers = vouchers.filter(v => inRange(v.date || v.createdAt));
            const rangeExpenses = expenses.filter(e => inRange(e.date || e.createdAt));

            // Separate sales vs purchases
            const saleVouchers = rangeVouchers.filter(v => v.voucherType !== 'purchase' && ['cash', 'credit'].includes(v.paymentType));
            const purchaseVouchers = rangeVouchers.filter(v => v.voucherType === 'purchase');

            // Totals
            const totalSales = saleVouchers.reduce((s, v) => s + (v.total || 0), 0);
            const totalPurchase = purchaseVouchers.reduce((s, v) => s + (v.total || 0), 0);
            const goldSold = saleVouchers.reduce((s, v) => s + (v.totals?.fineWeight ? v.items?.filter(i => i.metalType === 'gold').reduce((a, i) => a + (i.fineWeight || 0), 0) : 0), 0);
            const silverSold = saleVouchers.reduce((s, v) => s + (v.items?.filter(i => i.metalType === 'silver').reduce((a, i) => a + (i.fineWeight || 0), 0) || 0), 0);
            const goldBought = purchaseVouchers.reduce((s, v) => s + (v.items?.filter(i => i.metalType === 'gold').reduce((a, i) => a + (i.fineWeight || 0), 0) || 0), 0);
            const totalCashReceived = saleVouchers.reduce((s, v) => s + (v.cashReceived || 0), 0);
            const totalExpenses = rangeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
            const creditVouchers = saleVouchers.filter(v => v.paymentType === 'credit');
            const totalCreditValue = creditVouchers.reduce((s, v) => s + (v.total || 0), 0);

            // Top customers by voucher count
            const custMap = {};
            rangeVouchers.forEach(v => {
                const id = v.ledgerId?._id || v.ledgerId;
                if (!id) return;
                if (!custMap[id]) custMap[id] = { name: v.customerName || 'Unknown', count: 0, amount: 0 };
                custMap[id].count++;
                custMap[id].amount += v.total || 0;
            });
            const topCustomers = Object.values(custMap).sort((a, b) => b.amount - a.amount).slice(0, 5);

            // Daily breakdown
            const dailyMap = {};
            rangeVouchers.forEach(v => {
                const day = new Date(v.date || v.createdAt).toISOString().split('T')[0];
                if (!dailyMap[day]) dailyMap[day] = { date: day, count: 0, amount: 0, gold: 0, silver: 0 };
                dailyMap[day].count++;
                if (['cash', 'credit'].includes(v.paymentType) && v.voucherType !== 'purchase') {
                    dailyMap[day].amount += v.total || 0;
                    v.items?.forEach(i => {
                        if (i.metalType === 'gold') dailyMap[day].gold += i.fineWeight || 0;
                        if (i.metalType === 'silver') dailyMap[day].silver += i.fineWeight || 0;
                    });
                }
            });
            const daily = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

            // Expense breakdown by category
            const expCatMap = {};
            rangeExpenses.forEach(e => {
                const cat = e.category || 'Other';
                if (!expCatMap[cat]) expCatMap[cat] = 0;
                expCatMap[cat] += e.amount || 0;
            });

            // Due balance customers (from all ledgers)
            const dueCustomers = ledgers
                .filter(l => (l.balances?.cashBalance || 0) > 0)
                .sort((a, b) => (b.balances?.cashBalance || 0) - (a.balances?.cashBalance || 0))
                .slice(0, 5);

            // ────── AI DEMAND FORECASTING ──────────────────────────────
            // Day-of-week analysis
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayOfWeekMap = {};
            dayNames.forEach((d, i) => { dayOfWeekMap[i] = { day: d, count: 0, amount: 0, gold: 0, silver: 0 }; });
            saleVouchers.forEach(v => {
                const dow = new Date(v.date || v.createdAt).getDay();
                dayOfWeekMap[dow].count++;
                dayOfWeekMap[dow].amount += v.total || 0;
                v.items?.forEach(i => {
                    if (i.metalType === 'gold') dayOfWeekMap[dow].gold += i.fineWeight || 0;
                    if (i.metalType === 'silver') dayOfWeekMap[dow].silver += i.fineWeight || 0;
                });
            });
            const dayOfWeek = Object.values(dayOfWeekMap).filter(d => d.count > 0).sort((a, b) => b.amount - a.amount);

            // Top sold items analysis
            const itemPopularity = {};
            saleVouchers.forEach(v => {
                v.items?.forEach(i => {
                    const name = (i.itemName || 'Unknown').toLowerCase().trim();
                    if (!itemPopularity[name]) itemPopularity[name] = { name: i.itemName || 'Unknown', count: 0, totalWeight: 0, totalAmount: 0, metal: i.metalType };
                    itemPopularity[name].count++;
                    itemPopularity[name].totalWeight += i.fineWeight || 0;
                    itemPopularity[name].totalAmount += i.amount || 0;
                });
            });
            const topItems = Object.values(itemPopularity).sort((a, b) => b.count - a.count).slice(0, 8);

            // Metal demand ratio
            const totalGoldAmt = saleVouchers.reduce((s, v) => s + (v.items?.filter(i => i.metalType === 'gold').reduce((a, i) => a + (i.amount || 0), 0) || 0), 0);
            const totalSilverAmt = saleVouchers.reduce((s, v) => s + (v.items?.filter(i => i.metalType === 'silver').reduce((a, i) => a + (i.amount || 0), 0) || 0), 0);
            const goldRatio = totalSales > 0 ? ((totalGoldAmt / totalSales) * 100) : 0;
            const silverRatio = totalSales > 0 ? ((totalSilverAmt / totalSales) * 100) : 0;

            // Projection: daily avg revenue & growth
            const totalDays = daily.length || 1;
            const avgDailyRevenue = totalSales / totalDays;
            const avgDailyGold = goldSold / totalDays;
            const avgDailySilver = silverSold / totalDays;

            // Revenue trend (first half vs second half of period)
            const sortedDaily = [...daily].sort((a, b) => a.date.localeCompare(b.date));
            const half = Math.ceil(sortedDaily.length / 2);
            const firstHalf = sortedDaily.slice(0, half);
            const secondHalf = sortedDaily.slice(half);
            const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((s, d) => s + d.amount, 0) / firstHalf.length : 0;
            const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((s, d) => s + d.amount, 0) / secondHalf.length : 0;
            const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
            const projectedNextPeriod = avgDailyRevenue * totalDays * (1 + growthRate / 100);

            const forecast = {
                dayOfWeek, topItems, goldRatio, silverRatio,
                avgDailyRevenue, avgDailyGold, avgDailySilver,
                growthRate, projectedNextPeriod, totalDays
            };

            // ── PROFIT & LOSS ──
            const netProfit = totalSales - totalExpenses - totalPurchase;
            const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

            // ── HOURLY HEATMAP ──
            const hourlyMap = {};
            for (let h = 0; h < 24; h++) hourlyMap[h] = { hour: h, count: 0, amount: 0 };
            saleVouchers.forEach(v => {
                const h = new Date(v.date || v.createdAt).getHours();
                hourlyMap[h].count++;
                hourlyMap[h].amount += v.total || 0;
            });
            const hourly = Object.values(hourlyMap);

            // ── PAYMENT MODE BREAKDOWN ──
            const cashSales = saleVouchers.filter(v => v.paymentType === 'cash');
            const creditSales = saleVouchers.filter(v => v.paymentType === 'credit');
            const paymentBreakdown = {
                cashCount: cashSales.length,
                cashAmount: cashSales.reduce((s, v) => s + (v.total || 0), 0),
                creditCount: creditSales.length,
                creditAmount: creditSales.reduce((s, v) => s + (v.total || 0), 0)
            };

            // ── MONTH-OVER-MONTH ──
            const periodMs = to.getTime() - from.getTime();
            const prevFrom = new Date(from.getTime() - periodMs - 86400000);
            const prevTo = new Date(from.getTime() - 86400000);
            const prevVouchers = vouchers.filter(v => {
                const d = new Date(v.date || v.createdAt);
                return d >= prevFrom && d <= prevTo && v.voucherType !== 'purchase' && ['cash', 'credit'].includes(v.paymentType);
            });
            const prevSales = prevVouchers.reduce((s, v) => s + (v.total || 0), 0);
            const momChange = prevSales > 0 ? ((totalSales - prevSales) / prevSales) * 100 : (totalSales > 0 ? 100 : 0);

            // ── CUSTOMER LOYALTY ──
            const loyaltyMap = {};
            saleVouchers.forEach(v => {
                const id = v.ledgerId?._id || v.ledgerId;
                if (!id) return;
                if (!loyaltyMap[id]) loyaltyMap[id] = { name: v.customerName || 'Unknown', visits: 0, totalSpent: 0, lastVisit: null };
                loyaltyMap[id].visits++;
                loyaltyMap[id].totalSpent += v.total || 0;
                const vDate = new Date(v.date || v.createdAt);
                if (!loyaltyMap[id].lastVisit || vDate > loyaltyMap[id].lastVisit) loyaltyMap[id].lastVisit = vDate;
            });
            const loyalty = Object.values(loyaltyMap)
                .filter(c => c.visits >= 2)
                .sort((a, b) => b.visits - a.visits)
                .slice(0, 8)
                .map(c => ({
                    ...c,
                    daysSinceVisit: Math.floor((new Date() - c.lastVisit) / 86400000),
                    atRisk: Math.floor((new Date() - c.lastVisit) / 86400000) > 30
                }));

            // ── AI HEALTH SCORE (0-100) ──
            const revenueScore = Math.min(25, (totalSales > 0 ? 15 : 0) + (growthRate > 0 ? 10 : growthRate > -10 ? 5 : 0));
            const creditRiskScore = totalSales > 0 ? Math.min(25, 25 - Math.min(25, (totalCreditValue / totalSales) * 50)) : 12;
            const expenseScore = totalSales > 0 ? Math.min(25, 25 - Math.min(25, (totalExpenses / totalSales) * 50)) : 12;
            const diversScore = Math.min(25, (data?.topCustomers?.length || Object.keys(custMap).length) >= 5 ? 25 : (Object.keys(custMap).length / 5) * 25);
            const healthScore = Math.round(revenueScore + creditRiskScore + expenseScore + diversScore);

            setData({
                totalSales, totalPurchase, goldSold, silverSold, goldBought,
                totalCashReceived, totalExpenses, creditVouchers, totalCreditValue,
                topCustomers, daily, expCatMap, dueCustomers,
                voucherCount: rangeVouchers.length, saleCount: saleVouchers.length,
                forecast,
                netProfit, profitMargin,
                hourly, paymentBreakdown,
                prevSales, momChange,
                loyalty, healthScore
            });

        } catch (err) {
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const applyPreset = (idx) => {
        setPreset(idx);
        setFromDate(PRESETS[idx].from);
        setToDate(PRESETS[idx].to);
    };

    const fmtAmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const fmtWt = (n) => `${(n || 0).toFixed(3)} g`;

    const maxDaily = data ? Math.max(...(data.daily.map(d => d.amount)), 1) : 1;
    const maxCust = data ? Math.max(...(data.topCustomers.map(c => c.amount)), 1) : 1;

    return (
        <Layout>
            <div style={{ padding: '20px', maxWidth: 1100, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📊 Reports & Analytics</h1>
                        <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: 13 }}>
                            {user?.shopName}
                        </p>
                    </div>

                    {/* Date Range Controls */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {PRESETS.map((p, i) => (
                            <button
                                key={i}
                                onClick={() => applyPreset(i)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid var(--border-color)',
                                    background: preset === i ? 'var(--color-primary)' : 'transparent',
                                    color: preset === i ? '#fff' : 'var(--color-text)',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 500
                                }}
                            >{p.label}</button>
                        ))}
                        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPreset(-1); }}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--color-text)', fontSize: 12 }} />
                        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPreset(-1); }}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--color-text)', fontSize: 12 }} />
                        <button onClick={fetchAll} disabled={loading}
                            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                            {loading ? '...' : 'Apply'}
                        </button>
                        {!loading && data && (
                            <button onClick={() => window.print()}
                                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--color-text)', fontWeight: 500, cursor: 'pointer', fontSize: 12 }}>
                                🖨️ Print
                            </button>
                        )}
                    </div>
                </div>

                {loading && (
                    <div>
                        <SkeletonStat count={6} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                            <SkeletonCard count={1} />
                            <SkeletonCard count={1} />
                        </div>
                        <SkeletonTable rows={5} columns={6} />
                        <div style={{ marginTop: 28 }}><SkeletonCard count={1} /></div>
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
                            <StatCard label="Total Sales" value={fmtAmt(data.totalSales)} sub={`${data.saleCount} vouchers`} color="#f59e0b" />
                            <StatCard label="Gold Sold" value={fmtWt(data.goldSold)} sub="Fine weight" color="#B8860B" />
                            <StatCard label="Silver Sold" value={fmtWt(data.silverSold)} sub="Fine weight" color="#555" />
                            <StatCard label="Cash Collected" value={fmtAmt(data.totalCashReceived)} color="#10b981" />
                            <StatCard label="Total Expenses" value={fmtAmt(data.totalExpenses)} color="#ef4444" />
                            <StatCard label="Credit Sales" value={fmtAmt(data.totalCreditValue)} sub={`${data.creditVouchers.length} bills`} color="#8b5cf6" />
                            {data.totalPurchase > 0 && (
                                <StatCard label="Purchases (Old Gold)" value={fmtAmt(data.totalPurchase)} sub={`Gold: ${fmtWt(data.goldBought)}`} color="#06b6d4" />
                            )}
                        </div>

                        {/* Profit & Loss + MoM + Payment Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 28 }}>
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${data.netProfit >= 0 ? '#10b981' : '#ef4444'}` }}>
                                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>💰 Net Profit</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: data.netProfit >= 0 ? '#10b981' : '#ef4444' }}>{fmtAmt(data.netProfit)}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>Margin: {data.profitMargin.toFixed(1)}%</div>
                            </div>
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
                                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>📈 vs Previous Period</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: data.momChange >= 0 ? '#10b981' : '#ef4444' }}>
                                    {data.momChange >= 0 ? '▲' : '▼'} {Math.abs(data.momChange).toFixed(1)}%
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>Prev: {fmtAmt(data.prevSales)}</div>
                            </div>
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
                                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 8 }}>💳 Payment Split</div>
                                <div style={{ display: 'flex', height: 22, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                                    {data.paymentBreakdown.cashAmount > 0 && <div style={{ width: `${(data.paymentBreakdown.cashAmount / (data.paymentBreakdown.cashAmount + data.paymentBreakdown.creditAmount || 1)) * 100}%`, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>Cash</div>}
                                    {data.paymentBreakdown.creditAmount > 0 && <div style={{ width: `${(data.paymentBreakdown.creditAmount / (data.paymentBreakdown.cashAmount + data.paymentBreakdown.creditAmount || 1)) * 100}%`, background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>Credit</div>}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                                    Cash: {fmtAmt(data.paymentBreakdown.cashAmount)} ({data.paymentBreakdown.cashCount}) · Credit: {fmtAmt(data.paymentBreakdown.creditAmount)} ({data.paymentBreakdown.creditCount})
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                            {/* Top Customers */}
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🏆 Top Customers (by Amount)</h3>
                                {data.topCustomers.length === 0 && <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>No transactions in range</div>}
                                {data.topCustomers.map((c, i) => (
                                    <div key={i} style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 500 }}>{i + 1}. {c.name}</span>
                                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fmtAmt(c.amount)}</span>
                                        </div>
                                        <MiniBar value={c.amount} max={maxCust} color="#f59e0b" />
                                        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>{c.count} vouchers</div>
                                    </div>
                                ))}
                            </div>

                            {/* Due Customers */}
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>⏰ Highest Outstanding Balances</h3>
                                {data.dueCustomers.length === 0 && <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>No outstanding balances</div>}
                                {data.dueCustomers.map((l, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
                                        <span>{i + 1}. {l.name}</span>
                                        <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmtAmt(l.balances?.cashBalance)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Daily Breakdown Table */}
                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20, marginBottom: 28 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>📅 Daily Sales Breakdown</h3>
                            {data.daily.length === 0 ? (
                                <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>No data in selected range</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                                {['Date', 'Vouchers', 'Sales Amount', 'Gold (g)', 'Silver (g)', 'Bar'].map(h => (
                                                    <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Bar' || h === 'Sales Amount' ? 'right' : 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.daily.map((d, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '10px 12px' }}>{fmt(d.date)}</td>
                                                    <td style={{ padding: '10px 12px' }}>{d.count}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>{fmtAmt(d.amount)}</td>
                                                    <td style={{ padding: '10px 12px', color: '#B8860B' }}>{d.gold.toFixed(3)}</td>
                                                    <td style={{ padding: '10px 12px', color: '#555' }}>{d.silver.toFixed(3)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', minWidth: 100 }}>
                                                        <MiniBar value={d.amount} max={maxDaily} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Expense Breakdown */}
                        {Object.keys(data.expCatMap).length > 0 && (
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>💸 Expense Breakdown</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                                    {Object.entries(data.expCatMap).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                        <div key={cat} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 14px' }}>
                                            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>{cat}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{fmtAmt(amt)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Hourly Sales Heatmap + Customer Loyalty */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 28, marginBottom: 28 }}>
                            {/* Hourly Heatmap */}
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>📊 Hourly Sales Heatmap</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
                                    {data.hourly.filter(h => h.hour >= 8 && h.hour <= 21).map(h => {
                                        const maxH = Math.max(...data.hourly.map(x => x.count), 1);
                                        const intensity = h.count / maxH;
                                        return (
                                            <div key={h.hour} title={`${h.hour}:00 — ${h.count} sales, ${fmtAmt(h.amount)}`}
                                                style={{
                                                    textAlign: 'center', padding: '8px 2px', borderRadius: 6, fontSize: 10,
                                                    background: h.count === 0 ? 'var(--bg-secondary)' : `rgba(245, 158, 11, ${0.15 + intensity * 0.85})`,
                                                    color: intensity > 0.5 ? '#fff' : 'var(--color-text)', fontWeight: intensity > 0.5 ? 700 : 400,
                                                    cursor: 'default'
                                                }}>
                                                <div>{h.hour > 12 ? `${h.hour - 12}P` : h.hour === 12 ? '12P' : `${h.hour}A`}</div>
                                                <div style={{ fontSize: 9, marginTop: 2 }}>{h.count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-muted)' }}>
                                    Darker = more sales. Hover for details. (8 AM – 9 PM shown)
                                </div>
                            </div>

                            {/* Customer Loyalty */}
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20 }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🏅 Loyal Customers</h3>
                                {data.loyalty.length === 0 ? (
                                    <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>No repeat customers in this period</div>
                                ) : (
                                    data.loyalty.map((c, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border-color)', fontSize: 12 }}>
                                            <span>
                                                <span style={{ fontWeight: 600 }}>{c.name}</span>
                                                {c.atRisk && <span style={{ marginLeft: 6, fontSize: 9, background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>AT RISK</span>}
                                            </span>
                                            <span style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                                                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{c.visits} visits</span>
                                                <span style={{ color: 'var(--color-muted)' }}>{fmtAmt(c.totalSpent)}</span>
                                                <span style={{ color: 'var(--color-muted)' }}>{c.daysSinceVisit}d ago</span>
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* AI Health Score */}
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20, marginBottom: 28, textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>⚡ AI Shop Health Score</h3>
                            <div style={{ position: 'relative', display: 'inline-block', width: 120, height: 120 }}>
                                <svg viewBox="0 0 120 120" width="120" height="120">
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                                    <circle cx="60" cy="60" r="50" fill="none"
                                        stroke={data.healthScore >= 70 ? '#10b981' : data.healthScore >= 40 ? '#f59e0b' : '#ef4444'}
                                        strokeWidth="10" strokeDasharray={`${(data.healthScore / 100) * 314} 314`}
                                        strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 1s ease' }} />
                                </svg>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 28, fontWeight: 800, color: data.healthScore >= 70 ? '#10b981' : data.healthScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                                    {data.healthScore}
                                </div>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: data.healthScore >= 70 ? '#065f46' : data.healthScore >= 40 ? '#92400e' : '#991b1b' }}>
                                {data.healthScore >= 70 ? '🟢 Healthy' : data.healthScore >= 40 ? '🟡 Needs Attention' : '🔴 Critical'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>Based on revenue trend, credit risk, expense ratio & customer diversity</div>
                        </div>


                        {data.forecast && (
                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 20, marginTop: 28 }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>🤖 AI Demand Forecasting</h3>
                                <p style={{ margin: '0 0 18px', fontSize: 11, color: 'var(--color-muted)' }}>Based on {data.forecast.totalDays} days of transaction history</p>

                                {/* Revenue Projection */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, borderLeft: '4px solid #f59e0b' }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>Avg Daily Revenue</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{fmtAmt(data.forecast.avgDailyRevenue)}</div>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, borderLeft: '4px solid #10b981' }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>Projected Next Period</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{fmtAmt(data.forecast.projectedNextPeriod)}</div>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, borderLeft: `4px solid ${data.forecast.growthRate >= 0 ? '#10b981' : '#ef4444'}` }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>Revenue Trend</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: data.forecast.growthRate >= 0 ? '#10b981' : '#ef4444' }}>
                                            {data.forecast.growthRate >= 0 ? '📈' : '📉'} {data.forecast.growthRate.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, borderLeft: '4px solid #B8860B' }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>Avg Daily Gold</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#B8860B' }}>{fmtWt(data.forecast.avgDailyGold)}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    {/* Best Selling Days */}
                                    <div>
                                        <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>📅 Best Selling Days</h4>
                                        {data.forecast.dayOfWeek.length === 0 && <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>No data</div>}
                                        {data.forecast.dayOfWeek.map((d, i) => (
                                            <div key={d.day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: 12 }}>
                                                <span style={{ fontWeight: i < 2 ? 600 : 400 }}>
                                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {d.day}
                                                </span>
                                                <span style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                                                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fmtAmt(d.amount)}</span>
                                                    <span style={{ color: 'var(--color-muted)' }}>{d.count} bills</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Metal Demand Split & Top Items */}
                                    <div>
                                        <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>⚖️ Metal Demand Split</h4>
                                        <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                                            <div style={{ width: `${data.forecast.goldRatio}%`, background: 'linear-gradient(90deg,#B8860B,#DAA520)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                                {data.forecast.goldRatio > 10 ? `Gold ${data.forecast.goldRatio.toFixed(0)}%` : ''}
                                            </div>
                                            <div style={{ width: `${data.forecast.silverRatio}%`, background: 'linear-gradient(90deg,#6b7280,#9ca3af)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                                {data.forecast.silverRatio > 10 ? `Silver ${data.forecast.silverRatio.toFixed(0)}%` : ''}
                                            </div>
                                            {(100 - data.forecast.goldRatio - data.forecast.silverRatio) > 5 && (
                                                <div style={{ flex: 1, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#666' }}>Other</div>
                                            )}
                                        </div>

                                        <h4 style={{ margin: '16px 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>🔥 Top Selling Items</h4>
                                        {data.forecast.topItems.map((it, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border-color)', fontSize: 12 }}>
                                                <span>
                                                    <span style={{ color: it.metal === 'gold' ? '#B8860B' : '#6b7280', fontWeight: 600 }}>{it.metal === 'gold' ? '🟡' : '⚪'}</span>
                                                    {' '}{it.name}
                                                </span>
                                                <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{it.count}× | {fmtWt(it.totalWeight)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Insights */}
                                <div style={{ marginTop: 18, padding: 14, background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', borderRadius: 8, border: '1px dashed #93c5fd' }}>
                                    <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>💡 AI Insights</h4>
                                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.8 }}>
                                        {data.forecast.dayOfWeek.length > 0 && (
                                            <li><b>{data.forecast.dayOfWeek[0].day}</b> is your busiest day — consider stocking more inventory and keeping staff ready.</li>
                                        )}
                                        {data.forecast.growthRate > 5 && (
                                            <li>📈 Sales are <b>growing {data.forecast.growthRate.toFixed(0)}%</b> — great momentum! Plan for increased stock requirements.</li>
                                        )}
                                        {data.forecast.growthRate < -5 && (
                                            <li>📉 Sales <b>declined {Math.abs(data.forecast.growthRate).toFixed(0)}%</b> — consider promotions or reaching out to repeat customers.</li>
                                        )}
                                        {data.forecast.goldRatio > 70 && (
                                            <li>🟡 <b>{data.forecast.goldRatio.toFixed(0)}%</b> of revenue is from gold — ensure gold stock is always replenished.</li>
                                        )}
                                        {data.forecast.silverRatio > 40 && (
                                            <li>⚪ Silver accounts for <b>{data.forecast.silverRatio.toFixed(0)}%</b> of sales — a strong silver market, keep diverse silver inventory.</li>
                                        )}
                                        {data.forecast.topItems.length > 0 && (
                                            <li>🔥 <b>{data.forecast.topItems[0].name}</b> is your best-seller ({data.forecast.topItems[0].count} sold) — ensure this item type is always in stock.</li>
                                        )}
                                        <li>💰 At current pace, expect <b>{fmtAmt(data.forecast.avgDailyRevenue * 30)}</b> in revenue over the next 30 days.</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
