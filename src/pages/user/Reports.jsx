import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { reportAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { SkeletonStat, SkeletonCard, SkeletonTable } from '../../components/Skeleton';
import { FiPrinter } from 'react-icons/fi';

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

const StatCard = ({ label, value, sub, tone }) => (
    <div className="stat-tile">
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={tone ? { color: `var(--color-${tone})` } : undefined}>{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
    </div>
);

const Section = ({ title, sub, children, tour }) => (
    <section className="card" style={{ marginBottom: '1rem' }} data-tour={tour}>
        <h3 className="section-title" style={{ marginBottom: sub ? 2 : '0.75rem' }}>{title}</h3>
        {sub && <div className="stat-sub" style={{ marginBottom: '0.75rem' }}>{sub}</div>}
        {children}
    </section>
);

const Empty = ({ children }) => <div className="text-muted" style={{ fontSize: 13, padding: '0.25rem 0' }}>{children}</div>;

// First column is a label, the rest are figures (right-aligned)
const ReportTable = ({ head, children }) => (
    <div style={{ overflowX: 'auto' }}>
        <table className="table report-table no-scroll">
            <thead>
                <tr>{head.map((h, i) => <th key={h} className={i ? 'text-right' : undefined}>{h}</th>)}</tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    </div>
);

export default function Reports() {
    const { user } = useAuth();
    const [preset, setPreset] = useState(2); // index into PRESETS (matches the default dates below)
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

            // ────── SALES TRENDS / FORECAST ──────────────────────────────
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

            // ── HEALTH SCORE (0-100) ──
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

    const fmtAmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const fmtWt = (n) => `${(n || 0).toFixed(3)} g`;

    const healthTone = data ? (data.healthScore >= 70 ? 'success' : data.healthScore >= 40 ? 'warning' : 'danger') : undefined;
    const healthLabel = data ? (data.healthScore >= 70 ? 'Healthy' : data.healthScore >= 40 ? 'Needs attention' : 'Critical') : '';
    const payTotal = data ? (data.paymentBreakdown.cashAmount + data.paymentBreakdown.creditAmount) || 1 : 1;

    return (
        <Layout>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Header */}
                <div className="report-head">
                    <div>
                        <h1 style={{ fontSize: '1.375rem' }}>Reports</h1>
                        <div className="stat-sub">{user?.shopName} · {fmt(fromDate)} – {fmt(toDate)}</div>
                    </div>

                    <div className="report-controls no-print">
                        <div className="segmented" role="group" aria-label="Date range" data-tour="rep-range">
                            {PRESETS.map((p, i) => (
                                <button key={p.label} type="button" className={preset === i ? 'active' : ''} aria-pressed={preset === i} onClick={() => applyPreset(i)}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <div className="report-dates">
                            <label className="sr-only" htmlFor="rep-from">From date</label>
                            <input id="rep-from" type="date" className="input" value={fromDate} onChange={e => { setFromDate(e.target.value); setPreset(-1); }} />
                            <span className="text-muted" style={{ fontSize: 13 }}>to</span>
                            <label className="sr-only" htmlFor="rep-to">To date</label>
                            <input id="rep-to" type="date" className="input" value={toDate} onChange={e => { setToDate(e.target.value); setPreset(-1); }} />
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" onClick={fetchAll} disabled={loading}>
                            {loading ? 'Loading…' : 'Apply'}
                        </button>
                        {!loading && data && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                                <FiPrinter aria-hidden="true" /> Print
                            </button>
                        )}
                    </div>
                </div>

                {loading && (
                    <div>
                        <SkeletonStat count={6} />
                        <SkeletonTable rows={5} columns={5} />
                        <div style={{ marginTop: 16 }}><SkeletonCard count={1} /></div>
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* Key figures */}
                        <div className="stat-grid" style={{ marginBottom: '1rem' }} data-tour="rep-kpis">
                            <StatCard label="Total sales" value={fmtAmt(data.totalSales)} sub={`${data.saleCount} vouchers`} />
                            <StatCard label="Cash collected" value={fmtAmt(data.totalCashReceived)} />
                            <StatCard label="Credit sales" value={fmtAmt(data.totalCreditValue)} sub={`${data.creditVouchers.length} bills`} />
                            <StatCard label="Expenses" value={fmtAmt(data.totalExpenses)} />
                            <StatCard label="Net profit" value={fmtAmt(data.netProfit)} sub={`Margin ${data.profitMargin.toFixed(1)}%`} tone={data.netProfit >= 0 ? 'success' : 'danger'} />
                            <StatCard
                                label="vs previous period"
                                value={`${data.momChange >= 0 ? '▲' : '▼'} ${Math.abs(data.momChange).toFixed(1)}%`}
                                sub={`Previous: ${fmtAmt(data.prevSales)}`}
                                tone={data.momChange >= 0 ? 'success' : 'danger'}
                            />
                            <StatCard label="Gold sold (fine)" value={fmtWt(data.goldSold)} />
                            <StatCard label="Silver sold (fine)" value={fmtWt(data.silverSold)} />
                            {data.totalPurchase > 0 && (
                                <StatCard label="Purchases" value={fmtAmt(data.totalPurchase)} sub={`Gold bought: ${fmtWt(data.goldBought)}`} />
                            )}
                            <StatCard label="Health score" value={`${data.healthScore}/100`} sub={healthLabel} tone={healthTone} />
                        </div>

                        <div className="two-col">
                            <Section title="Top customers" sub="By sales amount">
                                {data.topCustomers.length === 0 ? <Empty>No transactions in this period</Empty> : (
                                    <ReportTable head={['Customer', 'Bills', 'Amount']}>
                                        {data.topCustomers.map((c, i) => (
                                            <tr key={i}>
                                                <td>{c.name}</td>
                                                <td className="text-right">{c.count}</td>
                                                <td className="text-right">{fmtAmt(c.amount)}</td>
                                            </tr>
                                        ))}
                                    </ReportTable>
                                )}
                            </Section>

                            <Section title="Highest outstanding balances" sub="Customers who owe the shop">
                                {data.dueCustomers.length === 0 ? <Empty>No outstanding balances</Empty> : (
                                    <ReportTable head={['Customer', 'Balance']}>
                                        {data.dueCustomers.map((l, i) => (
                                            <tr key={i}>
                                                <td>{l.name}</td>
                                                <td className="text-right" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{fmtAmt(l.balances?.cashBalance)}</td>
                                            </tr>
                                        ))}
                                    </ReportTable>
                                )}
                            </Section>
                        </div>

                        <Section title="Daily sales" tour="rep-daily">
                            {data.daily.length === 0 ? <Empty>No sales in this period</Empty> : (
                                <ReportTable head={['Date', 'Vouchers', 'Gold (g)', 'Silver (g)', 'Sales amount']}>
                                    {data.daily.map((d, i) => (
                                        <tr key={i}>
                                            <td>{fmt(d.date)}</td>
                                            <td className="text-right">{d.count}</td>
                                            <td className="text-right">{d.gold.toFixed(3)}</td>
                                            <td className="text-right">{d.silver.toFixed(3)}</td>
                                            <td className="text-right" style={{ fontWeight: 600 }}>{fmtAmt(d.amount)}</td>
                                        </tr>
                                    ))}
                                </ReportTable>
                            )}
                        </Section>

                        <div className="two-col">
                            <Section title="Payment split">
                                <div className="split-bar" aria-hidden="true">
                                    <div style={{ width: `${(data.paymentBreakdown.cashAmount / payTotal) * 100}%`, background: 'var(--color-primary)' }} />
                                    <div style={{ width: `${(data.paymentBreakdown.creditAmount / payTotal) * 100}%`, background: 'var(--color-primary-light)' }} />
                                </div>
                                <ReportTable head={['Mode', 'Bills', 'Amount']}>
                                    <tr>
                                        <td><span className="legend-dot" style={{ background: 'var(--color-primary)' }} />Cash</td>
                                        <td className="text-right">{data.paymentBreakdown.cashCount}</td>
                                        <td className="text-right">{fmtAmt(data.paymentBreakdown.cashAmount)}</td>
                                    </tr>
                                    <tr>
                                        <td><span className="legend-dot" style={{ background: 'var(--color-primary-light)' }} />Credit</td>
                                        <td className="text-right">{data.paymentBreakdown.creditCount}</td>
                                        <td className="text-right">{fmtAmt(data.paymentBreakdown.creditAmount)}</td>
                                    </tr>
                                </ReportTable>
                            </Section>

                            <Section title="Expenses by category">
                                {Object.keys(data.expCatMap).length === 0 ? <Empty>No expenses in this period</Empty> : (
                                    <ReportTable head={['Category', 'Share', 'Amount']}>
                                        {Object.entries(data.expCatMap).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                                            <tr key={cat}>
                                                <td>{cat}</td>
                                                <td className="text-right">{data.totalExpenses ? ((amt / data.totalExpenses) * 100).toFixed(0) : 0}%</td>
                                                <td className="text-right">{fmtAmt(amt)}</td>
                                            </tr>
                                        ))}
                                    </ReportTable>
                                )}
                            </Section>
                        </div>

                        <div className="two-col">
                            <Section title="Sales by hour" sub="8 AM – 9 PM · darker means more bills">
                                <div className="hour-grid">
                                    {data.hourly.filter(h => h.hour >= 8 && h.hour <= 21).map(h => {
                                        const maxH = Math.max(...data.hourly.map(x => x.count), 1);
                                        const intensity = h.count / maxH;
                                        return (
                                            <div key={h.hour} title={`${h.hour}:00 — ${h.count} bills, ${fmtAmt(h.amount)}`}
                                                style={{
                                                    background: h.count === 0 ? 'var(--bg-secondary)' : `color-mix(in srgb, var(--color-primary) ${Math.round((0.12 + intensity * 0.88) * 100)}%, var(--bg-primary))`,
                                                    color: intensity > 0.5 ? 'var(--color-on-primary)' : 'var(--text-secondary)'
                                                }}>
                                                <div>{h.hour > 12 ? `${h.hour - 12}p` : h.hour === 12 ? '12p' : `${h.hour}a`}</div>
                                                <div style={{ fontWeight: 600 }}>{h.count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Section>

                            <Section title="Repeat customers">
                                {data.loyalty.length === 0 ? <Empty>No repeat customers in this period</Empty> : (
                                    <ReportTable head={['Customer', 'Visits', 'Spent', 'Last visit']}>
                                        {data.loyalty.map((c, i) => (
                                            <tr key={i}>
                                                <td>
                                                    {c.name}
                                                    {c.atRisk && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Inactive</span>}
                                                </td>
                                                <td className="text-right">{c.visits}</td>
                                                <td className="text-right">{fmtAmt(c.totalSpent)}</td>
                                                <td className="text-right">{c.daysSinceVisit}d ago</td>
                                            </tr>
                                        ))}
                                    </ReportTable>
                                )}
                            </Section>
                        </div>

                        {data.forecast && (
                            <Section title="Sales trends" sub={`Based on ${data.forecast.totalDays} days of history`}>
                                <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
                                    <StatCard label="Avg daily revenue" value={fmtAmt(data.forecast.avgDailyRevenue)} />
                                    <StatCard label="Projected next period" value={fmtAmt(data.forecast.projectedNextPeriod)} />
                                    <StatCard label="Revenue trend" value={`${data.forecast.growthRate >= 0 ? '+' : ''}${data.forecast.growthRate.toFixed(1)}%`} tone={data.forecast.growthRate >= 0 ? 'success' : 'danger'} />
                                    <StatCard label="Avg daily gold" value={fmtWt(data.forecast.avgDailyGold)} />
                                </div>

                                <div className="two-col" style={{ gap: '1.5rem' }}>
                                    <div>
                                        <h4 className="subsection-title">Best selling days</h4>
                                        {data.forecast.dayOfWeek.length === 0 ? <Empty>No data</Empty> : (
                                            <ReportTable head={['Day', 'Bills', 'Amount']}>
                                                {data.forecast.dayOfWeek.map(d => (
                                                    <tr key={d.day}>
                                                        <td>{d.day}</td>
                                                        <td className="text-right">{d.count}</td>
                                                        <td className="text-right">{fmtAmt(d.amount)}</td>
                                                    </tr>
                                                ))}
                                            </ReportTable>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="subsection-title">Metal split</h4>
                                        <div className="split-bar" aria-hidden="true">
                                            <div style={{ width: `${data.forecast.goldRatio}%`, background: 'var(--metal-gold)' }} />
                                            <div style={{ width: `${data.forecast.silverRatio}%`, background: 'var(--metal-silver)' }} />
                                        </div>
                                        <div className="stat-sub" style={{ marginBottom: '1rem' }}>
                                            <span className="legend-dot" style={{ background: 'var(--metal-gold)' }} />Gold {data.forecast.goldRatio.toFixed(0)}%
                                            <span className="legend-dot" style={{ background: 'var(--metal-silver)', marginLeft: 12 }} />Silver {data.forecast.silverRatio.toFixed(0)}%
                                        </div>

                                        <h4 className="subsection-title">Top selling items</h4>
                                        {data.forecast.topItems.length === 0 ? <Empty>No data</Empty> : (
                                            <ReportTable head={['Item', 'Sold', 'Weight']}>
                                                {data.forecast.topItems.map((it, i) => (
                                                    <tr key={i}>
                                                        <td><span className="legend-dot" style={{ background: it.metal === 'gold' ? 'var(--metal-gold)' : 'var(--metal-silver)' }} />{it.name}</td>
                                                        <td className="text-right">{it.count}</td>
                                                        <td className="text-right">{fmtWt(it.totalWeight)}</td>
                                                    </tr>
                                                ))}
                                            </ReportTable>
                                        )}
                                    </div>
                                </div>

                                <h4 className="subsection-title" style={{ marginTop: '1.25rem' }}>Observations</h4>
                                <ul className="report-notes">
                                    {data.forecast.dayOfWeek.length > 0 && (
                                        <li><b>{data.forecast.dayOfWeek[0].day}</b> is the busiest day.</li>
                                    )}
                                    {data.forecast.growthRate > 5 && (
                                        <li>Sales are up <b>{data.forecast.growthRate.toFixed(0)}%</b> on the previous period.</li>
                                    )}
                                    {data.forecast.growthRate < -5 && (
                                        <li>Sales are down <b>{Math.abs(data.forecast.growthRate).toFixed(0)}%</b> on the previous period.</li>
                                    )}
                                    {data.forecast.goldRatio > 70 && (
                                        <li>Gold makes up <b>{data.forecast.goldRatio.toFixed(0)}%</b> of revenue.</li>
                                    )}
                                    {data.forecast.silverRatio > 40 && (
                                        <li>Silver makes up <b>{data.forecast.silverRatio.toFixed(0)}%</b> of sales.</li>
                                    )}
                                    {data.forecast.topItems.length > 0 && (
                                        <li>Best-selling item: <b>{data.forecast.topItems[0].name}</b> ({data.forecast.topItems[0].count} sold).</li>
                                    )}
                                    <li>At the current pace, the next 30 days come to about <b>{fmtAmt(data.forecast.avgDailyRevenue * 30)}</b>.</li>
                                </ul>
                            </Section>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
