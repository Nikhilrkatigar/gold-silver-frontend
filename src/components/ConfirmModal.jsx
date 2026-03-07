import React, { useState, useEffect } from 'react';

/**
 * Modern confirmation modal that replaces window.confirm / window.prompt.
 *
 * Props:
 *  - open        : boolean
 *  - title       : string
 *  - message     : string
 *  - confirmText : string (default "Yes")
 *  - cancelText  : string (default "No")
 *  - variant     : 'danger' | 'warning' | 'info' (default 'danger')
 *  - showInput   : boolean — show a text input (like prompt)
 *  - inputLabel  : string
 *  - inputRequired : boolean
 *  - onConfirm   : (inputValue?: string) => void
 *  - onCancel    : () => void
 */
const ConfirmModal = ({
    open,
    title = 'Are you sure?',
    message = '',
    confirmText = 'Yes',
    cancelText = 'No',
    variant = 'danger',
    showInput = false,
    inputLabel = '',
    inputRequired = false,
    onConfirm,
    onCancel
}) => {
    const [inputValue, setInputValue] = useState('');
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (open) {
            setInputValue('');
            // Small delay for mount animation
            requestAnimationFrame(() => setAnimating(true));
        } else {
            setAnimating(false);
        }
    }, [open]);

    if (!open) return null;

    const colors = {
        danger: { bg: '#fee2e2', accent: '#ef4444', text: '#991b1b', icon: '🗑️' },
        warning: { bg: '#fef3c7', accent: '#f59e0b', text: '#92400e', icon: '⚠️' },
        info: { bg: '#dbeafe', accent: '#3b82f6', text: '#1e40af', icon: 'ℹ️' }
    };
    const c = colors[variant] || colors.danger;

    const handleConfirm = () => {
        if (showInput && inputRequired && !inputValue.trim()) return;
        onConfirm(showInput ? inputValue.trim() : undefined);
    };

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: animating ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
                transition: 'background-color 0.2s ease',
                padding: '1rem'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-primary, #fff)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    maxWidth: '420px',
                    width: '100%',
                    overflow: 'hidden',
                    transform: animating ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
                    opacity: animating ? 1 : 0,
                    transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease'
                }}
            >
                {/* Accent bar */}
                <div style={{ height: '4px', backgroundColor: c.accent }} />

                <div style={{ padding: '1.5rem' }}>
                    {/* Icon + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            backgroundColor: c.bg, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0
                        }}>
                            {c.icon}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
                    </div>

                    {/* Message */}
                    {message && (
                        <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary, #6b7280)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            {message}
                        </p>
                    )}

                    {/* Optional input */}
                    {showInput && (
                        <div style={{ marginBottom: '1rem' }}>
                            {inputLabel && (
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {inputLabel} {inputRequired && <span style={{ color: c.accent }}>*</span>}
                                </label>
                            )}
                            <input
                                type="text"
                                className="input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type here..."
                                autoFocus
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onCancel}
                            className="btn"
                            style={{
                                padding: '0.6rem 1.25rem', borderRadius: '10px',
                                fontWeight: 600, fontSize: '0.9rem',
                                border: '1px solid var(--border-color, #e5e7eb)'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="btn"
                            disabled={showInput && inputRequired && !inputValue.trim()}
                            style={{
                                padding: '0.6rem 1.25rem', borderRadius: '10px',
                                fontWeight: 600, fontSize: '0.9rem',
                                backgroundColor: c.accent, color: '#fff',
                                border: 'none', cursor: 'pointer',
                                opacity: (showInput && inputRequired && !inputValue.trim()) ? 0.5 : 1
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
