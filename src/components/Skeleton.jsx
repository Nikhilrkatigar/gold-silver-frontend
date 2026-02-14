import React from 'react';

// Skeleton Card Component
export const SkeletonCard = ({ count = 1 }) => {
    return (
        <>
            {[...Array(count)].map((_, i) => (
                <div key={i} className="card skeleton-card" style={{ marginBottom: '1rem' }}>
                    <div className="skeleton skeleton-title" style={{ width: '60%', height: '24px', marginBottom: '12px' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '40%', height: '16px', marginBottom: '8px' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '80%', height: '16px' }}></div>
                </div>
            ))}
        </>
    );
};

// Skeleton Table Component
export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        {[...Array(columns)].map((_, i) => (
                            <th key={i}>
                                <div className="skeleton" style={{ width: '80%', height: '16px' }}></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {[...Array(rows)].map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {[...Array(columns)].map((_, colIndex) => (
                                <td key={colIndex}>
                                    <div className="skeleton" style={{ width: '90%', height: '16px' }}></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Skeleton Stat Card (for summary cards)
export const SkeletonStat = ({ count = 3 }) => {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${count}, 1fr)`,
            gap: '16px',
            marginBottom: '32px',
            padding: '16px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px'
        }}>
            {[...Array(count)].map((_, i) => (
                <div key={i} style={{
                    padding: '12px',
                    background: 'var(--bg-primary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                }}>
                    <div className="skeleton" style={{ width: '50%', height: '14px', marginBottom: '8px' }}></div>
                    <div className="skeleton" style={{ width: '70%', height: '24px' }}></div>
                </div>
            ))}
        </div>
    );
};

// Skeleton Text Lines
export const SkeletonText = ({ lines = 3 }) => {
    return (
        <div>
            {[...Array(lines)].map((_, i) => (
                <div
                    key={i}
                    className="skeleton"
                    style={{
                        width: i === lines - 1 ? '60%' : '100%',
                        height: '16px',
                        marginBottom: '8px'
                    }}
                ></div>
            ))}
        </div>
    );
};

export default {
    SkeletonCard,
    SkeletonTable,
    SkeletonStat,
    SkeletonText
};
