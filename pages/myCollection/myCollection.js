// pages/myCollection/myCollection.js
const authMixin = require('../../utils/authMixin.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    collections: [],       // 收藏的商品列表
    loading: false,        // 加载状态
    userInfo: null,        // 用户信息
    hasUserInfo: false     // 是否有用户信息
  },

  // ✅ 引入混入方法
  ...authMixin.methods,

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // ✅ 新增：使用统一的登录检查
    if (!this.requireLogin('查看收藏')) {
      return;
    }

    // 页面加载时获取用户信息
    const app = getApp();
    const userInfo = app.globalData.userInfo;

    if (userInfo && userInfo.id) {
      // ✅ 确保 id 是数字类型
      const userId = parseInt(userInfo.id);
      if (isNaN(userId) || userId <= 0) {
        console.error('❌ userInfo.id 格式错误:', userInfo.id);
        wx.showToast({
          title: '用户信息异常',
          icon: 'none'
        });
        return;
      }

      this.setData({
        userInfo: { ...userInfo, id: userId },
        hasUserInfo: true
      });
      // 获取收藏列表
      this.getFavoriteProducts(userId);
    } else {
      // 如果没有用户信息，尝试从本地存储获取
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && storedUserInfo.id) {
        // ✅ 确保 id 是数字类型
        const userId = parseInt(storedUserInfo.id);
        if (isNaN(userId) || userId <= 0) {
          console.error('❌ storedUserInfo.id 格式错误:', storedUserInfo.id);
          wx.showToast({
            title: '用户信息异常',
            icon: 'none'
          });
          return;
        }

        this.setData({
          userInfo: { ...storedUserInfo, id: userId },
          hasUserInfo: true
        });
        this.getFavoriteProducts(userId);
      } else {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        // 跳转到登录页面
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }, 1500);
      }
    }
  },

  /**
   * 商品点击事件
   */
  onGoodsTap(e) {
    const productId = e.currentTarget.dataset.id;
    if (productId) {
      wx.navigateTo({
        url: `/pages/GoodDetail/GoodDetail?id=${productId}`
      });
    }
  },

  /**
   * 获取用户收藏的商品列表
   */
  getFavoriteProducts(userId) {
    // ✅ 新增：验证 userId 是否有效
    if (!userId || userId === 'undefined' || isNaN(parseInt(userId))) {
      console.error('❌ getFavoriteProducts: userId 无效', userId);
      wx.showToast({
        title: '用户信息异常',
        icon: 'none'
      });
      return;
    }

    const numericUserId = parseInt(userId);

    this.setData({ loading: true });

    const app = getApp();
    const token = wx.getStorageSync('token');

    // ✅ 新增：验证 token 是否存在
    if (!token) {
      console.error('❌ getFavoriteProducts: token 不存在');
      this.setData({ loading: false });
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }

    // 调用后端接口获取收藏列表
    wx.request({
      url: 'http://139.199.87.181:8080/api/products/favorites',
      method: 'GET',
      data: {
        userId: numericUserId
      },
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.code === 200) {
          // 处理数据，将condition转换为中文
          const processedData = (res.data.data || []).map(item => {
            let conditionText = item.condition;
            switch(item.condition ? item.condition.toUpperCase() : '') {
              case 'NEW':
                conditionText = '全新';
                break;
              case 'GOOD':
                conditionText = '良好';
                break;
              case 'FAIR':
                conditionText = '一般';
                break;
              case 'POOR':
                conditionText = '较差';
                break;
              default:
                conditionText = item.condition || '未知';
            }
            return {
              ...item,
              condition: conditionText
            };
          });

          this.setData({
            collections: processedData,
            loading: false
          });
        } else if (res.data.code === 401) {
          wx.showToast({
            title: '未授权访问，请重新登录',
            icon: 'none'
          });
          // ✅ 修复：只清除登录相关数据
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.message || '获取收藏列表失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('获取收藏列表失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // ✅ 新增：重新检查登录状态
    if (!this.checkLogin()) {
      console.warn('⚠️ myCollection onShow: 用户未登录，跳转到登录页');
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    // ✅ 新增：同步登录状态
    this.syncLoginState();

    // 页面显示时重新加载数据（可选）
    if (this.data.hasUserInfo && this.data.userInfo) {
      // ✅ 验证 userInfo.id 是否有效
      if (!this.data.userInfo.id || this.data.userInfo.id === 'undefined') {
        console.error('❌ userInfo.id 无效');
        wx.redirectTo({
          url: '/pages/login/login'
        });
        return;
      }

      this.getFavoriteProducts(this.data.userInfo.id);
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    // ✅ 新增：刷新前检查登录状态
    if (!this.checkLogin()) {
      console.warn('⚠️ onPullDownRefresh: 用户未登录');
      wx.stopPullDownRefresh();
      return;
    }

    if (this.data.hasUserInfo && this.data.userInfo) {
      // ✅ 验证 userInfo.id 是否有效
      if (!this.data.userInfo.id || this.data.userInfo.id === 'undefined') {
        console.error('❌ userInfo.id 无效');
        wx.stopPullDownRefresh();
        wx.redirectTo({
          url: '/pages/login/login'
        });
        return;
      }

      this.getFavoriteProducts(this.data.userInfo.id);
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // 如果有分页功能，可以在这里加载更多数据
  }
});
