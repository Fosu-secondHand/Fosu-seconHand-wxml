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
      isFirstLogin: false,
      agreedToPolicy: false // 添加协议勾选状态
    },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否有登录状态
    const userInfo = wx.getStorageSync('userInfo');
    console.log('=== 页面加载时检查用户登录状态 ===');
    console.log('从本地存储获取的用户信息:', userInfo);
    if (userInfo) {
      console.log('用户信息包含的字段:', Object.keys(userInfo));
      console.log('用户是否已登录:', userInfo.isLogin);
    }

    if (userInfo && userInfo.isLogin) {
      wx.reLaunch({ url: '/pages/index/index' });
    } else {
      this.setData({ isFirstLogin: true });
    }

    // 监听隐私接口需要用户授权事件
    wx.onNeedPrivacyAuthorization((resolve, reject) => {
      this.setData({
        needPrivacyHandle: true,
        privacyResolve: resolve
      });
    });
  },



  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    console.log('=== 页面显示时检查用户登录状态 ===');
    console.log('从本地存储获取的用户信息:', userInfo);
    if (userInfo) {
      console.log('用户信息包含的字段:', Object.keys(userInfo));
      console.log('用户是否已登录:', userInfo.isLogin);
    }

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
      const { username, password, agreedToPolicy } = this.data;
      
      // 检查是否同意协议
      if (!agreedToPolicy) {
        this.setData({ errorMsg: '请先同意用户协议和隐私政策' });
        return false;
      }
      
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
     * 切换协议同意状态
     */
    toggleAgreement() {
      this.setData({
        agreedToPolicy: !this.data.agreedToPolicy,
        errorMsg: '' // 清除错误信息
      });
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

    // 调用后端登录接口
    wx.request({
      url: 'http://localhost:8090/user/login', // 替换为实际后端地址
      method: 'POST',
      data: {
        username: username,
        password: password
      },
      success: (response) => {
        if (response.data.code === 200) {
          // 登录成功后，创建用户信息
          const userInfo = {
            id: response.data.data.userId,  // 改为 id 而不是 userId
            username: response.data.data.username,
            avatarUrl: response.data.data.avatarUrl || '/static/assets/icons/default-avatar.png',
            nickname: response.data.data.nickname || response.data.data.username,
            accountNumber: response.data.data.accountNumber,
            isLogin: true,
            loginTime: new Date().toISOString(),
            token: response.data.data.token // 使用后端返回的真实token
          };


          // 添加调试信息
          console.log('=== 账号密码登录成功 ===');
          console.log('后端返回的完整数据:', response.data);
          console.log('准备存储的用户信息:', userInfo);
          console.log('用户信息包含的字段:', Object.keys(userInfo));

          // 保存用户信息到本地存储
          wx.setStorageSync('userInfo', userInfo);
          // 同时单独存储token
          wx.setStorageSync('token', response.data.data.token);

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
        } else {
          this.setData({
            errorMsg: response.data.message || '登录失败，请稍后重试',
            loading: false
          });
        }
      },
      fail: (error) => {
        console.error('登录请求失败:', error);
        this.setData({
          errorMsg: '网络请求失败，请稍后重试',
          loading: false
        });
      }
    });
  },



  /**
   * 微信授权登录
   */
  wxLogin() {
    // 检查是否同意协议
    if (!this.data.agreedToPolicy) {
      this.setData({ errorMsg: '请先同意用户协议和隐私政策' });
      return;
    }

    this.setData({ loading: true });

    // 调用wx.login获取登录凭证
    wx.login({
      success: (res) => {
        if (res.code) {
          // 将code发送到后端
          wx.request({
            url: 'http://localhost:8090/wechat/login', // 替换为你的后端地址
            method: 'POST',
            data: {
              code: res.code
            },
            success: (response) => {
              if (response.data.code === 200) {
                // 登录成功，保存用户信息
                const userInfo = {
                  id: response.data.data.userId,  // 统一使用 id 字段
                  userId: response.data.data.userId,
                  openid: response.data.data.openid,
                  token: response.data.data.token,
                  isLogin: true,
                  loginMethod: 'wechat',
                  loginTime: new Date().toISOString()
                };

                // 添加调试信息
                console.log('=== 微信登录成功 ===');
                console.log('后端返回的完整数据:', response.data);
                console.log('准备存储的用户信息:', userInfo);
                console.log('用户信息包含的字段:', Object.keys(userInfo));


// 保存用户信息到本地存储
                wx.setStorageSync('userInfo', userInfo);
// 缺少这一行：
                wx.setStorageSync('token', response.data.data.token);

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
              } else {
                // 登录失败
                this.setData({
                  errorMsg: response.data.message || '微信登录失败，请稍后重试',
                  loading: false
                });
              }
            },
            fail: (error) => {
              console.error('请求后端登录接口失败:', error);
              this.setData({
                errorMsg: '网络请求失败，请稍后重试',
                loading: false
              });
            }
          });
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
   * 获取用户详细信息（需要用户授权）
   */
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功:', res);

        // 保存到本地存储
        const userInfo = wx.getStorageSync('userInfo') || {};
        Object.assign(userInfo, {
          nickname: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl,
          gender: res.userInfo.gender,
          province: res.userInfo.province,
          city: res.userInfo.city,
          country: res.userInfo.country
        });
        wx.setStorageSync('userInfo', userInfo);

        // 发送到后端更新用户信息
        const storedUserInfo = wx.getStorageSync('userInfo');
        if (storedUserInfo && storedUserInfo.userId) {
          wx.request({
            url: 'http://localhost:8090/wechat/updateUserInfo',
            method: 'POST',
            data: {
              userId: storedUserInfo.userId,
              userInfo: {
                nickName: res.userInfo.nickName,
                avatarUrl: res.userInfo.avatarUrl,
                gender: res.userInfo.gender,
                province: res.userInfo.province,
                city: res.userInfo.city,
                country: res.userInfo.country
              }
            },
            success: (response) => {
              console.log('用户信息更新成功:', response);
            },
            fail: (error) => {
              console.error('更新用户信息失败:', error);
            }
          });
        }

        wx.showToast({
          title: '获取信息成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '获取信息失败',
          icon: 'none'
        });
      }
    });
  },
  
    /**
     * 检查登录态是否过期
     */
    checkSession() {
      wx.checkSession({
        success: () => {
          wx.showToast({
            title: '登录态有效',
            icon: 'success'
          });
        },
        fail: () => {
          wx.showToast({
            title: '登录态已过期',
            icon: 'none'
          });
          // 需要重新登录
          this.wxLogin();
        }
      });
    },
  
    /**
     * 获取用户授权设置
     */
    getAuthSetting() {
      wx.getSetting({
        success: (res) => {
          console.log('用户授权设置:', res.authSetting);
          // 可以检查用户是否授权了特定权限
          if (res.authSetting['scope.userInfo']) {
            console.log('用户已授权用户信息');
          }
        },
        fail: (err) => {
          console.error('获取授权设置失败:', err);
        }
      });
    },
  
    /**
     * 打开设置页面
     */
    openSetting() {
      wx.openSetting({
        success: (res) => {
          console.log('打开设置页面成功:', res);
        },
        fail: (err) => {
          console.error('打开设置页面失败:', err);
        }
      });
    },
  
    /**
     * 获取当前账号信息
     */
    getAccountInfo() {
      try {
        const accountInfo = wx.getAccountInfoSync();
        console.log('当前账号信息:', accountInfo);
        wx.showToast({
          title: '已获取账号信息',
          icon: 'success'
        });
      } catch (err) {
        console.error('获取账号信息失败:', err);
      }
    },
  
    /**
     * 请求订阅消息授权
     */
    requestSubscribeMessage() {
      // 需要替换为实际的模板ID
      const templateId = 'YOUR_TEMPLATE_ID_HERE';
      
      wx.requestSubscribeMessage({
        tmplIds: [templateId],
        success: (res) => {
          console.log('订阅消息授权结果:', res);
          if (res[templateId] === 'accept') {
            wx.showToast({
              title: '订阅成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '取消订阅',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('订阅消息失败:', err);
          wx.showToast({
            title: '订阅失败',
            icon: 'none'
          });
        }
      });
    },
  
    /**
     * 检查小程序是否被添加至「我的小程序」
     */
    checkIsAddedToMyMiniProgram() {
      wx.checkIsAddedToMyMiniProgram({
        success: (res) => {
          if (res.added) {
            wx.showToast({
              title: '已在我的小程序',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '未添加到我的小程序',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('检查是否添加到我的小程序失败:', err);
        }
      });
    },
  
    /**
     * 查询隐私授权情况
     */
    getPrivacySetting() {
      wx.getPrivacySetting({
        success: (res) => {
          console.log('隐私设置:', res);
          if (res.needAuthorization) {
            console.log('需要用户授权');
          } else {
            console.log('无需用户授权');
          }
        },
        fail: (err) => {
          console.error('获取隐私设置失败:', err);
        }
      });
    },
  
    /**
     * 跳转至隐私协议页面
     */
    openPrivacyContract() {
      wx.openPrivacyContract({
        success: () => {
          console.log('打开隐私协议页面成功');
        },
        fail: (err) => {
          console.error('打开隐私协议页面失败:', err);
        }
      });
    },
  
    /**
     * 模拟隐私接口调用
     */
    requirePrivacyAuthorize() {
      wx.requirePrivacyAuthorize({
        success: () => {
          console.log('隐私授权成功');
          wx.showToast({
            title: '隐私授权成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('隐私授权失败:', err);
          if (err.errCode === -10000) {
            console.log('用户拒绝授权');
          }
        }
      });
    },
  
    /**
     * 处理隐私授权
     */
    handlePrivacyAuthorization() {
      if (this.data.privacyResolve) {
        this.data.privacyResolve();
        this.setData({
          needPrivacyHandle: false
        });
      }
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
  