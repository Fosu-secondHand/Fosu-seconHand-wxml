Page({
  data: {
    avatarUrl: '',
    nickname: '',
    accountNumber: '',
    myGoodsCount: 0,
    soldCount: 0,
    boughtCount: 0,
    netError: false
  },

  onLoad() {
    this.loadUserInfoWithNetError();
  },

  onShow() {
    // 每次页面显示时更新发布数量
    const myPublishGoodsList = wx.getStorageSync('myPublishGoodsList') || [];
    this.setData({
      myGoodsCount: myPublishGoodsList.length
    });
  },

  loadUserInfoWithNetError() {
    this.setData({ netError: false });
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      
      const defaultData = {
        avatarUrl: '/static/assets/icons/default-avatar.png',
        nickname: '未设置昵称',
        accountNumber: '账号: fosu' + Math.floor(Math.random() * 10000)
      };
      
      // 获取发布商品数量
      const myPublishGoodsList = wx.getStorageSync('myPublishGoodsList') || [];
      
      this.setData({
        ...defaultData,
        ...userInfo,
        myGoodsCount: myPublishGoodsList.length
      });
      
      console.log('Profile: 用户信息加载成功', this.data);
    } catch (error) {
      console.error('Profile: 加载用户信息失败', error);
      wx.showToast({
        title: '加载用户信息失败',
        icon: 'none'
      });
      this.setData({ netError: true });
    }
  },

  reloadPage() {
    this.loadUserInfoWithNetError();
  },

  // 导航到我的商品页面
  navigateToMyGoods() {
    wx.navigateTo({
      url: '/pages/myPublished/myPublished'
    });
  },

  // 导航到已卖出页面
  navigateToSold() {
    wx.navigateTo({
      url: '/pages/mySold/mySold'
    });
  },

  // 导航到已买到页面
  navigateToBought() {
    wx.navigateTo({
      url: '/pages/myBought/myBought'
    });
  },

  // 导航到地址管理页面
  navigateToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  // 导航到关于页面
  navigateToAboutFOSU() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  // ===== 新增功能 =====
  // 导航到我的发布页面
  navigateToMyPublish() {
    wx.navigateTo({
      url: '/pages/myPublish/myPublish'
    });
  },

  // 导航到客服中心页面
  navigateToCustomerService() {
    wx.navigateTo({
      url: '/pages/customerService/customerService'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  goToUserHome() {
    wx.navigateTo({
      url: '/pages/userHome/userHome'
    });
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ avatarUrl: tempFilePath });
        // 同步到本地userInfo
        let userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.avatarUrl = tempFilePath;
        wx.setStorageSync('userInfo', userInfo);
        wx.showToast({ title: '头像已更新', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '未选择头像', icon: 'none' });
      }
    });
  }
  ,
  onShow() {
    if (this.getTabBar) {
      const tabbar = this.getTabBar();
      if (tabbar && tabbar.setData) {
        tabbar.setData({ selected: 3 });
      }
    }
  }
});