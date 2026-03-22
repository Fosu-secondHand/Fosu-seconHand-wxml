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

  onLoad() {
    const app = getApp();
    const userInfo = wx.getStorageSync('userInfo') || {};
    const token = wx.getStorageSync('token');

    // 检查登录状态
    if (!token || !userInfo.id) {
      console.warn('用户未登录或缺少必要信息');
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      // 可以选择跳转到登录页面
      // wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    // 设置用户 ID
    if (userInfo.id && (typeof userInfo.id === 'string' || typeof userInfo.id === 'number')) {
      const userId = String(userInfo.id).trim();
      if (userId) {
        this.setData({ userId });
        this.fetchUserDetails(userId);
        this.fetchSellingProducts(userId);
      }
    }

    // 初始化其他本地数据
    this.initLocalData();
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
    // 处理头像 - 优先使用微信头像，其次使用用户数据中的头像
    const storedUserInfo = wx.getStorageSync('userInfo') || {};
    const avatarUrl = storedUserInfo.avatarUrl || userData.avatar || this.data.avatarUrl;

    // 处理昵称 - 优先使用微信昵称，其次使用用户数据中的昵称
    const nickname = storedUserInfo.nickname || userData.nickname || this.data.nickname;

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

    this.setData({
      avatarUrl,
      nickname,
      creditScore,
      profileDesc,
      tags
    });
  },

  onShow() {
    // 页面显示时刷新商品数据
    if (this.data.userId) {
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

          // ✅ 新增：确保每个商品都有 image 字段
          const processedProducts = products.map(product => {
            // 如果产品有 images 数组，取第一张作为封面图
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              return { ...product, image: product.images[0] };
            }
            // 如果已经有 image 字段，保持不变
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
    console.log('当前页面路径:', this.route);
    console.log('当前 userId:', this.data.userId);

    // ✅ 修复 1: 检查页面栈数量，避免页面栈溢出
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

    // ✅ 修复 2: 验证登录状态
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

    // ✅ 修复 3: 优化防抖处理，缩短锁定时间
    if (this.isNavigating) {
      console.warn('⚠️ 页面正在跳转中，忽略本次点击');
      return;
    }

    this.isNavigating = true;

    wx.navigateTo({
      url: '/pages/setting/setting',
      success: () => {
        console.log('✅ 跳转到setting页面成功');
        // ✅ 修复 4: 立即重置防抖标志，不需要等待
        this.isNavigating = false;
      },
      fail: (err) => {
        console.error('❌ 跳转到setting页面失败:', err);
        this.isNavigating = false;

        // ✅ 修复 5: 如果是重复跳转导致的失败，给出提示
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

  onBgImgTap() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        that.setData({ bgImgUrl: tempFilePath });
        try {
          wx.setStorageSync('userBgImg', tempFilePath);
        } catch (e) {
          console.warn('保存背景图片失败:', e);
        }
      }
    });
  },

  updateUserInfoStorage(updates) {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      Object.assign(userInfo, updates);
      wx.setStorageSync('userInfo', userInfo);
    } catch (e) {
      console.warn('更新本地用户信息失败:', e);
    }
  }
});
