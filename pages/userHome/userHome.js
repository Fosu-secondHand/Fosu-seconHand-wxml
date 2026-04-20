Page({
  data: {
    avatarUrl: '/static/assets/icons/default-avatar.png',
    nickname: '昵称',
    accountNumber: '',
    profileDesc: '这家伙很神秘，没有写个人简介。',
    goodsList: [],
    showEditDesc: false,
    editDescValue: '',
    tags: ['IP 广东省', '女生'],
    showAddTagModal: false,
    addTagValue: '',
    showEditTagModal: false,
    editTagValue: '',
    editTagIndex: 0,
    creditScore: 100,
    goodsCount: 0,
    commentCount: 0,
    postCount: 0,
    currentTab: 0,
    tabList: [
      { name: '宝贝', count: 0 },
      { name: '评价', count: 0 },
      { name: '动态', count: 0 }
    ],
    bgImgUrl: '/static/back.png',
    userId: null,
  },

  onLoad(options) {
    console.log('=== userHome 页面加载 ===');
    console.log('接收到的参数:', options);

    const app = getApp();
    const token = wx.getStorageSync('token');
    const currentUserInfo = wx.getStorageSync('userInfo') || {};

    // ✅ 修复 1: 优先使用传入的 userId 参数（查看他人主页）
    let targetUserId = null;
    let isViewingOthers = false;

    if (options && options.userId) {
      // 从参数中获取卖家 ID
      targetUserId = String(options.userId).trim();
      isViewingOthers = true;
      console.log('✅ 查看他人主页，目标用户 ID:', targetUserId);
    } else if (token && currentUserInfo.id) {
      // 没有传入 userId，则查看自己的主页
      targetUserId = String(currentUserInfo.id).trim();
      isViewingOthers = false;
      console.log('✅ 查看个人主页，当前用户 ID:', targetUserId);
    } else {
      // 既没有传入 userId，也没有登录
      console.warn('⚠️ 用户未登录且未指定用户 ID');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // ✅ 修复 2: 验证 userId 是否有效
    if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
      console.error('❌ 用户 ID 无效:', targetUserId);
      wx.showToast({
        title: '用户信息异常',
        icon: 'none'
      });
      return;
    }

    // ✅ 修复 3: 确保 userId 是数字类型（如果需要）
    const numericUserId = parseInt(targetUserId);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      console.error('❌ 用户 ID 无法转换为有效数字:', targetUserId);
      wx.showToast({
        title: '用户 ID 格式错误',
        icon: 'none'
      });
      return;
    }

    // 设置用户 ID 和状态
    this.setData({
      userId: numericUserId,
      isViewingOthers: isViewingOthers  // ✅ 用于控制是否显示编辑按钮
    });

    // ✅ 修复 4: 加载目标用户的数据
    console.log('开始加载用户详情，用户 ID:', numericUserId);
    this.fetchUserDetails(numericUserId);
    this.fetchSellingProducts(numericUserId);

    // 初始化其他本地数据（仅在查看自己主页时）
    if (!isViewingOthers) {
      this.initLocalData();
    } else {
      // 查看他人主页时，初始化空的评论和动态数据
      this.setData({
        commentCount: 0,
        postCount: 0,
        tabList: [
          { name: '宝贝', count: 0 },
          { name: '评价', count: 0 },
          { name: '动态', count: 0 }
        ]
      });
    }
  },

  // 初始化本地数据（评论和动态）
  initLocalData() {
    let myComments = [], myPosts = [];
    try {
      myComments = wx.getStorageSync('myCommentList') || [];
      myPosts = wx.getStorageSync('myPostList') || [];
    } catch (e) {
      console.warn("部分本地数据读取出错", e);
    }

    const commentLen = myComments.length;
    const postLen = myPosts.length;

    this.setData({
      commentCount: commentLen,
      postCount: postLen,
      tabList: [
        { name: '宝贝', count: this.data.goodsCount },
        { name: '评价', count: commentLen },
        { name: '动态', count: postLen }
      ]
    });

    // 设置背景图
    try {
      const localBg = wx.getStorageSync('userBgImg');
      if (localBg) {
        this.setData({ bgImgUrl: localBg });
      }
    } catch (e) {
      console.warn("读取 userBgImg 出错", e);
    }
  },

  // 获取用户详情
  fetchUserDetails(userId) {
    const app = getApp();
    const baseURL = app.globalData.baseUrl;

    // 获取认证token
    const token = wx.getStorageSync('token');
    console.log('获取到的token:', token); // 添加调试日志

    if (!baseURL) {
      console.error('API地址未配置');
      return;
    }

    if (!token) {
      console.warn('未找到有效的认证token');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.request({
      url: `${baseURL}/users/${userId}`,
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${token}` // 确保始终使用Bearer格式
      },
      success: (res) => {
        console.log('用户详情接口响应:', res); // 添加调试日志
        if (res.statusCode === 200 && res.data && res.data.data) {
          const userData = res.data.data;
          this.processUserData(userData);
        } else {
          console.error('获取用户详情失败，状态码:', res.statusCode, '响应:', res.data);
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取用户详情失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },



  // 处理用户数据
  processUserData(userData) {
    console.log('\n=== 开始处理用户数据 ===');
    console.log('原始用户数据:', userData);

    // ✅ 修复：处理头像 URL - 优先使用接口返回的头像
    let avatarUrl = this.data.avatarUrl; // 默认头像

    if (userData.avatar) {
      console.log('接口返回的头像路径:', userData.avatar);
      avatarUrl = this.processImageUrl(userData.avatar);
      console.log('处理后的头像 URL:', avatarUrl);
    }

    // 处理昵称 - 优先使用接口返回的昵称
    const nickname = userData.nickname || this.data.nickname;

    // 处理信用分
    const creditScore = userData.creditScore !== undefined ? userData.creditScore : this.data.creditScore;

    // 处理简介（接口未提供简介字段，保留原逻辑）
    let profileDesc = this.data.profileDesc;

    // 处理性别标签
    let tags = [...this.data.tags];
    if (userData.gender !== undefined) {
      // 移除原有的性别标签
      tags = tags.filter(tag => tag !== '男生' && tag !== '女生');
      // 添加新的性别标签
      const genderMap = { 1: '男生', 2: '女生' };
      const genderTag = genderMap[userData.gender];
      if (genderTag) {
        tags.unshift(genderTag);
      }
    }

    console.log('最终设置的头像 URL:', avatarUrl);
    console.log('=== 用户数据处理结束 ===\n');

    this.setData({
      avatarUrl,
      nickname,
      creditScore,
      profileDesc,
      tags
    });
  },

  onShow() {
    // ✅ 修复 5: 页面显示时刷新商品数据
    if (this.data.userId) {
      console.log('页面显示，刷新商品列表，用户 ID:', this.data.userId);
      this.fetchSellingProducts(this.data.userId);
    }
  },

  // 获取用户正在出售的商品
  fetchSellingProducts(userId) {
    const app = getApp();
    const baseURL = app.globalData.baseUrl;

    // 获取认证 token
    const token = wx.getStorageSync('token');
    console.log('获取商品列表时的 token:', token);

    if (!baseURL) {
      console.error('API 地址未配置');
      return;
    }

    if (!token) {
      console.warn('获取商品列表时未找到有效的认证 token');
      return;
    }

    wx.request({
      url: `${baseURL}/users/${userId}/selling-products`,
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        console.log('商品列表接口响应:', res);
        if (res.statusCode === 200 && res.data) {
          const products = Array.isArray(res.data.data) ? res.data.data : [];

          // ✅ 修复：处理商品图片 URL
          const processedProducts = products.map(product => {
            let imageUrl = '';

            // 如果产品有 images 数组，取第一张作为封面图
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              imageUrl = product.images[0];
            } else if (product.image) {
              // 如果已经有 image 字段，使用它
              imageUrl = product.image;
            }

            // ✅ 处理图片 URL
            if (imageUrl) {
              const processedImageUrl = this.processImageUrl(imageUrl);
              console.log(`商品 "${product.title}" 图片处理:`, imageUrl, '->', processedImageUrl);

              return {
                ...product,
                image: processedImageUrl,
                images: product.images ? product.images.map(img => this.processImageUrl(img)) : [processedImageUrl]
              };
            }

            return product;
          });

          const goodsCount = processedProducts.length;
          this.setData({
            goodsList: processedProducts,
            goodsCount,
            tabList: [
              { name: '宝贝', count: goodsCount },
              { name: '评价', count: this.data.commentCount },
              { name: '动态', count: this.data.postCount }
            ]
          });

          try {
            wx.setStorageSync('myPublishGoodsList', processedProducts);
          } catch (e) {
            console.warn('保存商品列表失败:', e);
          }
        } else {
          console.error('获取商品列表失败，状态码:', res.statusCode, '响应:', res.data);
          wx.showToast({
            title: '获取商品失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取商品列表失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },


  goToGoodDetail(e) {
    const id = e.currentTarget.dataset.id;

    // ✅ 新增：详细调试信息
    console.log('\n=== 点击商品，准备跳转 ===');
    console.log('原始 dataset:', e.currentTarget.dataset);
    console.log('获取到的 id:', id);
    console.log('id 类型:', typeof id);
    console.log('id 是否为空:', !id);

    // ✅ 新增：验证 id 是否有效
    if (!id || id === 'undefined' || id === 'null') {
      console.error('❌ 商品ID 无效:', id);
      wx.showToast({
        title: '商品信息异常',
        icon: 'none'
      });
      return;
    }

    console.log('✅ 商品ID 验证通过，准备跳转:', id);

    wx.navigateTo({
      url: `/pages/GoodDetail/GoodDetail?id=${id}`,
      success: () => {
        console.log('✅ 跳转成功');
      },
      fail: (err) => {
        console.error('❌ 跳转失败:', err);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  onEditDesc() {
    this.setData({
      showEditDesc: true,
      editDescValue: this.data.profileDesc === '这家伙很神秘，没有写个人简介。' ? '' : this.data.profileDesc
    });
  },

  onEditDescInput(e) {
    this.setData({ editDescValue: e.detail.value });
  },

  onCloseEditDesc() {
    this.setData({ showEditDesc: false });
  },

  onConfirmEditDesc() {
    let newDesc = this.data.editDescValue.trim();
    if (!newDesc) {
      newDesc = '这家伙很神秘，没有写个人简介。';
    }
    this.setData({ profileDesc: newDesc, showEditDesc: false });
    this.updateUserInfoStorage({ profileDesc: newDesc, intro: newDesc });
  },


  onEditProfile() {
    console.log('\n=== 点击编辑按钮 ===');

    // ✅ 修复 6: 如果是查看他人主页，不允许编辑
    if (this.data.isViewingOthers) {
      console.warn('⚠️ 正在查看他人主页，无法编辑');
      wx.showToast({
        title: '无法编辑他人资料',
        icon: 'none'
      });
      return;
    }

    console.log('当前页面路径:', this.route);
    console.log('当前 userId:', this.data.userId);

    // ✅ 修复 7: 检查页面栈数量，避免页面栈溢出
    const pages = getCurrentPages();
    console.log('当前页面栈数量:', pages.length);

    if (pages.length >= 9) {
      console.warn('⚠️ 页面栈接近上限，使用 reLaunch');
      wx.reLaunch({
        url: '/pages/setting/setting',
        fail: (err) => {
          console.error('reLaunch 失败:', err);
          wx.showToast({
            title: '请稍后再试',
            icon: 'none'
          });
        }
      });
      return;
    }

    // ✅ 修复 8: 验证登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo || !userInfo.id) {
      console.warn('⚠️ 用户未登录，无法编辑');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // ✅ 修复 9: 优化防抖处理，缩短锁定时间
    if (this.isNavigating) {
      console.warn('⚠️ 页面正在跳转中，忽略本次点击');
      return;
    }

    this.isNavigating = true;

    wx.navigateTo({
      url: '/pages/setting/setting',
      success: () => {
        console.log('✅ 跳转到setting页面成功');
        // ✅ 修复 10: 立即重置防抖标志，不需要等待
        this.isNavigating = false;
      },
      fail: (err) => {
        console.error('❌ 跳转到setting页面失败:', err);
        this.isNavigating = false;

        // ✅ 修复 11: 如果是重复跳转导致的失败，给出提示
        if (err.errMsg && err.errMsg.includes('fail')) {
          wx.showToast({
            title: '请稍后再试',
            icon: 'none'
          });
        } else {
          wx.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      }
    });
  },

// ... existing code ...

  onAddTag() {
    this.setData({ showAddTagModal: true, addTagValue: '' });
  },

  onAddTagInput(e) {
    this.setData({ addTagValue: e.detail.value });
  },

  onAddTagCancel() {
    this.setData({ showAddTagModal: false });
  },

  onAddTagConfirm() {
    let val = this.data.addTagValue.trim();
    if (!val) return wx.showToast({ title: '请输入内容', icon: 'none' });
    if (val.length > 8) return wx.showToast({ title: '标签最多8个字', icon: 'none' });
    if (this.data.tags.length >= 6) return wx.showToast({ title: '最多只能添加6个标签', icon: 'none' });

    const tags = [...this.data.tags, val];
    this.setData({ tags, showAddTagModal: false });
    this.updateUserInfoStorage({ tags });
  },

  onGenderTagTap() {
    const that = this;
    wx.showActionSheet({
      itemList: ['男生', '女生'],
      success(res) {
        const gender = res.tapIndex === 0 ? '男生' : '女生';
        // 替换 tags 中的性别
        const tags = that.data.tags.map(t => (t === '男生' || t === '女生') ? gender : t);
        that.setData({ tags });
        that.updateUserInfoStorage({ tags });
      }
    });
  },

  onTagTap(e) {
    const idx = e.currentTarget.dataset.index;
    const that = this;
    wx.showActionSheet({
      itemList: ['更改内容', '删除'],
      success(res) {
        if (res.tapIndex === 0) {
          // 更改内容
          that.setData({
            showEditTagModal: true,
            editTagValue: that.data.tags[idx],
            editTagIndex: idx
          });
        } else if (res.tapIndex === 1) {
          // 删除
          const tags = [...that.data.tags];
          tags.splice(idx, 1);
          that.setData({ tags });
          that.updateUserInfoStorage({ tags });
        }
      }
    });
  },

  onEditTagInput(e) {
    this.setData({ editTagValue: e.detail.value });
  },

  onEditTagCancel() {
    this.setData({ showEditTagModal: false });
  },

  onEditTagConfirm() {
    let val = this.data.editTagValue.trim();
    if (!val) return wx.showToast({ title: '请输入内容', icon: 'none' });
    if (val.length > 8) return wx.showToast({ title: '标签最多8个字', icon: 'none' });

    const tags = [...this.data.tags];
    tags[this.data.editTagIndex] = val;
    this.setData({ tags, showEditTagModal: false });
    this.updateUserInfoStorage({ tags });
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index });
  },

  // onBgImgTap() {
  //   const that = this;
  //   wx.chooseImage({
  //     count: 1,
  //     sizeType: ['original', 'compressed'],
  //     sourceType: ['album', 'camera'],
  //     success(res) {
  //       const tempFilePath = res.tempFilePaths[0];
  //       that.setData({ bgImgUrl: tempFilePath });
  //       try {
  //         wx.setStorageSync('userBgImg', tempFilePath);
  //       } catch (e) {
  //         console.warn('保存背景图片失败:', e);
  //       }
  //     }
  //   });
  // },

  updateUserInfoStorage(updates) {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      Object.assign(userInfo, updates);
      wx.setStorageSync('userInfo', userInfo);
    } catch (e) {
      console.warn('更新本地用户信息失败:', e);
    }
  },

  // ✅ 新增：点击头像更换（仅在查看自己主页时可用）
  onChooseAvatar() {
    console.log('=== 点击头像，准备更换 ===');

    // ✅ 修复 12: 如果是查看他人主页，不允许更换头像
    if (this.data.isViewingOthers) {
      console.warn('⚠️ 正在查看他人主页，无法更换头像');
      wx.showToast({
        title: '无法更改他人头像',
        icon: 'none'
      });
      return;
    }

    // 检查登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo || !userInfo.id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 选择图片
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],  // ✅ 压缩图片
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('选择图片成功:', tempFilePath);

        // ✅ 立即显示预览
        this.setData({ avatarUrl: tempFilePath });

        // ✅ 上传到服务器
        this.uploadAvatarToServer(tempFilePath);
      },
      fail: (err) => {
        console.log('取消选择或选择失败:', err);
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

        console.log('UserHome: 图片转 Base64 成功，长度:', base64Image.length);

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
            console.log('UserHome: 服务器响应:', res);

            if (res.statusCode === 200 && res.data.code === 200) {
              // ✅ 获取服务器返回的头像 URL
              let avatarUrl = res.data.data.avatar;

              // ✅ 关键修复：如果返回的是相对路径，拼接完整域名
              if (avatarUrl && !avatarUrl.startsWith('http')) {
                const serverRoot = app.globalData.baseUrl.replace(/\/api$/, '');
                avatarUrl = serverRoot + avatarUrl;
              }

              console.log('UserHome: 最终头像 URL:', avatarUrl);

              // ✅ 更新本地显示
              this.setData({ avatarUrl: avatarUrl });

              // ✅ 更新本地缓存
              const localUserInfo = wx.getStorageSync('userInfo') || {};
              localUserInfo.avatarUrl = avatarUrl;
              localUserInfo.avatar = avatarUrl;
              wx.setStorageSync('userInfo', localUserInfo);

              wx.hideLoading();
              wx.showToast({ title: '头像已更新', icon: 'success' });

              console.log('UserHome: 头像上传成功', avatarUrl);
            } else {
              wx.hideLoading();
              wx.showToast({
                title: res.data.message || '上传失败',
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            console.error('UserHome: 头像上传失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('UserHome: 图片转 Base64 失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '图片处理失败',
          icon: 'none'
        });
      }
    });
  },
  // ✅ 新增：统一处理图片 URL 的方法
  processImageUrl(imagePath) {
    // ✅ 修复：先检查 imagePath 是否存在并转换为字符串
    if (!imagePath && imagePath !== 0) return '';

    // 确保 imagePath 是字符串类型
    const imageUrl = String(imagePath).trim();

    // 如果转换后为空，返回空字符串
    if (!imageUrl) return '';

    const app = getApp();
    const baseURL = app.globalData.baseUrl;

    console.log('processImageUrl 输入:', imagePath, '类型:', typeof imagePath);
    console.log('processImageUrl 转换后:', imageUrl);

    // 如果已经是完整 URL，直接返回
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log('✅ 完整 URL，直接返回');
      return imageUrl;
    }

    // 如果是相对路径，拼接完整域名
    if (imageUrl.startsWith('/api')) {
      // 后端返回的是 /api/uploads/xxx.png
      // 需要从 baseURL 中提取服务器根地址（去掉 /api）
      const serverRoot = baseURL.replace(/\/api$/, '');
      const finalUrl = serverRoot + imageUrl;
      console.log('⚠️ 路径含 /api，拼接服务器根地址:', finalUrl);
      return finalUrl;
    } else {
      // 后端返回的是 /uploads/xxx.png（没有 /api）
      const finalUrl = baseURL + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
      console.log('✅ 普通拼接:', finalUrl);
      return finalUrl;
    }
  },

});
