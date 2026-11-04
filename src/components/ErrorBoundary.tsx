import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Shows the real error on the page instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Portfolio render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{ minHeight: '100svh', background: '#0b0b0e', color: '#ece8df', padding: '32px', fontFamily: 'monospace' }}>
        <h1 style={{ fontSize: '20px' }}>Something broke while loading the portfolio</h1>
        <p style={{ color: '#8d8c96' }}>Copy this message and send it back:</p>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#f0a0a0' }}>
          {error.name}: {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
      </div>
    );
  }
}
