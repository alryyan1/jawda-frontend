// src/services/realtimeService.ts
import { io, Socket } from 'socket.io-client';
import type { Patient } from '@/types/patients';
import type { DoctorVisit, LabRequest } from '@/types/visits';
import type { SysmexResultEventData } from '@/types/sysmex';

interface BankakImageEventData {
  id: number;
  image_url: string;
  full_image_url: string;
  phone: string;
  doctorvisit_id: number | null;
  patient_name: string;
  created_at: string;
  created_at_human: string;
}
import { realtimeUrlFromConstants } from '@/pages/constants';

class RealtimeService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second

  constructor() {
    // Only connect if not already connected
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
  }

  private connect(): void {
    // Don't create a new connection if one already exists and is connected
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected, skipping new connection');
      return;
    }

    const realtimeUrl = import.meta.env.VITE_REALTIME_URL || realtimeUrlFromConstants;
    
    this.socket = io(realtimeUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false, // Don't force new connections
      autoConnect: true,
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
      this.socket.on('open-general-shift', (data: { user_id?: number; user_name?: string; opened_at?: string }) => {
        console.log('Received open-general-shift event:', data);
        callback(data || {});
      });
    }
  }

  // Unsubscribe from general shift open event
  public offOpenGeneralShift(callback?: (data: { user_id?: number; user_name?: string; opened_at?: string }) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off('open-general-shift', callback);
      } else {
        this.socket.off('open-general-shift');
      }
    }
  }

  // Subscribe to general shift close event
  public onCloseGeneralShift(callback: (data: { user_id?: number; user_name?: string; shift_id?: number; closed_at?: string }) => void): void {
    if (this.socket) {
      this.socket.on('close-general-shift', (data: { user_id?: number; user_name?: string; shift_id?: number; closed_at?: string }) => {
        console.log('Received close-general-shift event:', data);
        callback(data || {});
      });
    }
  }

  // Unsubscribe from general shift close event
  public offCloseGeneralShift(callback?: (data: { user_id?: number; user_name?: string; shift_id?: number; closed_at?: string }) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off('close-general-shift', callback);
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

  // Subscribe to bankak-image-inserted events
  public onBankakImageInserted(callback: (data: BankakImageEventData) => void): void {
    if (this.socket) {
      const eventHandler = (data: BankakImageEventData) => {
        console.log('Received bankak-image-inserted event:', data);
        callback(data);
      };
      
      // Store the handler so we can remove it later
      (callback as any).__eventHandler = eventHandler;
      this.socket.on('bankak-image-inserted', eventHandler);
    }
  }

  // Unsubscribe from bankak-image-inserted events
  public offBankakImageInserted(callback?: (data: BankakImageEventData) => void): void {
    if (this.socket) {
      if (callback && (callback as any).__eventHandler) {
        this.socket.off('bankak-image-inserted', (callback as any).__eventHandler);
        delete (callback as any).__eventHandler;
      } else {
        this.socket.off('bankak-image-inserted');
      }
    }
  }

  // Print services receipt
  public async printServicesReceipt(visitId: number, patientId?: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const realtimeUrl = import.meta.env.VITE_REALTIME_URL || realtimeUrlFromConstants;
      const response = await fetch(`http://localhost:4002/emit/print-services-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': import.meta.env.VITE_SERVER_AUTH_TOKEN || 'changeme',
        },
        body: JSON.stringify({
          visit_id: visitId,
          patient_id: patientId,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, message: result.message };
      } else {
        return { success: false, error: result.error || 'Failed to print services receipt' };
      }
    } catch (error) {
      console.error('Error printing services receipt:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  // Check if connected
  public getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Get socket instance safely
  public getSocket(): Socket | null {
    return this.socket;
  }

  // Disconnect
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners(); // Clean up all event listeners
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Create a singleton instance
const realtimeService = new RealtimeService();

export default realtimeService;
