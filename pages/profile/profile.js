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

      // 优先使用微信用户信息，其次使用存储的用户信息，最后使用默认值
      let avatarUrl = '/static/assets/icons/default-avatar.png';

      // ✅ 关键修复：处理头像 URL
      if (userInfo.avatarUrl || userInfo.avatar) {
        avatarUrl = userInfo.avatarUrl || userInfo.avatar;

        // 如果是相对路径，拼接完整域名
        const app = getApp();
        if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('/static')) {
          const serverRoot = app.globalData.baseUrl.replace(/\/api$/, '');
          avatarUrl = serverRoot + avatarUrl;
        }
      }

      const defaultData = {
        avatarUrl: avatarUrl,
        nickname: '未设置昵称'
      };

      // 如果有微信用户信息，优先使用
      if (userInfo.avatarUrl) {
        defaultData.avatarUrl = avatarUrl;
      }

      // 优先使用微信获取的昵称
      if (userInfo.nickName) {
        defaultData.nickname = userInfo.nickName;
      } else if (userInfo.nickname) {
        defaultData.nickname = userInfo.nickname;
      }

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

  // 导航到关于页面
  navigateToAboutFOSU() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('查看关于')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/about/about'
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
            nickname: '未设置昵称'
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

  onChooseAvatar(e) {
    // 使用混入的登录检查方法
    if (!this.requireLogin('更换头像')) {
      return;
    }

    // 阻止事件冒泡到父元素，避免同时触发 goToUserHome
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;

        // ✅ 立即显示预览
        this.setData({ avatarUrl: tempFilePath });

        // ✅ 上传到服务器
        this.uploadAvatarToServer(tempFilePath);
      },
      fail: () => {
        wx.showToast({ title: '未选择头像', icon: 'none' });
      }
    });
  },

  // ✅ 新增：上传头像到服务器（使用 Base64 方式）
  uploadAvatarToServer(tempFilePath) {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!app.globalData.baseUrl || !token || !userInfo.id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '处理中...' });

    // ✅ 将图片转为 Base64
    wx.getFileSystemManager().readFile({
      filePath: tempFilePath,
      encoding: 'base64',
      success: (res) => {
        // ✅ 添加 Base64 前缀
        const base64Image = 'data:image/png;base64,' + res.data;

        console.log('Profile: 图片转 Base64 成功，长度:', base64Image.length);

        // ✅ 调用用户信息更新接口
        wx.request({
          url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
          method: 'PUT',
          header: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            nickname: userInfo.nickname || this.data.nickname,
            avatar: base64Image  // ✅ Base64 格式的头像
          },
          success: (res) => {
            console.log('Profile: 服务器响应:', res);

            if (res.statusCode === 200 && res.data.code === 200) {
              // ✅ 获取服务器返回的头像 URL
              const avatarUrl = res.data.data.avatar;

              // ✅ 更新本地显示
              this.setData({ avatarUrl: avatarUrl });

              // ✅ 更新本地缓存
              const localUserInfo = wx.getStorageSync('userInfo') || {};
              localUserInfo.avatarUrl = avatarUrl;
              localUserInfo.avatar = avatarUrl;
              wx.setStorageSync('userInfo', localUserInfo);

              wx.hideLoading();
              wx.showToast({ title: '头像已更新', icon: 'success' });

              console.log('Profile: 头像上传成功', avatarUrl);
            } else {
              wx.hideLoading();
              wx.showToast({
                title: res.data.message || '上传失败',
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            console.error('Profile: 头像上传失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('Profile: 图片转 Base64 失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '图片处理失败',
          icon: 'none'
        });
      }
    });
  },



  // ✅ 新增：导航到设置页面
  navigateToSetting() {
    // 使用混入的登录检查方法
    if (!this.requireLogin('访问设置')) {
      return;
    }

    wx.navigateTo({
      url: '/pages/setting/setting'
    });
  }

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
