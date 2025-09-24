// pages/register/register.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    phone: '',
    loading: false,
    errorMsg: '',
    countdown: 0,
    isCountingDown: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.isLogin) {
      wx.navigateBack();
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
   * 确认密码
   */
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value,
      errorMsg: ''
    });
  },

  /**
   * 输入昵称
   */
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  /**
   * 输入手机号
   */
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { username, password, confirmPassword, nickname, phone } = this.data;
    
    if (!username) {
      this.setData({ errorMsg: '请输入用户名' });
      return false;
    }
    
    if (username.length < 3 || username.length > 20) {
      this.setData({ errorMsg: '用户名长度应在3-20位之间' });
      return false;
    }
    
    if (!password) {
      this.setData({ errorMsg: '请输入密码' });
      return false;
    }
    
    if (password.length < 6 || password.length > 20) {
      this.setData({ errorMsg: '密码长度应在6-20位之间' });
      return false;
    }
    
    if (!confirmPassword) {
      this.setData({ errorMsg: '请确认密码' });
      return false;
    }
    
    if (password !== confirmPassword) {
      this.setData({ errorMsg: '两次输入的密码不一致' });
      return false;
    }
    
    if (!nickname) {
      this.setData({ errorMsg: '请输入昵称' });
      return false;
    }
    
    if (nickname.length > 20) {
      this.setData({ errorMsg: '昵称长度不能超过20位' });
      return false;
    }
    
    if (!phone) {
      this.setData({ errorMsg: '请输入手机号' });
      return false;
    }
    
    // 简单的手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      this.setData({ errorMsg: '请输入有效的手机号' });
      return false;
    }
    
    return true;
  },

  /**
   * 注册操作
   */
  register() {
    if (!this.validateForm()) {
      return;
    }

    const { username, password, nickname, phone } = this.data;
    
    this.setData({ loading: true });
    
    // 模拟注册请求
    setTimeout(() => {
      try {
        // 注册成功后，创建用户信息
        const userInfo = {
          id: 'user_' + Date.now(),
          username,
          password, // 实际项目中应加密存储
          nickname,
          phone,
          avatarUrl: '/static/assets/icons/default-avatar.png',
          accountNumber: 'fosu' + Math.floor(Math.random() * 10000),
          isLogin: true,
          registerTime: new Date().toISOString(),
          loginTime: new Date().toISOString()
        };

        // 保存用户信息到本地存储
        wx.setStorageSync('userInfo', userInfo);
        
        // 显示注册成功提示
        wx.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 1500
        });
        
        // 延迟跳转到首页
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
        
      } catch (error) {
        console.error('注册失败:', error);
        this.setData({
          errorMsg: '注册失败，请稍后重试',
          loading: false
        });
      }
    }, 1500);
  },

  /**
   * 返回登录页
   */
  backToLogin() {
    wx.navigateBack();
  },

  /**
   * 获取验证码
   */
  getVerificationCode() {
    const { phone, isCountingDown } = this.data;
    
    if (isCountingDown) {
      return;
    }
    
    // 简单的手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      this.setData({ errorMsg: '请输入有效的手机号' });
      return;
    }
    
    // 模拟发送验证码
    wx.showLoading({ title: '发送中...' });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '验证码已发送' });
      
      // 开始倒计时
      this.setData({ 
        countdown: 60, 
        isCountingDown: true 
      });
      
      this.countdownTimer = setInterval(() => {
        const { countdown } = this.data;
        if (countdown <= 1) {
          clearInterval(this.countdownTimer);
          this.setData({ 
            countdown: 0, 
            isCountingDown: false 
          });
        } else {
          this.setData({ countdown: countdown - 1 });
        }
      }, 1000);
    }, 1000);
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
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除计时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }
});