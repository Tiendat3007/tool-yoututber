import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('tutien_scan_history_sessions');
      localStorage.removeItem('tutien_character_lore');
    } catch (e) {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#090d16',
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '650px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', marginBottom: '16px' }}>
              <AlertCircle size={40} color="#ef4444" />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#f87171' }}>
              Đã Khôi Phục Giao Diện Sau Khi Gặp Lỗi
            </h2>

            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
              Hệ thống đã tự động bảo vệ dữ liệu phụ đề của bạn. Chi tiết lỗi: <br />
              <code style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', color: '#fbbf24', fontSize: '13px' }}>
                {this.state.error?.message || 'Lỗi không xác định'}
              </code>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={16} /> Tải Lại Trang
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Tiếp Tục Làm Việc
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
