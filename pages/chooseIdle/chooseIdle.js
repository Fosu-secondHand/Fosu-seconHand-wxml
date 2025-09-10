Page({
  goPublish() {
    wx.navigateTo({ url: '/pages/idle/idle' });
  },
  goWant() {
    wx.navigateTo({ url: '/pages/wantIdle/wantIdle' });
  },
  onShow() {
    if (this.getTabBar) {
      const tabbar = this.getTabBar();
      if (tabbar && tabbar.setData) {
        tabbar.setData({ selected: 1 });
      }
    }
  }
}); 