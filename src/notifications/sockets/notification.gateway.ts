import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>();

  handleConnection(socket: Socket) {
    console.log(`🟢 Socket connected: ${socket.id}`);
  }

  @SubscribeMessage('register')
  handleRegister(socket: Socket, userId: string) {
    this.userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    for (const [userId, sid] of this.userSocketMap.entries()) {
      if (sid === socket.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  }

  emitToUser(userId: string, payload: any): boolean {
    const socketId = this.userSocketMap.get(userId);
    if (!socketId) return false;

    this.server.to(socketId).emit('reminder', payload);
    return true;
  }
}
