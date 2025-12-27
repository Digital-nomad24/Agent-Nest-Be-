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

  /**
   * userId -> socketId
   */
  private userSocketMap = new Map<string, string>();

  // --------------------------------------------------
  // Socket connected
  // --------------------------------------------------
  handleConnection(socket: Socket) {
    console.log(`🟢 Socket connected: ${socket.id}`);
  }

  // --------------------------------------------------
  // Frontend registers userId manually
  // socket.emit('register', userId)
  // --------------------------------------------------
  @SubscribeMessage('register')
  handleRegister(socket: Socket, userId: string) {
    if (!userId) {
      console.warn(
        `⚠️ register called without userId from socket ${socket.id}`,
      );
      return;
    }

    this.userSocketMap.set(userId, socket.id);

    console.log(
      `✅ User registered | userId=${userId} | socketId=${socket.id}`,
    );

    console.log(
      `📦 Current socket map size: ${this.userSocketMap.size}`,
    );
  }

  // --------------------------------------------------
  // Socket disconnected
  // --------------------------------------------------
  handleDisconnect(socket: Socket) {
    let removedUserId: string | null = null;

    for (const [userId, sid] of this.userSocketMap.entries()) {
      if (sid === socket.id) {
        removedUserId = userId;
        this.userSocketMap.delete(userId);
        break;
      }
    }

    if (removedUserId) {
      console.log(
        `🔴 Socket disconnected | userId=${removedUserId} | socketId=${socket.id}`,
      );
    } else {
      console.log(
        `🔴 Socket disconnected (unregistered) | socketId=${socket.id}`,
      );
    }
  }

  // --------------------------------------------------
  // Emit notification to specific user
  // --------------------------------------------------
  emitToUser(userId: string, payload: any): boolean {
    const socketId = this.userSocketMap.get(userId);

    if (!socketId) {
      console.warn(
        `⚠️ emitToUser failed | userId=${userId} | reason=No active socket`,
      );
      return false;
    }

    console.log(
      `📤 Emitting reminder | userId=${userId} | socketId=${socketId}`,
    );

    this.server.to(socketId).emit('reminder', payload);
    return true;
  }
}
