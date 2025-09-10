Page({
  data: {
    ordersList: []
  },

  onLoad() {
    this.loadOrdersList();
  },

  onShow() {
    this.loadOrdersList();
  },

  loadOrdersList() {
    // 这里模拟从缓存获取已卖出订单列表，实际应用中应从服务器获取
    const ordersList = wx.getStorageSync('mySoldOrdersList') || [];
    this.setData({ ordersList });
  }
});