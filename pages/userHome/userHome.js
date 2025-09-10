Page({
  data: {
    avatarUrl: '/static/assets/icons/default-avatar.png', // 默认头像与个人中心一致
    nickname: '昵称',
    accountNumber: '',
    profileDesc: '', // 初始为空
    goodsList: [],
    showEditDesc: false,
    editDescValue: '',
    tags: ['IP 广东省', '女生'],
    showAddTagModal: false,
    addTagValue: '',
    showEditTagModal: false,
    editTagValue: '',
    editTagIndex: 0,
    creditScore: 100, // 信用分，基础100
    goodsCount: 0, // 宝贝数量
    commentCount: 0, // 评价数量
    postCount: 0, // 动态数量
    currentTab: 0,
    tabList: [
      { name: '宝贝', count: 0 },
      { name: '评价', count: 0 },
      { name: '动态', count: 0 }
    ],
    bgImgUrl: '/static/back.png',
  },
  onLoad() {
    // 读取本地存储的我发布的商品
    const myGoods = wx.getStorageSync('myPublishGoodsList') || [];
    // 假设有本地存储的评价和动态数据
    const myComments = wx.getStorageSync('myCommentList') || [];
    const myPosts = wx.getStorageSync('myPostList') || [];
    this.setData({
      goodsList: myGoods,
      goodsCount: myGoods.length,
      commentCount: myComments.length,
      postCount: myPosts.length,
      tabList: [
        { name: '宝贝', count: myGoods.length },
        { name: '评价', count: myComments.length },
        { name: '动态', count: myPosts.length }
      ]
    });
    // 这里可以同步读取用户头像、昵称、简介等
    const userInfo = wx.getStorageSync('userInfo') || {};
    let desc = userInfo.intro || userInfo.profileDesc || '';
    if (!desc) desc = '这家伙很神秘，没有写个人简介。';
    this.setData({
      avatarUrl: userInfo.avatarUrl || '/static/assets/icons/default-avatar.png',
      nickname: userInfo.nickname || this.data.nickname,
      accountNumber: userInfo.accountNumber || '账号: fosu' + Math.floor(Math.random() * 10000),
      profileDesc: desc,
      tags: userInfo.tags || ['IP 广东省', '女生'],
      creditScore: userInfo.creditScore || 100
    });
    const localBg = wx.getStorageSync('userBgImg');
    if (localBg) {
      this.setData({ bgImgUrl: localBg });
    }
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
    // 同步到本地userInfo
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.profileDesc = newDesc;
    userInfo.intro = newDesc;
    wx.setStorageSync('userInfo', userInfo);
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
    const tags = this.data.tags.concat(val);
    this.setData({ tags, showAddTagModal: false });
    // 同步到本地 userInfo
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.tags = tags;
    wx.setStorageSync('userInfo', userInfo);
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
        // 同步到本地 userInfo
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.tags = tags;
        wx.setStorageSync('userInfo', userInfo);
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
          const tags = that.data.tags.slice();
          tags.splice(idx, 1);
          that.setData({ tags });
          // 同步到本地 userInfo
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.tags = tags;
          wx.setStorageSync('userInfo', userInfo);
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
    const tags = this.data.tags.slice();
    tags[this.data.editTagIndex] = val;
    this.setData({ tags, showEditTagModal: false });
    // 同步到本地 userInfo
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.tags = tags;
    wx.setStorageSync('userInfo', userInfo);
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
        wx.setStorageSync('userBgImg', tempFilePath);
      }
    });
  },
}); 