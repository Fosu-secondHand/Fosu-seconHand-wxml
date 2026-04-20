// pages/mySold/mySold.js
const authMixin = require('../../utils/authMixin.js');

Page({
  data: {
    soldProducts: [],      // 卖出的商品列表
    loading: false,        // 加载状态
    userInfo: null,        // 用户信息
    hasUserInfo: false     // 是否有用户信息
  },

  // ✅ 引入混入方法
  ...authMixin.methods,

  onLoad() {
    // ✅ 新增：使用统一的登录检查
    if (!this.requireLogin('查看卖出记录')) {
      return;
    }

    this.loadUserInfo();
  },

  onShow() {
    // ✅ 新增：重新检查登录状态
    if (!this.checkLogin()) {
      console.warn('⚠️ mySold onShow: 用户未登录，跳转到登录页');
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    // ✅ 新增：同步登录状态
    this.syncLoginState();

    // 页面显示时重新加载数据
    if (this.data.hasUserInfo && this.data.userInfo) {
      // ✅ 验证 userInfo.id 是否有效
      if (!this.data.userInfo.id || this.data.userInfo.id === 'undefined') {
        console.error('❌ userInfo.id 无效', this.data.userInfo);
        wx.redirectTo({
          url: '/pages/login/login'
        });
        return;
      }

      this.getSoldProducts(this.data.userInfo.id);
    }
  },

  loadUserInfo() {
    // ✅ 新增：再次验证登录状态
    if (!this.checkLogin()) {
      console.warn('⚠️ loadUserInfo: 用户未登录');
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
      // 获取卖出的商品列表
      this.getSoldProducts(userId);
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
        this.getSoldProducts(userId);
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
   * 获取用户卖出的商品列表
   */
  getSoldProducts(userId) {
    // ✅ 新增：验证 userId 是否有效
    if (!userId || userId === 'undefined' || isNaN(parseInt(userId))) {
      console.error('❌ getSoldProducts: userId 无效', userId);
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
      console.error('❌ getSoldProducts: token 不存在');
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

    // 调用后端接口获取卖出的商品列表
    wx.request({
      url: `${app.globalData.baseUrl}/products/sold-by-user`,
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
          // 处理数据，将condition转换为中文，并处理图片URL
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

            // 处理图片URL
            let imageUrl = '/static/assets/default-image.png';
            if (item.image) {
              if (Array.isArray(item.image)) {
                imageUrl = item.image[0];
              } else {
                imageUrl = item.image;
              }
            } else if (item.images && item.images.length > 0) {
              imageUrl = item.images[0];
            }

            // 如果是相对路径，拼接基础URL
            const baseURL = app.globalData.baseUrl;
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/static')) {
              imageUrl = baseURL + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
            }

            return {
              ...item,
              condition: conditionText,
              image: imageUrl // 使用处理后的图片URL
            };
          });

          this.setData({
            soldProducts: processedData,
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
            title: res.data.message || '获取卖出商品列表失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('获取卖出商品列表失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
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

      this.getSoldProducts(this.data.userInfo.id);
      wx.stopPullDownRefresh();
    }
  }
});
