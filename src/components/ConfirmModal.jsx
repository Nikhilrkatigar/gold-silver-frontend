import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FiTrash2, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { overlayMotion, panelMotion } from './ConfirmDialog';

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
const variants = {
    danger: { color: 'var(--color-danger)', Icon: FiTrash2, btn: 'btn-danger' },
    warning: { color: 'var(--color-warning)', Icon: FiAlertTriangle, btn: 'btn-primary' },
    info: { color: 'var(--color-info)', Icon: FiInfo, btn: 'btn-primary' }
};

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

    useEffect(() => {
        if (open) setInputValue('');
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onCancel]);

    const v = variants[variant] || variants.danger;
    const blocked = showInput && inputRequired && !inputValue.trim();

    const handleConfirm = () => {
        if (blocked) return;
        onConfirm(showInput ? inputValue.trim() : undefined);
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="modal-overlay" onClick={onCancel} style={{ zIndex: 9999, animation: 'none' }} {...overlayMotion}>
                    <motion.div
                        className="modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-modal-title"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '420px', animation: 'none' }}
                        {...panelMotion}
                    >
                        <div className="modal-body">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: v.color, background: 'var(--bg-tertiary)'
                                }}>
                                    <v.Icon size={20} aria-hidden="true" />
                                </div>
                                <h3 id="confirm-modal-title" className="modal-title">{title}</h3>
                            </div>

                            {message && (
                                <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                                    {message}
                                </p>
                            )}

                            {showInput && (
                                <div className="input-group">
                                    {inputLabel && (
                                        <label className="input-label" htmlFor="confirm-modal-input">
                                            {inputLabel} {inputRequired && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                                        </label>
                                    )}
                                    <input
                                        id="confirm-modal-input"
                                        type="text"
                                        className="input"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                        placeholder="Type here..."
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={onCancel} className="btn btn-secondary">
                                {cancelText}
                            </button>
                            <button type="button" onClick={handleConfirm} className={`btn ${v.btn}`} disabled={blocked} autoFocus={!showInput}>
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
