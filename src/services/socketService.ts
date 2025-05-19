// src/services/socketService.ts (example)
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:6001'; // URL of your Laravel Echo Server
let socket: Socket;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Add any necessary options, like auth if your echo server requires it
    });

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });
  }
  return socket;
};