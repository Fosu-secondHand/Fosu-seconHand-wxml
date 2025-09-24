// pages/forgotPassword/forgotPassword.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    username: '',
    phone: '',
    verificationCode: '',
    newPassword: '',
    confirmNewPassword: '',
    loading: false,
    errorMsg: '',
    countdown: 0,
    isCountingDown: false,
    step: 1 // 1: 验证身份, 2: 重置密码, 3: 完成
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面加载逻辑
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
   * 输入手机号
   */
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  /**
   * 输入验证码
   */
  onVerificationCodeInput(e) {
    this.setData({
      verificationCode: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  /**
   * 输入新密码
   */
  onNewPasswordInput(e) {
    this.setData({
      newPassword: e.detail.value,
      errorMsg: ''
    });
  },

  /**
   * 确认新密码
   */
  onConfirmNewPasswordInput(e) {
    this.setData({
      confirmNewPassword: e.detail.value,
      errorMsg: ''
    });
  },

  /**
   * 验证身份表单验证
   */
  validateIdentityForm() {
    const { username, phone, verificationCode } = this.data;
    
    if (!username) {
      this.setData({ errorMsg: '请输入用户名' });
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
    
    if (!verificationCode) {
      this.setData({ errorMsg: '请输入验证码' });
      return false;
    }
    
    if (verificationCode.length !== 6) {
      this.setData({ errorMsg: '验证码应为6位数字' });
      return false;
    }
    
    return true;
  },

  /**
   * 重置密码表单验证
   */
  validateResetPasswordForm() {
    const { newPassword, confirmNewPassword } = this.data;
    
    if (!newPassword) {
      this.setData({ errorMsg: '请输入新密码' });
      return false;
    }
    
    if (newPassword.length < 6 || newPassword.length > 20) {
      this.setData({ errorMsg: '密码长度应在6-20位之间' });
      return false;
    }
    
    if (!confirmNewPassword) {
      this.setData({ errorMsg: '请确认新密码' });
      return false;
    }
    
    if (newPassword !== confirmNewPassword) {
      this.setData({ errorMsg: '两次输入的密码不一致' });
      return false;
    }
    
    return true;
  },

  /**
   * 验证身份
   */
  verifyIdentity() {
    if (!this.validateIdentityForm()) {
      return;
    }

    const { username, phone, verificationCode } = this.data;
    
    this.setData({ loading: true });
    
    // 模拟验证请求
    setTimeout(() => {
      try {
        // 验证成功，进入第二步
        this.setData({
          loading: false,
          step: 2,
          errorMsg: ''
        });
        
        wx.showToast({
          title: '验证成功',
          icon: 'success',
          duration: 1000
        });
        
      } catch (error) {
        console.error('验证失败:', error);
        this.setData({
          errorMsg: '验证失败，请检查信息是否正确',
          loading: false
        });
      }
    }, 1500);
  },

  /**
   * 重置密码
   */
  resetPassword() {
    if (!this.validateResetPasswordForm()) {
      return;
    }

    const { newPassword } = this.data;
    
    this.setData({ loading: true });
    
    // 模拟重置密码请求
    setTimeout(() => {
      try {
        // 重置成功，进入第三步
        this.setData({
          loading: false,
          step: 3,
          errorMsg: ''
        });
        
        wx.showToast({
          title: '密码重置成功',
          icon: 'success',
          duration: 1000
        });
        
      } catch (error) {
        console.error('重置密码失败:', error);
        this.setData({
          errorMsg: '重置密码失败，请稍后重试',
          loading: false
        });
      }
    }, 1500);
  },

  /**
   * 返回登录页
   */
  backToLogin() {
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  /**
   * 前往登录页（与backToLogin功能相同，为了兼容模板修改）
   */
  goToLogin() {
    this.backToLogin();
  },

  /**
   * 返回第一步：验证身份
   */
  backToStep1() {
    this.setData({
      step: 1,
      errorMsg: ''
    });
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
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除计时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }
});