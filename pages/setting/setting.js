// pages/setting/setting.js
const authMixin = require('../../utils/authMixin.js');

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    accountNumber: '',
    intro: '',
    phone: '',
    notificationEnabled: true,

    // 模态框状态
    isAvatarEditModalShow: false,
    isNicknameEditModalShow: false,
    isAccountEditModalShow: false,
    isIntroEditModalShow: false,
    isBindPhoneModalShow: false,

    // 临时编辑数据
    tempAvatarUrl: '',
    tempNickname: '',
    tempAccountNumber: '',
    tempIntro: '',
    tempPhone: '',

    // 随机昵称配置
    randomNicknameConfig: {
      prefixes: ['校园', '阳光', '快乐', '活力', '智慧'],
      suffixes: ['同学', '伙伴', '达人', '创客', '学者'],
      generated: false
    },

    // 登录状态
    isLogin: false
  },

  // 引入混入方法
  ...authMixin.methods,

  onLoad() {
    // 检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    // 如果未登录，重定向到登录页面
    if (!(userInfo && userInfo.isLogin && token)) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }, 1500);
        }
      });
      return;
    }

    // 已登录，设置登录状态并加载用户信息
    this.setData({
      isLogin: true
    });

    this.loadUserInfo();
  },

  // 从缓存加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};

      // 如果已经有账号，使用已有账号；如果没有，生成新账号
      let accountNumber = userInfo.accountNumber;
      if (!accountNumber) {
        accountNumber = 'fosu' + Math.floor(Math.random() * 10000);
        // 保存新生成的账号到缓存
        userInfo.accountNumber = accountNumber;
        wx.setStorageSync('userInfo', userInfo);
      }

      // 合并缓存数据和默认值
      const defaultData = {
        avatarUrl: '/static/assets/icons/default-avatar.png',
        nickname: '未设置昵称',
        accountNumber: accountNumber,
        intro: '',
        phone: '',
        notificationEnabled: true
      };

      this.setData({
        ...defaultData,
        ...userInfo
      });

      console.log('Setting: 用户信息加载成功', this.data);
    } catch (error) {
      console.error('Setting: 加载用户信息失败', error);
      wx.showToast({
        title: '加载用户信息失败',
        icon: 'none'
      });
    }
  },

  // 保存用户信息到缓存
  saveUserInfo() {
    try {
      const userInfo = {
        avatarUrl: this.data.avatarUrl,
        nickname: this.data.nickname,
        accountNumber: this.data.accountNumber,
        intro: this.data.intro,
        phone: this.data.phone,
        notificationEnabled: this.data.notificationEnabled
      };

      wx.setStorageSync('userInfo', userInfo);
      this.updateProfilePage(userInfo);

      console.log('Setting: 用户信息保存成功', userInfo);
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('Setting: 保存用户信息失败', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 更新Profile页面数据
  updateProfilePage(data) {
    const pages = getCurrentPages();
    const profilePage = pages.find(page => page.route.includes('profile'));

    if (profilePage) {
      profilePage.setData(data);
      console.log('Setting: 已同步数据到Profile页面', data);
    }
  },

  // 生成随机昵称
  generateRandomNickname() {
    const { prefixes, suffixes } = this.data.randomNicknameConfig;
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomNumber = Math.floor(Math.random() * 1000);

    const randomNickname = `${randomPrefix}${randomSuffix}${randomNumber}`;

    this.setData({
      nickname: randomNickname,
      'randomNicknameConfig.generated': true
    });

    this.saveUserInfo();
    console.log('Setting: 生成随机昵称', randomNickname);
  },

  // ================= 头像编辑 =================
  openAvatarEditModal() {
    this.setData({
      isAvatarEditModalShow: true,
      tempAvatarUrl: this.data.avatarUrl
    });
  },

  closeAvatarEditModal() {
    this.setData({
      isAvatarEditModalShow: false,
      tempAvatarUrl: ''
    });
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          tempAvatarUrl: res.tempFilePaths[0]
        });
      },
      fail: (err) => {
        console.error('Setting: 选择图片失败', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  uploadAvatar() {
    if (!this.data.tempAvatarUrl) return;

    wx.showLoading({ title: '上传中...' });

    // 模拟上传到服务器
    setTimeout(() => {
      this.setData({
        avatarUrl: this.data.tempAvatarUrl,
        isAvatarEditModalShow: false
      });

      this.saveUserInfo();
      wx.hideLoading();
    }, 1000);
  },

  // ================= 昵称编辑 =================
  openNicknameEdit() {
    this.setData({
      isNicknameEditModalShow: true,
      tempNickname: this.data.nickname
    });
  },

  closeNicknameEditModal() {
    this.setData({
      isNicknameEditModalShow: false
    });
  },

  onNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value });
  },

  saveNickname() {
    const newNickname = this.data.tempNickname || '';

    this.setData({
      nickname: newNickname || '未设置昵称',
      isNicknameEditModalShow: false
    });

    this.saveUserInfo();
  },

  // ================= 账号编辑 =================
  openAccountEditModal() {
    this.setData({
      isAccountEditModalShow: true,
      tempAccountNumber: this.data.accountNumber
    });
  },

  closeAccountEditModal() {
    this.setData({
      isAccountEditModalShow: false
    });
  },

  onAccountInput(e) {
    this.setData({ tempAccountNumber: e.detail.value });
  },

  saveAccountNumber() {
    const newAccountNumber = this.data.tempAccountNumber.trim();

    if (!newAccountNumber) {
      wx.showToast({
        title: '账号不能为空',
        icon: 'none'
      });
      return;
    }

    this.setData({
      accountNumber: newAccountNumber,
      isAccountEditModalShow: false
    });

    this.saveUserInfo();
  },

  // ================= 简介编辑 =================
  openIntroEdit() {
    this.setData({
      isIntroEditModalShow: true,
      tempIntro: this.data.intro
    });
  },

  closeIntroEditModal() {
    this.setData({
      isIntroEditModalShow: false
    });
  },

  onIntroInput(e) {
    this.setData({ tempIntro: e.detail.value });
  },

  saveIntro() {
    const newIntro = this.data.tempIntro || '';

    this.setData({
      intro: newIntro,
      isIntroEditModalShow: false
    });

    this.saveUserInfo();
  },

  // ================= 手机绑定 =================
  openBindPhone() {
    this.setData({
      isBindPhoneModalShow: true,
      tempPhone: this.data.phone
    });
  },

  closeBindPhoneModal() {
    this.setData({
      isBindPhoneModalShow: false
    });
  },

  onPhoneInput(e) {
    this.setData({ tempPhone: e.detail.value });
  },

  bindPhone() {
    const newPhone = this.data.tempPhone.trim();

    if (newPhone && !/^1[3-9]\d{9}$/.test(newPhone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '处理中...' });

    setTimeout(() => {
      this.setData({
        phone: newPhone,
        isBindPhoneModalShow: false
      });

      this.saveUserInfo();
      wx.hideLoading();
    }, 1000);
  },

  // ================= 通知开关 =================
  toggleNotification(e) {
    const enabled = e.detail.value;
    this.setData({ notificationEnabled: enabled });

    wx.setStorageSync('notificationEnabled', enabled);
  },

  // ================= 退出登录 =================
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前账号吗？',
      confirmColor: '#e64340',
      success: (res) => {
        if (res.confirm) {
          try {
            // 获取App实例
            const app = getApp();

            // 调用全局logout方法进行全面清理
            if (app && app.logout) {
              app.logout();
            }

            // 额外清除，确保万无一失
            wx.clearStorageSync();

            // 强制设置用户未登录状态
            wx.setStorageSync('userInfo', { isLogin: false });

            console.log('登录状态已完全清除');

            // 短暂延迟后再跳转，确保清除操作完全执行
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/login/login',
                success: () => {
                  console.log('成功跳转到登录页面');
                },
                fail: (err) => {
                  console.error('跳转登录页面失败:', err);
                  // 备用方案：如果reLaunch失败，尝试其他跳转方式
                  wx.redirectTo({ url: '/pages/login/login' });
                }
              });
            }, 100);
          } catch (e) {
            console.error('退出登录过程发生异常:', e);
            // 即使出现异常，也尝试跳转到登录页
            wx.reLaunch({ url: '/pages/login/login' });
          }
        }
      }
    });
  }
});
