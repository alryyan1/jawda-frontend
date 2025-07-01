// src/services/socketService.ts
import { io, Socket } from 'socket.io-client';

declare global {
  interface Window {
    socketService: SocketService;
  }
}

class SocketService {
  private static instance: SocketService;
  public socket: Socket | null = null;
  public isConfigured: boolean = false;
  public isConnected: boolean = false;

  private constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    try {
      // Check if socket functionality is disabled
      if (import.meta.env.VITE_DISABLE_SOCKET === 'true') {
        console.log('🔇 Socket functionality disabled via environment variable');
        this.isConfigured = false;
        return;
      }

      // Build the socket URL
      const scheme = import.meta.env.VITE_SOCKET_SCHEME || 'http';
      const host = import.meta.env.VITE_SOCKET_HOST || '127.0.0.1';
      const port = import.meta.env.VITE_SOCKET_PORT || '8080';
      const socketUrl = `${scheme}://${host}:${port}`;

      console.log('Initializing Socket.IO with config:', {
        url: socketUrl,
        scheme,
        host,
        port
      });

      // Initialize socket.io client
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3, // Reduced from 5 to fail faster
        reconnectionDelay: 1000,
        timeout: 10000, // Reduced from 20000 to fail faster
      });

      this.isConfigured = true;
      this.setupConnectionEvents();
      
      console.log('✅ Socket.IO client configured successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Socket.IO:', error);
      this.socket = null;
      this.isConfigured = false;
      this.isConnected = false;
    }
  }

  private setupConnectionEvents() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🟢 Successfully connected to WebSocket server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 WebSocket server disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Attempting to reconnect (${attemptNumber})`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection failed:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after maximum attempts');
      console.log('💡 Tip: Make sure your Socket.IO server is running on port 8080');
      console.log('💡 Run: npm run socket-server');
      this.isConnected = false;
    });

    // Add a timeout to detect if server is not available
    setTimeout(() => {
      if (!this.isConnected) {
        console.warn('⚠️ Socket.IO server not responding. Real-time features will be disabled.');
        console.log('💡 To enable real-time features:');
        console.log('   1. Install dependencies: npm install');
        console.log('   2. Start socket server: npm run socket-server');
        console.log('   3. Or disable socket features: Set VITE_DISABLE_SOCKET=true in .env');
      }
    }, 5000);
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public reconnect() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.warn('Error disconnecting previous socket instance:', error);
      }
    }
    this.initializeSocket();
  }

  public joinRoom(roomName: string) {
    if (!this.isConfigured || !this.socket) {
      console.warn(`Cannot join room '${roomName}': Socket service not configured`);
      return false;
    }

    if (!this.isConnected) {
      console.warn(`Cannot join room '${roomName}': Socket not connected`);
      return false;
    }

    try {
      console.log(`Joining room '${roomName}'...`);
      this.socket.emit('join', roomName);
      console.log(`✅ Joined room '${roomName}' successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error joining room '${roomName}':`, error);
      return false;
    }
  }

  public leaveRoom(roomName: string) {
    if (!this.socket) return false;

    try {
      console.log(`Leaving room '${roomName}'...`);
      this.socket.emit('leave', roomName);
      console.log(`✅ Left room '${roomName}' successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error leaving room '${roomName}':`, error);
      return false;
    }
  }

  public on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.socket) {
      console.warn(`Cannot listen to event '${event}': Socket not available`);
      return;
    }

    this.socket.on(event, callback);
  }

  public off(event: string, callback?: (...args: unknown[]) => void) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  public emit(event: string, ...args: unknown[]) {
    if (!this.socket) {
      console.warn(`Cannot emit event '${event}': Socket not available`);
      return;
    }

    this.socket.emit(event, ...args);
  }

  public getDebugInfo() {
    return {
      isConfigured: this.isConfigured,
      hasSocket: !!this.socket,
      isConnected: this.isConnected,
      socketConnected: this.socket?.connected || false,
      envVars: {
        VITE_SOCKET_SCHEME: import.meta.env.VITE_SOCKET_SCHEME || 'DEFAULT',
        VITE_SOCKET_HOST: import.meta.env.VITE_SOCKET_HOST || 'DEFAULT',
        VITE_SOCKET_PORT: import.meta.env.VITE_SOCKET_PORT || 'DEFAULT'
      }
    };
  }

  public getConnectionStatus() {
    if (!this.isConfigured || !this.socket) {
      return {
        isConnected: false,
        state: 'disconnected',
        details: 'Service not properly configured'
      };
    }

    const connectionState = this.socket.connected ? 'connected' : 'disconnected';
    
    return {
      isConnected: this.isConnected,
      state: connectionState,
      details: this.getConnectionStateDescription(connectionState)
    };
  }

  private getConnectionStateDescription(state: string): string {
    switch (state) {
      case 'connected': return '✅ Connected and ready';
      case 'connecting': return '🔄 Connecting to server...';
      case 'disconnected': return '❌ Disconnected from server';
      case 'unavailable': return '❌ Server unavailable';
      case 'failed': return '❌ Connection failed';
      case 'reconnecting': return '🔄 Reconnecting...';
      default: return `❓ Unknown state: ${state}`;
    }
  }

  public testConnection() {
    console.log('=== Socket Service Connection Test ===');
    const debugInfo = this.getDebugInfo();
    const connectionStatus = this.getConnectionStatus();
    
    console.log('Debug Info:', debugInfo);
    console.log('Connection Status:', connectionStatus);
    
    if (!this.isConfigured) {
      console.error('❌ Service not configured');
      return false;
    }
    
    if (!this.socket) {
      console.error('❌ Socket instance not available');
      return false;
    }
    
    if (!this.isConnected) {
      console.error('❌ Socket not connected');
      return false;
    }
    
    console.log('✅ All components available');
    console.log('Connection State:', connectionStatus.details);
    
    // Try to emit a test event
    try {
      this.socket.emit('test-connection');
      console.log('✅ Test event emitted successfully');
      return connectionStatus.isConnected;
    } catch (error) {
      console.error('❌ Failed to emit test event:', error);
      return false;
    }
  }
}

export const socketService = SocketService.getInstance();