import { io, Socket } from "socket.io-client";

interface SocketServiceConfig {
  url: string;
  options?: any;
}

interface HL7TestResult {
  success: boolean;
  message?: string;
  error?: string;
  response?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private config: SocketServiceConfig;

  constructor(config: SocketServiceConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.config.url, {
          transports: ["websocket", "polling"],
          timeout: 10000,
          ...this.config.options,
        });

        this.socket.on("connect", () => {
          console.log("Socket connected:", this.socket?.id);
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          reject(error);
        });

        this.socket.on("disconnect", (reason) => {
          console.log("Socket disconnected:", reason);
        });

        this.socket.on("error", (error) => {
          console.error("Socket error:", error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Send HL7 message for testing
  async sendHL7Message(message: string): Promise<HL7TestResult> {
    alert("Sending HL7 message from frontend");
    console.log(this.socket, "socket", this.socket?.connected, "connected");
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({
          success: false,
          error: "Socket not connected",
        });
        return;
      }

      // Set up a one-time listener for the response
      const responseHandler = (result: HL7TestResult) => {
        this.socket?.off("hl7-test-response", responseHandler);
        resolve(result);
      };

      this.socket.on("hl7-test-response", responseHandler);

      // Send the HL7 message
      this.socket.emit("hl7-test-message", { message });

      // Set a timeout for the response
      setTimeout(() => {
        this.socket?.off("hl7-test-response", responseHandler);
        resolve({
          success: false,
          error: "Timeout waiting for response",
        });
      }, 10000); // 10 second timeout
    });
  }

  // Listen for HL7 messages from the server
  onHL7Message(callback: (message: string) => void): void {
    if (this.socket) {
      this.socket.on("hl7-message", callback);
    }
  }

  // Remove HL7 message listener
  offHL7Message(callback: (message: string) => void): void {
    if (this.socket) {
      this.socket.off("hl7-message", callback);
    }
  }

  // Join a room for specific HL7 device testing
  joinRoom(room: string): void {
    if (this.socket) {
      this.socket.emit("join", room);
    }
  }

  // Leave a room
  leaveRoom(room: string): void {
    if (this.socket) {
      this.socket.emit("leave", room);
    }
  }

  // Generic event listener
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Generic event remover
  off(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Create a singleton instance
const socketService = new SocketService({
  url: import.meta.env.VITE_REALTIME_SERVER_URL || "http://192.168.100.12:4001",
  options: {
    autoConnect: true,
  },
});

export default socketService;
export { SocketService, type HL7TestResult };
