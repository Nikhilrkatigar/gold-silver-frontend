import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false
}) {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
                animation: 'fadeIn 0.2s ease-in-out'
            }}
        >
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '450px',
                    width: '90%',
                    animation: 'slideIn 0.3s ease-out'
                }}
            >
                <div className="modal-header" style={{
                    borderBottom: danger ? '3px solid var(--color-danger)' : '3px solid var(--color-primary)',
                    paddingBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {danger && (
                            <FiAlertTriangle
                                size={28}
                                style={{ color: 'var(--color-danger)' }}
                            />
                        )}
                        <h3 className="modal-title" style={{ margin: 0 }}>{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-icon"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem'
                        }}
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '1.5rem 1.25rem' }}>
                    <p style={{
                        margin: 0,
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: 'var(--color-text)'
                    }}>
                        {message}
                    </p>
                </div>

                <div className="modal-footer" style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ minWidth: '100px' }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={danger ? 'btn btn-danger' : 'btn btn-primary'}
                        style={{ minWidth: '100px' }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            transform: translateY(-20px) scale(0.95);
            opacity: 0;
          }
          to { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
        </div>
    );
}
