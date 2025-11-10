Page({
  data: {
    goodsList: [],     // 发布的商品列表
    loading: false,    // 加载状态
    userInfo: null,    // 用户信息
    hasUserInfo: false // 是否有用户信息
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    if (this.data.hasUserInfo && this.data.userInfo) {
      this.loadPublishedProducts(this.data.userInfo.id);
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
      // 获取发布的商品列表
      this.loadPublishedProducts(userInfo.id);
    } else {
      // 如果没有用户信息，尝试从本地存储获取
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && storedUserInfo.id) {
        this.setData({
          userInfo: storedUserInfo,
          hasUserInfo: true
        });
        this.loadPublishedProducts(storedUserInfo.id);
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
   * 获取用户发布的商品列表
   */
  loadPublishedProducts(userId) {
    this.setData({ loading: true });

    const app = getApp();
    const token = wx.getStorageSync('token');

    // 调用后端接口获取发布的商品列表
    wx.request({
      url: `${app.globalData.baseUrl}/products/published-by-user`,
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
          // 修改 loadPublishedProducts 方法中的数据处理部分
          const processedData = (res.data.data || []).map(item => {
            let conditionText = item.condition;
            let originalCondition = item.condition; // 保存原始condition值

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

            // 处理商品状态显示
            let statusText = '未知状态';
            if (item.status) {
              switch(item.status.toUpperCase()) {
                case 'ON_SALE':
                  statusText = '销售中';
                  break;
                case 'SOLD':
                  statusText = '已售出';
                  break;
                case 'REMOVED':
                  statusText = '已下架';
                  break;
                default:
                  statusText = item.status;
              }
            }

            return {
              ...item,
              condition: conditionText,
              originalCondition: originalCondition, // 保存原始condition值
              image: imageUrl,
              status: statusText,
              isSold: item.status && item.status.toUpperCase() === 'SOLD'
            };
          });


          this.setData({
            goodsList: processedData,
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
            title: res.data.message || '获取发布商品列表失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('获取发布商品列表失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },
/**
 * 商品点击事件 - 跳转到商品详情页
 */
onGoodsTap(e) {
  const productId = e.currentTarget.dataset.id;
  if (productId) {
    wx.navigateTo({
      url: `/pages/GoodDetail/GoodDetail?id=${productId}`
    });
  }
},

  editGoods(e) {
    try {
      const goodsId = parseInt(e.currentTarget.dataset.id);
      console.log('正在编辑商品ID:', goodsId);

      const goods = this.data.goodsList.find(item => item.productId === goodsId);
      console.log('找到的商品信息:', goods);

      // 检查商品是否已售出
      if (goods && goods.isSold) {
        wx.showToast({
          title: '已售出商品无法编辑',
          icon: 'none'
        });
        return;
      }

      if (goods) {
        // 将商品信息存储到本地，以便在编辑页面使用
        // 确保传递原始的condition值
        const goodsForEdit = {
          ...goods,
          condition: goods.originalCondition || goods.condition // 使用原始condition值
        };

        wx.setStorageSync('editingGoods', goodsForEdit);

        // 跳转到编辑页面
        wx.navigateTo({
          url: '/pages/editIdle/editIdle',
          success: () => {
            console.log('跳转到编辑页面成功');
          },
          fail: (error) => {
            console.error('跳转失败，错误信息:', error);
            wx.showToast({
              title: '跳转失败: ' + error.errMsg,
              icon: 'none',
              duration: 2000
            });
          }
        });
      } else {
        console.error('未找到商品信息');
        wx.showToast({
          title: '商品信息获取失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('编辑商品时发生错误:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  deleteGoods(e) {
    const goodsId = e.currentTarget.dataset.id;

    // 检查商品是否已售出
    const goods = this.data.goodsList.find(item => item.productId == goodsId);
    if (goods && goods.isSold) {
      wx.showToast({
        title: '已售出商品无法删除',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件商品吗？',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(goodsId);
        }
      }
    });
  },

  /**
   * 调用后端接口删除商品
   */
  performDelete(goodsId) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userId = this.data.userInfo.id; // 获取当前用户ID

    // 确保 goodsId 是数字类型
    const productId = parseInt(goodsId);

    if (isNaN(productId)) {
      wx.showToast({
        title: '商品ID无效',
        icon: 'none'
      });
      return;
    }

    if (!userId) {
      wx.showToast({
        title: '用户信息缺失',
        icon: 'none'
      });
      return;
    }

    wx.request({
      url: `${app.globalData.baseUrl}/products/delete?userId=${userId}&productId=${productId}`,
      method: 'POST',
      data: {}, // 请求体为空，参数通过查询字符串传递
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('删除请求响应:', res);
        if (res.data.code === 200) {
          // 删除成功，更新本地列表
          const newGoodsList = this.data.goodsList.filter(item => item.productId != goodsId);
          this.setData({ goodsList: newGoodsList });
          wx.showToast({ title: '商品已删除' });
        } else {
          wx.showToast({
            title: res.data.message || '删除失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('删除商品失败:', err);
        wx.showToast({
          title: '网络请求失败: ' + (err.errMsg || ''),
          icon: 'none'
        });
      }
    });
  }
});
