// message.js
const authMixin = require('../../utils/authMixin.js');

Page({
  data: {
    messages: [],
    page: 1,
    pageSize: 10,
    hasMoreData: true,
    loading: false, // 添加加载状态
    tradeRequests: [], // 存储交易请求
    receivedRequests: [], // 收到的交易请求
    sentRequests: [], // 发出的交易请求
    showAllReceived: false, // 控制收到的请求是否展开
    showAllSent: false, // 控制发出的请求是否展开
    displayReceivedRequests: [], // 显示的收到的请求
    displaySentRequests: [], // 显示的发出的请求
    unreadCount: 0, // 添加未读消息计数
    // 新增：区分不同类型的消息计数
    unreadReceivedRequests: 0, // 未读收到的交易请求
    unreadSentRequests: 0, // 未读发出的交易请求
    unreadChatMessages: 0, // 未读聊天消息
    hasLoadedTradeRequests: false, // 新增：标记是否已加载过交易请求
    chatSessions: [], // ✅ 新增：存储真实的聊天会话列表
    isLogin: false  // ✅ 新增：登录状态
  },

  // ✅ 引入混入方法
  ...authMixin.methods,

  // ✅ 修复：删除了错误的 onLoad (那是 chat 页面的逻辑)，改为标准的 message 页面初始化
  onLoad: function (options) {
    console.log('🚀 消息列表页面加载');
    this.checkLogin(); // 检查登录状态
  },

  onShow() {
    if (!this.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    console.log('=== onShow 触发 ===');

    const pages = getCurrentPages();
    const previousPage = pages.length > 1 ? pages[pages.length - 2] : null;

    if (previousPage && previousPage.route && previousPage.route.includes('chat')) {
      setTimeout(() => {
        this.forceSyncTabBarSelectedState();
      }, 200);
      setTimeout(() => {
        this.getUnreadMessageCount();
        this.loadChatSessions();
      }, 300);
    }

    if (!this.data.hasLoadedTradeRequests) {
      this.loadTradeRequests();
      this.setData({ hasLoadedTradeRequests: true });
    } else {
      this.updateUnreadCount();
      this.updateTabBarBadge();
    }

    this.getUnreadMessageCount();
    this.loadChatSessions();
  },

  onHide() {
    // 页面隐藏时也要更新红点
    this.updateTabBarBadge();
  },

  onUnload() {
    // 页面卸载时更新红点
    this.updateTabBarBadge();
  },


  // 加载交易请求
  loadTradeRequests() {
    // ✅ 新增：使用统一的登录检查
    if (!this.checkLogin()) {
      console.warn('⚠️ loadTradeRequests: 用户未登录');
      return;
    }

    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) return;

    console.log('=== 开始加载交易请求 ===');

    // 加载收到的交易请求
    wx.request({
      url: `${app.globalData.baseUrl}/trade-requests/received?userId=${userInfo.id}`,
      method: 'GET',
      header: {
        'Authorization': token
      },
      success: (res) => {
        if (res.data.code === 200) {
          console.log('=== 收到的交易请求数据 ===', res.data.data);

          // 处理收到的交易请求数据并按时间排序
          let processedRequests = this.processTradeRequestData(res.data.data || []);
          // 按时间倒序排列（最新的在前面）
          processedRequests = processedRequests.sort((a, b) =>
              new Date(b.createTime) - new Date(a.createTime)
          );

          this.setData({
            receivedRequests: processedRequests
          }, () => {
            this.updateDisplayReceivedRequests();
            // 更新未读消息计数
            this.updateUnreadCount();
          });
        }
      }
    });

    // 加载发出的交易请求 - 简化逻辑，直接使用后端返回的 is_read字段
    wx.request({
      url: `${app.globalData.baseUrl}/trade-requests/sent?userId=${userInfo.id}`,
      method: 'GET',
      header: {
        'Authorization': token
      },
      success: (res) => {
        if (res.data.code === 200) {
          console.log('=== 发出的交易请求数据 ===', res.data.data);

          // 处理发出的交易请求数据并按时间排序
          let processedRequests = this.processTradeRequestData(res.data.data || []);

          console.log('=== 处理后的发出的交易请求 ===', processedRequests);
          console.log('=== 其中未读的数量 ===', processedRequests.filter(r => !r.isRead).length);

          // 按时间倒序排列（最新的在前面）
          processedRequests = processedRequests.sort((a, b) =>
              new Date(b.createTime) - new Date(a.createTime)
          );

          this.setData({
            sentRequests: processedRequests
          }, () => {
            this.updateDisplaySentRequests();
            // 更新未读消息计数
            this.updateUnreadCount();
          });
        }
      }
    });
  },

  // ✅ 新增：统一处理图片 URL 的方法（参考 userHome.js）
  processImageUrl(imagePath) {
    if (!imagePath && imagePath !== 0) return '';

    const imageUrl = String(imagePath).trim();
    if (!imageUrl) return '';

    const app = getApp();
    const baseURL = app.globalData.baseUrl;

    // 如果已经是完整 URL，直接返回
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // 如果是相对路径，拼接完整域名
    if (imageUrl.startsWith('/api')) {
      const serverRoot = baseURL.replace(/\/api$/, '');
      return serverRoot + imageUrl;
    } else {
      return baseURL + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
    }
  },

  // ✅ 修复：加载聊天会话列表（从后端接口）
  loadChatSessions() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) {
      console.log('用户未登录，跳过加载会话');
      return;
    }

    const currentUserId = userInfo.id;
    if (!currentUserId) return;

    console.log('=== 加载聊天会话列表，userId:', currentUserId);

    wx.request({
      url: `${app.globalData.baseUrl}/messages/getChatSessionList`,
      method: 'GET',
      data: { userId: currentUserId },
      header: { 'Authorization': token },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          let sessions = res.data.data;

          // 1. 兼容后端返回的对象结构 { sessions: [...] }
          if (sessions && typeof sessions === 'object' && !Array.isArray(sessions)) {
            sessions = sessions.sessions || [];
          }
          if (!Array.isArray(sessions)) sessions = [];

          // 2. ✅ 关键修复：按最后一条消息的时间倒序排列（最新的在最前）
          sessions.sort((a, b) => {
            return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
          });

          // 3. 处理每一条会话的显示数据
          const processedSessions = sessions.map(session => {
            // ✅ 处理头像 URL
            let avatarUrl = session.avatar;
            if (avatarUrl && avatarUrl.trim() !== '') {
              avatarUrl = this.processImageUrl(avatarUrl);
            } else {
              avatarUrl = '/static/assets/icons/default-avatar.png';
            }

            return {
              ...session,
              receiver: session.targetId || session.receiverId || session.otherUserId,
              title: session.nickname || session.name || `用户${session.targetId}`,
              avatar: avatarUrl, // ✅ 使用处理后的头像 URL
              text: session.lastMessage || '暂无消息',
              date: session.lastDate ? this.formatSessionTime(session.lastDate) : '',
              isRead: session.unreadCount === 0,
              unreadCount: session.unreadCount || 0
            };
          });

          this.setData({
            chatSessions: processedSessions,
            messages: processedSessions
          }, () => {
            this.calculateTotalUnreadMessages();
          });

          this.updateGlobalUnreadChatCount();
        } else {
          this.setData({ chatSessions: [], messages: [] });
        }
      },
      fail: (err) => {
        console.error('加载聊天会话网络错误:', err);
        this.setData({ chatSessions: [], messages: [] });
      }
    });
  },

  // ✅ 新增：计算总未读消息数
  calculateTotalUnreadMessages() {
    // 计算所有会话的未读消息总数
    const totalUnread = this.data.chatSessions.reduce((sum, session) => {
      return sum + (session.unreadCount || 0);
    }, 0);

    console.log('=== 计算总未读消息数:', totalUnread);

    // 更新全局未读消息数
    this.updateGlobalUnreadCount(totalUnread);
  },

  // ✅ 修改：获取未读消息总数（使用后端接口）
  getUnreadMessageCount() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) {
      console.log('用户未登录，跳过获取未读数');
      return;
    }

    const currentUserId = userInfo.id;

    wx.request({
      url: `${app.globalData.baseUrl}/messages/unread-count`,
      method: 'GET',
      data: {
        userId: currentUserId,
        pageNum: 1,
        pageSize: 20 // ✅ 强制要求返回 20 条
      },
      header: {
        'Authorization': token
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          const count = res.data.data.count || res.data.data || 0;
          console.log('=== 后端返回的未读消息数量:', count);

          // ✅ 修改：直接使用后端返回的总数
          this.updateGlobalUnreadCount(count);
        } else {
          console.error('获取未读消息数量失败:', res.data);
        }
      },
      fail: (err) => {
        console.error('获取未读消息数量网络错误:', err);
      }
    });
  },

  // ✅ 新增：批量标记消息为已读（使用后端接口）
  markMessagesAsRead(messageIds) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    if (!token || !messageIds || messageIds.length === 0) {
      console.log('没有需要标记的消息');
      return Promise.resolve();
    }

    console.log('=== 准备标记消息为已读，IDs:', messageIds);

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/messages/mark-read-batch`,
        method: 'POST',
        data: messageIds, // 数组格式 [1, 2, 3]
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.code === 200) {
            console.log('=== 批量标记消息为已读成功 ===');

            // 重新获取未读数量
            this.getUnreadMessageCount();

            resolve(true);
          } else {
            console.error('批量标记消息为已读失败:', res.data);
            reject(false);
          }
        },
        fail: (err) => {
          console.error('批量标记消息为已读网络错误:', err);
          reject(false);
        }
      });
    });
  },

  // ✅ 新增：标记单个消息为已读（使用后端接口）
  markSingleMessageAsRead(messageId) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    if (!token || !messageId) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/messages/mark-read`,
        method: 'POST',
        data: {
          messageId: messageId
        },
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.code === 200) {
            console.log('=== 标记单条消息为已读成功 ===');

            // 重新获取未读数量
            this.getUnreadMessageCount();

            resolve(true);
          } else {
            console.error('标记单条消息为已读失败:', res.data);
            reject(false);
          }
        },
        fail: (err) => {
          console.error('标记单条消息为已读网络错误:', err);
          reject(false);
        }
      });
    });
  },

  formatSessionTime(timestamp) {
    if (!timestamp) return '';
    // ✅ 修复：处理时间字符串中的 'T' 和 'Z'，并补偿时区
    let date = new Date(timestamp);

    // 如果解析出的年份不对，说明可能是时区问题，尝试手动补偿
    if (isNaN(date.getTime())) {
      date = new Date(timestamp.replace(/-/g, '/'));
    }

    // 补偿 8 小时 (8 * 60 * 60 * 1000)
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const chinaTime = new Date(utcTime + (8 * 3600000));

    const now = new Date();
    const diff = now - chinaTime;

    // ✅ 关键修改：增加 hour12: false 参数，强制使用 24 小时制
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    if (diff < 24 * 60 * 60 * 1000 && chinaTime.toDateString() === now.toDateString()) {
      return chinaTime.toLocaleTimeString('zh-CN', timeOptions);
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (chinaTime.toDateString() === yesterday.toDateString()) {
      return '昨天 ' + chinaTime.toLocaleTimeString('zh-CN', timeOptions);
    }

    return chinaTime.toLocaleDateString('zh-CN') + ' ' + chinaTime.toLocaleTimeString('zh-CN', timeOptions);
  },


  // ✅ 修改：更新全局未读聊天消息数
  updateGlobalUnreadChatCount() {
    const app = getApp();

    // ✅ 计算未读聊天消息总数（从会话列表中累加）
    const totalUnread = this.data.chatSessions.reduce((sum, session) => {
      return sum + (session.unreadCount || 0);
    }, 0);

    console.log('=== 更新全局未读聊天消息数:', totalUnread);

    app.globalData.unreadChatMessages = totalUnread;
    wx.setStorageSync('unreadChatMessages', totalUnread);

    // 通知 TabBar 更新
    if (typeof app.updateUnreadMessageCount === 'function') {
      app.updateUnreadMessageCount(totalUnread);
    }
  },

  // ✅ 新增：监听 WebSocket 新消息（可选功能）
  setupWebSocketListener() {
    const app = getApp();

    // 如果已经有监听器，先移除
    if (this._wsListenerAdded) {
      return;
    }

    // 监听 WebSocket 消息
    wx.onSocketMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        console.log('收到 WebSocket 消息:', data);

        // 处理新消息推送
        if (data.type === 'MESSAGE') {
          this.handleNewMessageInList(data);
        }
      } catch (err) {
        console.error('解析 WebSocket 消息失败:', err);
      }
    });

    this._wsListenerAdded = true;
  },
  // ✅ 新增：在消息列表中处理新消息
  handleNewMessageInList(data) {
    const { chatSessions } = this.data;
    const senderId = data.senderId;

    console.log('=== 收到新消息，senderId:', senderId);

    // 查找对应的会话
    const sessionIndex = chatSessions.findIndex(session =>
        String(session.receiver) === String(senderId)
    );

    if (sessionIndex !== -1) {
      // 会话已存在，更新未读数
      const updatedSessions = [...chatSessions];
      const session = updatedSessions[sessionIndex];

      // 未读数 +1
      session.unreadCount = (session.unreadCount || 0) + 1;
      session.lastMessage = data.content;
      session.lastMessageTime = data.sendTime || new Date().toISOString();

      // 将该会话移到列表顶部
      updatedSessions.splice(sessionIndex, 1);
      updatedSessions.unshift(session);

      this.setData({
        chatSessions: updatedSessions,
        messages: updatedSessions
      }, () => {
        console.log('✅ 更新会话列表，未读数 +1');

        // 重新计算总未读数
        this.calculateTotalUnreadMessages();
      });
    } else {
      // 会话不存在，重新加载会话列表
      console.log('新会话，重新加载列表');
      setTimeout(() => {
        this.loadChatSessions();
      }, 500);
    }
  },

  // 标记单个交易请求为已读 - 使用新接口 /trade-requests/mark-read/{requestId}
  markRequestAsRead(requestId) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    if (!token || !requestId) return;

    const numericRequestId = parseInt(requestId);
    if (isNaN(numericRequestId)) {
      console.error('无效的 requestId:', requestId);
      return;
    }

    // 调用新接口：/trade-requests/mark-read/{requestId}
    wx.request({
      url: `${app.globalData.baseUrl}/trade-requests/mark-read/${numericRequestId}`,
      method: 'POST',
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.code === 200) {
          console.log(`请求 ${numericRequestId} 已标记为已读`);
        } else {
          console.error('标记请求为已读失败:', res.data.message);
        }
      },
      fail: (err) => {
        console.error('标记请求为已读失败:', err);
      }
    });
  },



    // 更新显示的收到的请求
    updateDisplayReceivedRequests() {
      const { receivedRequests, showAllReceived } = this.data;
      const displayRequests = showAllReceived ? receivedRequests : receivedRequests.slice(0, 1);
      this.setData({
        displayReceivedRequests: displayRequests
      });
    },

    // 更新显示的发出的请求
    updateDisplaySentRequests() {
      const { sentRequests, showAllSent } = this.data;
      const displayRequests = showAllSent ? sentRequests : sentRequests.slice(0, 1);
      this.setData({
        displaySentRequests: displayRequests
      });
    },

  // 切换收到的请求显示状态 - 保持原有逻辑，不标记为已读
    toggleReceivedRequests() {
      this.setData({
        showAllReceived: !this.data.showAllReceived
      }, () => {
        this.updateDisplayReceivedRequests();
        // 收到的请求不在此处标记为已读，只有处理后才减少未读数
      });
    },


    toggleSentRequests() {
      this.setData({
        showAllSent: !this.data.showAllSent
      }, () => {
        this.updateDisplaySentRequests();
        // 只有在展开时才标记为已读
        if (this.data.showAllSent) {
          this.markSentRequestsAsRead();
        }
      });
    },
// 批量标记请求为已读 - 使用新接口 /trade-requests/mark-read-batch
  markRequestsAsReadBatch(requestIds) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    if (!token || !requestIds || requestIds.length === 0) return;

    // 调用新接口：/trade-requests/mark-read-batch
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/trade-requests/mark-read-batch`,
        method: 'POST',
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        // 直接发送数组，而不是对象
        data: requestIds,
        success: (res) => {
          if (res.data.code === 200) {
            console.log(`批量标记 ${requestIds.length} 个请求为已读成功`);
            resolve(true);
          } else {
            console.error('批量标记请求为已读失败:', res.data.message);
            reject(false);
          }
        },
        fail: (err) => {
          console.error('批量标记请求为已读失败:', err);
          reject(false);
        }
      });
    });
  },


// 标记收到的请求为已读 - 只在处理请求时调用，不改变原有逻辑
  markReceivedRequestsAsRead() {
    const updatedReceivedRequests = this.data.receivedRequests.map(request => ({
      ...request,
      isRead: true
    }));

    this.setData({
      receivedRequests: updatedReceivedRequests,
      displayReceivedRequests: this.data.showAllReceived ? updatedReceivedRequests : updatedReceivedRequests.slice(0, 1)
    });

    // 更新未读计数
    this.updateUnreadCount();
    // 更新底部导航栏红点
    this.updateTabBarBadge();
  },

  // 标记发出的请求为已读 - 展开时调用，只标记未读的
  async markSentRequestsAsRead() {
    // 获取所有未读的发出的请求 ID（基于后端返回的 is_read字段）
    const unreadRequestIds = this.data.sentRequests
        .filter(req => req.isRead === false)
        .map(req => req.id);

    console.log('=== 准备标记为已读的请求 ID 列表 ===', unreadRequestIds);

    if (unreadRequestIds.length > 0) {
      try {
        // 调用后端 API 批量标记未读请求为已读
        await this.markRequestsAsReadBatch(unreadRequestIds);

        console.log(`已将 ${unreadRequestIds.length} 个未读请求标记为已读`);

        // ✅ 修改：不再重新加载数据，只在本地更新状态
        // 本地更新状态：只将未读的改为已读，已读的保持不变
        const updatedSentRequests = this.data.sentRequests.map(request => {
          if (request.isRead === false) {
            return { ...request, isRead: true };
          }
          return request;
        });

        this.setData({
          sentRequests: updatedSentRequests,
          displaySentRequests: this.data.showAllSent ? updatedSentRequests : updatedSentRequests.slice(0, 1)
        });

        // ✅ 重要：更新未读计数并立即通知 TabBar
        this.updateUnreadCount();

        // ✅ 修复：移除 setTimeout，直接调用
        this.updateTabBarBadge();
        console.log('=== 已刷新 TabBar 红点 ===');

        console.log('=== 本地状态已更新为已读 ===');

      } catch (error) {
        console.error('标记发出的请求为已读失败:', error);
      }
    }
    // 如果没有未读请求，什么都不做
  },
  // 处理交易请求数据，确保字段一致性
  processTradeRequestData(requests) {
    if (!requests || !Array.isArray(requests)) return [];

    // 状态映射
    const statusMap = {
      'PENDING': '待处理',
      'ACCEPTED': '已同意',
      'REJECTED': '已拒绝'
    };

    return requests.map(request => {
      // 格式化日期显示，使用 requestTime 字段
      let formattedDate = new Date().toLocaleDateString();
      if (request.requestTime) {
        const dateObj = new Date(request.requestTime);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleDateString('zh-CN');
        }
      }

      // 从 product 对象中获取商品标题
      const productTitle = (request.product && request.product.title) || '商品标题';

      // 获取商品状态
      const productStatus = (request.product && request.product.status) || 'UNKNOWN';

      // 获取商品 ID
      const productId = request.productId || (request.product && request.product.productId) || null;

      // 确保必要的字段存在
      return {
        ...request,
        id: request.id || request.requestId, // 确保 id 字段存在
        productId: productId, // 添加商品 ID 字段
        buyerName: request.buyerName || request.buyerNickname || request.buyerUsername || '未知买家',
        sellerName: request.sellerName || request.sellerNickname || request.sellerUsername || '未知卖家',
        productTitle: productTitle,
        productPrice: request.productPrice || request.price || 0,
        productImage: request.productImage || request.image || request.productImageUrl || '/static/assets/default-image.png',
        createTime: formattedDate,
        status: request.status || 'PENDING',
        productStatus: productStatus, // 添加商品状态字段
        quantity: request.quantity || 1, // 添加商品数量字段，默认为 1
        // 添加显示用的状态文本
        statusText: statusMap[request.status] || request.status,
        // 关键：正确解析 is_read字段 (0 未读，1 已读)
        isRead: request.is_read === 1 || request.is_read === true
      };
    });
  },

  // 获取未读交易请求数量 - 使用新接口 /trade-requests/unread-count
  getUnreadTradeRequestCount() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) return;

    // 调用新接口：/trade-requests/unread-count
    wx.request({
      url: `${app.globalData.baseUrl}/trade-requests/unread-count?userId=${userInfo.id}`,
      method: 'GET',
      header: {
        'Authorization': token
      },
      success: (res) => {
        if (res.data.code === 200) {
          // 更新全局未读消息数
          const unreadCount = res.data.data || 0;
          this.updateGlobalUnreadCount(unreadCount);
        }
      },
      fail: (err) => {
        console.error('获取未读交易请求数量失败:', err);
      }
    });
  },

  // 更新未读消息计数
  updateUnreadCount() {
    // 计算未读消息数量
    const unreadReceived = this.calculateUnreadReceivedRequests();
    const unreadSent = this.calculateUnreadSentRequests();
    const unreadChat = this.calculateUnreadChatMessages();

    this.setData({
      unreadReceivedRequests: unreadReceived,
      unreadSentRequests: unreadSent,
      unreadChatMessages: unreadChat,
      unreadCount: unreadReceived + unreadSent + unreadChat
    });

    // 更新全局未读消息计数
    this.updateGlobalUnreadCount(this.data.unreadCount);
  },

  // 更新全局未读消息计数
  updateGlobalUnreadCount(count) {
    const app = getApp();

    // 更新全局数据
    app.globalData.unreadMessageCount = count;

    // 同步到本地存储
    wx.setStorageSync('unreadMessageCount', count);

    // 强制刷新tabBar红点显示
    this.forceUpdateTabBarBadge();
  },

  forceUpdateTabBarBadge() {
    // 直接通过全局数据更新，让自定义 tabBar 自己监听变化
    const app = getApp();
    wx.setStorageSync('unreadMessageCount', this.data.unreadCount);
    app.globalData.unreadMessageCount = this.data.unreadCount;

    // ✅ 新增：不主动调用 getTabBar，而是依赖 tabBar 的自动更新机制
    console.log('已更新全局未读消息数:', this.data.unreadCount);

    // ✅ 新增：延迟同步选中状态，确保 TabBar 已经渲染
    setTimeout(() => {
      this.forceSyncTabBarSelectedState();
    }, 100);
  },
  // ✅ 新增：强制同步 TabBar 选中状态
  forceSyncTabBarSelectedState() {
    try {
      const tabBar = this.getTabBar();
      if (tabBar && typeof tabBar.syncSelectedState === 'function') {
        console.log('=== 强制同步 TabBar 选中状态 ===');
        tabBar.syncSelectedState();
      }
    } catch (error) {
      console.error('=== 同步 TabBar 状态失败:', error);
    }
  },


  // 计算未读收到的交易请求 - 只统计 PENDING 且 ON_SALE 的（不管 isRead）
  calculateUnreadReceivedRequests() {
    // 收到的请求：只有 PENDING 且 ON_SALE 状态的才算未读
    return this.data.receivedRequests.filter(request =>
        request.status === 'PENDING' && request.productStatus === 'ON_SALE'
    ).length;
  },

// 计算未读发出的交易请求 - 基于 is_read 字段
  calculateUnreadSentRequests() {
    const unread = this.data.sentRequests.filter(request =>
        request.isRead === false
    ).length;

    console.log('=== 计算未读发出的请求 ===');
    console.log('sentRequests 总数:', this.data.sentRequests.length);
    console.log('其中未读的数量:', unread);
    console.log('sentRequests 详情:', this.data.sentRequests.map(r => ({ id: r.id, isRead: r.isRead, status: r.status })));

    return unread;
  },

  // 计算未读聊天消息
  calculateUnreadChatMessages() {
    // ✅ 修复：直接从当前 chatSessions 实时计算未读总数
    const totalUnread = this.data.chatSessions.reduce((sum, session) => {
      return sum + (session.unreadCount || 0);
    }, 0);

    console.log('=== 实时计算聊天消息未读数:', totalUnread);

    // 同时更新全局数据和本地存储，保持同步
    const app = getApp();
    app.globalData.unreadChatMessages = totalUnread;
    wx.setStorageSync('unreadChatMessages', totalUnread);

    return totalUnread;
  },

  // 设置底部导航栏红点
  setTabBarBadge(count) {
    // 由于使用自定义TabBar，通过全局数据更新
    const app = getApp();
    app.updateUnreadMessageCount(count);

    // 也可以直接更新本地存储
    wx.setStorageSync('unreadMessageCount', count);
  },

  // 修改 updateTabBarBadge 方法
  updateTabBarBadge() {
    // 更新全局未读消息计数
    this.updateGlobalUnreadCount(this.data.unreadCount);
  },

  // 标记消息为已读（在消息页面时调用）
  markMessagesAsRead() {
    // 标记发出的交易请求为已读
    const updatedSentRequests = this.data.sentRequests.map(request => ({
      ...request,
      isRead: true
    }));

    // 标记聊天消息为已读
    const updatedMessages = this.data.messages.map(message => ({
      ...message,
      isRead: true
    }));

    this.setData({
      sentRequests: updatedSentRequests,
      displaySentRequests: this.data.showAllSent ? updatedSentRequests : updatedSentRequests.slice(0, 1),
      messages: updatedMessages
    });

    // 更新未读计数
    this.updateUnreadCount();
    // 更新底部导航栏红点
    this.updateTabBarBadge();
  },



  // ✅ 修改：navigateToChat - 点击聊天会话时标记为已读并跳转
  navigateToChat: function(event) {
    console.log('=== 点击聊天会话，原始 event ===', event);

    // ✅ 修复：从 dataset 中获取所有可能的 ID 字段
    const dataset = event.currentTarget.dataset;
    let receiver = dataset.receiver || dataset.targetid || dataset.targetId || dataset.otheruserid || dataset.otherUserId;

    console.log('=== 准备跳转聊天，从 dataset 提取的 receiver:', receiver);

    // 如果 dataset 里没有，尝试从整个 item 数据里找（作为兜底）
    if (!receiver && dataset.item) {
      const item = dataset.item;
      receiver = item.receiver || item.targetId || item.otherUserId || item.chatPartnerId;
    }

    // 确保 receiver 是有效数字
    if (!receiver || isNaN(parseInt(receiver))) {
      console.error('❌ 无法提取有效的接收者 ID', dataset);
      wx.showToast({ title: '用户信息异常', icon: 'none' });
      return;
    }

    receiver = parseInt(receiver);

    // ✅ 修改：从 chatSessions 中查找对应的会话信息，用于获取名称和更新状态
    const messageItem = this.data.chatSessions.find(item => {
      const itemReceiver = item.receiver || item.targetId || item.otherUserId;
      return itemReceiver === receiver;
    });

    const name = messageItem ? (messageItem.title || messageItem.name || '未知用户') : '未知用户';

    console.log('=== 点击聊天会话，最终 receiver:', receiver, '名称:', name);

    // ✅ 新增：调用后端接口标记该会话的所有消息为已读
    if (messageItem && (messageItem.unreadCount > 0 || !messageItem.isRead)) {
      this.markChatSessionAsRead(receiver);
    }

    // ✅ 修改：本地立即更新 UI，将当前会话的未读数清零
    const updatedSessions = this.data.chatSessions.map(msg => {
      const msgReceiver = msg.receiver || msg.targetId || msg.otherUserId;
      if (msgReceiver === receiver) {
        return {
          ...msg,
          isRead: true,
          unreadCount: 0 // ✅ 立即清零
        };
      }
      return msg;
    });

    this.setData({
      chatSessions: updatedSessions,
      messages: updatedSessions // 同步更新
    }, () => {
      // ✅ 重新计算总未读数并更新 TabBar
      this.calculateTotalUnreadMessages();
    });

    // ✅ 跳转时传递当前用户 ID 和接收者 ID
    const userInfo = wx.getStorageSync('userInfo');
    const currentUserId = userInfo ? userInfo.id : '';

    wx.navigateTo({
      url: `/pages/chat/chat?receiver=${receiver}&name=${encodeURIComponent(name)}&currentUserId=${currentUserId}`
    });
  },



  // ✅ 修改：标记整个聊天会话为已读（需要先获取消息 ID 列表）
  markChatSessionAsRead: function(receiverId) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo || !receiverId) {
      console.log('参数不足，无法标记已读');
      return;
    }

    const currentUserId = userInfo.id;

    console.log('=== 调用后端接口标记聊天会话为已读，receiverId:', receiverId);

    // ✅ 新增：先获取该会话的聊天记录，获取未读消息的 ID
    wx.request({
      url: `${app.globalData.baseUrl}/messages/history`,
      method: 'GET',
      data: {
        userId1: currentUserId,
        userId2: receiverId
      },
      header: {
        'Authorization': token
      },
      success: (historyRes) => {
        if (historyRes.statusCode === 200 && historyRes.data.code === 200) {
          const messages = historyRes.data.data.messages || [];

          // 过滤出对方发送的未读消息
          const unreadMessageIds = messages
              .filter(msg => {
                const isFromOtherUser = String(msg.sender) === String(receiverId);
                const isUnread = msg.is_read === 0 || msg.isRead === false || !msg.is_read;
                return isFromOtherUser && isUnread;
              })
              .map(msg => msg.id);

          console.log('=== 该会话未读消息 ID 列表 ===', unreadMessageIds);

          if (unreadMessageIds.length === 0) {
            console.log('没有需要标记的消息');
            return;
          }

          // ✅ 遍历每个 messageId，逐个调用后端接口
          const markPromises = unreadMessageIds.map(messageId => {
            return new Promise((resolve, reject) => {
              wx.request({
                url: `${app.globalData.baseUrl}/messages/mark-read`,
                method: 'POST',
                header: {
                  'Authorization': token,
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: {
                  // ✅ 正确传递单个 messageId 参数
                  messageId: messageId
                },
                success: (res) => {
                  if (res.statusCode === 200 && res.data.code === 200) {
                    console.log(`✅ 消息 ${messageId} 已标记为已读`);
                    resolve(true);
                  } else {
                    console.warn(`⚠️ 消息 ${messageId} 标记失败:`, res.data);
                    resolve(false);
                  }
                },
                fail: (err) => {
                  console.warn(`⚠️ 消息 ${messageId} 标记网络错误:`, err);
                  resolve(false);
                }
              });
            });
          });

          // 执行所有标记操作
          Promise.all(markPromises).then(results => {
            const successCount = results.filter(r => r === true).length;
            console.log(`✅ 标记完成，成功 ${successCount}/${unreadMessageIds.length}`);

            // 重新获取未读数量
            setTimeout(() => {
              this.getUnreadMessageCount();
            }, 500);
          });
        } else {
          console.error('获取聊天记录失败:', historyRes.data);
        }
      },
      fail: (err) => {
        console.error('获取聊天记录网络错误:', err);
      }
    });
  },





  // 同意交易请求
  acceptTradeRequest(e) {
    const requestId = e.currentTarget.dataset.requestId;
    this.processTradeRequest(requestId, 'ACCEPTED');
  },

  // 拒绝交易请求
  rejectTradeRequest(e) {
    const requestId = e.currentTarget.dataset.requestId;
    this.processTradeRequest(requestId, 'REJECTED');
  },

// 在处理交易请求后正确更新未读数
  processTradeRequest(requestId, action) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    // 验证必要参数
    if (!requestId) {
      console.error('参数验证失败：requestId 为空');
      wx.showToast({ title: '请求 ID 缺失', icon: 'none' });
      return;
    }

    const numericRequestId = parseInt(requestId);
    if (isNaN(numericRequestId)) {
      console.error('参数验证失败：requestId 不是有效数字', requestId);
      wx.showToast({ title: '请求 ID 格式错误', icon: 'none' });
      return;
    }

    const validActions = ['ACCEPTED', 'REJECTED'];
    if (!action || !validActions.includes(action)) {
      console.error('参数验证失败：action 值无效', action);
      wx.showToast({ title: '操作类型无效', icon: 'none' });
      return;
    }

    if (!token || !userInfo || !userInfo.id) {
      console.error('身份验证失败：token 或用户信息不完整');
      wx.showToast({ title: '用户未登录', icon: 'none' });
      return;
    }

    wx.showLoading({
      title: action === 'ACCEPTED' ? '正在同意...' : '正在拒绝...'
    });

    const baseUrl = app.globalData.baseUrl;
    if (!baseUrl) {
      console.error('配置错误：baseUrl 未设置');
      wx.showToast({ title: '系统配置错误', icon: 'none' });
      wx.hideLoading();
      return;
    }

    const url = `${baseUrl}/trade-requests/process?requestId=${numericRequestId}&action=${action}`;

    wx.request({
      url: url,
      method: 'POST',
      header: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data.code === 200) {
            wx.showToast({
              title: action === 'ACCEPTED' ? '已同意交易' : '已拒绝交易',
              icon: 'success'
            });

            if (action === 'ACCEPTED') {
              wx.showToast({
                title: '交易已同意',
                icon: 'success'
              });
            }

            // 重要：处理完成后，重新加载交易请求列表
            // 因为后端会在状态变更时自动将请求设为未读
            setTimeout(() => {
              this.loadTradeRequests();
              // 更新未读计数
              this.updateUnreadCount();
              this.updateTabBarBadge();
            }, 1000);
          } else {
            console.error('业务处理失败:', res.data.message);
            wx.showToast({
              title: res.data.message || '操作失败',
              icon: 'none'
            });
          }
        } else {
          console.error('HTTP 状态码错误:', res.statusCode);
          wx.showToast({
            title: '服务器错误',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 跳转到商品详情页
  navigateToProductDetail(e) {
    const productId = e.currentTarget.dataset.productId;
    if (productId) {
      wx.navigateTo({
        url: `/pages/GoodDetail/GoodDetail?id=${productId}`
      });
    }
  },

  // 检查订单是否已存在的辅助方法
  checkOrderExists(tradeRequestId, callback) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    // 调用后端接口检查订单是否已存在
    wx.request({
      url: `${app.globalData.baseUrl}/orders/check?tradeRequestId=${tradeRequestId}`,
      method: 'GET',
      header: {
        'Authorization': token
      },
      success: (res) => {
        if (res.data.code === 200) {
          callback(res.data.exists || false);
        } else {
          callback(false);
        }
      },
      fail: () => {
        callback(false);
      }
    });
  },
  // ✅ 新增：创建或更新聊天会话
  createOrUpdateChatSession(targetUserId, targetUserName, goodsId) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) {
      console.error('用户未登录，无法创建会话');
      return;
    }

    const currentUserId = userInfo.id;

    // 检查是否已存在该会话
    const existingSession = this.data.chatSessions.find(
        session => session.receiver === targetUserId || session.otherUserId === targetUserId
    );

    if (existingSession) {
      console.log('=== 会话已存在，直接跳转 ===');
      // 会话已存在，直接跳转
      this.navigateToChatByUser(existingSession);
      return;
    }

    console.log('=== 开始创建新会话 ===');

    // 调用后端接口创建会话或发送第一条消息
    wx.request({
      url: `${app.globalData.baseUrl}/messages/send`,
      method: 'POST',
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      data: {
        senderId: currentUserId,
        receiverId: targetUserId,
        content: `您好，我对您的商品（ID: ${goodsId}）感兴趣，想了解一下~`,
        messageType: 'text'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          console.log('=== 消息发送成功，会话已创建 ===');

          // 重新加载会话列表
          this.loadChatSessions();

          // 延迟一点再跳转，确保会话已添加到列表
          setTimeout(() => {
            // 找到新创建的会话
            const newSession = this.data.chatSessions.find(
                session => session.receiver === targetUserId || session.otherUserId === targetUserId
            );

            if (newSession) {
              this.navigateToChatByUser(newSession);
            } else {
              // 如果找不到，手动创建一个会话对象并跳转
              const manualSession = {
                receiver: targetUserId,
                otherUserId: targetUserId,
                name: targetUserName,
                title: targetUserName,
                avatar: '/static/assets/icons/default-avatar.png',
                lastMessage: '您好，我对您的商品感兴趣，想了解一下~',
                lastMessageTime: new Date().toISOString(),
                unreadCount: 0,
                isRead: true
              };

              // 添加到会话列表
              const updatedSessions = [manualSession, ...this.data.chatSessions];
              this.setData({
                chatSessions: updatedSessions,
                messages: updatedSessions
              });

              this.navigateToChatByUser(manualSession);
            }
          }, 300);
        } else {
          console.error('创建会话失败:', res.data);
          wx.showToast({
            title: res.data.message || '创建会话失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('创建会话网络错误:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // ✅ 新增：根据用户对象跳转聊天
  navigateToChatByUser(session) {
    const receiver = session.receiver || session.otherUserId;
    const name = session.name || session.title || '未知用户';

    // 标记该聊天消息为已读
    const updatedSessions = this.data.chatSessions.map(msg => {
      if (msg.receiver === receiver || msg.otherUserId === receiver) {
        return { ...msg, isRead: true, unreadCount: 0 };
      }
      return msg;
    });

    this.setData({
      chatSessions: updatedSessions,
      messages: updatedSessions // 同步更新
    });

    // 更新未读计数
    this.updateGlobalUnreadChatCount();
    this.updateUnreadCount();
    this.updateTabBarBadge();

    // 传递当前用户 ID 和接收者 ID
    const currentUserId = this.data.userInfo?.id || '';

    wx.navigateTo({
      url: `/pages/chat/chat?receiver=${receiver}&name=${encodeURIComponent(name)}&currentUserId=${currentUserId}`
    });
  }

});
