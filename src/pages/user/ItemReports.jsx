import React, { useState, useEffect } from 'react';
import { itemAPI, categoryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import Layout from '../../components/Layout';
import { SkeletonTable } from '../../components/Skeleton';
import PullToRefresh from '../../components/PullToRefresh';

const ItemReports = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('category-summary');

  // Fetch data
  const fetchData = async () => {
    if (user?.stockMode !== 'item') {
      setItems([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        itemAPI.getAll({}),
        categoryAPI.getAll()
      ]);
      setItems(itemsRes.data.items || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (error) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.stockMode]);

  // Category-wise stock summary
  const getCategorySummary = () => {
    const summary = {};
    categories.forEach(cat => {
      const catItems = items.filter(i => i.categoryId._id === cat._id);
      summary[cat._id] = {
        name: cat.name,
        type: cat.type,
        total: catItems.length,
        available: catItems.filter(i => i.status === 'available').length,
        sold: catItems.filter(i => i.status === 'sold').length,
        totalGrossWeight: catItems.reduce((sum, i) => sum + (i.grossWeight || 0), 0),
        totalNetWeight: catItems.reduce((sum, i) => sum + (i.netWeight || 0), 0),
        soldValue: catItems.filter(i => i.status === 'sold').length
      };
    });
    return Object.values(summary);
  };

  // Metal-wise stock summary
  const getMetalSummary = () => {
    const gold = items.filter(i => i.metal === 'gold');
    const silver = items.filter(i => i.metal === 'silver');

    return [
      {
        metal: 'Gold',
        icon: '🟨',
        total: gold.length,
        available: gold.filter(i => i.status === 'available').length,
        sold: gold.filter(i => i.status === 'sold').length,
        totalGrossWeight: gold.reduce((sum, i) => sum + (i.grossWeight || 0), 0),
        totalNetWeight: gold.reduce((sum, i) => sum + (i.netWeight || 0), 0),
        avgValue: (gold.reduce((sum, i) => sum + (i.netWeight || 0), 0) / gold.length).toFixed(2)
      },
      {
        metal: 'Silver',
        icon: '⚪',
        total: silver.length,
        available: silver.filter(i => i.status === 'available').length,
        sold: silver.filter(i => i.status === 'sold').length,
        totalGrossWeight: silver.reduce((sum, i) => sum + (i.grossWeight || 0), 0),
        totalNetWeight: silver.reduce((sum, i) => sum + (i.netWeight || 0), 0),
        avgValue: (silver.reduce((sum, i) => sum + (i.netWeight || 0), 0) / silver.length).toFixed(2)
      }
    ];
  };

  // Unsold ageing report
  const getAgeingReport = () => {
    const now = new Date();
    const availableItems = items.filter(i => i.status === 'available');

    const ranges = [
      { name: '0-7 days', min: 0, max: 7 },
      { name: '8-15 days', min: 8, max: 15 },
      { name: '16-30 days', min: 16, max: 30 },
      { name: '31-60 days', min: 31, max: 60 },
      { name: '60+ days', min: 61, max: Infinity }
    ];

    return ranges.map(range => {
      const itemsInRange = availableItems.filter(item => {
        const age = Math.floor((now - new Date(item.createdAt)) / (1000 * 60 * 60 * 24));
        return age >= range.min && age <= range.max;
      });

      return {
        ageRange: range.name,
        count: itemsInRange.length,
        totalGrossWeight: itemsInRange.reduce((sum, i) => sum + (i.grossWeight || 0), 0),
        totalNetWeight: itemsInRange.reduce((sum, i) => sum + (i.netWeight || 0), 0),
        items: itemsInRange
      };
    });
  };

  // Daily sold items report
  const getDailySoldReport = () => {
    const sold = items.filter(i => i.status === 'sold');
    const grouped = {};

    sold.forEach(item => {
      if (item.soldAt) {
        const date = new Date(item.soldAt).toLocaleDateString('en-IN');
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(item);
      }
    });

    return Object.entries(grouped)
      .map(([date, items]) => ({
        date,
        count: items.length,
        goldCount: items.filter(i => i.metal === 'gold').length,
        silverCount: items.filter(i => i.metal === 'silver').length,
        totalNetWeight: items.reduce((sum, i) => sum + (i.netWeight || 0), 0),
        items
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Labour income summary
  const getLabourSummary = () => {
    const sold = items.filter(i => i.status === 'sold');
    const goldLabour = sold
      .filter(i => i.metal === 'gold')
      .reduce((sum, i) => sum + (i.labour || 0), 0);
    const silverLabour = sold
      .filter(i => i.metal === 'silver')
      .reduce((sum, i) => sum + (i.labour || 0), 0);

    return {
      total: goldLabour + silverLabour,
      gold: goldLabour,
      silver: silverLabour,
      averagePerItem: (goldLabour + silverLabour) / (sold.length || 1),
      totalItems: sold.length
    };
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csv = '';
    let filename = '';

    switch (reportType) {
      case 'category-summary':
        filename = 'category-summary.csv';
        csv = 'Category,Type,Total,Available,Sold,Gross Weight,Net Weight\n';
        getCategorySummary().forEach(cat => {
          csv += `${cat.name},${cat.type},${cat.total},${cat.available},${cat.sold},${cat.totalGrossWeight.toFixed(2)},${cat.totalNetWeight.toFixed(2)}\n`;
        });
        break;
      case 'metal-summary':
        filename = 'metal-summary.csv';
        csv = 'Metal,Total,Available,Sold,Gross Weight,Net Weight,Average Weight\n';
        getMetalSummary().forEach(metal => {
          csv += `${metal.metal},${metal.total},${metal.available},${metal.sold},${metal.totalGrossWeight.toFixed(2)},${metal.totalNetWeight.toFixed(2)},${metal.avgValue}\n`;
        });
        break;
      case 'ageing':
        filename = 'ageing-report.csv';
        csv = 'Age Range,Count,Gross Weight,Net Weight\n';
        getAgeingReport().forEach(range => {
          csv += `${range.ageRange},${range.count},${range.totalGrossWeight.toFixed(2)},${range.totalNetWeight.toFixed(2)}\n`;
        });
        break;
      case 'daily-sold':
        filename = 'daily-sold-report.csv';
        csv = 'Date,Count,Gold,Silver,Total Net Weight\n';
        getDailySoldReport().forEach(day => {
          csv += `${day.date},${day.count},${day.goldCount},${day.silverCount},${day.totalNetWeight.toFixed(2)}\n`;
        });
        break;
      case 'labour':
        filename = 'labour-summary.csv';
        csv = `Metric,Amount\nTotal Labour Income,₹${getLabourSummary().total.toFixed(2)}\nGold Labour,₹${getLabourSummary().gold.toFixed(2)}\nSilver Labour,₹${getLabourSummary().silver.toFixed(2)}\nAverage Per Item,₹${getLabourSummary().averagePerItem.toFixed(2)}\n`;
        break;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <Layout>
      <PullToRefresh onRefresh={fetchData}>
        <div style={{ padding: '1rem' }}>
          <h1>Item Reports</h1>

          {user?.stockMode !== 'item' && (
            <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
              Item reports are available only when stock mode is set to item-wise.
            </div>
          )}

          {/* Report Type Selector */}
          {user?.stockMode === 'item' && (
          <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="input-label">Report Type</label>
                <select 
                  className="input"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="category-summary">Category-wise Summary</option>
                  <option value="metal-summary">Metal-wise Summary</option>
                  <option value="ageing">Unsold Ageing Report</option>
                  <option value="daily-sold">Daily Sold Items</option>
                  <option value="labour">Labour Income Summary</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={handleExportCSV} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiDownload /> Export CSV
              </button>
              <button onClick={fetchData} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiRefreshCw /> Refresh
              </button>
            </div>
          </div>
          )}

          {/* Reports */}
          {user?.stockMode === 'item' && (loading ? (
            <SkeletonTable rows={5} />
          ) : (
            <>
              {/* Category Summary */}
              {reportType === 'category-summary' && (
                <div className="card" style={{ overflowX: 'auto' }}>
                  <h2>Category-wise Stock Summary</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left' }}>Category</th>
                        <th style={{ padding: '1rem', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Total</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Available</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Sold</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Gross (g)</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Net (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCategorySummary().map((cat, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem' }}>{cat.name}</td>
                          <td style={{ padding: '1rem' }}>{cat.type}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{cat.total}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#10b981' }}>{cat.available}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444' }}>{cat.sold}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>{cat.totalGrossWeight.toFixed(2)}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{cat.totalNetWeight.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Metal Summary */}
              {reportType === 'metal-summary' && (
                <div className="card" style={{ overflowX: 'auto' }}>
                  <h2>Metal-wise Stock Summary</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left' }}>Metal</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Total</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Available</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Sold</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Gross (g)</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Net (g)</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Avg Weight (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getMetalSummary().map((metal, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem' }}>{metal.icon} {metal.metal}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{metal.total}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#10b981' }}>{metal.available}</td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444' }}>{metal.sold}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>{metal.totalGrossWeight.toFixed(2)}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{metal.totalNetWeight.toFixed(2)}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>{metal.avgValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Ageing Report */}
              {reportType === 'ageing' && (
                <div className="card" style={{ overflowX: 'auto' }}>
                  <h2>Unsold Items Ageing Report</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left' }}>Age Range</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Count</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Gross (g)</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Net (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAgeingReport().map((range, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem' }}>{range.ageRange}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{range.count}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>{range.totalGrossWeight.toFixed(2)}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{range.totalNetWeight.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Daily Sold Report */}
              {reportType === 'daily-sold' && (
                <div className="card" style={{ overflowX: 'auto' }}>
                  <h2>Daily Sold Items Report</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Total Sold</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Gold</th>
                        <th style={{ padding: '1rem', textAlign: 'center' }}>Silver</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Total Net (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDailySoldReport().map((day, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem' }}>{day.date}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>{day.count}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>🟨 {day.goldCount}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>⚪ {day.silverCount}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{day.totalNetWeight.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Labour Summary */}
              {reportType === 'labour' && (
                <div className="card">
                  <h2>Labour Income Summary</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Labour Income</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>₹{getLabourSummary().total.toFixed(2)}</div>
                    </div>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Gold Labour</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD700' }}>₹{getLabourSummary().gold.toFixed(2)}</div>
                    </div>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Silver Labour</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#C0C0C0' }}>₹{getLabourSummary().silver.toFixed(2)}</div>
                    </div>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Items Sold</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{getLabourSummary().totalItems}</div>
                    </div>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Avg Labour/Item</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>₹{getLabourSummary().averagePerItem.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ))}
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default ItemReports;
