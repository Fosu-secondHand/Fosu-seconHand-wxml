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
    // 处理头像
    const avatarUrl = userData.avatar || this.data.avatarUrl;

    // 处理昵称
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

    // 获取认证token
    const token = wx.getStorageSync('token');
    console.log('获取商品列表时的token:', token); // 添加调试日志

    if (!baseURL) {
      console.error('API地址未配置');
      return;
    }

    if (!token) {
      console.warn('获取商品列表时未找到有效的认证token');
      return;
    }

    wx.request({
      url: `${baseURL}/users/${userId}/selling-products`,
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${token}` // 确保始终使用Bearer格式
      },
      success: (res) => {
        console.log('商品列表接口响应:', res); // 添加调试日志
        if (res.statusCode === 200 && res.data) {
          const products = Array.isArray(res.data.data) ? res.data.data : [];
          const goodsCount = products.length;
          this.setData({
            goodsList: products,
            goodsCount,
            tabList: [
              { name: '宝贝', count: goodsCount },
              { name: '评价', count: this.data.commentCount },
              { name: '动态', count: this.data.postCount }
            ]
          });

          try {
            wx.setStorageSync('myPublishGoodsList', products);
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
    wx.navigateTo({
      url: `/pages/GoodDetail/GoodDetail?id=${id}`
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
    wx.navigateTo({ url: '/pages/setting/setting' });
  },

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
