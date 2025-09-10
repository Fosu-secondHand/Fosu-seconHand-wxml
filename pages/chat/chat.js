const { getChatRecords, getMockLinks } = require('../../mock/chat.js');

Page({
  data: {
    chatRecords: [],
    message: '',
    receiver: '',
    chatName: '',
    scrollTop: 0,
    scrollIntoView: '',
    scrollAnimation: true,
    showLinkModal: false,
    linkInput: '',
    showFunctionPanel: false,
    linkList: []
  },

  onLoad: function (options) {
    const receiver = options.receiver;
    const chatName = options.name || '聊天';
    this.setData({ receiver, chatName });

    wx.setNavigationBarTitle({ title: chatName });

    const sender = 'currentUserID';
    getChatRecords(sender, receiver).then(mockRecords => {
      const processedMock = this.processChatRecords(mockRecords);

      let localRecords = wx.getStorageSync('chatRecords_' + receiver);
      if (!Array.isArray(localRecords)) localRecords = [];

      // 追加本地缓存到mock后面
      const finalRecords = [...processedMock, ...localRecords];

      this.setData({ chatRecords: finalRecords }, () => {
        this.scrollToBottom();
      });
    }).catch(err => {
      console.error('获取mock数据失败:', err);
      this.setData({ chatRecords: [] });
    });
  },

  loadChatRecords: function () {
    const { receiver } = this.data;
    const sender = 'currentUserID';
    getChatRecords(sender, receiver).then(chatRecords => {
      this.setData({
        chatRecords: this.processChatRecords(chatRecords)
      }, () => {
        this.scrollToBottom();
      });
    }).catch(err => {
      console.error('Failed to load chat records:', err);
    });
  },

  processChatRecords: function (records) {
    return records.map((record, index, array) => {
      // 补充type字段
      if (!record.type) {
        record.type = 'text';
      }
      // 格式化时间显示
      record.formattedTime = this.formatTime(record.timestamp);
      record.showTime = index === 0 || !this.isTimeGap(array, index);
      record.id = record.id || `msg-${Date.now()}-${index}`;
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

  // 发送文本消息
  sendMessage: function () {
    const { message, receiver, chatRecords } = this.data;
    if (!message.trim()) return;
    const newMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      sender: 'currentUserID',
      receiver,
      content: message,
      type: 'text',
      timestamp: new Date().toISOString(),
      formattedTime: this.formatTime(new Date().toISOString()),
      showTime: true
    };
    const newRecords = [...(chatRecords || []), newMessage];
    this.setData({
      message: '',
      chatRecords: newRecords
    }, () => {
      wx.setStorageSync('chatRecords_' + receiver, newRecords);
      this.scrollToBottom();
    });
  },

  // 拍摄并发送图片消息
  takePhoto: function () {
    const { receiver, chatRecords } = this.data;
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
        if (this.data.chatRecords.length > 0) {
          const lastMsg = this.data.chatRecords[this.data.chatRecords.length - 1];
          console.log('滚动到消息id:', lastMsg.id);
          this.setData({ scrollIntoView: lastMsg.id });
        }
      }, 100);
    });
  },

  onShow: function () {
    this.scrollToBottom();
  },
});