import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in UI:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    if (window.confirm('Bersihkan cache lokal dan muat ulang aplikasi? Data transaksi di IndexedDB & Google Drive akan tetap aman.')) {
      try {
        localStorage.removeItem('gdrive_cached_file_id');
        localStorage.removeItem('gdrive_token_timestamp');
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-5">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Terjadi Kendala Tampilan</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplikasi mendeteksi gangguan pada proses rendering. Anda dapat memuat ulang aplikasi untuk kembali melanjutkan pekerjaan.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-left text-xs font-mono text-rose-300 max-h-36 overflow-auto select-text">
                <p className="font-bold text-[11px] text-slate-400 mb-1">Rincian Error:</p>
                <p className="text-[11px] leading-relaxed break-words">{this.state.error.toString()}</p>
              </div>
            )}

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <RefreshCw className="h-4 w-4" />
                Muat Ulang Halaman
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
              >
                <Trash2 className="h-4 w-4" />
                Bersihkan Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
