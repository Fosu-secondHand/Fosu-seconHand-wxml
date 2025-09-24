// WebSocket连接管理服务
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000; // 3秒
    this.heartbeatInterval = 30000; // 30秒心跳
    this.heartbeatTimer = null;
    this.messageQueue = []; // 消息队列
    this.listeners = new Map(); // 事件监听器
    this.currentUserId = 'currentUserID';
  }

  // 连接WebSocket
  connect(url) {
    return new Promise((resolve, reject) => {
      try {
        this.socket = wx.connectSocket({
          url: url,
          success: () => {
            console.log('WebSocket连接请求已发送');
          },
          fail: (error) => {
            console.error('WebSocket连接失败:', error);
            reject(error);
          }
        });

        // 监听连接打开
        this.socket.onOpen(() => {
          console.log('WebSocket连接已打开');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        });

        // 监听消息
        this.socket.onMessage((res) => {
          try {
            const data = JSON.parse(res.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        });

        // 监听连接关闭
        this.socket.onClose((res) => {
          console.log('WebSocket连接已关闭:', res);
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected', res);
          
          // 如果不是主动关闭，尝试重连
          if (res.code !== 1000) {
            this.attemptReconnect();
          }
        });

        // 监听连接错误
        this.socket.onError((error) => {
          console.error('WebSocket连接错误:', error);
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('error', error);
        });

      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        reject(error);
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.close({
        code: 1000,
        reason: '主动断开连接'
      });
      this.socket = null;
    }
    this.isConnected = false;
    this.stopHeartbeat();
    this.messageQueue = [];
  }

  // 发送消息
  sendMessage(message) {
    if (!this.isConnected) {
      console.warn('WebSocket未连接，消息已加入队列');
      this.messageQueue.push(message);
      return false;
    }

    try {
      const messageData = {
        type: 'message',
        data: message,
        timestamp: new Date().toISOString(),
        userId: this.currentUserId
      };

      this.socket.send({
        data: JSON.stringify(messageData),
        success: () => {
          console.log('消息发送成功');
          this.emit('messageSent', message);
        },
        fail: (error) => {
          console.error('消息发送失败:', error);
          this.emit('messageSendFailed', { message, error });
        }
      });

      return true;
    } catch (error) {
      console.error('发送消息异常:', error);
      this.emit('messageSendFailed', { message, error });
      return false;
    }
  }

  // 处理接收到的消息
  handleMessage(data) {
    switch (data.type) {
      case 'message':
        this.emit('messageReceived', data.data);
        break;
      case 'messageStatus':
        this.emit('messageStatusUpdate', data.data);
        break;
      case 'heartbeat':
        // 心跳响应
        break;
      case 'error':
        console.error('服务器错误:', data.message);
        this.emit('serverError', data);
        break;
      default:
        console.log('未知消息类型:', data.type);
    }
  }

  // 尝试重连
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('重连次数已达上限，停止重连');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试第${this.reconnectAttempts}次重连...`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect(this.socket.url).catch(error => {
          console.error('重连失败:', error);
          this.attemptReconnect();
        });
      }
    }, this.reconnectInterval);
  }

  // 开始心跳
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      }
    }, this.heartbeatInterval);
  }

  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 发送心跳
  sendHeartbeat() {
    if (this.isConnected) {
      this.socket.send({
        data: JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })
      });
    }
  }

  // 处理消息队列
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  // 添加事件监听器
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // 移除事件监听器
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件监听器执行错误 (${event}):`, error);
        }
      });
    }
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length
    };
  }

  // 清空消息队列
  clearMessageQueue() {
    this.messageQueue = [];
  }
}

// 创建单例实例
const websocketManager = new WebSocketManager();

module.exports = websocketManager;

