Page({
  data: {
    description: '',
    images: [],
    shippingMethod: 'seller',
    loading: false,
    categoryOptions: ['教材书籍', '服饰鞋包', '生活用品', '数码产品', '美妆个护', '交通出行', '其他闲置'],
    category: '',
    conditionOptions: ['几乎全新', '轻微使用痕迹', '明显使用痕迹'],
    condition: ''
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

  // 提交发布
  submitPublish() {
    if (!this.data.description.trim()) {
      return wx.showToast({ title: '请填写商品描述', icon: 'none' });
    }
    if (this.data.images.length === 0) {
      return wx.showToast({ title: '请上传图片', icon: 'none' });
    }
    if (!this.data.category) {
      return wx.showToast({ title: '请选择分类', icon: 'none' });
    }
    if (!this.data.condition) {
      return wx.showToast({ title: '请选择成色', icon: 'none' });
    }
    this.setData({ loading: true });
    // 这里可以添加后续处理逻辑
    wx.showToast({
      title: '发布成功',
      icon: 'success',
      duration: 2000,
      success: () => {
        this.setData({
          description: '',
          images: [],
          shippingMethod: 'seller',
          loading: false,
          category: '',
          condition: ''
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }
    });
  }
}); 