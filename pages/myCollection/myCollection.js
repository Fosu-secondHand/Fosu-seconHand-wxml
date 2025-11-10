// pages/myCollection/myCollection.js
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

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面加载时获取用户信息
    const app = getApp();
    const userInfo = app.globalData.userInfo;

    if (userInfo && userInfo.id) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
      // 获取收藏列表
      this.getFavoriteProducts(userInfo.id);
    } else {
      // 如果没有用户信息，尝试从本地存储获取
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && storedUserInfo.id) {
        this.setData({
          userInfo: storedUserInfo,
          hasUserInfo: true
        });
        this.getFavoriteProducts(storedUserInfo.id);
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
    this.setData({ loading: true });

    // 调用后端接口获取收藏列表
    wx.request({
      url: 'http://localhost:8090/products/favorites',
      method: 'GET',
      data: {
        userId: userId
      },
      header: {
        'Authorization': wx.getStorageSync('token'),
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
          // 清除本地存储并跳转到登录页
          wx.clearStorageSync();
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
    // 页面显示时重新加载数据（可选）
    if (this.data.hasUserInfo && this.data.userInfo) {
      this.getFavoriteProducts(this.data.userInfo.id);
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    if (this.data.hasUserInfo && this.data.userInfo) {
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
