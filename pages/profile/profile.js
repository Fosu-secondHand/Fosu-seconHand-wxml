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

  // 合并后的onShow方法，包含更新发布数量和设置tabbar选中状态
  onShow() {
    // 1. 更新发布商品数量
    const myPublishGoodsList = wx.getStorageSync('myPublishGoodsList') || [];
    this.setData({
      myGoodsCount: myPublishGoodsList.length
    });
    
    // 2. 设置tabbar选中状态
    if (this.getTabBar) {
      const tabbar = this.getTabBar();
      if (tabbar && tabbar.setData) {
        tabbar.setData({ selected: 3 });
      }
    }
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

  // 导航到关于FOSU页面（修复路径）
  navigateToAboutFOSU() {
    wx.navigateTo({
      url: '/pages/aboutFosu/aboutFosu'
    });
  },

  // ===== 新增功能 =====
  // 导航到我的发布页面（修复路径）
  navigateToMyPublish() {
    wx.navigateTo({
      url: '/pages/myPublished/myPublished'
    });
  },

  // 导航到客服中心页面
  navigateToCustomerService() {
    wx.navigateTo({
      url: '/pages/customerService/customerService'
    });
  },

  // 退出登录（修复：添加页面跳转逻辑）
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            // 获取App实例
            const app = getApp();
            
            // 调用全局logout方法进行全面清理
            if (app && app.logout) {
              app.logout();
            }
            
            // 额外清除，确保万无一失
            wx.clearStorageSync();
            
            // 强制设置用户未登录状态
            wx.setStorageSync('userInfo', { isLogin: false });
            
            console.log('登录状态已完全清除');
            
            // 短暂延迟后再跳转，确保清除操作完全执行
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/login/login',
                success: () => {
                  console.log('成功跳转到登录页面');
                },
                fail: (err) => {
                  console.error('跳转登录页面失败:', err);
                  // 备用方案：如果reLaunch失败，尝试其他跳转方式
                  wx.redirectTo({ url: '/pages/login/login' });
                }
              });
            }, 100);
          } catch (e) {
            console.error('退出登录过程发生异常:', e);
            // 即使出现异常，也尝试跳转到登录页
            wx.reLaunch({ url: '/pages/login/login' });
          }
        }
      }
    });
  },

  goToUserHome() {
    wx.navigateTo({
      url: '/pages/userHome/userHome'
    });
  },

  // 修复头像点击事件冲突，添加e.stopPropagation()阻止事件冒泡
  onChooseAvatar(e) {
    // 阻止事件冒泡到父元素，避免同时触发goToUserHome
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
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
});