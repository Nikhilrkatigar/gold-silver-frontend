import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

export const overlayMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18, ease: 'easeOut' }
};

export const panelMotion = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 16 },
    transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }
};

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
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="modal-overlay"
                    onClick={onClose}
                    style={{ zIndex: 9999, animation: 'none' }}
                    {...overlayMotion}
                >
                    <motion.div
                        className="modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '440px', animation: 'none' }}
                        {...panelMotion}
                    >
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {danger && <FiAlertTriangle size={22} style={{ color: 'var(--color-danger)' }} aria-hidden="true" />}
                                <h3 id="confirm-dialog-title" className="modal-title">{title}</h3>
                            </div>
                            <button type="button" onClick={onClose} className="btn btn-icon" aria-label="Close">
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{message}</p>
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="btn btn-secondary">
                                {cancelText}
                            </button>
                            <button type="button" onClick={handleConfirm} className={danger ? 'btn btn-danger' : 'btn btn-primary'} autoFocus>
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
