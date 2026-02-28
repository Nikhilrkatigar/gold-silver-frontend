import React, { useState, useEffect } from 'react';

const PullToRefresh = ({ onRefresh, children }) => {
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const threshold = 80; // Pull distance needed to trigger refresh

    const handleTouchStart = (e) => {
        // Only allow pull-to-refresh when scrolled to top
        if (window.scrollY === 0) {
            setStartY(e.touches[0].clientY);
            setIsPulling(true);
        }
    };

    const handleTouchMove = (e) => {
        if (!isPulling || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const distance = currentY - startY;

        if (distance > 0 && window.scrollY === 0) {
            setPullDistance(Math.min(distance, threshold * 1.5));
            // Prevent default scrolling when pulling
            if (distance > 10) {
                e.preventDefault();
            }
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling) return;

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } catch (error) {
                console.error('Refresh error:', error);
            } finally {
                setIsRefreshing(false);
            }
        }

        setIsPulling(false);
        setPullDistance(0);
        setStartY(0);
    };

    useEffect(() => {
        const element = document.body;
        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isPulling, pullDistance, startY, isRefreshing]);

    const pullProgress = Math.min(pullDistance / threshold, 1);
    const showIndicator = isPulling && pullDistance > 10;

    return (
        <>
            {/* Pull-to-refresh indicator */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `translateY(${showIndicator || isRefreshing ? pullDistance - 60 : -60}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s ease',
                    zIndex: 999,
                    pointerEvents: 'none'
                }}
            >
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--bg-primary)',
                        boxShadow: 'var(--shadow-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `rotate(${pullProgress * 360}deg)`,
                        transition: isRefreshing ? 'none' : 'transform 0.2s ease'
                    }}
                >
                    {isRefreshing ? (
                        <div className="loading" style={{ borderTopColor: 'var(--color-primary)' }}></div>
                    ) : (
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-primary)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                    )}
                </div>
            </div>

            {/* Content */}
            {children}
        </>
    );
};

export default PullToRefresh;
