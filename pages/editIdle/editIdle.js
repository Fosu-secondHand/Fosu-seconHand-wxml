Page({
  data: {
    description: '',      // 商品描述
    images: [],           // 已选图片
    price: '',            // 价格
    shippingMethod: 'seller', // 交易方式：卖家送/买家取
    loading: false,       // 加载状态
    isEditMode: true,     // 是否为编辑模式
    editingGoodsId: null,  // 正在编辑的商品ID
    categoryOptions: ['教材书籍', '服饰鞋包', '生活用品', '数码产品', '美妆个护', '交通出行', '其他闲置'],
    category: '',
    conditionOptions: ['几乎全新', '轻微使用痕迹', '明显使用痕迹'],
    condition: '',
    showPriceDetail: false, // 定价详情弹窗显示状态
  },

  onLoad() {
    // 获取待编辑的商品信息
    const editingGoods = wx.getStorageSync('editingGoods');
    if (editingGoods) {
      this.setData({
        description: editingGoods.description,
        images: editingGoods.images,
        price: editingGoods.price,
        shippingMethod: editingGoods.shippingMethod,
        editingGoodsId: editingGoods.id,
        category: editingGoods.category || '',
        condition: editingGoods.condition || ''
      });
      // 清除编辑状态
      wx.removeStorageSync('editingGoods');
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

  // 显示定价详情弹窗
  onShowPriceDetail() {
    this.setData({ showPriceDetail: true });
  },

  // 隐藏定价详情弹窗
  onHidePriceDetail() {
    this.setData({ showPriceDetail: false });
  },

  // 切换交易方式
  onShippingChange(e) {
    this.setData({ shippingMethod: e.detail.value });
  },

  // 分类选择
  onCategorySelect(e) {
    this.setData({ category: e.currentTarget.dataset.value });
  },

  // 成色选择
  onConditionSelect(e) {
    this.setData({ condition: e.currentTarget.dataset.value });
  },

  // 提交修改
  submitEdit() {
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

    // 构建更新后的商品数据
    const updatedGoods = {
      id: this.data.editingGoodsId,
      title: this.data.description,
      description: this.data.description,
      images: this.data.images,
      imageUrl: this.data.images[0], // 使用第一张图片作为主图
      price: this.data.price,
      shippingMethod: this.data.shippingMethod,
      status: '在售', // 商品状态：在售/已售出
      createdAt: new Date().toISOString(),
      category: this.data.category,
      condition: this.data.condition
    };

    // 获取现有商品列表
    const myPublishGoodsList = wx.getStorageSync('myPublishGoodsList') || [];

    // 更新商品信息
    const index = myPublishGoodsList.findIndex(item => item.id === this.data.editingGoodsId);
    if (index !== -1) {
      myPublishGoodsList[index] = updatedGoods;
      wx.setStorageSync('myPublishGoodsList', myPublishGoodsList);

      // 修改成功提示
      wx.showToast({
        title: '修改成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        }
      });
    } else {
      wx.showToast({
        title: '商品不存在',
        icon: 'none'
      });
    }

    this.setData({ loading: false });
  },

  // 处理定价弹窗输入
  onModalPriceInput(e) {
    this.setData({ price: e.detail });
  },

  // 处理定价弹窗确定
  onModalPriceConfirm() {
    const price = parseFloat(this.data.price);
    if (!price || isNaN(price)) {
      wx.showToast({ title: '请输入正确价格', icon: 'none' });
      return;
    }
    this.setData({ showPriceDetail: false });
  },

  // 处理定价弹窗关闭
  onModalPriceClose() {
    this.setData({ showPriceDetail: false });
  },
}); 