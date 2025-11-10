// pages/mySold/mySold.js
Page({
  data: {
    soldProducts: [],      // 卖出的商品列表
    loading: false,        // 加载状态
    userInfo: null,        // 用户信息
    hasUserInfo: false     // 是否有用户信息
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    // 页面显示时重新加载数据
    if (this.data.hasUserInfo && this.data.userInfo) {
      this.getSoldProducts(this.data.userInfo.id);
    }
  },

  loadUserInfo() {
    // 页面加载时获取用户信息
    const app = getApp();
    const userInfo = app.globalData.userInfo;

    if (userInfo && userInfo.id) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
      // 获取卖出的商品列表
      this.getSoldProducts(userInfo.id);
    } else {
      // 如果没有用户信息，尝试从本地存储获取
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && storedUserInfo.id) {
        this.setData({
          userInfo: storedUserInfo,
          hasUserInfo: true
        });
        this.getSoldProducts(storedUserInfo.id);
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
    this.setData({ loading: true });

    const app = getApp();
    const token = wx.getStorageSync('token');

    // 调用后端接口获取卖出的商品列表
    wx.request({
      url: `${app.globalData.baseUrl}/products/sold-by-user`,
      method: 'GET',
      data: {
        userId: userId
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
          // 清除本地存储并跳转到登录页
          wx.clearStorageSync();
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
    if (this.data.hasUserInfo && this.data.userInfo) {
      this.getSoldProducts(this.data.userInfo.id);
      wx.stopPullDownRefresh();
    }
  }
});
