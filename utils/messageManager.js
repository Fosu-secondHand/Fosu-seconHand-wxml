// 消息管理服务
class MessageManager {
  constructor() {
    this.currentUserId = 'currentUserID';
    this.messageCache = new Map(); // 消息缓存
    this.pageSize = 20; // 分页大小
  }

  // 生成消息ID
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 保存消息到本地存储
  saveMessage(sessionId, message) {
    const messages = this.getMessageList(sessionId);
    messages.push(message);
    
    // 按时间排序
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 保存到本地存储
    wx.setStorageSync(`messages_${sessionId}`, messages);
    
    // 更新缓存
    this.messageCache.set(sessionId, messages);
    
    return message;
  }

  // 获取消息列表
  getMessageList(sessionId) {
    // 先从缓存获取
    if (this.messageCache.has(sessionId)) {
      return this.messageCache.get(sessionId);
    }

    // 从本地存储获取
    const messages = wx.getStorageSync(`messages_${sessionId}`) || [];
    this.messageCache.set(sessionId, messages);
    return messages;
  }

  // 分页加载消息
  async loadMessages(sessionId, page = 1, pageSize = this.pageSize) {
    const allMessages = this.getMessageList(sessionId);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const messages = allMessages.slice(startIndex, endIndex);
    const hasMore = endIndex < allMessages.length;
    
    return {
      messages,
      hasMore,
      total: allMessages.length,
      page,
      pageSize
    };
  }

  // 创建文本消息
  createTextMessage(sender, receiver, content) {
    return {
      id: this.generateMessageId(),
      sender,
      receiver,
      content,
      type: 'text',
      status: 'sending', // sending, sent, delivered, read, failed
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  // 创建图片消息
  createImageMessage(sender, receiver, imagePath) {
    return {
      id: this.generateMessageId(),
      sender,
      receiver,
      content: imagePath,
      type: 'image',
      status: 'sending',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  // 创建链接消息
  createLinkMessage(sender, receiver, url, title, desc) {
    return {
      id: this.generateMessageId(),
      sender,
      receiver,
      content: url,
      type: 'link',
      title,
      desc,
      status: 'sending',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  // 创建系统消息
  createSystemMessage(content, sessionId) {
    return {
      id: this.generateMessageId(),
      sender: 'system',
      receiver: sessionId,
      content,
      type: 'system',
      status: 'sent',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  }

  // 更新消息状态
  updateMessageStatus(sessionId, messageId, status) {
    const messages = this.getMessageList(sessionId);
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      messages[messageIndex].status = status;
      messages[messageIndex].updatedAt = new Date().toISOString();
      
      // 保存更新
      wx.setStorageSync(`messages_${sessionId}`, messages);
      this.messageCache.set(sessionId, messages);
      
      return messages[messageIndex];
    }
    
    return null;
  }

  // 标记消息为已读
  markMessagesAsRead(sessionId, messageIds) {
    const messages = this.getMessageList(sessionId);
    let updatedCount = 0;
    
    messages.forEach(message => {
      if (messageIds.includes(message.id) && message.sender !== this.currentUserId) {
        message.status = 'read';
        message.readAt = new Date().toISOString();
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      wx.setStorageSync(`messages_${sessionId}`, messages);
      this.messageCache.set(sessionId, messages);
    }
    
    return updatedCount;
  }

  // 删除消息
  deleteMessage(sessionId, messageId) {
    const messages = this.getMessageList(sessionId);
    const filteredMessages = messages.filter(msg => msg.id !== messageId);
    
    wx.setStorageSync(`messages_${sessionId}`, filteredMessages);
    this.messageCache.set(sessionId, filteredMessages);
    
    return filteredMessages.length < messages.length;
  }

  // 清空会话消息
  clearSessionMessages(sessionId) {
    wx.removeStorageSync(`messages_${sessionId}`);
    this.messageCache.delete(sessionId);
  }

  // 搜索消息
  searchMessages(sessionId, keyword) {
    const messages = this.getMessageList(sessionId);
    return messages.filter(message => 
      message.content && message.content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // 获取未读消息数量
  getUnreadMessageCount(sessionId) {
    const messages = this.getMessageList(sessionId);
    return messages.filter(message => 
      message.sender !== this.currentUserId && 
      message.status !== 'read'
    ).length;
  }

  // 格式化消息时间显示
  formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 今天的消息只显示时间
    if (diff < 24 * 60 * 60 * 1000 && date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // 昨天的消息显示"昨天"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // 其他显示完整日期
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 检查是否需要显示时间
  shouldShowTime(messages, currentIndex) {
    if (currentIndex === 0) return true;
    
    const currentTime = new Date(messages[currentIndex].timestamp);
    const previousTime = new Date(messages[currentIndex - 1].timestamp);
    const timeDiff = (currentTime - previousTime) / 60000; // 分钟差
    
    return timeDiff >= 5; // 5分钟以上显示时间
  }
}

// 创建单例实例
const messageManager = new MessageManager();

module.exports = messageManager;

