// pages/setting/setting.js
const authMixin = require('../../utils/authMixin.js');

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    accountNumber: '',
    intro: '',
    notificationEnabled: true,

    // 模态框状态
    isAvatarEditModalShow: false,
    isNicknameEditModalShow: false,
    isAccountEditModalShow: false,
    isIntroEditModalShow: false,

    // 临时编辑数据
    tempAvatarUrl: '',
    tempNickname: '',
    tempAccountNumber: '',
    tempIntro: '',

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

      console.log('Setting: 原始 userInfo:', userInfo);

      // ✅ 修改：优先使用微信授权信息作为默认值
      // 如果已经有账号，使用已有账号；如果没有，生成新账号
      let accountNumber = userInfo.accountNumber;
      if (!accountNumber) {
        accountNumber = 'fosu' + Math.floor(Math.random() * 10000);
        // 保存新生成的账号到缓存
        userInfo.accountNumber = accountNumber;
        wx.setStorageSync('userInfo', userInfo);
      }

      // ✅ 修改：合并缓存数据和默认值，优先使用微信授权信息
      let avatarUrl = userInfo.avatarUrl || userInfo.avatar || '/static/assets/icons/default-avatar.png';

      // ✅ 关键修复：如果头像是相对路径，拼接完整域名
      const app = getApp();
      if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('/static')) {
        const serverRoot = app.globalData.baseUrl.replace(/\/api$/, '');
        avatarUrl = serverRoot + avatarUrl;
      }

      const defaultData = {
        avatarUrl: avatarUrl,
        nickname: userInfo.nickname || userInfo.nickName || '未设置昵称',
        accountNumber: accountNumber,
        intro: userInfo.intro || '',
        notificationEnabled: true
      };

      console.log('Setting: 加载的用户信息:', defaultData);

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
  saveUserInfo(skipServerUpdate = false) {
    try {
      // ✅ 修复：先获取现有的 userInfo，保留关键字段
      const existingUserInfo = wx.getStorageSync('userInfo') || {};

      console.log('Setting: 保存前的现有 userInfo:', existingUserInfo);

      // ✅ 构建更新数据（只更新需要修改的字段）
      const updateData = {
        avatarUrl: this.data.avatarUrl,
        avatar: this.data.avatarUrl,         // ✅ 同时更新 avatar
        nickname: this.data.nickname,
        nickName: this.data.nickname,        // ✅ 同时更新 nickName（兼容旧代码）
        accountNumber: this.data.accountNumber,
        intro: this.data.intro,
        notificationEnabled: this.data.notificationEnabled
      };

      // ✅ 关键修复：合并现有数据和更新数据，保留 id、token、isLogin 等关键字段
      const userInfo = {
        ...existingUserInfo,  // 保留原有字段（id, token, isLogin 等）
        ...updateData         // 覆盖需要更新的字段
      };

      // ✅ 验证关键字段是否存在
      if (!userInfo.id || userInfo.id === 'undefined') {
        console.error('❌ Setting: 保存后发现 userInfo.id 丢失！', userInfo);
        wx.showToast({
          title: '用户信息异常',
          icon: 'none'
        });
        return;
      }

      console.log('Setting: 准备保存的 userInfo:', {
        id: userInfo.id,
        nickname: userInfo.nickname,
        nickName: userInfo.nickName,
        avatar: userInfo.avatar
      });

      wx.setStorageSync('userInfo', userInfo);
      this.updateProfilePage(userInfo);

      console.log('Setting: 用户信息保存成功', userInfo);

      // ✅ 修改：只在需要时才调用后端接口
      if (!skipServerUpdate) {
        this.updateUserInfoToServer();
      }

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


  // ✅ 优化：更新用户信息到服务器
  updateUserInfoToServer() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!app.globalData.baseUrl || !token || !userInfo.id) {
      console.warn('Setting: 缺少必要参数，跳过更新到服务器');
      return;
    }

    // ✅ 修正：严格按照后端接口要求的字段名
    const updateData = {
      userId: userInfo.id,
      avatar: this.data.avatarUrl,  // ✅ 使用 avatar 字段
      nickname: this.data.nickname,  // ✅ 正确
      Username: this.data.nickname,  // ✅ 添加 Username 字段（注意大写）
      gender: userInfo.gender || 0   // ✅ 正确
      // ❌ 不传递 intro 字段，因为后端没有这个字段
    };

    console.log('Setting: 准备更新用户信息到服务器:', updateData);

    wx.request({
      url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
      method: 'PUT',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: updateData,
      success: (res) => {
        console.log('Setting: 服务器响应:', res);
        if (res.statusCode === 200 && res.data.code === 200) {
          console.log('Setting: 用户信息更新成功');

          // ✅ 修复：同步更新本地存储的 userInfo，同时更新 nickname 和 nickName
          const localUserInfo = wx.getStorageSync('userInfo') || {};
          Object.assign(localUserInfo, {
            avatar: this.data.avatarUrl,
            avatarUrl: this.data.avatarUrl,  // ✅ 同时更新 avatarUrl
            nickname: this.data.nickname,
            nickName: this.data.nickname   // ✅ 同时更新 nickName（大写N）
          });
          wx.setStorageSync('userInfo', localUserInfo);

          console.log('✅ 本地 userInfo 已更新:', {
            nickname: localUserInfo.nickname,
            nickName: localUserInfo.nickName,
            avatar: localUserInfo.avatar
          });

          wx.showToast({
            title: '同步成功',
            icon: 'success'
          });
        } else {
          console.error('Setting: 用户信息更新失败:', res.data);
          wx.showToast({
            title: res.data.message || '同步服务器失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Setting: 更新用户信息网络错误:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
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

  // ✅ 修改：使用 Base64 方式上传头像
  uploadAvatar() {
    if (!this.data.tempAvatarUrl) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

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
      filePath: this.data.tempAvatarUrl,
      encoding: 'base64',
      success: (res) => {
        // ✅ 添加 Base64 前缀
        const base64Image = 'data:image/png;base64,' + res.data;

        console.log('Setting: 图片转 Base64 成功，长度:', base64Image.length);

        // ✅ 调用用户信息更新接口
        wx.request({
          url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
          method: 'PUT',
          header: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            nickname: this.data.nickname,
            avatar: base64Image  // ✅ Base64 格式的头像
          },
          success: (res) => {
            console.log('Setting: 服务器响应:', res);

            if (res.statusCode === 200 && res.data.code === 200) {
              // ✅ 获取服务器返回的头像 URL
              let avatarUrl = res.data.data.avatar;

              // ✅ 关键修复：如果返回的是相对路径，拼接完整域名
              if (avatarUrl && !avatarUrl.startsWith('http')) {
                // 从 baseUrl 中提取服务器根地址
                const serverRoot = app.globalData.baseUrl.replace(/\/api$/, '');
                avatarUrl = serverRoot + avatarUrl;
              }

              console.log('Setting: 最终头像 URL:', avatarUrl);

              this.setData({
                avatarUrl: avatarUrl,
                isAvatarEditModalShow: false
              });

              // ✅ 更新本地缓存（同时更新 nickname 和 nickName）
              const localUserInfo = wx.getStorageSync('userInfo') || {};
              localUserInfo.avatarUrl = avatarUrl;
              localUserInfo.avatar = avatarUrl;
              // ✅ 确保昵称字段也同步（如果之前有修改）
              if (this.data.nickname) {
                localUserInfo.nickname = this.data.nickname;
                localUserInfo.nickName = this.data.nickname;  // ✅ 同时更新大写N版本
              }
              wx.setStorageSync('userInfo', localUserInfo);

              // ✅ 同步到个人主页
              this.updateProfilePage({
                avatarUrl: avatarUrl,
                nickname: this.data.nickname,
                nickName: this.data.nickname
              });

              wx.hideLoading();
              wx.showToast({
                title: '头像更新成功',
                icon: 'success'
              });

              console.log('Setting: 头像上传成功', avatarUrl);
            } else {
              wx.hideLoading();
              wx.showToast({
                title: res.data.message || '更新失败',
                icon: 'none'
              });
            }
          },

          fail: (err) => {
            console.error('Setting: 更新用户信息网络错误:', err);
            wx.hideLoading();
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('Setting: 图片转 Base64 失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '图片处理失败',
          icon: 'none'
        });
      }
    });
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
  }, // ================= 昵称编辑 =================
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

    // 昵称修改后立即保存到服务器
    this.saveUserInfo(false);
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

    // 简介修改后立即保存到服务器
    this.saveUserInfo(false);
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
            const app = getApp();

            if (app && app.logout) {
              app.logout();
            }

            // ✅ 修复：只清除登录相关数据，保留其他设置
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');

            // Deleted:wx.clearStorageSync();

            // Deleted:wx.setStorageSync('userInfo', { isLogin: false });

            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/login/login',
                success: () => {
                  console.log('成功跳转到登录页面');
                },
                fail: (err) => {
                  console.error('跳转登录页面失败:', err);
                  wx.redirectTo({ url: '/pages/login/login' });
                }
              });
            }, 100);
          } catch (e) {
            console.error('退出登录过程发生异常:', e);
            wx.reLaunch({ url: '/pages/login/login' });
          }
        }
      }
    });
  }
});
