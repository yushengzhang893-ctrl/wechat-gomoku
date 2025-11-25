import { Move, OnlineMessage, Player } from '../types';

// Declare global PeerJS variable from CDN
declare const Peer: any;

type MessageCallback = (msg: OnlineMessage) => void;
type StatusCallback = (status: string) => void;

class OnlineService {
  private peer: any | null = null;
  private conn: any | null = null;
  private onMessageCallback: MessageCallback | null = null;
  private onStatusCallback: StatusCallback | null = null;

  // Generate a random short ID for the room
  generateRoomId(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  // Create a room (Host)
  createRoom(roomId: string, msgCallback: MessageCallback, statusCallback?: StatusCallback) {
    this.cleanup();
    this.onMessageCallback = msgCallback;
    this.onStatusCallback = statusCallback;
    
    // Initialize Peer with specific ID
    const peerId = `GOMOKU-${roomId}`;
    this.peer = new Peer(peerId);

    this.peer.on('open', (id: string) => {
      console.log('My peer ID is: ' + id);
      if (this.onStatusCallback) this.onStatusCallback('WAITING');
    });

    this.peer.on('connection', (conn: any) => {
      this.conn = conn;
      this.setupConnection();
      if (this.onStatusCallback) this.onStatusCallback('CONNECTED');
      
      // Notify UI that someone joined (simulate JOIN message locally for Host)
      if (this.onMessageCallback) {
          this.onMessageCallback({ type: 'JOIN' });
      }
    });

    this.peer.on('error', (err: any) => {
      console.error(err);
      alert("创建房间失败 (ID可能已被占用)，请重试");
    });
  }

  // Join a room (Guest)
  joinRoom(roomId: string, msgCallback: MessageCallback, statusCallback?: StatusCallback) {
    this.cleanup();
    this.onMessageCallback = msgCallback;
    this.onStatusCallback = statusCallback;

    // Guest doesn't need a specific ID
    this.peer = new Peer();

    this.peer.on('open', (id: string) => {
      const hostId = `GOMOKU-${roomId}`;
      console.log('Connecting to: ' + hostId);
      
      const conn = this.peer.connect(hostId);
      
      conn.on('open', () => {
        this.conn = conn;
        this.setupConnection();
        if (this.onStatusCallback) this.onStatusCallback('CONNECTED');
        
        // Send JOIN message to host? PeerJS connection event handles this on host side.
        // But we can send a hello
        this.sendMessage({ type: 'JOIN' }); // Guest tells host they are ready
      });
      
      conn.on('error', (err: any) => {
          console.error("Connection Error", err);
          alert("无法连接房间，请检查房间号");
      });
    });
  }

  private setupConnection() {
    if (!this.conn) return;

    this.conn.on('data', (data: any) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(data as OnlineMessage);
      }
    });

    this.conn.on('close', () => {
      if (this.onMessageCallback) {
        this.onMessageCallback({ type: 'LEAVE' });
      }
      this.cleanup();
    });
  }

  sendMessage(msg: OnlineMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  sendMove(move: Move, player: Player) {
    this.sendMessage({
      type: 'MOVE',
      payload: { move, player }
    });
  }

  cleanup() {
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
    this.conn = null;
    this.peer = null;
  }
  
  disconnect() {
      this.sendMessage({ type: 'LEAVE' });
      setTimeout(() => this.cleanup(), 100);
  }
}

export const onlineService = new OnlineService();