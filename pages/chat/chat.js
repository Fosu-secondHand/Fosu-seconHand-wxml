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
    heartbeatTimer: null,
    currentUserAvatar: '/static/assets/icons/default-avatar.png',
    receiverAvatar: '/static/assets/icons/default-avatar.png',
    currentUserName: '',
    receiverName: '',
    // ✅ 新增：商品卡片相关数据
    relatedGoods: null, // 存储商品信息对象
    goodsIdFromUrl: ''  // 记录从 URL 传来的商品 ID
  },


  onLoad: function (options) {
    console.log('🚀 聊天页面初始化收到的参数:', options);

    let receiver = parseInt(options.receiver);
    const currentUserId = parseInt(options.currentUserId);
    const goodsId = options.goodsId; // ✅ 获取商品 ID

    if (isNaN(receiver)) {
      receiver = parseInt(options.targetId || options.otherUserId);
    }

    const chatName = options.name ? decodeURIComponent(options.name) : (isNaN(receiver) ? '未知用户' : String(receiver));

    console.log('🚀 聊天页面初始化:', { receiver, currentUserId, chatName, goodsId });

    if (isNaN(receiver) || !receiver) {
      wx.showToast({ title: '聊天对象信息缺失', icon: 'none' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
      return;
    }

    const userInfo = wx.getStorageSync('userInfo');
    let currentUserAvatar = '/static/assets/icons/default-avatar.png';
    let currentUserName = '我';

    if (userInfo) {
      if (userInfo.avatar) {
        currentUserAvatar = this.processImageUrl(userInfo.avatar);
      }
      currentUserName = userInfo.nickname || userInfo.username || '我';
    }

    this.setData({
      receiver,
      chatName,
      currentUserId: currentUserId || 252,
      currentUserAvatar: currentUserAvatar,
      currentUserName: currentUserName,
      receiverName: chatName,
      goodsIdFromUrl: goodsId // ✅ 保存商品 ID
    });

    wx.setNavigationBarTitle({ title: chatName });

    this.loadReceiverInfo(receiver);

    // ✅ 如果传入了商品 ID，则加载商品信息
    if (goodsId) {
      this.loadRelatedGoods(goodsId);
    }

    this.loadChatHistory();
    this.connectWebSocket();
  },

  // ✅ 新增：加载关联商品信息
  loadRelatedGoods: function(goodsId) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    wx.request({
      url: `${app.globalData.baseUrl}/products/detail?productId=${goodsId}`,
      method: 'GET',
      header: { 'Authorization': token },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const product = res.data.data;
          // 处理图片路径
          let imageUrl = product.image || (product.images && product.images[0]) || '';
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = this.processImageUrl(imageUrl);
          }

          this.setData({
            relatedGoods: {
              id: product.id || product.productId,
              title: product.title,
              price: product.price,
              image: imageUrl
            }
          });
        }
      },
      fail: (err) => {
        console.error('加载关联商品失败:', err);
      }
    });
  },

  // ✅ 新增：点击商品卡片跳转回详情页
  onGoodsCardTap: function() {
    if (this.data.relatedGoods && this.data.relatedGoods.id) {
      wx.navigateTo({
        url: `/pages/GoodDetail/GoodDetail?id=${this.data.relatedGoods.id}`
      });
    }
  },

  // ✅ 新增：加载接收者信息（头像等）
  loadReceiverInfo: function(receiverId) {
    const token = wx.getStorageSync('token');
    if (!token || !receiverId) return;

    console.log('🔍 [loadReceiverInfo] 开始加载接收者信息，receiverId:', receiverId);

    wx.request({
      url: `${app.globalData.baseUrl}/users/${receiverId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        console.log('📥 [loadReceiverInfo] 接口响应:', res);

        if (res.statusCode === 200 && res.data.code === 200) {
          const userData = res.data.data;
          console.log('👤 [loadReceiverInfo] 用户原始数据:', userData);

          let avatarUrl = '/static/assets/icons/default-avatar.png';
          let userName = '未知用户';

          if (userData.avatar) {
            console.log('🖼️ [loadReceiverInfo] 原始头像路径:', userData.avatar);
            avatarUrl = this.processImageUrl(userData.avatar);
            console.log('🖼️ [loadReceiverInfo] 处理后头像 URL:', avatarUrl);
          } else {
            console.warn('⚠️ [loadReceiverInfo] 用户数据中没有 avatar 字段');
          }

          if (userData.nickname || userData.username) {
            userName = userData.nickname || userData.username;
          }

          this.setData({
            receiverAvatar: avatarUrl,
            receiverName: userName
          });

          console.log('✅ [loadReceiverInfo] 加载成功:', { avatarUrl, userName });
        } else {
          console.error('❌ [loadReceiverInfo] 接口返回错误:', res.data);
        }
      },
      fail: (err) => {
        console.error('❌ [loadReceiverInfo] 网络请求失败:', err);
      }
    });
  },

  onUnload() {
    console.log('🔴 页面卸载，彻底关闭 WebSocket');
    this.closeWebSocket(true);
  },

  onHide() {
    // ✅ 修复：页面隐藏时不要永久关闭，只停止心跳即可
    // 这样用户切出去回消息列表再回来，连接还在，体验更流畅
    console.log('🟡 页面隐藏，停止心跳');
    this.stopHeartbeat();
  },

  onShow() {
    console.log('🟢 页面显示，检查连接状态');
    // 如果断开了，重新连
    if (!this.data.isConnected) {
      this.connectWebSocket();
    }
    this.scrollToBottom();
  },

  // ✅ 新增：统一的消息格式转换函数（智能检测版本 - 修复版）
  formatMessage: function(rawMsg) {
    if (!rawMsg) return null;
    const msg = { ...rawMsg };

    console.log('🔍 [formatMessage] 原始消息:', rawMsg);

    // 1. 兼容字段名：将 senderId/receiverId 映射为 sender/receiver
    msg.sender = msg.sender || msg.senderId;
    msg.receiver = msg.receiver || msg.receiverId;
    msg.messageType = msg.messageType || msg.msgType;

    // ✅ 关键修复：智能检测消息类型
    // 优先检查 metadata 中是否有 images 字段，如果有则强制识别为图片
    let detectedType = msg.messageType;

    if (msg.metadata) {
      try {
        // ✅ 修复：处理字符串类型的 metadata（可能包含转义字符）
        let metadataObj;
        if (typeof msg.metadata === 'string') {
          // 先尝试直接解析
          try {
            metadataObj = JSON.parse(msg.metadata);
          } catch (e) {
            // 如果失败，尝试去除转义字符后再解析
            const cleanMetadata = msg.metadata.replace(/\\"/g, '"');
            metadataObj = JSON.parse(cleanMetadata);
          }
        } else {
          metadataObj = msg.metadata;
        }

        console.log('🔍 [formatMessage] 解析后的 metadata 对象:', metadataObj);

        if (metadataObj && metadataObj.images && Array.isArray(metadataObj.images) && metadataObj.images.length > 0) {
          detectedType = 1; // 强制识别为图片
          console.log('🖼️ [formatMessage] 检测到 metadata.images，强制识别为图片类型');
        } else if (metadataObj && metadataObj.linkUrl) {
          detectedType = 3; // 链接类型
          console.log('🔗 [formatMessage] 检测到 metadata.linkUrl，识别为链接类型');
        }
      } catch (e) {
        console.warn('⚠️ [formatMessage] metadata 解析失败，使用原始 msgType:', e);
        console.warn('⚠️ [formatMessage] metadata 原始值:', msg.metadata);
      }
    }

    // 2. 根据检测后的类型转换 type 和 content
    if (detectedType === 1) { // 图片
      msg.type = 'image';

      if (msg.metadata) {
        try {
          // ✅ 修复：同样处理字符串类型的 metadata
          let metadata;
          if (typeof msg.metadata === 'string') {
            try {
              metadata = JSON.parse(msg.metadata);
            } catch (e) {
              const cleanMetadata = msg.metadata.replace(/\\"/g, '"');
              metadata = JSON.parse(cleanMetadata);
            }
          } else {
            metadata = msg.metadata;
          }

          console.log('🖼️ [formatMessage] 解析后的 metadata:', metadata);

          if (metadata.images && Array.isArray(metadata.images) && metadata.images.length > 0) {
            // ✅ 关键：拼接完整 URL 并进行协议转换（HTTP/HTTPS）
            let imageUrl = metadata.images[0];
            console.log('🖼️ [formatMessage] 原始图片路径:', imageUrl);

            msg.content = this.processImageUrl(imageUrl);
            console.log('🖼️ [formatMessage] 处理后的图片 URL:', msg.content);
          } else {
            console.warn('⚠️ [formatMessage] metadata.images 为空');
            msg.content = '';
          }
        } catch (e) {
          console.error('❌ [formatMessage] 解析图片 metadata 失败:', e, 'metadata 原始值:', msg.metadata);
          msg.content = '';
        }
      } else {
        console.warn('⚠️ [formatMessage] metadata 字段不存在');
        msg.content = '';
      }
    } else if (detectedType === 2) { // 文件
      msg.type = 'file';
      msg.content = msg.content || '[文件]';
    } else if (detectedType === 3) { // 链接
      msg.type = 'link';
      // 链接消息通常也需要从 metadata 取 URL
      if (msg.metadata) {
        try {
          let metadata;
          if (typeof msg.metadata === 'string') {
            metadata = JSON.parse(msg.metadata);
          } else {
            metadata = msg.metadata;
          }
          msg.content = metadata.linkUrl || msg.content;
        } catch(e) {}
      }
    } else { // 默认为文本
      msg.type = 'text';
      msg.content = msg.content || '';
    }

    console.log('✅ [formatMessage] 转换后的消息:', msg);
    return msg;
  },


  // ✅ 修改：加载聊天记录时使用转换函数
  loadChatHistory: function () {
    const { currentUserId, receiver } = this.data;
    if (!currentUserId || !receiver) return;

    const token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: `${app.globalData.baseUrl}/messages/history`,
      method: 'GET',
      data: { userId1: currentUserId, userId2: receiver },
      header: { 'Authorization': token },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          let messages = [];
          if (Array.isArray(res.data.data)) {
            messages = res.data.data;
          } else if (res.data.data && Array.isArray(res.data.data.messages)) {
            messages = res.data.data.messages;
          }

          console.log('=== 原始历史消息数据 ===', messages);

          // ✅ 核心修改：对每一条历史消息进行格式转换
          const formattedMessages = messages.map(msg => this.formatMessage(msg));

          console.log('=== formatMessage 转换后的数据 ===', formattedMessages);

          // ✅ 关键修复：processChatRecords 不应该再修改 type 和 content 字段
          const processedMessages = this.processChatRecords(formattedMessages);

          console.log('=== processChatRecords 处理后的最终数据 ===', processedMessages);

          this.setData({
            chatRecords: processedMessages
          }, () => {
            this.scrollToBottom();
          });

          setTimeout(() => {
            this.markMessagesAsRead(receiver);
          }, 500);
        }
      },
      fail: (err) => {
        console.error('加载聊天记录网络错误:', err);
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

  // ✅ 新增：统一处理图片 URL 的方法（参考 message.js）
  processImageUrl(imagePath) {
    if (!imagePath && imagePath !== 0) {
      console.warn('⚠️ [processImageUrl] 输入路径为空');
      return '';
    }

    const imageUrl = String(imagePath).trim();
    if (!imageUrl) {
      console.warn('⚠️ [processImageUrl] 修剪后路径为空');
      return '';
    }

    const app = getApp();
    const baseURL = app.globalData.baseUrl;

    console.log('🔗 [processImageUrl] 输入路径:', imageUrl);
    console.log('🔗 [processImageUrl] baseURL:', baseURL);

    // 如果已经是完整 URL，直接返回
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // ✅ 关键修复：将 HTTPS 强制转换为 HTTP（仅用于开发环境）
      if (imageUrl.startsWith('https://')) {
        const httpUrl = imageUrl.replace('https://', 'http://');
        console.log('🔗 [processImageUrl] HTTPS -> HTTP:', httpUrl);
        return httpUrl;
      }
      console.log('🔗 [processImageUrl] 已是完整 HTTP URL，直接返回');
      return imageUrl;
    }

    // 如果是相对路径，拼接完整域名
    if (imageUrl.startsWith('/api')) {
      const serverRoot = baseURL.replace(/\/api$/, '');
      // ✅ 确保使用 HTTP
      const finalUrl = serverRoot + imageUrl;
      const result = finalUrl.startsWith('https://') ? finalUrl.replace('https://', 'http://') : finalUrl;
      console.log('🔗 [processImageUrl] /api 路径拼接结果:', result);
      return result;
    } else {
      const finalUrl = baseURL + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
      // ✅ 确保使用 HTTP
      const result = finalUrl.startsWith('https://') ? finalUrl.replace('https://', 'http://') : finalUrl;
      console.log('🔗 [processImageUrl] 相对路径拼接结果:', result);
      return result;
    }
  },

  // ✅ 修复：连接 WebSocket - 增加防抖和状态检查
  connectWebSocket: function() {
    // 1. 如果已经连接成功，直接返回，不要重复连接
    if (this.data.isConnected) {
      console.log('✅ WebSocket 已连接，跳过本次连接请求');
      return;
    }

    // 2. 如果正在连接中（有 socketTaskId 但未 open），也跳过，防止并发请求
    if (this.data.ws && this.data.ws.readyState === 0) {
      console.log('⏳ WebSocket 正在连接中，请稍候...');
      return;
    }

    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    let userId = userInfo?.id || wx.getStorageSync('userId') || this.data.currentUserId;

    if (!token || !userId) {
      console.error('❌ 缺少 Token 或 UserId，无法连接');
      return;
    }

    // ✅ 关键：在发起新连接前，先确保旧连接已彻底关闭
    if (this.data.ws) {
      console.log('⚠️ 检测到残留连接对象，先手动关闭...');
      try {
        this.data.ws.close();
      } catch (e) {}
      this.data.ws = null;
    }

    const wsUrl = `ws://139.199.87.181:8080/api/ws/message?userId=${userId}&token=${token}`;
    console.log('📡 正在建立 WebSocket 连接...', wsUrl);

    // 3. 发起连接
    const socketTask = wx.connectSocket({
      url: wsUrl,
      success: () => {
        console.log('✅ 连接请求已发送');
      },
      fail: (err) => {
        console.error('❌ 连接请求发送失败', err);
        this.setData({ isConnected: false });
        // 只有非人为关闭才重连
        if (!this.data.isPermanentlyClosed) {
          this.scheduleReconnect();
        }
      }
    });

    // 保存当前 socket 任务引用
    this.setData({ ws: socketTask });

    // 4. 监听打开事件
    socketTask.onOpen(() => {
      console.log('✅ WebSocket 连接正式打开');
      this.setData({
        isConnected: true,
        isPermanentlyClosed: false // 重置关闭标志
      });
      this.startHeartbeat();
    });

    // 5. 监听关闭事件
    socketTask.onClose((res) => {
      console.log('🔴 WebSocket 已关闭', res.code);
      this.setData({ isConnected: false });
      this.stopHeartbeat();

      // 如果不是永久关闭且不是正常关闭(1000)，则尝试重连
      if (!this.data.isPermanentlyClosed && res.code !== 1000) {
        this.scheduleReconnect();
      }
    });

    // 6. 监听错误
    socketTask.onError((err) => {
      console.error('⚠️ WebSocket 发生错误', err);
      this.setData({ isConnected: false });
      this.stopHeartbeat();
    });

    // 7. 监听消息
    socketTask.onMessage((res) => {
      this.handleSocketMessage(res.data);
    });
  },


  handleSocketMessage: function(dataStr) {
    try {
      const data = JSON.parse(dataStr);
      console.log('📨 收到消息:', data);

      // 兼容后端返回的数组格式或对象格式
      const messages = Array.isArray(data) ? data : [data];

      messages.forEach(msg => {
        if (msg.type === 'MESSAGE' || msg.msgType) {
          this.handleNewMessage(msg);
        }
      });
    } catch (e) {
      console.error('解析消息失败', e);
    }
  },

  // ✅ 修改：处理新消息（WebSocket）
  handleNewMessage: function(data) {
    const { receiver, chatRecords, currentUserId, currentUserName, currentUserAvatar, receiverName, receiverAvatar } = this.data;

    if (data.senderId === receiver || data.receiverId === currentUserId) {
      // ✅ 使用简化后的转换函数
      const formattedData = this.formatMessage(data);

      // 处理头像（如果后端没返回头像，则本地匹配）
      let senderAvatar = formattedData.senderAvatar;
      if (!senderAvatar) {
        senderAvatar = (formattedData.sender == currentUserId) ? currentUserAvatar : receiverAvatar;
      }

      const senderName = (formattedData.sender == currentUserId) ? currentUserName : receiverName;

      const newMessage = {
        ...formattedData,
        id: formattedData.id || formattedData.messageId || `msg-${Date.now()}`,
        timestamp: formattedData.timestamp || formattedData.sendTime || new Date().toISOString(),
        formattedTime: this.formatTime(new Date(formattedData.sendTime)),
        showTime: true,
        senderAvatar: senderAvatar,
        senderName: senderName
      };

      const newRecords = [...chatRecords, newMessage];
      this.setData({ chatRecords: newRecords }, () => {
        this.scrollToBottom();
      });

      wx.setStorageSync(`chatRecords_${receiver}`, newRecords);
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


  // ✅ 修复：关闭 WebSocket
  closeWebSocket: function(isPermanent = false) {
    console.log(`🔴 准备关闭 WebSocket (永久: ${isPermanent})`);

    this.setData({
      isPermanentlyClosed: isPermanent
    });

    this.stopHeartbeat();
    if (this.data.reconnectTimer) {
      clearTimeout(this.data.reconnectTimer);
      this.data.reconnectTimer = null;
    }

    if (this.data.ws) {
      try {
        this.data.ws.close();
      } catch (e) {
        console.warn('关闭 Socket 时出错', e);
      }
      this.setData({ ws: null });
    }
  },

  processChatRecords: function (records) {
    if (!Array.isArray(records)) return [];

    const { currentUserId, currentUserName, currentUserAvatar, receiverName, receiverAvatar } = this.data;

    return records.map((record, index, array) => {
      // ✅ 核心修复：统一字段名，确保 WXML 能读到
      const normalizedRecord = {
        ...record,
        id: record.id || record.messageId || `msg-${Date.now()}-${index}`,
        // 兼容 sender 和 senderId
        sender: record.sender || record.senderId,
        // 兼容 receiver 和 receiverId
        receiver: record.receiver || record.receiverId,
        // ✅ 关键修复：只有当 content 为空时才使用 message 字段
        // 对于图片消息，content 已经被 formatMessage 设置为图片 URL，不应被覆盖
        content: record.content || record.message || '',
        // 兼容时间字段
        timestamp: record.timestamp || record.sendTime || record.createTime,
        // ✅ 关键修复：如果已经有 type 字段（由 formatMessage 设置），则不再覆盖
        type: record.type || (record.messageType === 1 ? 'image' : record.messageType === 2 ? 'file' : record.messageType === 3 ? 'link' : 'text'),
        // ✅ 新增：根据发送者设置头像和昵称
        senderAvatar: (record.sender == currentUserId) ? currentUserAvatar : receiverAvatar,
        senderName: (record.sender == currentUserId) ? currentUserName : receiverName
      };

      normalizedRecord.formattedTime = this.formatTime(normalizedRecord.timestamp);
      // 只有当两条消息间隔超过 5 分钟才显示时间
      normalizedRecord.showTime = index === 0 || !this.isTimeGap(array, index);

      return normalizedRecord;
    });
  },

  formatTime: function (timestamp) {
    if (!timestamp) return '';

    // 1. 解析时间
    let date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      date = new Date(timestamp.replace(/-/g, '/'));
    }

    // 2. ✅ 关键修复：补偿时区（转为北京时间 UTC+8）
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const chinaTime = new Date(utcTime + (8 * 3600000));

    const now = new Date();
    const diff = now - chinaTime;

    // ✅ 关键修改：定义 24 小时制的选项
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    // 3. 今天的消息只显示时间
    if (diff < 24 * 60 * 60 * 1000 && chinaTime.toDateString() === now.toDateString()) {
      return chinaTime.toLocaleTimeString('zh-CN', timeOptions);
    }

    // 4. 昨天的消息显示"昨天"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (chinaTime.toDateString() === yesterday.toDateString()) {
      return '昨天 ' + chinaTime.toLocaleTimeString('zh-CN', timeOptions);
    }

    // 5. 其他显示完整日期
    return chinaTime.toLocaleDateString('zh-CN') + ' ' + chinaTime.toLocaleTimeString('zh-CN', timeOptions);
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

  // ✅ 发送消息（增强健壮性）
  sendMessage: function () {
    const { message, receiver, currentUserId, currentUserName, currentUserAvatar, chatRecords, isConnected } = this.data;

    console.log('--- 准备发送 ---', { message, receiver, currentUserId, isConnected });

    if (!message || !message.trim()) {
      wx.showToast({ title: '消息不能为空', icon: 'none' });
      return;
    }

    if (!receiver) {
      wx.showToast({ title: '接收者信息丢失', icon: 'none' });
      return;
    }

    // ✅ 如果未连接，先尝试重连再发送
    if (!isConnected) {
      wx.showToast({ title: '正在重连服务器...', icon: 'none' });
      this.connectWebSocket();
      // 等待 1 秒后再尝试发送
      setTimeout(() => this.sendMessage(), 1000);
      return;
    }

    // 1. 本地乐观更新 UI
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: currentUserId,
      receiver: receiver,
      content: message,
      type: 'text',
      timestamp: new Date().toISOString(),
      formattedTime: this.formatTime(new Date()),
      showTime: true,
      senderAvatar: currentUserAvatar, // ✅ 添加当前用户头像
      senderName: currentUserName // ✅ 添加当前用户昵称
    };

    const newRecords = [...(chatRecords || []), newMessage];
    this.setData({
      message: '',
      chatRecords: newRecords
    }, () => {
      this.scrollToBottom();
    });

    // 2. 通过 WebSocket 发送
    const wsPayload = {
      type: 'MESSAGE',
      senderId: Number(currentUserId), // 确保是数字
      receiverId: Number(receiver),    // 确保是数字
      content: message,
      messageType: 'text'
    };

    wx.sendSocketMessage({
      data: JSON.stringify(wsPayload),
      fail: (err) => {
        console.error('❌ 发送失败:', err);
        wx.showToast({ title: '发送失败', icon: 'none' });
      }
    });
  },

  // ✅ 新增：上传图片到服务器
  uploadChatImage: function(filePath) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      wx.uploadFile({
        url: `${app.globalData.baseUrl}/messages/upload/image`,
        filePath: filePath,
        name: 'file', // 后端要求的参数名
        header: {
          'Authorization': token
        },
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data);
              if (data.code === 200) {
                // ✅ 关键修复：使用 processImageUrl 统一处理，自动转 HTTPS
                let imageUrl = data.data;
                imageUrl = this.processImageUrl(imageUrl);
                console.log('✅ 图片上传成功，处理后 URL:', imageUrl);
                resolve(imageUrl);
              } else {
                reject(new Error(data.message || '上传失败'));
              }
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error('网络错误'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // ✅ 修改：发送图片时的本地预览也保持格式一致
  takePhoto: function () {
    const { receiver, currentUserId, currentUserName, currentUserAvatar, chatRecords, isConnected } = this.data;
    if (!isConnected) {
      wx.showToast({ title: '网络连接中...', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: async (res) => {
        wx.showLoading({ title: '发送中...' });
        const tempFilePath = res.tempFiles[0].tempFilePath;

        try {
          const imageUrl = await this.uploadChatImage(tempFilePath);

          // ✅ 构造符合前端统一格式的消息对象
          const newMessage = {
            id: `msg-${Date.now()}`,
            sender: currentUserId,
            receiver: receiver,
            type: 'image', // ✅ 明确指定类型
            content: imageUrl, // ✅ 直接存放处理后的 URL
            timestamp: new Date().toISOString(),
            formattedTime: this.formatTime(new Date()),
            showTime: true,
            senderAvatar: currentUserAvatar,
            senderName: currentUserName
          };

          const newRecords = [...(chatRecords || []), newMessage];
          this.setData({
            chatRecords: newRecords,
            showFunctionPanel: false
          }, () => {
            this.scrollToBottom();
          });

          // ✅ 修复：发送相对路径给后端，metadata 作为对象传递（不要手动 stringify）
          const relativePath = imageUrl.replace(/^https?:\/\/[^\/]+/, '');
          console.log('📤 [takePhoto] 准备发送 WebSocket 消息:', {
            receiverId: Number(receiver),
            msgType: 1,
            metadata: { images: [relativePath] }
          });

          wx.sendSocketMessage({
            data: JSON.stringify({
              type: 'MESSAGE',
              senderId: Number(currentUserId),
              receiverId: Number(receiver),
              content: '',
              msgType: 1, // ✅ 使用 msgType 而不是 messageType
              metadata: { images: [relativePath] } // ✅ 作为对象传递，让 JSON.stringify 自动处理
            }),
            fail: (err) => {
              console.error('❌ 图片消息发送失败:', err);
              wx.showToast({ title: '发送失败', icon: 'none' });
            }
          });

          wx.hideLoading();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: '图片上传失败', icon: 'none' });
          console.error(error);
        }
      }
    });
  },

  // ✅ 修复：选择相册图片并发送
  chooseImage: function () {
    const { receiver, currentUserId, currentUserName, currentUserAvatar, chatRecords, isConnected } = this.data;

    if (!isConnected) {
      wx.showToast({ title: '网络连接中...', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: async (res) => {
        wx.showLoading({ title: '发送中...' });
        const tempFilePath = res.tempFiles[0].tempFilePath;

        try {
          // 1. 上传图片
          const imageUrl = await this.uploadChatImage(tempFilePath);

          // ✅ 修复：提取相对路径
          const relativePath = imageUrl.replace(/^https?:\/\/[^\/]+/, '');
          console.log('📤 [chooseImage] 准备发送 WebSocket 消息:', {
            receiverId: Number(receiver),
            msgType: 1,
            metadata: { images: [relativePath] }
          });

          // 2. 构造 WebSocket 消息（✅ metadata 作为对象）
          const wsPayload = {
            type: 'MESSAGE',
            senderId: Number(currentUserId),
            receiverId: Number(receiver),
            content: '',
            msgType: 1, // ✅ 使用 msgType
            metadata: { images: [relativePath] } // ✅ 作为对象传递
          };

          // 3. 本地乐观更新 UI
          const newMessage = {
            id: `msg-${Date.now()}`,
            sender: currentUserId,
            receiver: receiver,
            content: imageUrl,
            type: 'image',
            timestamp: new Date().toISOString(),
            formattedTime: this.formatTime(new Date()),
            showTime: true,
            senderAvatar: currentUserAvatar, // ✅ 添加头像
            senderName: currentUserName // ✅ 添加昵称
          };

          const newRecords = [...(chatRecords || []), newMessage];
          this.setData({
            chatRecords: newRecords,
            showFunctionPanel: false
          }, () => {
            this.scrollToBottom();
          });

          // 4. 通过 WebSocket 发送
          wx.sendSocketMessage({
            data: JSON.stringify(wsPayload),
            fail: (err) => {
              console.error('❌ 图片消息发送失败:', err);
              wx.showToast({ title: '发送失败', icon: 'none' });
            }
          });

          wx.hideLoading();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: '图片上传失败', icon: 'none' });
          console.error(error);
        }
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

  // ✅ 新增：预览图片
  previewImage: function(e) {
    const url = e.currentTarget.dataset.src;
    wx.previewImage({
      current: url,
      urls: [url]
    });
  }
});