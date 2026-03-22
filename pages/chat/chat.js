// chat.js
const app = getApp();

Page({
  data: {
    chatRecords: [],
    message: '',
    receiver: '',
    chatName: '',
    currentUserId: '',
    sessionId: null,
    scrollTop: 0,
    scrollIntoView: '',
    scrollAnimation: true,
    showLinkModal: false,
    linkInput: '',
    showFunctionPanel: false,
    linkList: [],
    ws: null,
    isConnected: false,
    reconnectTimer: null,
    heartbeatTimer: null
  },

  onLoad: function (options) {
    const receiver = options.receiver;
    const currentUserId = options.currentUserId;
    // 优先使用从 message 页面传递过来的 name 参数作为聊天标题
    const chatName = options.name ? decodeURIComponent(options.name) : receiver;

    this.setData({
      receiver,
      chatName,
      currentUserId: currentUserId || 'currentUserID'
    });

    wx.setNavigationBarTitle({ title: chatName });

    // ✅ 加载聊天记录
    this.loadChatHistory();

    // ✅ 连接 WebSocket
    this.connectWebSocket();
  },

  onUnload() {
    // 页面卸载时关闭 WebSocket 连接
    this.closeWebSocket();
  },

  onHide() {
    // 页面隐藏时也关闭 WebSocket
    this.closeWebSocket();
  },

  onShow() {
    this.scrollToBottom();
  },

  // ✅ 加载聊天记录（使用后端接口）
  loadChatHistory: function () {
    const { currentUserId, receiver } = this.data;

    if (!currentUserId || !receiver) {
      console.error('用户 ID 或接收者 ID 为空');
      return;
    }

    // ✅ 获取 Token
    const token = wx.getStorageSync('token');
    if (!token) {
      console.error('Token 不存在，请先登录');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }

    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: `${app.globalData.baseUrl}/messages/history`,
      method: 'GET',
      data: {
        userId1: currentUserId,
        userId2: receiver
      },
      header: {
        // ✅ 添加认证头
        'Authorization': token
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          const messages = res.data.data.messages || [];
          const processedMessages = this.processChatRecords(messages);

          this.setData({
            chatRecords: processedMessages
          }, () => {
            this.scrollToBottom();
          });

          // ✅ 修改：延迟标记已读，等待页面渲染完成
          setTimeout(() => {
            this.markMessagesAsRead(receiver);
          }, 500);
        } else if (res.statusCode === 401) {
          console.error('未授权访问，请重新登录');
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          });
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 1500);
        } else {
          console.error('加载聊天记录失败:', res.data);
          wx.showToast({
            title: res.data.message || '加载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('加载聊天记录网络错误:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // ✅ 修复：标记消息为已读（使用后端接口）- 修改为传递 messageId 数组
  markMessagesAsRead: function(receiverId) {
    const token = wx.getStorageSync('token');
    const app = getApp();

    if (!token) {
      console.log('Token 不存在，无法标记已读');
      return;
    }

    const { currentUserId, chatRecords } = this.data;

    if (!receiverId || !currentUserId) {
      console.log('receiverId 或 currentUserId 为空');
      return;
    }

    // ✅ 新增：从聊天记录中获取所有未读消息的 ID
    // 过滤出对方发送的、未读的消息
    const unreadMessageIds = chatRecords
        .filter(record => {
          // 对方发送的消息 AND (未标记为已读 OR is_read === 0)
          const isFromOtherUser = String(record.sender) === String(receiverId);
          const isUnread = record.is_read === 0 || record.isRead === false || !record.is_read;
          return isFromOtherUser && isUnread;
        })
        .map(record => record.id);

    console.log('=== 准备标记为已读的消息 ID 列表 ===', unreadMessageIds);

    if (unreadMessageIds.length === 0) {
      console.log('没有需要标记的消息');
      return;
    }

    console.log('=== 尝试标记消息为已读 ===');
    console.log('消息 ID 数量:', unreadMessageIds.length);
    console.log('消息 IDs:', unreadMessageIds);

    // ✅ 修复：遍历每个 messageId，逐个调用后端接口
    // 因为后端接口是单个 messageId，不是批量操作
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
              resolve(false); // 不拒绝，继续处理其他消息
            }
          },
          fail: (err) => {
            console.warn(`⚠️ 消息 ${messageId} 标记网络错误:`, err);
            resolve(false); // 不拒绝，继续处理其他消息
          }
        });
      });
    });

    // 执行所有标记操作
    Promise.all(markPromises).then(results => {
      const successCount = results.filter(r => r === true).length;
      console.log(`✅ 标记完成，成功 ${successCount}/${unreadMessageIds.length}`);

      // 通知消息列表页面更新未读数
      this.updateMessageListUnreadCount();
    });
  },

// ✅ 修改：通知消息列表页面更新未读计数
  updateMessageListUnreadCount: function() {
    // 获取所有页面栈
    const pages = getCurrentPages();

    // 查找消息列表页面
    const messagePage = pages.find(page => page.route === 'pages/message/message');

    if (messagePage && typeof messagePage.getUnreadMessageCount === 'function') {
      console.log('=== 通知消息列表页面更新未读数 ===');
      // 延迟调用，确保当前操作已完成
      setTimeout(() => {
        messagePage.getUnreadMessageCount();
        messagePage.loadChatSessions();
      }, 500);
    }
  },


  // ✅ 更新全局未读聊天消息数
  updateGlobalUnreadChatCount: function() {
    const appInstance = getApp();
    let count = appInstance.globalData.unreadChatMessages || 0;

    // 减少未读数（假设只减少了当前会话的未读数）
    count = Math.max(0, count - 1);

    appInstance.globalData.unreadChatMessages = count;
    wx.setStorageSync('unreadChatMessages', count);

    // 通知 TabBar 更新
    if (typeof appInstance.updateUnreadMessageCount === 'function') {
      appInstance.updateUnreadMessageCount(count);
    }
  },

  // ✅ 连接 WebSocket - 添加超详细调试日志
  connectWebSocket: function() {
    const token = wx.getStorageSync('token');

    // ✅ 获取 userId - 从多个来源尝试获取
    const userInfo = wx.getStorageSync('userInfo');
    let userId = null;

    // 优先从 userInfo 中获取
    if (userInfo && userInfo.id) {
      userId = userInfo.id;
    }

    // 如果 userInfo 中没有，尝试直接从 storage 获取
    if (!userId) {
      userId = wx.getStorageSync('userId');
    }

    // 如果还是没有，从 options 参数中获取（如果有）
    if (!userId) {
      userId = this.data.currentUserId;
    }

    // ✅ 详细日志：连接前检查
    console.log('\n');
    console.log('========================================');
    console.log('=== 🚀 WebSocket 连接前检查 ===');
    console.log('========================================');
    console.log('📍 Token:', token ? token.substring(0, 20) + '...' : '❌ 不存在');
    console.log('📍 UserInfo:', userInfo);
    console.log('📍 UserId 来源:', userInfo?.id ? 'userInfo' : wx.getStorageSync('userId') ? 'storage' : 'currentUserId');
    console.log('📍 最终 UserId:', userId);
    console.log('========================================\n');

    if (!token) {
      console.error('❌ Token 不存在，无法连接 WebSocket');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (!userId) {
      console.error('❌ UserId 不存在，无法连接 WebSocket');
      wx.showToast({
        title: '用户信息异常',
        icon: 'none'
      });
      return;
    }

    // 关闭旧连接
    if (this.data.ws) {
      console.log('⚠️ 检测到旧连接，正在关闭...');
      this.data.ws.close();
    }

    // ✅ 构建 WebSocket URL
    const wsUrl = `ws://localhost:8090/ws/message?userId=${userId}&token=${token}`;

    console.log('\n');
    console.log('========================================');
    console.log('=== 📡 WebSocket 连接详情 ===');
    console.log('========================================');
    console.log('🌐 WebSocket URL:', wsUrl);
    console.log('📦 连接参数:', {
      userId: userId,
      userIdType: typeof userId,
      tokenExists: !!token
    });
    console.log('========================================\n');

    // ✅ 开始连接
    console.log('⏳ 正在发起 WebSocket 连接请求...');

    wx.connectSocket({
      url: wsUrl,
      success: (res) => {
        console.log('\n');
        console.log('========================================');
        console.log('✅ WebSocket 连接请求已发送');
        console.log('========================================');
        console.log('响应对象:', res);
        console.log('========================================\n');
      },
      fail: (err) => {
        console.log('\n');
        console.log('========================================');
        console.log('❌ WebSocket 连接失败');
        console.log('========================================');
        console.error('错误对象:', err);
        console.error('错误详情:', JSON.stringify(err));
        console.error('错误码:', err.errCode);
        console.error('错误信息:', err.errMsg);

        // ✅ 尝试给出具体建议
        console.log('\n🔍 错误分析:');
        if (err.errMsg.includes('url')) {
          console.warn('⚠️ URL 可能有问题，请检查是否包含 http/https 前缀');
          console.warn('  当前 URL:', wsUrl);
        } else if (err.errMsg.includes('domain')) {
          console.warn('⚠️ 域名未配置，请在微信公众平台配置 WebSocket 合法域名');
          console.warn('  或在开发者工具中开启"不校验合法域名"');
        } else if (err.errMsg.includes('timeout')) {
          console.warn('⚠️ 连接超时，后端服务可能未启动');
        } else if (err.errMsg.includes('401')) {
          console.error('⚠️ 身份验证失败 (401)，Token 可能无效或 userId 不匹配');
        } else if (err.errMsg.includes('403')) {
          console.error('⚠️ 拒绝访问 (403)，后端拒绝了连接请求');
        } else if (err.errMsg.includes('404')) {
          console.error('⚠️ 接口不存在 (404)，后端 WebSocket 端点可能未配置');
        } else if (err.errMsg.includes('500')) {
          console.error('⚠️ 服务器内部错误 (500)，后端服务异常');
        }

        console.log('\n💡 建议操作:');
        if (err.errMsg && err.errMsg.includes('domain')) {
          console.warn('1. 在微信开发者工具中开启"不校验合法域名"');
          console.warn('   位置：右上角"详情" → "本地设置" → 勾选"不校验合法域名"');
        } else {
          console.warn('1. 检查后端 WebSocket 服务是否启动');
          console.warn('   命令：netstat -ano | findstr :8090');
          console.warn('2. 查看后端日志，确认 WebSocket 是否正常启动');
          console.warn('3. 检查后端 Token 验证逻辑是否正确');
        }

        console.log('========================================\n');

        // ✅ 如果是 401 错误，提示用户
        if (err.errMsg && err.errMsg.includes('401')) {
          console.error('⚠️ Token 验证失败，可能是 userId 与 Token 不匹配');
          console.error('💡 建议：请检查后端 Token 生成逻辑，确保 Token 中的 userId 与前端传递的一致');

          wx.showModal({
            title: '连接失败',
            content: '身份验证失败，请重新登录',
            confirmText: '重新登录',
            success: (res) => {
              if (res.confirm) {
                // 清除所有缓存，跳转到登录页
                wx.clearStorageSync();
                wx.reLaunch({
                  url: '/pages/login/login'
                });
              }
            }
          });
        }

        this.setData({ isConnected: false });
        // 5 秒后重连
        this.scheduleReconnect();
      }
    });

    // 监听 WebSocket 连接打开
    wx.onSocketOpen((res) => {
      console.log('\n');
      console.log('========================================');
      console.log('✅ WebSocket 连接已打开');
      console.log('========================================');
      console.log('打开事件详情:', res);
      console.log('========================================\n');

      this.setData({ isConnected: true });
      this.startHeartbeat();
    });

    // 监听 WebSocket 连接关闭
    wx.onSocketClose((res) => {
      console.log('\n');
      console.log('========================================');
      console.log('🔴 WebSocket 连接已关闭');
      console.log('========================================');
      console.log('关闭事件详情:', res);
      console.log('关闭码:', res.code);
      console.log('关闭原因:', res.reason);
      console.log('是否干净:', res.wasClean);

      // ✅ 1006 表示异常关闭
      if (res.code === 1006) {
        console.error('\n⚠️ 异常关闭（1006），可能是：');
        console.error('1. 后端拒绝连接（认证失败）');
        console.error('2. 网络问题');
        console.error('3. 服务器未启动');
        console.error('4. 防火墙阻止了连接');
      } else if (res.code === 1000) {
        console.log('✅ 正常关闭 (1000)');
      } else if (res.code === 1001) {
        console.warn('⚠️ 端点离开 (1001)');
      } else if (res.code === 1002) {
        console.error('❌ 协议错误 (1002)');
      } else if (res.code === 1003) {
        console.error('❌ 数据类型不支持 (1003)');
      } else if (res.code === 1005) {
        console.warn('⚠️ 无状态码 (1005)');
      }

      console.log('========================================\n');

      this.setData({ isConnected: false });
      this.stopHeartbeat();

      // 3 秒后尝试重连
      this.scheduleReconnect();
    });

    // 监听 WebSocket 错误
    wx.onSocketError((res) => {
      console.log('\n');
      console.log('========================================');
      console.log('⚠️ WebSocket 错误');
      console.log('========================================');
      console.error('错误事件详情:', res);
      console.error('错误码:', res.errCode);
      console.error('错误信息:', res.errMsg);

      // ✅ 如果是 401 错误，提示用户
      if (res.errCode === 401) {
        console.error('\n⚠️ Token 验证失败：userId 与 Token 不匹配');
        console.error('当前 userId:', userId);
        console.error('Token 中的 userId 可能是：183（与实际不符）');
      } else {
        console.warn('\n⚠️ WebSocket 连接错误，请检查网络或服务状态');
      }

      console.log('========================================\n');

      this.setData({ isConnected: false });
      this.stopHeartbeat();
    });

    // 监听 WebSocket 消息
    wx.onSocketMessage((res) => {
      console.log('\n');
      console.log('========================================');
      console.log('📨 收到 WebSocket 消息');
      console.log('========================================');
      console.log('原始数据:', res.data);
      console.log('数据类型:', typeof res.data);

      try {
        const data = JSON.parse(res.data);
        console.log('解析后的数据:', data);
        console.log('消息类型:', data.type);
        console.log('========================================\n');

        // 处理新消息推送
        if (data.type === 'MESSAGE') {
          console.log('📩 收到新消息推送');
          this.handleNewMessage(data);
        }

        // 处理通知推送
        if (data.type === 'NOTIFICATION') {
          console.log('🔔 收到通知推送');
          this.handleNotification(data);
        }
      } catch (err) {
        console.error('❌ 解析 WebSocket 消息失败:', err);
        console.error('原始数据:', res.data);
        console.log('========================================\n');
      }
    });
  },

  // ✅ 处理新消息
  handleNewMessage: function(data) {
    const { receiver, chatRecords, currentUserId } = this.data;

    // 判断是否是当前会话的消息
    if (data.senderId === receiver || data.receiverId === currentUserId) {
      const newMessage = {
        id: data.messageId || `msg-${Date.now()}`,
        sender: data.senderId,
        receiver: data.receiverId,
        content: data.content,
        type: data.messageType || 'text',
        timestamp: data.sendTime || new Date().toISOString(),
        formattedTime: this.formatTime(new Date(data.sendTime)),
        showTime: true
      };

      const newRecords = [...chatRecords, newMessage];
      this.setData({ chatRecords: newRecords }, () => {
        this.scrollToBottom();
      });

      // 保存到本地缓存
      wx.setStorageSync(`chatRecords_${receiver}`, newRecords);

      // 如果在聊天页面，标记为已读
      this.markMessagesAsRead(receiver);
    }
  },

  // ✅ 处理通知
  handleNotification: function(data) {
    wx.showToast({
      title: data.content || '您有新消息',
      icon: 'none',
      duration: 2000
    });

    // 更新未读数
    this.updateGlobalUnreadChatCount();
  },

  // ✅ 定时心跳
  startHeartbeat: function() {
    this.stopHeartbeat(); // 先清除之前的

    this.data.heartbeatTimer = setInterval(() => {
      if (this.data.isConnected && this.data.ws) {
        wx.sendSocketMessage({
          data: JSON.stringify({ type: 'PING' }),
          success: () => {
            console.log('发送心跳成功');
          },
          fail: (err) => {
            console.error('发送心跳失败:', err);
          }
        });
      }
    }, 30000); // 每 30 秒发送一次心跳
  },

  stopHeartbeat: function() {
    if (this.data.heartbeatTimer) {
      clearInterval(this.data.heartbeatTimer);
      this.data.heartbeatTimer = null;
    }
  },

  // ✅ 安排重连
  scheduleReconnect: function() {
    if (this.data.reconnectTimer) {
      clearTimeout(this.data.reconnectTimer);
    }

    this.data.reconnectTimer = setTimeout(() => {
      console.log('尝试重新连接 WebSocket...');
      this.connectWebSocket();
    }, 3000); // 3 秒后重连
  },

  // ✅ 关闭 WebSocket
  closeWebSocket: function() {
    this.stopHeartbeat();

    if (this.data.reconnectTimer) {
      clearTimeout(this.data.reconnectTimer);
      this.data.reconnectTimer = null;
    }

    if (this.data.ws) {
      wx.closeSocket({
        success: () => {
          console.log('WebSocket 连接已关闭');
        }
      });
    }
  },

  processChatRecords: function (records) {
    return records.map((record, index, array) => {
      // 补充 type 字段
      if (!record.type) {
        record.type = 'text';
      }

      // 格式化时间显示
      record.formattedTime = this.formatTime(record.timestamp || record.sendTime);
      record.showTime = index === 0 || !this.isTimeGap(array, index);
      record.id = record.id || record.messageId || `msg-${Date.now()}-${index}`;

      return record;
    });
  },


  formatTime: function (timestamp) {
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
  },

  isTimeGap: function (records, index) {
    if (index === 0) return false;
    const currentTime = new Date(records[index].timestamp);
    const previousTime = new Date(records[index - 1].timestamp);
    const timeDiff = (currentTime - previousTime) / 60000; // 分钟差
    return timeDiff < 5; // 5分钟内不显示时间
  },

  onInput: function (e) {
    this.setData({
      message: e.detail.value
    });
  },

  // 切换功能面板显示
  toggleFunctionPanel: function () {
    this.setData({ showFunctionPanel: !this.data.showFunctionPanel });
  },

  // ✅ 发送消息（使用 WebSocket）- 优化：添加详细日志
  sendMessage: function () {
    const { message, receiver, currentUserId, chatRecords, isConnected } = this.data;

    console.log('\n');
    console.log('========================================');
    console.log('📤 尝试发送消息');
    console.log('========================================');
    console.log('消息内容:', message);
    console.log('接收者 ID:', receiver);
    console.log('当前用户 ID:', currentUserId);
    console.log('WebSocket 连接状态:', isConnected ? '已连接 ✅' : '未连接 ❌');
    console.log('========================================\n');

    if (!message.trim()) {
      console.warn('⚠️ 消息内容为空，取消发送');
      return;
    }

    if (!isConnected) {
      console.warn('⚠️ WebSocket 未连接，无法发送消息');
      wx.showModal({
        title: '发送失败',
        content: '网络连接不可用，请检查网络后重试',
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            this.connectWebSocket();
          }
        }
      });
      return;
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: currentUserId,
      receiver: receiver,
      content: message,
      type: 'text',
      timestamp: new Date().toISOString(),
      formattedTime: this.formatTime(new Date().toISOString()),
      showTime: true
    };

    console.log('📦 准备通过 WebSocket 发送消息:', newMessage);
    console.log('JSON 数据:', JSON.stringify({
      type: 'MESSAGE',
      senderId: currentUserId,
      receiverId: receiver,
      content: message,
      messageType: 'text'
    }));

    // 通过 WebSocket 发送
    wx.sendSocketMessage({
      data: JSON.stringify({
        type: 'MESSAGE',
        senderId: currentUserId,
        receiverId: receiver,
        content: message,
        messageType: 'text'
      }),
      success: () => {
        console.log('\n');
        console.log('========================================');
        console.log('✅ WebSocket 消息发送成功');
        console.log('========================================\n');

        // 添加到聊天记录的 UI
        const newRecords = [...(chatRecords || []), newMessage];
        this.setData({
          message: '',
          chatRecords: newRecords
        }, () => {
          wx.setStorageSync('chatRecords_' + receiver, newRecords);
          this.scrollToBottom();
        });
      },
      fail: (err) => {
        console.log('\n');
        console.log('========================================');
        console.log('❌ WebSocket 消息发送失败');
        console.log('========================================');
        console.error('错误详情:', err);
        console.log('========================================\n');

        wx.showToast({
          title: '发送失败，请检查网络',
          icon: 'none'
        });
      }
    });
  },


  // 拍摄并发送图片消息
  takePhoto: function () {
    const { receiver, currentUserId, chatRecords, isConnected } = this.data;

    if (!isConnected) {
      wx.showToast({
        title: '网络连接中...',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['camera'],
      success: (res) => {
        let imgPath = res.tempFilePaths[0];
        if (imgPath.startsWith('http://tmp/')) {
          imgPath = imgPath.replace('http://tmp/', 'wxfile://');
        }

        const newMessage = {
          id: `msg-${Date.now()}`,
          sender: currentUserId,
          receiver: receiver,
          content: imgPath,
          type: 'image',
          timestamp: new Date().toISOString(),
          formattedTime: this.formatTime(new Date().toISOString()),
          showTime: true
        };

        console.log('发送图片消息', newMessage);

        // TODO: 这里应该上传图片到服务器，然后发送图片 URL
        // 暂时先发送本地路径

        const newRecords = [...(chatRecords || []), newMessage];
        this.setData({
          chatRecords: newRecords,
          showFunctionPanel: false
        }, () => {
          wx.setStorageSync('chatRecords_' + receiver, newRecords);
          this.scrollToBottom();
        });
      }
    });
  },

  // 选择图片并发送图片消息
  chooseImage: function () {
    const { receiver, chatRecords } = this.data;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        let imgPath = res.tempFilePaths[0];
        if (imgPath.startsWith('http://tmp/')) {
          imgPath = imgPath.replace('http://tmp/', 'wxfile://');
        }
        const newMessage = {
          id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          sender: 'currentUserID',
          receiver,
          content: imgPath,
          type: 'image',
          timestamp: new Date().toISOString(),
          formattedTime: this.formatTime(new Date().toISOString()),
          showTime: true
        };
        console.log('发送图片消息', newMessage);
        const newRecords = [...(chatRecords || []), newMessage];
        this.setData({ chatRecords: newRecords, showFunctionPanel: false }, () => {
          wx.setStorageSync('chatRecords_' + receiver, newRecords);
          this.scrollToBottom();
        });
      }
    });
  },

  showLinkInput: function () {
    getMockLinks().then(list => {
      this.setData({ showLinkModal: true, linkInput: '', showFunctionPanel: false, linkList: list });
    });
  },

  // 选择并发送mock链接消息
  sendMockLink: function (e) {
    const { url, title, desc } = e.currentTarget.dataset;
    const { receiver, chatRecords } = this.data;
    const newMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      sender: 'currentUserID',
      receiver,
      content: url,
      type: 'link',
      title,
      desc,
      timestamp: new Date().toISOString(),
      formattedTime: this.formatTime(new Date().toISOString()),
      showTime: true
    };
    const newRecords = [...(chatRecords || []), newMessage];
    this.setData({
      chatRecords: newRecords,
      showLinkModal: false,
      linkInput: '',
      linkList: []
    }, () => {
      wx.setStorageSync('chatRecords_' + receiver, newRecords);
      this.scrollToBottom();
    });
  },

  scrollToBottom: function () {
    wx.nextTick(() => {
      setTimeout(() => {
        try {
          const query = wx.createSelectorQuery().in(this);
          query.select('#chatScrollView').boundingClientRect();
          query.selectViewport().scrollOffset();
          query.exec(res => {
            if (res && res[0] && res[1]) {
              // 直接滚动到底部而不依赖于消息ID
              this.setData({
                scrollTop: 99999
              });
              console.log('滚动到底部完成');
            }
          });
        } catch (e) {
          console.error('滚动到底部失败:', e);
          // 降级方案：使用原来的方法
          if (this.data.chatRecords.length > 0) {
            const lastMsg = this.data.chatRecords[this.data.chatRecords.length - 1];
            this.setData({ scrollIntoView: lastMsg.id });
          }
        }
      }, 50);
    });
  },

  onShow: function () {
    this.scrollToBottom();
  },
});