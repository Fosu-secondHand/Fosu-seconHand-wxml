// pages/login/login.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    username: '',
    password: '',
    loading: false,
    errorMsg: '',
    isFirstLogin: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否有登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.isLogin) {
      wx.reLaunch({ url: '/pages/index/index' });
    } else {
      this.setData({ isFirstLogin: true });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.isLogin) {
      wx.reLaunch({ url: '/pages/index/index' });
    }
  },

  /**
   * 输入用户名
   */
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  /**
   * 输入密码
   */
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value,
      errorMsg: ''
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { username, password } = this.data;
    
    if (!username) {
      this.setData({ errorMsg: '请输入用户名' });
      return false;
    }
    
    if (!password) {
      this.setData({ errorMsg: '请输入密码' });
      return false;
    }
    
    if (password.length < 6) {
      this.setData({ errorMsg: '密码长度不能少于6位' });
      return false;
    }
    
    return true;
  },

  /**
   * 登录操作
   */
  login() {
    if (!this.validateForm()) {
      return;
    }

    const { username, password } = this.data;
    
    this.setData({ loading: true });
    
    // 模拟登录请求
    setTimeout(() => {
      try {
        // 登录成功后，创建用户信息
        const userInfo = {
          id: 'user_' + Date.now(),
          username,
          avatarUrl: '/static/assets/icons/default-avatar.png',
          nickname: username,
          accountNumber: 'fosu' + Math.floor(Math.random() * 10000),
          isLogin: true,
          loginTime: new Date().toISOString()
        };

        // 保存用户信息到本地存储
        wx.setStorageSync('userInfo', userInfo);
        
        // 显示登录成功提示
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });
        
        // 延迟跳转到首页
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
        
      } catch (error) {
        console.error('登录失败:', error);
        this.setData({
          errorMsg: '登录失败，请稍后重试',
          loading: false
        });
      }
    }, 1500);
  },

  /**
   * 微信授权登录
   */
  wxLogin() {
    this.setData({ loading: true });
    
    wx.login({
      success: (res) => {
        if (res.code) {
          // 模拟微信登录成功后的处理
          setTimeout(() => {
            try {
              // 创建微信登录用户信息
              const userInfo = {
                id: 'wx_user_' + Date.now(),
                username: 'wx_user_' + Math.floor(Math.random() * 10000),
                avatarUrl: '/static/assets/icons/default-avatar.png',
                nickname: '微信用户',
                accountNumber: 'wx' + Math.floor(Math.random() * 10000),
                isLogin: true,
                loginMethod: 'wechat',
                loginTime: new Date().toISOString()
              };

              // 保存用户信息到本地存储
              wx.setStorageSync('userInfo', userInfo);
              
              // 显示登录成功提示
              wx.showToast({
                title: '微信登录成功',
                icon: 'success',
                duration: 1500
              });
              
              // 延迟跳转到首页
              setTimeout(() => {
                wx.reLaunch({ url: '/pages/index/index' });
              }, 1500);
              
            } catch (error) {
              console.error('微信登录失败:', error);
              this.setData({
                errorMsg: '微信登录失败，请稍后重试',
                loading: false
              });
            }
          }, 1500);
        } else {
          console.error('登录失败:', res.errMsg);
          this.setData({
            errorMsg: '登录失败，请稍后重试',
            loading: false
          });
        }
      },
      fail: (error) => {
        console.error('微信登录接口调用失败:', error);
        this.setData({
          errorMsg: '无法获取微信授权，请稍后重试',
          loading: false
        });
      }
    });
  },

  /**
   * 注册账号
   */
  register() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  /**
   * 忘记密码
   */
  forgotPassword() {
    wx.navigateTo({
      url: '/pages/forgotPassword/forgotPassword'
    });
  },

  /**
   * 用户协议
   */
  viewUserAgreement() {
    wx.navigateTo({
      url: '/pages/about/about?type=agreement'
    });
  },

  /**
   * 隐私政策
   */
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/about/about?type=privacy'
    });
  }
});