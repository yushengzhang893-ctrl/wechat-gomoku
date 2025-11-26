import type { Move, OnlineMessage, Player } from '../types';

// 正确的导入方式
import Peer, { DataConnection } from 'peerjs';

type MessageCallback = (msg: OnlineMessage) => void;
type StatusCallback = (status: string) => void;

class OnlineService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onMessageCallback: MessageCallback | null = null;
  private onStatusCallback: StatusCallback | null | undefined = null;
  private isHost: boolean = false;

  // 生成随机房间ID
  generateRoomId(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  // 创建房间（主机）
  async createRoom(roomId: string, msgCallback: MessageCallback, statusCallback?: StatusCallback): Promise<void> {
    try {
      this.cleanup();
      this.isHost = true;
      this.onMessageCallback = msgCallback;
      this.onStatusCallback = statusCallback || null;
      
      const peerId = `gomoku-${roomId}`;
      
      this.peer = new Peer(peerId, {
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      return new Promise((resolve, reject) => {
        if (!this.peer) return reject(new Error('Peer not initialized'));

        this.peer.on('open', (id: string) => {
          console.log('Host peer ID:', id);
          if (this.onStatusCallback) this.onStatusCallback('WAITING');
          resolve();
        });

        this.peer.on('connection', (conn: DataConnection) => {
          this.conn = conn;
          this.setupConnection();
          if (this.onStatusCallback) this.onStatusCallback('CONNECTED');
        });

        this.peer.on('error', (err: any) => {
          console.error('Peer error:', err);
          if (this.onStatusCallback) this.onStatusCallback('ERROR');
          reject(err);
        });
      });
    } catch (error) {
      console.error('Create room error:', error);
      throw error;
    }
  }

  // 加入房间（客户端）
  async joinRoom(roomId: string, msgCallback: MessageCallback, statusCallback?: StatusCallback): Promise<void> {
    try {
      this.cleanup();
      this.isHost = false;
      this.onMessageCallback = msgCallback;
      this.onStatusCallback = statusCallback || null;

      this.peer = new Peer({
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      return new Promise((resolve, reject) => {
        if (!this.peer) return reject(new Error('Peer not initialized'));

        this.peer.on('open', (id: string) => {
          console.log('Client peer ID:', id);
          const hostId = `gomoku-${roomId}`;
          
          if (this.onStatusCallback) this.onStatusCallback('CONNECTING');
          
          this.conn = this.peer!.connect(hostId, {
            reliable: true,
            serialization: 'json'
          });

          this.conn.on('open', () => {
            console.log('Connected to host');
            if (this.onStatusCallback) this.onStatusCallback('CONNECTED');
            this.setupConnection();
            resolve();
          });

          this.conn.on('error', (err: any) => {
            console.error('Connection error:', err);
            if (this.onStatusCallback) this.onStatusCallback('ERROR');
            reject(err);
          });
        });

        this.peer.on('error', (err: any) => {
          console.error('Peer error:', err);
          if (this.onStatusCallback) this.onStatusCallback('ERROR');
          reject(err);
        });
      });
    } catch (error) {
      console.error('Join room error:', error);
      throw error;
    }
  }

  private setupConnection(): void {
    if (!this.conn) return;

    this.conn.on('data', (data: any) => {
      console.log('Received data:', data);
      if (this.onMessageCallback) {
        this.onMessageCallback(data as OnlineMessage);
      }
    });

    this.conn.on('close', () => {
      console.log('Connection closed');
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: 'LEAVE' });
      }
      if (this.onStatusCallback) this.onStatusCallback('DISCONNECTED');
      this.cleanup();
    });

    this.conn.on('error', (err: any) => {
      console.error('Connection error:', err);
      if (this.onStatusCallback) this.onStatusCallback('ERROR');
    });
  }

  sendMessage(msg: OnlineMessage): boolean {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
        return true;
      } catch (error) {
        console.error('Send message error:', error);
        return false;
      }
    }
    return false;
  }

  sendMove(move: Move, player: Player): boolean {
    return this.sendMessage({
      type: 'MOVE',
      payload: { move, player }
    });
  }

  getIsHost(): boolean {
    return this.isHost;
  }

  cleanup(): void {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isHost = false;
  }

  disconnect(): void {
    this.sendMessage({ type: 'LEAVE' });
    setTimeout(() => this.cleanup(), 100);
  }
}

export const onlineService = new OnlineService();