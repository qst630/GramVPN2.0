import React from 'react';
import { Wifi, WifiOff, Database, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  error?: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected, error }) => {
  // Don't show anything if no Supabase configured (not an error state)
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '20px',
        fontSize: '10px',
        color: '#f59e0b',
        background: 'rgba(245, 158, 11, 0.1)',
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <AlertCircle size={10} />
        DEMO MODE
      </div>
    );
  }

  if (isConnected) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '20px',
        fontSize: '10px',
        color: '#10b981',
        background: 'rgba(16, 185, 129, 0.1)',
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <Database size={10} />
        CONNECTED
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '20px',
      fontSize: '10px',
      color: '#ef4444',
      background: 'rgba(239, 68, 68, 0.1)',
      padding: '4px 8px',
      borderRadius: '6px',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <WifiOff size={10} />
      {error ? 'ERROR' : 'DISCONNECTED'}
    </div>
  );
};