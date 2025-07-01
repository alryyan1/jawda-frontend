import { useState, useEffect } from 'react';
import { socketService } from '@/services/socketService';

interface ConnectionStatus {
  isConnected: boolean;
  state: string;
  details: string;
}

export const useConnectionStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    state: 'unknown',
    details: 'Checking connection...'
  });

  useEffect(() => {
    // Initial status check
    const updateStatus = () => {
      const currentStatus = socketService.getConnectionStatus();
      setStatus(currentStatus);
    };

    updateStatus();

    // Set up event listeners if socket service is configured
    if (socketService.isConfigured && socketService.socket) {
      // Listen to connection events
      const onConnect = () => {
        console.log('🟢 WebSocket connected successfully!');
        updateStatus();
      };

      const onDisconnect = () => {
        console.log('🔴 WebSocket disconnected');
        updateStatus();
      };

      const onConnectError = (error: unknown) => {
        console.error('🔴 WebSocket connection error:', error);
        updateStatus();
      };

      const onReconnect = () => {
        console.log('🟢 WebSocket reconnected successfully!');
        updateStatus();
      };

      // Bind to connection events
      socketService.on('connect', onConnect);
      socketService.on('disconnect', onDisconnect);
      socketService.on('connect_error', onConnectError);
      socketService.on('reconnect', onReconnect);

      // Cleanup function
      return () => {
        socketService.off('connect', onConnect);
        socketService.off('disconnect', onDisconnect);
        socketService.off('connect_error', onConnectError);
        socketService.off('reconnect', onReconnect);
      };
    }

    // If not configured, check periodically
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return status;
}; 