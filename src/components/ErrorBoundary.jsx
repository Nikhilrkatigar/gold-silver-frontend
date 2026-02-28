import React from 'react';

/**
 * ErrorBoundary — catches any unhandled render error in child components
 * and shows a friendly fallback instead of a blank white screen.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '2rem',
                    fontFamily: 'Arial, sans-serif',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    color: 'var(--text-primary, #333)'
                }}>
                    <div style={{
                        maxWidth: '480px',
                        textAlign: 'center',
                        padding: '2.5rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #e0e0e0)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
                    }}>
                        {/* Icon */}
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>

                        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem', fontWeight: '700' }}>
                            Something went wrong
                        </h2>
                        <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.95rem' }}>
                            The application encountered an unexpected error.
                        </p>

                        {/* Error detail — dev only */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{
                                margin: '1rem 0',
                                padding: '0.75rem',
                                backgroundColor: '#fff3cd',
                                border: '1px solid #ffc107',
                                borderRadius: '6px',
                                textAlign: 'left',
                                fontSize: '0.8rem'
                            }}>
                                <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Error details</summary>
                                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '0.6rem 1.4rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color, #ccc)',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '0.6rem 1.4rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#f59e0b',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600'
                                }}
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
