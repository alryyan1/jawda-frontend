// src/services/realtimeService.ts
import { io, Socket } from 'socket.io-client';
import type { Patient } from '@/types/patients';
import type { DoctorVisit, LabRequest } from '@/types/visits';
import type { SysmexResultEventData } from '@/types/sysmex';
import { realtimeUrlFromConstants } from '@/pages/constants';

class RealtimeService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second

  constructor() {
    this.connect();
  }

  private connect(): void {
      const realtimeUrl = import.meta.env.VITE_REALTIME_URL || realtimeUrlFromConstants;
    
    this.socket = io(realtimeUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to realtime server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from realtime server:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Subscribe to patient-registered events
  public onPatientRegistered(callback: (patient: Patient) => void): void {
    if (this.socket) {
      this.socket.on('patient-registered', (data: { patient: Patient }) => {
        console.log('Received patient-registered event:', data);
        callback(data.patient);
      });
    }
  }

  // Unsubscribe from patient-registered events
  public offPatientRegistered(callback?: (patient: Patient) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off('patient-registered', callback);
      } else {
        this.socket.off('patient-registered');
      }
    }
  }

  // Subscribe to lab-payment events
  public onLabPayment(callback: (data: { visit: DoctorVisit; patient: Patient; labRequests: LabRequest[] }) => void): void {
    if (this.socket) {
      this.socket.on('lab-payment', (data: { visit: DoctorVisit; patient: Patient; labRequests: LabRequest[] }) => {
        console.log('Received lab-payment event:', data);
        callback(data);
      });
    }
  }

  // Unsubscribe from lab-payment events
  public offLabPayment(callback?: (data: { visit: DoctorVisit; patient: Patient; labRequests: LabRequest[] }) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off('lab-payment', callback);
      } else {
        this.socket.off('lab-payment');
      }
    }
  }

  // Subscribe to general shift open event
  public onOpenGeneralShift(callback: (data: { user_id?: number; user_name?: string; opened_at?: string }) => void): void {
    if (this.socket) {
      this.socket.on('open-general-shift', (data: any) => {
        console.log('Received open-general-shift event:', data);
        callback(data || {});
      });
    }
  }

  // Unsubscribe from general shift open event
  public offOpenGeneralShift(callback?: (data: { user_id?: number; user_name?: string; opened_at?: string }) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off('open-general-shift', callback as any);
      } else {
        this.socket.off('open-general-shift');
      }
    }
  }

  // Subscribe to general shift close event
  public onCloseGeneralShift(callback: (data: { user_id?: number; user_name?: string; shift_id?: number; closed_at?: string }) => void): void {
    if (this.socket) {
      this.socket.on('close-general-shift', (data: any) => {
        console.log('Received close-general-shift event:', data);
        callback(data || {});
      });
    }
  }

  // Unsubscribe from general shift close event
  public offCloseGeneralShift(callback?: (data: { user_id?: number; user_name?: string; shift_id?: number; closed_at?: string }) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off('close-general-shift', callback as any);
      } else {
        this.socket.off('close-general-shift');
      }
    }
  }

  // Subscribe to sysmex-result-inserted events
  public onSysmexResultInserted(callback: (data: SysmexResultEventData) => void): void {
    if (this.socket) {
      this.socket.on('sysmex-result-inserted', (data: SysmexResultEventData) => {
        console.log('Received sysmex-result-inserted event:', data);
        callback(data);
      });
    }
  }

  // Unsubscribe from sysmex-result-inserted events
  public offSysmexResultInserted(callback?: (data: SysmexResultEventData) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off('sysmex-result-inserted', callback);
      } else {
        this.socket.off('sysmex-result-inserted');
      }
    }
  }

  // Check if connected
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Disconnect
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Create a singleton instance
const realtimeService = new RealtimeService();

export default realtimeService;
