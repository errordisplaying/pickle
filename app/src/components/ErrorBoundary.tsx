import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-warm-white min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <AlertTriangle
                className="w-14 h-14 text-[#C49A5C]"
                strokeWidth={1.5}
              />
            </div>

            <h1
              className="text-2xl font-semibold mb-3"
              style={{ color: '#1A1A1A' }}
            >
              something went wrong
            </h1>

            {this.state.error && (
              <p
                className="text-sm mb-8 leading-relaxed"
                style={{ color: '#6E6A60' }}
              >
                {this.state.error.message}
              </p>
            )}

            <button
              onClick={this.handleReset}
              className="bg-[#C49A5C] text-white hover:bg-[#8B6F3C] rounded-full px-8 py-3 text-sm font-medium transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
