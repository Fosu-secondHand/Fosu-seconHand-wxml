// 会话管理相关的模拟实现

// 会话数据结构示例
// {
//   id: string, // 会话ID
//   senderId: string, // 发送者ID
//   receiverId: string, // 接收者ID
//   receiverName: string, // 接收者名称
//   lastMessage: string, // 最后一条消息内容
//   lastMessageTime: string, // 最后一条消息时间
//   unreadCount: number, // 未读消息数
//   updatedAt: string // 更新时间
// }

// 初始化或获取会话数据
const getConversations = () => {
  const conversations = wx.getStorageSync('conversations') || [];
  return conversations;
};

// 保存会话数据
const saveConversations = (conversations) => {
  wx.setStorageSync('conversations', conversations);
};

// 创建或获取会话
const createOrGetConversation = (senderId, receiverId, receiverName = '') => {
  let conversations = getConversations();
  
  // 查找现有会话
  let conversation = conversations.find(c => 
    (c.senderId === senderId && c.receiverId === receiverId) || 
    (c.senderId === receiverId && c.receiverId === senderId)
  );
  
  // 如果会话不存在，则创建新会话
  if (!conversation) {
    conversation = {
      id: `conv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      senderId,
      receiverId,
      receiverName: receiverName || receiverId,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      updatedAt: new Date().toISOString()
    };
    
    conversations.push(conversation);
    saveConversations(conversations);
  }
  
  return conversation;
};

// 更新会话最后消息
const updateConversationLastMessage = (senderId, receiverId, message, messageTime = new Date().toISOString()) => {
  let conversations = getConversations();
  
  const conversation = conversations.find(c => 
    (c.senderId === senderId && c.receiverId === receiverId) || 
    (c.senderId === receiverId && c.receiverId === senderId)
  );
  
  if (conversation) {
    conversation.lastMessage = message;
    conversation.lastMessageTime = messageTime;
    conversation.updatedAt = new Date().toISOString();
    
    // 如果是接收者的消息，增加未读数
    if (senderId !== wx.getStorageSync('currentUserID') && senderId !== 'currentUserID') {
      conversation.unreadCount += 1;
    }
    
    // 重新排序会话列表，最新的会话排在前面
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    saveConversations(conversations);
  }
};

// 获取用户的会话列表
const getUserConversations = (userId = 'currentUserID') => {
  let conversations = getConversations();
  
  // 过滤出用户相关的会话
  const userConversations = conversations.filter(c => 
    c.senderId === userId || c.receiverId === userId
  );
  
  // 按更新时间倒序排序
  userConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  return userConversations;
};

// 清除会话未读消息计数
const clearUnreadCount = (conversationId) => {
  let conversations = getConversations();
  
  const conversation = conversations.find(c => c.id === conversationId);
  
  if (conversation) {
    conversation.unreadCount = 0;
    conversation.updatedAt = new Date().toISOString();
    saveConversations(conversations);
  }
};

// 标记消息为已读
const markMessagesAsRead = (senderId, receiverId) => {
  let conversations = getConversations();
  
  const conversation = conversations.find(c => 
    (c.senderId === senderId && c.receiverId === receiverId) || 
    (c.senderId === receiverId && c.receiverId === senderId)
  );
  
  if (conversation && receiverId === 'currentUserID') {
    conversation.unreadCount = 0;
    conversation.updatedAt = new Date().toISOString();
    saveConversations(conversations);
  }
  
  // 这里可以添加更多逻辑来标记具体的消息为已读
  // 例如在本地存储中更新消息的read状态
};

// 获取未读消息总数
const getTotalUnreadCount = (userId = 'currentUserID') => {
  const conversations = getUserConversations(userId);
  return conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
};

module.exports = {
  createOrGetConversation,
  updateConversationLastMessage,
  getUserConversations,
  clearUnreadCount,
  markMessagesAsRead,
  getTotalUnreadCount
};