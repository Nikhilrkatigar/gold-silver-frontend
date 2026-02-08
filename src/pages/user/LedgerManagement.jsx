import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ledgerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiX } from 'react-icons/fi';
import { isValidGSTFormat, extractStateFromGST } from '../../utils/gstCalculations';

export default function LedgerManagement() {
  const [ledgers, setLedgers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    phoneNumber: '',
    hasGST: false,
    gstNumber: '',
    stateCode: ''
  });

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      const response = await ledgerAPI.getAll();
      setLedgers(response.data.ledgers);
    } catch (error) {
      toast.error('Failed to load ledgers');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate GST if enabled
    if (formData.hasGST && (!formData.gstNumber || !isValidGSTFormat(formData.gstNumber))) {
      toast.error('Please enter a valid GST number');
      return;
    }
    
    try {
      const submitData = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        ...(formData.hasGST && {
          gstDetails: {
            hasGST: true,
            gstNumber: formData.gstNumber,
            stateCode: formData.stateCode
          }
        })
      };

      if (editingLedger) {
        await ledgerAPI.update(editingLedger._id, submitData);
        toast.success('Ledger updated successfully');
      } else {
        await ledgerAPI.create(submitData);
        toast.success('Ledger created successfully');
      }
      
      setShowModal(false);
      setFormData({ name: '', phoneNumber: '', hasGST: false, gstNumber: '', stateCode: '' });
      setEditingLedger(null);
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (ledger) => {
    setEditingLedger(ledger);
    setFormData({ 
      name: ledger.name, 
      phoneNumber: ledger.phoneNumber,
      hasGST: ledger.gstDetails?.hasGST || false,
      gstNumber: ledger.gstDetails?.gstNumber || '',
      stateCode: ledger.gstDetails?.stateCode || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (ledger) => {
    if (ledger.hasVouchers) {
      toast.error('Cannot delete ledger with existing vouchers');
      return;
    }
    
    if (!confirm(`Delete ledger "${ledger.name}"?`)) return;

    try {
      await ledgerAPI.delete(ledger._id);
      toast.success('Ledger deleted successfully');
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete ledger');
    }
  };

  return (
    <Layout>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Ledger Management</h1>
          <button onClick={() => { setEditingLedger(null); setFormData({ name: '', phoneNumber: '', hasGST: false, gstNumber: '', stateCode: '' }); setShowModal(true); }} className="btn btn-primary">
            <FiPlus /> Add Ledger
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>GST Status</th>
                <th>Amount Balance</th>
                <th>Gold Fine Wt</th>
                <th>Silver Fine Wt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.map((ledger) => (
                <tr key={ledger._id}>
                  <td>{ledger.name}</td>
                  <td>{ledger.phoneNumber}</td>
                  <td>
                    <span className={`badge ${ledger.gstDetails?.hasGST ? 'badge-success' : 'badge-secondary'}`}>
                      {ledger.gstDetails?.hasGST ? '✅ Yes' : '❌ No'}
                    </span>
                  </td>
                  <td>₹{ledger.balances?.amount?.toFixed(2) || '0.00'}</td>
                  <td>{ledger.balances?.goldFineWeight?.toFixed(3) || '0.000'} g</td>
                  <td>{ledger.balances?.silverFineWeight?.toFixed(3) || '0.000'} g</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link to={`/ledgers/${ledger._id}`} className="btn btn-sm btn-secondary">
                        <FiEye /> View
                      </Link>
                      <button onClick={() => handleEdit(ledger)} className="btn btn-sm btn-secondary">
                        <FiEdit2 />
                      </button>
                      <button onClick={() => handleDelete(ledger)} className="btn btn-sm btn-danger" disabled={ledger.hasVouchers}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">{editingLedger ? 'Edit Ledger' : 'Add New Ledger'}</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-icon"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <FiX size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="input-group">
                    <label className="input-label">Name</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Phone Number</label>
                    <input
                      type="tel"
                      className="input"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      required
                    />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '15px', paddingTop: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={formData.hasGST}
                        onChange={(e) => {
                          setFormData({
                            ...formData, 
                            hasGST: e.target.checked,
                            gstNumber: e.target.checked ? formData.gstNumber : '',
                            stateCode: e.target.checked ? formData.stateCode : ''
                          });
                        }}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      <span>✅ Customer has GST</span>
                    </label>

                    {formData.hasGST && (
                      <div className="input-group">
                        <label className="input-label">GST Number *</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.gstNumber}
                          onChange={(e) => {
                            const gstNum = e.target.value.toUpperCase();
                            setFormData({
                              ...formData, 
                              gstNumber: gstNum,
                              stateCode: isValidGSTFormat(gstNum) ? extractStateFromGST(gstNum) : ''
                            });
                          }}
                          placeholder="15-digit GST format"
                          maxLength="15"
                          style={{
                            borderColor: formData.gstNumber && !isValidGSTFormat(formData.gstNumber) ? '#ff4757' : 'var(--border-color)',
                            borderWidth: formData.gstNumber && !isValidGSTFormat(formData.gstNumber) ? '2px' : '1px'
                          }}
                        />
                        {formData.gstNumber && !isValidGSTFormat(formData.gstNumber) && (
                          <small style={{ display: 'block', marginTop: '2px', color: '#ff4757', fontSize: '10px' }}>
                            Invalid GST format (expected 15 characters)
                          </small>
                        )}
                        {formData.gstNumber && isValidGSTFormat(formData.gstNumber) && formData.stateCode && (
                          <small style={{ display: 'block', marginTop: '2px', color: 'var(--color-success)', fontSize: '10px' }}>
                            ✓ Valid GST | State Code: {formData.stateCode}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={formData.hasGST && (!formData.gstNumber || !isValidGSTFormat(formData.gstNumber))}
                  >
                    {editingLedger ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
