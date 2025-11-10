// services/messageService.js
const WebSocketManager = require('../utils/WebSocketManager.js');

class MessageService {
    constructor() {
        this.messageListeners = [];
    }

    // 初始化WebSocket连接
    initWebSocket(userId, token) {
        WebSocketManager.connect(userId, token);

        // 监听消息
        WebSocketManager.on('message', (message) => {
            this.handleIncomingMessage(message);
        });
    }

    // 处理接收到的消息
    handleIncomingMessage(message) {
        // 根据消息类型处理
        switch (message.type) {
            case 'text':
                this.notifyMessageListeners(message);
                break;
            case 'image':
                this.notifyMessageListeners(message);
                break;
            case 'system':
                this.handleSystemMessage(message);
                break;
            default:
                console.warn('未知消息类型:', message.type);
        }
    }

    // 发送文本消息
    sendTextMessage(receiverId, content) {
        const message = {
            receiverId: receiverId,
            content: content,
            type: 'text'
        };

        return WebSocketManager.sendMessage(message);
    }

    // 发送图片消息
    sendImageMessage(receiverId, imageUrl) {
        const message = {
            receiverId: receiverId,
            content: imageUrl,
            type: 'image'
        };

        return WebSocketManager.sendMessage(message);
    }

    // 添加消息监听器
    addMessageListener(callback) {
        this.messageListeners.push(callback);
    }

    // 移除消息监听器
    removeMessageListener(callback) {
        const index = this.messageListeners.indexOf(callback);
        if (index > -1) {
            this.messageListeners.splice(index, 1);
        }
    }

    // 通知所有监听器
    notifyMessageListeners(message) {
        this.messageListeners.forEach(callback => {
            callback(message);
        });
    }

    // 处理系统消息
    handleSystemMessage(message) {
        // 可以处理系统通知、用户上线/下线等
        console.log('系统消息:', message);
    }
}

module.exports = new MessageService();
