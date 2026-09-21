import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by AI Clipzone ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d1424] border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
              केही प्राविधिक समस्या आयो
            </h1>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              चिन्ता नगर्नुहोस्, तपाईंको डाटा सुरक्षित छ। कृपया एपलाई पुनः लोड गर्नुहोस्।
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition active:scale-95 shadow-lg shadow-amber-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                पुनः लोड गर्नुहोस् (Reload)
              </button>
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition active:scale-95 border border-white/10"
              >
                <Home className="w-4 h-4" />
                गृहपृष्ठ (Home)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
