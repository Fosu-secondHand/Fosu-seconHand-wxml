App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.isLogin) {
      // 未登录状态，确保跳转到登录页
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/login/login' });
      }, 500);
    } else {
      this.checkLoginStatus();
    }
  },
  
    // 检查登录状态
  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.isLogin) {
        this.globalData.userInfo = userInfo;
        console.log('用户已登录:', userInfo.username);
      } else {
        this.globalData.userInfo = null;
        // 简化跳转逻辑，直接跳转到登录页
        setTimeout(() => {
          // 检查当前页面是否已经是登录页
          const currentPages = getCurrentPages();
          const currentPage = currentPages.length > 0 ? currentPages[currentPages.length - 1] : null;
          if (!currentPage || !currentPage.route.includes('login')) {
            wx.redirectTo({ url: '/pages/login/login' });
          }
        }, 500);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      this.globalData.userInfo = null;
    }
  },
  
    // 获取用户信息
    getUserInfo() {
      return this.globalData.userInfo;
    },
  
    // 设置用户信息
    setUserInfo(userInfo) {
      this.globalData.userInfo = userInfo;
      try {
        wx.setStorageSync('userInfo', userInfo);
      } catch (error) {
        console.error('保存用户信息失败:', error);
      }
    },

    // 退出登录
    logout() {
      try {
        // 清除用户信息
        this.globalData.userInfo = null;
        wx.removeStorageSync('userInfo');
  
        // 其他清理工作
        wx.removeStorageSync('token');
        wx.removeStorageSync('sessionKey');
  
        // 如果有WebSocket连接，断开连接
        if (this.globalWebSocketManager) {
          this.globalWebSocketManager.disconnect();
          this.globalWebSocketManager = null;
        }
  
        console.log('用户已退出登录');
      } catch (error) {
        console.error('退出登录失败:', error);
      }
    },
  
    // 全局数据
    globalData: {
      userInfo: null,
      // 修改baseUrl为后端服务地址
      baseUrl: 'http://localhost:8090', // 后端服务运行在8090端口
      socketUrl: 'ws://localhost:8090/ws', // WebSocket地址
      isDebug: true
    },
  
    // 全局WebSocket管理器
    globalWebSocketManager: null,
    
    // 添加通用请求方法
    request(options) {
      const {
        url,
        method = 'GET',
        data = {},
        header = {},
        success,
        fail,
        complete
      } = options;
      
      // 添加认证token（如果存在）
      const token = wx.getStorageSync('token');
      if (token) {
        header['Authorization'] = token;
      }
      
      wx.request({
        url: this.globalData.baseUrl + url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        success: (res) => {
          // 根据后端response结构处理返回数据
          if (res.statusCode === 200) {
            // 假设后端返回格式为 {code: 200, message: "success", data: {}}
            if (res.data.code === 200) {
              success && success(res.data);
            } else {
              // 处理错误
              console.error('请求失败:', res.data.message);
              fail && fail(res.data);
            }
          } else {
            console.error('网络请求失败:', res.statusCode);
            fail && fail({ message: '网络请求失败' });
          }
        },
        fail: (err) => {
          console.error('请求异常:', err);
          fail && fail({ message: '请求异常' });
        },
        complete
      });
    }
  })
  