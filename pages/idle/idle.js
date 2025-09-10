// pages/idle/idle.js
Page({
  data: {
    description: '',      // 商品描述
    images: [],           // 已选图片
    price: '',            // 价格
    shippingMethod: 'seller', // 交易方式：卖家送/买家取
    loading: false,       // 加载状态
    isEditMode: false,    // 是否为编辑模式
    editingGoodsId: null,  // 正在编辑的商品ID
    showPriceModal: false,
    modalPrice: '',
    showKeyboard: false,
    keyboardTarget: '', // 'price' or 'origin'
    categoryOptions: ['教材书籍', '服饰鞋包', '生活用品', '数码产品', '美妆个护', '交通出行', '其他闲置'],
    category: '',
    conditionOptions: ['几乎全新', '轻微使用痕迹', '明显使用痕迹'],
    condition: '',
  },

  onLoad(options) {
    // 检查是否为编辑模式
    if (options.mode === 'edit') {
      const editingGoods = wx.getStorageSync('editingGoods');
      if (editingGoods) {
        this.setData({
          description: editingGoods.description,
          images: editingGoods.images,
          price: editingGoods.price,
          shippingMethod: editingGoods.shippingMethod,
          isEditMode: true,
          editingGoodsId: editingGoods.id
        });
        // 清除编辑状态
        wx.removeStorageSync('editingGoods');
      }
    }
  },

  // 处理描述输入
  onDescriptionChange(e) {
    this.setData({ description: e.detail.value });
  },

  // 选择图片
  chooseImage() {
    const maxCount = 9 - this.data.images.length;
    if (maxCount <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ images: [...this.data.images, ...res.tempFilePaths] });
      }
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  // 价格输入
  onPriceInput(e) {
    let value = e.detail.value.replace(/[^\d.]/g, ''); // 只保留数字和小数点
    // 只允许一个小数点，且最多两位小数
    value = value.replace(/^(\d+)(\.\d{0,2})?.*$/, (match, int, dec) => int + (dec || ''));
    this.setData({ price: value });
  },

  // 切换交易方式
  onShippingChange(e) {
    this.setData({ shippingMethod: e.detail.value });
  },

  // 打开定价弹窗
  openPriceModal() {
    this.setData({
      showPriceModal: true,
      modalPrice: this.data.price
    });
  },

  // 关闭定价弹窗
  closePriceModal() {
    this.setData({ showPriceModal: false });
  },

  // 处理定价弹窗输入
  onModalPriceInput(e) {
    this.setData({ modalPrice: e.detail });
  },

  // 处理定价弹窗确定
  onModalPriceConfirm() {
    const price = parseFloat(this.data.modalPrice);
    if (!price || isNaN(price)) {
      wx.showToast({ title: '请输入正确价格', icon: 'none' });
      return;
    }
    this.setData({
      price: this.data.modalPrice,
      showPriceModal: false
    });
  },

  // 处理定价弹窗关闭
  onModalPriceClose() {
    this.setData({ showPriceModal: false });
  },

  // 跳转拍卖
  goAuction() {
    wx.navigateTo({ url: '/pages/auctionPrice/auctionPrice' }); // 如无此页面可后续补充
  },

  // 提交发布
  submitPublish() {
    // 表单验证
    if (!this.data.description.trim()) {
      return wx.showToast({ title: '请填写商品描述', icon: 'none' });
    }
    if (this.data.images.length === 0) {
      return wx.showToast({ title: '请上传图片', icon: 'none' });
    }
    if (!this.data.price) {
      return wx.showToast({ title: '请设置价格', icon: 'none' });
    }
    if (!this.data.category) {
      return wx.showToast({ title: '请选择分类', icon: 'none' });
    }
    if (!this.data.condition) {
      return wx.showToast({ title: '请选择成色', icon: 'none' });
    }

    // 显示加载状态
    this.setData({ loading: true });

    // 构建新商品数据
    const newGoods = {
      id: this.data.isEditMode ? this.data.editingGoodsId : Date.now(),
      title: this.data.description,
      description: this.data.description,
      images: this.data.images,
      imageUrl: this.data.images[0], // 使用第一张图片作为主图
      price: this.data.price,
      shippingMethod: this.data.shippingMethod,
      status: '在售', // 商品状态：在售/已售出
      createdAt: this.data.isEditMode ? new Date().toISOString() : new Date().toISOString(),
      category: this.data.category,
      condition: this.data.condition
    };

    // 获取现有商品列表
    const myPublishGoodsList = wx.getStorageSync('myPublishGoodsList') || [];

    if (this.data.isEditMode) {
      // 编辑模式：更新现有商品
      const index = myPublishGoodsList.findIndex(item => item.id === this.data.editingGoodsId);
      if (index !== -1) {
        myPublishGoodsList[index] = newGoods;
      }
    } else {
      // 新增模式：添加到列表开头
      myPublishGoodsList.unshift(newGoods);
    }

    // 保存更新后的列表
    wx.setStorageSync('myPublishGoodsList', myPublishGoodsList);

    // 发布成功提示
    wx.showToast({
      title: this.data.isEditMode ? '修改成功' : '发布成功',
      icon: 'success',
      duration: 2000,
      success: () => {
        // 重置所有输入状态
        this.setData({
          description: '',
          images: [],
          price: '',
          shippingMethod: 'seller',
          loading: false,
          isEditMode: false,
          editingGoodsId: null
        });

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }
    });
  },

  // 显示自定义数字键盘
  showCustomKeyboard(e) {
    const target = e.currentTarget.dataset.target;
    this.setData({
      showKeyboard: true,
      keyboardTarget: target
    });
  },

  // 键盘输入事件
  onKeyboardInput(e) {
    const value = e.detail.value;
    if (this.data.keyboardTarget === 'price') {
      this.setData({ modalPrice: value });
    }
  },

  // 键盘确定事件
  onKeyboardConfirm(e) {
    const value = e.detail.value;
    if (this.data.keyboardTarget === 'price') {
      this.setData({ modalPrice: value, showKeyboard: false });
    }
  },

  // 键盘收起事件
  onKeyboardHide() {
    this.setData({ showKeyboard: false });
  },

  // 分类选择
  onCategorySelect(e) {
    this.setData({ category: e.currentTarget.dataset.value });
  },

  // 成色选择
  onConditionSelect(e) {
    this.setData({ condition: e.currentTarget.dataset.value });
  }
});