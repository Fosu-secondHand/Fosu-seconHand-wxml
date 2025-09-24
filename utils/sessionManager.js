// 会话管理服务
class SessionManager {
  constructor() {
    this.sessions = new Map(); // 内存中的会话缓存
    this.currentUserId = 'currentUserID'; // 当前用户ID，实际项目中从登录状态获取
  }

  // 生成会话ID
  generateSessionId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
  }

  // 创建或获取会话
  async createOrGetSession(otherUserId) {
    const sessionId = this.generateSessionId(this.currentUserId, otherUserId);
    
    // 先从内存缓存获取
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    // 从本地存储获取
    let session = wx.getStorageSync(`session_${sessionId}`);
    if (session) {
      this.sessions.set(sessionId, session);
      return session;
    }

    // 创建新会话
    session = {
      id: sessionId,
      participants: [this.currentUserId, otherUserId],
      lastMessage: null,
      lastMessageTime: null,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 保存到本地存储
    wx.setStorageSync(`session_${sessionId}`, session);
    this.sessions.set(sessionId, session);

    return session;
  }

  // 更新会话最后消息
  async updateSessionLastMessage(sessionId, message) {
    const session = this.sessions.get(sessionId) || wx.getStorageSync(`session_${sessionId}`);
    if (!session) return;

    session.lastMessage = {
      content: message.content,
      type: message.type,
      sender: message.sender,
      timestamp: message.timestamp
    };
    session.lastMessageTime = message.timestamp;
    session.updatedAt = new Date().toISOString();

    // 如果不是当前用户发送的消息，增加未读数
    if (message.sender !== this.currentUserId) {
      session.unreadCount = (session.unreadCount || 0) + 1;
    }

    // 保存更新
    wx.setStorageSync(`session_${sessionId}`, session);
    this.sessions.set(sessionId, session);
  }

  // 获取用户的所有会话列表
  async getUserSessions() {
    const sessions = [];
    const storageInfo = wx.getStorageInfoSync();
    
    for (const key of storageInfo.keys) {
      if (key.startsWith('session_')) {
        const session = wx.getStorageSync(key);
        if (session && session.participants.includes(this.currentUserId)) {
          sessions.push(session);
        }
      }
    }

    // 按最后消息时间排序
    sessions.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || a.createdAt).getTime();
      const timeB = new Date(b.lastMessageTime || b.createdAt).getTime();
      return timeB - timeA;
    });

    return sessions;
  }

  // 标记会话为已读
  async markSessionAsRead(sessionId) {
    const session = this.sessions.get(sessionId) || wx.getStorageSync(`session_${sessionId}`);
    if (!session) return;

    session.unreadCount = 0;
    session.updatedAt = new Date().toISOString();

    wx.setStorageSync(`session_${sessionId}`, session);
    this.sessions.set(sessionId, session);
  }

  // 获取会话未读消息总数
  async getTotalUnreadCount() {
    const sessions = await this.getUserSessions();
    return sessions.reduce((total, session) => total + (session.unreadCount || 0), 0);
  }

  // 删除会话
  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    wx.removeStorageSync(`session_${sessionId}`);
  }

  // 清空所有会话
  async clearAllSessions() {
    this.sessions.clear();
    const storageInfo = wx.getStorageInfoSync();
    for (const key of storageInfo.keys) {
      if (key.startsWith('session_')) {
        wx.removeStorageSync(key);
      }
    }
  }
}

// 创建单例实例
const sessionManager = new SessionManager();

module.exports = sessionManager;

