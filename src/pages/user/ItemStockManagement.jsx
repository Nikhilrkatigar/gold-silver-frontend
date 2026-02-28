import React, { useEffect, useState } from 'react';
import { itemAPI, categoryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPrinter, FiDownload, FiRefreshCw, FiEye, FiX } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { SkeletonTable } from '../../components/Skeleton';
import PullToRefresh from '../../components/PullToRefresh';

const ItemStockManagement = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'available', categoryId: '', metal: '' });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('ornament');
  const [categorySearch, setCategorySearch] = useState('');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    metal: 'gold',
    purity: '22K',
    grossWeight: '',
    lessWeight: '0',
    purchaseRate: '',
    categoryId: '',
    huid: '',
    hallmarkDate: ''
  });

  // Fetch items and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        categoryAPI.getAll(),
        itemAPI.getAll(filter)
      ]);
      setCategories(categoriesRes.data.categories || []);
      setItems(itemsRes.data.items || []);
    } catch (error) {
      toast.error('Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Enter category name');
      return;
    }

    try {
      await categoryAPI.create({
        name: newCategory,
        type: newCategoryType
      });
      toast.success('Category created!');
      setNewCategory('');
      setShowNewCategoryForm(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  // Create/Update item
  const handleSaveItem = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.grossWeight || !formData.categoryId) {
      toast.error('Fill all required fields');
      return;
    }

    try {
      const itemPayload = {
        name: formData.name,
        metal: formData.metal,
        purity: formData.purity,
        grossWeight: parseFloat(formData.grossWeight),
        lessWeight: parseFloat(formData.lessWeight) || 0,
        categoryId: formData.categoryId,
        ...(formData.huid ? { huid: formData.huid.toUpperCase().trim() } : {}),
        ...(formData.hallmarkDate ? { hallmarkDate: formData.hallmarkDate } : {}),
      };

      if (editingItem) {
        await itemAPI.update(editingItem._id, itemPayload);
        toast.success('Item updated!');
      } else {
        await itemAPI.create(itemPayload);
        toast.success('Item created!');
      }

      setShowForm(false);
      setEditingItem(null);
      setCategorySearch('');
      setFormData({ name: '', metal: 'gold', purity: '22K', grossWeight: '', lessWeight: '0', purchaseRate: '', categoryId: '', huid: '', hallmarkDate: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save item');
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;

    try {
      await itemAPI.delete(itemId);
      toast.success('Item deleted!');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  // Edit item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setCategorySearch(item?.categoryId?.name || '');
    setFormData({
      name: item.name,
      metal: item.metal,
      purity: item.purity,
      grossWeight: item.grossWeight,
      lessWeight: item.lessWeight,
      purchaseRate: item.purchaseRate || '',
      categoryId: item.categoryId._id,
      huid: item.huid || '',
      hallmarkDate: item.hallmarkDate ? item.hallmarkDate.split('T')[0] : '',
    });
    setShowForm(true);
  };

  // Override sold status back to available (audit logged on backend)
  const handleOverrideItem = async (item) => {
    const reason = window.prompt('Enter override reason to mark this sold item as available:');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await itemAPI.override(item._id, {
        action: 'mark_available',
        reason: reason.trim()
      });
      toast.success('Override applied. Item is now available.');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply override');
    }
  };

  // Print QR tag
  const handlePrintTag = (item) => {
    const qrcodeElement = document.getElementById(`qrcode-${item._id}`);
    if (!qrcodeElement) {
      toast.error('Unable to render QR code for this item');
      return;
    }

    const printWindow = window.open('', '', 'height=400,width=300');

    printWindow.document.write(`
      <html>
        <head>
          <title>Item Tag - ${item.itemCode}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .tag { border: 1px solid black; padding: 15px; margin: 10px; display: inline-block; }
            .qr { margin: 10px 0; }
            .qr svg { width: 100px; height: 100px; border: 1px solid #333; }
            p { margin: 5px 0; font-size: 12px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="qr">${qrcodeElement.innerHTML}</div>
            <p class="label">${item.name}</p>
            <p>Code: ${item.itemCode}</p>
            <p>Purity: ${item.purity}</p>
            <p>Net Wt: ${item.netWeight}g</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Item Code', 'Name', 'Metal', 'Purity', 'Gross Weight', 'Less Weight', 'Net Weight', 'Rate (₹/g)', 'Cost Price (₹)', 'HUID', 'Category', 'Status'];
    const rows = items.map(item => [
      item.itemCode,
      item.name,
      item.metal,
      item.purity,
      item.grossWeight,
      item.lessWeight,
      item.netWeight,
      item.purchaseRate || 0,
      item.costPrice || 0,
      item.huid || '',
      typeof item.categoryId === 'object' ? item.categoryId.name : item.categoryId,
      item.status
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCategoryOptions = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Calculate statistics from ALL items (not just filtered)
  const [allStats, setAllStats] = useState({ total: 0, available: 0, sold: 0, totalNetWeight: 0, totalCostPrice: 0 });
  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        const res = await itemAPI.getAll({});
        const all = res.data.items || [];
        setAllStats({
          total: all.length,
          available: all.filter(i => i.status === 'available').length,
          sold: all.filter(i => i.status === 'sold').length,
          totalNetWeight: all.filter(i => i.status === 'available').reduce((sum, i) => sum + (i.netWeight || 0), 0),
          totalCostPrice: all.filter(i => i.status === 'available').reduce((sum, i) => sum + (i.costPrice || 0), 0)
        });
      } catch (_) { /* ignore */ }
    };
    fetchAllStats();
  }, [items]);

  return (
    <PullToRefresh onRefresh={fetchData}>
      <div style={{ padding: '1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1>Item-wise Inventory</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Items</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{allStats.total}</div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Available</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#10b981' }}>{allStats.available}</div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sold</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#ef4444' }}>{allStats.sold}</div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Available Net Wt</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{allStats.totalNetWeight.toFixed(2)}g</div>
            </div>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Stock Value</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#8b5cf6' }}>₹{allStats.totalCostPrice.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setEditingItem(null); setShowForm(!showForm); setCategorySearch(''); setFormData({ name: '', metal: 'gold', purity: '22K', grossWeight: '', lessWeight: '0', purchaseRate: '', categoryId: '', huid: '', hallmarkDate: '' }); }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FiPlus /> Add Item
          </button>
          <button
            onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            📁 Add Category
          </button>
          <button
            onClick={handleExportCSV}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FiDownload /> Export CSV
          </button>
          <button
            onClick={fetchData}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>

        {/* New Category Form */}
        {showNewCategoryForm && (
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h3>Create New Category</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">Category Name</label>
                <input
                  type="text"
                  className="input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g., Rings, Necklaces, etc."
                />
              </div>
              <div>
                <label className="input-label">Type</label>
                <select
                  className="input"
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value)}
                  style={{ marginBottom: 0 }}
                >
                  <option value="ornament">Ornament</option>
                  <option value="coin">Coin</option>
                  <option value="raw_material">Raw Material</option>
                </select>
              </div>
              <button onClick={handleCreateCategory} className="btn btn-primary">Create</button>
              <button onClick={() => setShowNewCategoryForm(false)} className="btn" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Add/Edit Item Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => { setShowForm(false); setEditingItem(null); setCategorySearch(''); }} className="btn">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="input-label">Item Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Category *</label>
                  <input
                    type="text"
                    className="input"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search category..."
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <select
                    className="input"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {filteredCategoryOptions.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name} ({cat.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Metal *</label>
                  <select
                    className="input"
                    value={formData.metal}
                    onChange={(e) => setFormData({ ...formData, metal: e.target.value })}
                  >
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Purity *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.purity}
                    onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                    placeholder="22K, 18K, 925, etc."
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Gross Weight (g) *</label>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    value={formData.grossWeight}
                    onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Less Weight (g)</label>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    value={formData.lessWeight}
                    onChange={(e) => setFormData({ ...formData, lessWeight: e.target.value })}
                  />
                </div>
                <div>
                  <label className="input-label">Purchase Rate (₹/g)</label>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    value={formData.purchaseRate}
                    onChange={(e) => setFormData({ ...formData, purchaseRate: e.target.value })}
                    placeholder="Rate per gram"
                  />
                  {formData.purchaseRate && formData.grossWeight && formData.lessWeight !== '' && (
                    <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      Cost: ₹{((parseFloat(formData.grossWeight || 0) - parseFloat(formData.lessWeight || 0)) * parseFloat(formData.purchaseRate || 0)).toFixed(2)}
                    </small>
                  )}
                </div>
                {/* HUID / Hallmark fields */}
                <div>
                  <label className="input-label">HUID (BIS Hallmark Code)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.huid}
                    onChange={(e) => setFormData({ ...formData, huid: e.target.value.toUpperCase() })}
                    placeholder="e.g. AB1234 (optional)"
                    maxLength={16}
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>BIS Hallmark Unique ID — found on the hallmark certificate</small>
                </div>
                <div>
                  <label className="input-label">Hallmark Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.hallmarkDate}
                    onChange={(e) => setFormData({ ...formData, hallmarkDate: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setCategorySearch(''); }} className="btn">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Item</button>
              </div>
            </form>
          </div>
        )
        }

        {/* Filters */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="input-label">Search</label>
              <div style={{ position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Item name, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
              </div>
            </div>
            <div>
              <label className="input-label">Status</label>
              <select
                className="input"
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            <div>
              <label className="input-label">Category</label>
              <select
                className="input"
                value={filter.categoryId}
                onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Metal</label>
              <select
                className="input"
                value={filter.metal}
                onChange={(e) => setFilter({ ...filter, metal: e.target.value })}
              >
                <option value="">All Metals</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Table */}
        {
          loading ? (
            <SkeletonTable rows={5} />
          ) : filteredItems.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No items found
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>QR</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Item Code</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Metal</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Purity</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Gross (g)</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Less (g)</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Net (g)</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Rate (₹/g)</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Cost (₹)</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div id={`qrcode-${item._id}`} style={{ display: 'inline-block' }}>
                          <QRCodeSVG
                            value={item._id}
                            size={60}
                            level="H"
                            includeMargin={false}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                          {item.itemCode}
                        </code>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {item.name}
                        {item.huid && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{ fontSize: 10, backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                              🏅 {item.huid}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {item.metal === 'gold' ? '🟨 Gold' : '⚪ Silver'}
                      </td>
                      <td style={{ padding: '1rem' }}>{item.purity}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>{item.grossWeight.toFixed(2)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>{item.lessWeight.toFixed(2)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{item.netWeight.toFixed(2)}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{item.purchaseRate ? `₹${item.purchaseRate.toFixed(0)}` : '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#8b5cf6' }}>{item.costPrice ? `₹${item.costPrice.toFixed(0)}` : '-'}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: item.status === 'available' ? '#d1fae5' : '#fee2e2',
                          color: item.status === 'available' ? '#065f46' : '#991b1b'
                        }}>
                          {item.status === 'available' ? '✓ Available' : '✕ Sold'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handlePrintTag(item)}
                            className="btn"
                            title="Print QR Tag"
                            style={{ padding: '0.5rem' }}
                          >
                            <FiPrinter size={16} />
                          </button>
                          {item.status === 'available' && (
                            <>
                              <button
                                onClick={() => handleEditItem(item)}
                                className="btn"
                                title="Edit"
                                style={{ padding: '0.5rem' }}
                              >
                                <FiEdit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item._id)}
                                className="btn"
                                title="Delete"
                                style={{ padding: '0.5rem', color: '#ef4444' }}
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </>
                          )}
                          {item.status === 'sold' && (
                            <button
                              onClick={() => handleOverrideItem(item)}
                              className="btn"
                              title="Override to Available"
                              style={{ padding: '0.5rem', color: '#f59e0b' }}
                            >
                              <FiRefreshCw size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div >
    </PullToRefresh >
  );
};

export default ItemStockManagement;
