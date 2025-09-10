// message.js
const { messages } = require('../../mock/message.js'); // 根据实际路径调整

Page({
  data: {
    messages: [],
    originalMessages: messages, // 保存原始数据
    page: 1,
    pageSize: 10,
    hasMoreData: true,
    loading: false // 添加加载状态
  },

  onLoad() {
    this.loadMessages();
    wx.setNavigationBarTitle({
      title: '消息'
    });
  },

  loadMessages() {
    if (this.data.loading || !this.data.hasMoreData) return;

    this.setData({ loading: true }); // 设置加载状态

    const { page, pageSize, originalMessages } = this.data;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const newMessages = originalMessages.slice(start, end);

    if (newMessages.length < pageSize) {
      this.setData({ hasMoreData: false });
    }
    this.setData({
      messages: this.data.messages.concat(newMessages),
      page: page + 1,
      loading: false // 重置加载状态
    });
  },

  onReachBottom() {
    this.loadMessages();
  },

  navigateToChat: function(event) {
    const receiver = event.currentTarget.dataset.receiver;
    wx.navigateTo({
      url: `/pages/chat/chat?receiver=${receiver}` // 跳转到私聊页面，并传递接收者ID
    });
  },
  onShow() {
    if (this.getTabBar) {
      const tabbar = this.getTabBar();
      if (tabbar && tabbar.setData) {
        tabbar.setData({ selected: 2 });
      }
    }
  }
});