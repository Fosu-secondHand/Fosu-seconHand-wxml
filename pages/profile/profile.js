// pages/profile/profile.js
const authMixin = require('../../utils/authMixin.js');

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    accountNumber: '',
    myGoodsCount: 0,
    soldCount: 0,
    boughtCount: 0,
    netError: false,
    isLogin: false // 新增：用户登录状态
  },

  // 引入混入方法
  ...authMixin.methods,

  onLoad() {
    this.checkLoginStatus(); // 检查登录状态
    this.loadUserInfoWithNetError();
  },

  // 去登录功能
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 检查用户登录状态
  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');

      // 检查用户是否已登录（存在userInfo且isLogin为true，且存在token）
      const isLogin = !!(userInfo && userInfo.isLogin && token);

      this.setData({
        isLogin: isLogin
      });
    } catch (error) {
      console.error('检查登录状态失败:', error);
      this.setData({
        isLogin: false
      });
    }
  },

  // 合并后的onShow方法，包含更新发布数量和设置tabbar选中状态
  onShow() {
    // 重新检查登录状态
    this.checkLoginStatus();

    // 更新所有统计数据
    this.updateAllStats();

    // 2. 设置tabbar选中状态
    if (this.getTabBar) {
      const tabbar = this.getTabBar();
      if (tabbar && tabbar.setData) {
        tabbar.setData({ selected: 3 });
      }
    }
  },

  // 更新所有统计数据
  updateAllStats() {
    this.updateMyGoodsCount();
    this.updateSoldCount();
    this.updateBoughtCount();
  },

  // 更新我发布的商品数量
  updateMyGoodsCount() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo || !userInfo.id) {
      this.setData({ myGoodsCount: 0 });
      return;
    }

    // 调用后端接口获取发布的商品数量
    wx.request({
      url: `${app.globalData.baseUrl}/products/published-by-user`,
      method: 'GET',
      data: {
        userId: userInfo.id
      },
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.code === 200) {
          const count = res.data.data ? res.data.data.length : 0;
          this.setData({ myGoodsCount: count });
        } else {
          // 失败时使用本地存储数据作为备选
          const myPublishGoodsList = wx.getStorageSync('myPublishGoodsList') || [];
          this.setData({ myGoodsCount: myPublishGoodsList.length });
        }
      },
      fail: (err) => {
        console.error('获取发布商品数量失败:', err);
        // 失败时使用本地存储数据作为备选
        const myPublishGoodsList = wx.getStorageSync('myPublishGoodsList') || [];
        this.setData({ myGoodsCount: myPublishGoodsList.length });
      }
    });
  },

  // 更新我卖出的商品数量
  updateSoldCount() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo || !userInfo.id) {
      this.setData({ soldCount: 0 });
      return;
    }

    // 调用后端接口获取卖出的商品数量
    wx.request({
      url: `${app.globalData.baseUrl}/products/sold-by-user`,
      method: 'GET',
      data: {
        userId: userInfo.id
      },
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.code === 200) {
          const count = res.data.data ? res.data.data.length : 0;
          this.setData({ soldCount: count });
        } else {
          this.setData({ soldCount: 0 });
        }
      },
      fail: (err) => {
        console.error('获取卖出商品数量失败:', err);
        this.setData({ soldCount: 0 });
      }
    });
  },

  // 更新我买到的商品数量
  updateBoughtCount() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo || !userInfo.id) {
      this.setData({ boughtCount: 0 });
      return;
    }

    // 调用后端接口获取购买的商品数量
    wx.request({
      url: `${app.globalData.baseUrl}/products/purchased-by-user`,
      method: 'GET',
      data: {
        userId: userInfo.id
      },
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.code === 200) {
          const count = res.data.data ? res.data.data.length : 0;
          this.setData({ boughtCount: count });
        } else {
          this.setData({ boughtCount: 0 });
        }
      },
      fail: (err) => {
        console.error('获取购买商品数量失败:', err);
        this.setData({ boughtCount: 0 });
      }
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

      this.setData({
        ...defaultData,
        ...userInfo
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
    // 使用混入的登录检查方法
    if (!this.requireLogin('查看我的发布')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/myPublished/myPublished'
    });
  },

  // 导航到已卖出页面
  navigateToSold() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('查看已卖出')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/mySold/mySold'
    });
  },

  // 导航到已买到页面
  navigateToBought() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('查看已买到')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/myBought/myBought'
    });
  },

  // 导航到地址管理页面
  navigateToAddress() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('管理地址')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  // 导航到关于FOSU页面（修复路径）
  navigateToAboutFOSU() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('查看关于FOSU')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/aboutFosu/aboutFosu'
    });
  },

  // ===== 新增功能 =====
  // 导航到我的发布页面（修复路径）
  navigateToMyPublish() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('查看我的发布')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/myPublished/myPublished'
    });
  },

  // 导航到客服中心页面
  navigateToCustomerService() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('联系客服')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/customerService/customerService'
    });
  },

  goToUserHome() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('查看个人主页')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/userHome/userHome'
    });
  },
// 在 profile.js 文件中添加以下方法
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息和token
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');

          // 更新页面数据状态
          this.setData({
            isLogin: false,
            avatarUrl: '/static/assets/icons/default-avatar.png',
            nickname: '未设置昵称',
            accountNumber: '账号: fosu' + Math.floor(Math.random() * 10000)
          });

          // 显示退出成功提示
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 修复头像点击事件冲突，添加e.stopPropagation()阻止事件冒泡
  onChooseAvatar(e) {
    // 使用混入的登录检查方法
    if (!this.requireLogin('更换头像')) {
      return;
    }

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
  },
//   // 导航到设置页面
// navigateToSetting() {
//   // 使用混入的登录检查方法
//   if (!this.requireLogin('访问设置')) {
//     return;
//   }
//
//   wx.navigateTo({
//     url: '/pages/setting/setting'
//   });
// }

});
