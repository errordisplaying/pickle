import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
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
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-warm-white min-h-[200px] flex items-center justify-center px-6 py-12">
          <div className="max-w-sm w-full text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle
                className="w-10 h-10 text-[#C49A5C]"
                strokeWidth={1.5}
              />
            </div>

            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: '#1A1A1A' }}
            >
              something went wrong
            </h3>

            <p
              className="text-sm mb-6 leading-relaxed"
              style={{ color: '#6E6A60' }}
            >
              {this.state.error?.message || 'This section couldn\u2019t load properly.'}
            </p>

            <button
              onClick={this.handleReset}
              className="bg-[#C49A5C] text-white hover:bg-[#8B6F3C] rounded-full px-6 py-2.5 text-sm font-medium transition-colors duration-200"
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
