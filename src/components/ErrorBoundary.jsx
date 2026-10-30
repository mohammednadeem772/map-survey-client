// Last-resort safety net for an uncaught render error. Without this, React
// unmounts the whole tree on a crash and the page goes blank/unresponsive
// with no way to recover except knowing to manually type a URL — which
// looks exactly like the "stuck, nothing responds" reports: clicking a nav
// link or the browser back button changes the route, but the crashed tree
// never renders anything for it. This swaps in a plain "something broke"
// screen with a real page reload instead of leaving the user stranded.
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>The app hit an unexpected error. Reloading usually fixes it; your saved data is safe.</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
