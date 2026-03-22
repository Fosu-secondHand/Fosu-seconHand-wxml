Page({
  data: {
    description: '',      // 商品描述
    images: [],           // 已选图片
    price: '',            // 价格
    quantity: 1,          // 商品数量，默认为1
    shippingMethod: 'seller', // 交易方式：卖家送/买家取
    loading: false,       // 加载状态
    isEditMode: true,     // 是否为编辑模式
    editingGoodsId: null,  // 正在编辑的商品ID
    productType: 'SELL',   // 商品类型：SELL(出售) 或 WANT(求购)
    categoryOptions: [
      { id: 1, name: '教材书籍' },
      { id: 2, name: '服饰鞋包' },
      { id: 3, name: '生活用品' },
      { id: 4, name: '数码产品' },
      { id: 5, name: '美妆个护' },
      { id: 6, name: '交通出行' },
      { id: 7, name: '其他闲置' }
    ],
    category: null,       // 选中的分类对象
    conditionOptions: [
      { value: 'NEW', label: '几乎全新' },
      { value: 'GOOD', label: '轻微使用痕迹' },
      { value: 'FAIR', label: '明显使用痕迹' }
    ],
    condition: null,      // 选中的成色对象
    showPriceModal: false, // 定价弹窗显示状态
    modalPrice: '',
    originalProductData: null // 添加原始商品数据
  },

  onLoad() {
    // 获取待编辑的商品ID
    const editingGoods = wx.getStorageSync('editingGoods');
    if (editingGoods) {
      const goodsId = editingGoods.id || editingGoods.productId;
      if (goodsId) {
        this.setData({
          editingGoodsId: goodsId,
          productType: editingGoods.productType || 'SELL'
        });
        // 从服务器获取商品详细信息
        this.loadProductDetail(goodsId);
      }
      // 清除编辑状态
      wx.removeStorageSync('editingGoods');
    }
  },

  // 加载商品详细信息
  loadProductDetail(productId) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    wx.request({
      url: `${app.globalData.baseUrl}/products/detail?productId=${productId}`,
      method: 'GET',
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const productDetail = res.data.data;

          // 保存原始商品数据
          this.setData({
            originalProductData: productDetail
          });

          // 根据商品类型设置不同的默认值
          if (productDetail.productType === 'WANT') {
            this.loadWantGoodsData(productDetail);
          } else {
            this.loadSellGoodsData(productDetail);
          }
        } else {
          wx.showToast({
            title: '获取商品信息失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取商品详情失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载出售商品数据
  loadSellGoodsData(goods) {
    // 处理图片URL
    let images = [];
    if (goods.image) {
      if (Array.isArray(goods.image)) {
        images = goods.image;
      } else {
        images = [goods.image];
      }
    } else if (goods.images) {
      images = goods.images;
    }

    // 查找对应的分类对象
    let categoryObj = null;
    if (goods.category) {
      const categoryName = goods.category.name || goods.category;
      const categoryId = goods.category.categoryId || goods.categoryId;

      // 根据分类名称或ID查找对应的分类对象
      categoryObj = this.data.categoryOptions.find(cat =>
          cat.name === categoryName || cat.id === categoryId
      ) || null;
    }

    // 查找对应的成色对象
    let conditionObj = null;
    const conditionValue = goods.condition ? goods.condition.toUpperCase() : '';
    conditionObj = this.data.conditionOptions.find(cond =>
        cond.value === conditionValue
    ) || null;

    this.setData({
      description: goods.description || goods.title,
      images: images,
      price: goods.price ? goods.price.toString() : '',
      quantity: goods.quantity || 1, // 加载商品数量
      shippingMethod: goods.transactionMethod === 'Pickup' ? 'buyer' : 'seller',
      category: categoryObj,
      condition: conditionObj,
      productType: goods.productType || 'SELL'
    });
  },

  // 加载求购商品数据
  loadWantGoodsData(goods) {
    // 处理图片URL
    let images = [];
    if (goods.image) {
      if (Array.isArray(goods.image)) {
        images = goods.image;
      } else {
        images = [goods.image];
      }
    } else if (goods.images) {
      images = goods.images;
    }

    this.setData({
      description: goods.description || goods.title,
      images: images,
      quantity: goods.quantity || 1, // 加载商品数量
      shippingMethod: goods.transactionMethod === 'Pickup' ? 'buyer' : 'seller',
      productType: goods.productType || 'WANT'
    });
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

  // 价格输入（保留原有方法，但不再直接使用）
  onPriceInput(e) {
    let value = e.detail.value.replace(/[^\d.]/g, ''); // 只保留数字和小数点
    // 只允许一个小数点，且最多两位小数
    value = value.replace(/^(\d+)(\.\d{0,2})?.*$/, (match, int, dec) => int + (dec || ''));
    this.setData({ price: value });
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
    let value = e.detail.replace(/[^\d.]/g, '');
    value = value.replace(/^(\d+)(\.\d{0,2})?.*$/, (match, int, dec) => int + (dec || ''));
    const numValue = parseFloat(value);
    if (numValue > 999999) {
      value = '999999';
    }
    this.setData({ modalPrice: value });
  },

  // 处理定价弹窗确定
  onModalPriceConfirm() {
    const price = parseFloat(this.data.modalPrice);
    if (!price || isNaN(price) || price <= 0) {
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

  // 根据分类ID获取分类对象
  getCategoryById(categoryId) {
    return this.data.categoryOptions.find(cat => cat.id === categoryId) || null;
  },

  // 切换交易方式
  onShippingChange(e) {
    this.setData({ shippingMethod: e.detail.value });
  },

  // 分类选择
  onCategorySelect(e) {
    const categoryId = e.currentTarget.dataset.id;
    const categoryIndex = e.currentTarget.dataset.index;

    // 边界检查
    if (categoryIndex < 0 || categoryIndex >= this.data.categoryOptions.length) {
      console.warn('无效的分类索引:', categoryIndex);
      return;
    }

    // 根据ID找到对应的分类对象
    const selectedCategory = this.data.categoryOptions[categoryIndex];

    this.setData({
      category: selectedCategory
    });
  },

  // 成色选择
  onConditionSelect(e) {
    const conditionIndex = e.currentTarget.dataset.index;

    // 边界检查
    if (conditionIndex < 0 || conditionIndex >= this.data.conditionOptions.length) {
      console.warn('无效的成色索引:', conditionIndex);
      return;
    }

    const selectedCondition = this.data.conditionOptions[conditionIndex];

    this.setData({ condition: selectedCondition });
  },

  // 增加商品数量
  increaseQuantity() {
    this.setData({
      quantity: this.data.quantity + 1
    });
  },

  // 减少商品数量
  decreaseQuantity() {
    if (this.data.quantity > 1) {
      this.setData({
        quantity: this.data.quantity - 1
      });
    }
  },

  // 直接输入商品数量
  onQuantityInput(e) {
    let value = parseInt(e.detail.value);
    if (isNaN(value) || value < 1) {
      value = 1;
    }
    if (value > 999) {
      value = 999;
    }
    this.setData({
      quantity: value
    });
  },

  // 提交修改
  submitEdit() {
    if (this.data.productType === 'WANT') {
      this.submitWantGoodsEdit();
    } else {
      this.submitSellGoodsEdit();
    }
  },

  // 获取用户详细信息
  getUserDetail(userId, token) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      wx.request({
        url: `${app.globalData.baseUrl}/users/${userId}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.code === 200) {
            resolve(res.data.data);
          } else {
            reject(new Error(res.data.message || '获取用户信息失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // 提交求购商品修改
  submitWantGoodsEdit() {
    // 表单验证（求购商品逻辑）
    if (!this.data.description.trim()) {
      return wx.showToast({ title: '请填写商品描述', icon: 'none' });
    }
    if (this.data.images.length === 0) {
      return wx.showToast({ title: '请上传图片', icon: 'none' });
    }

    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    // 获取用户详细信息后提交
    this.getUserDetail(userInfo.id, token).then(userDetail => {
      // 解析用户地址信息
      let campus = "佛山大学";
      let address = "";

      if (userDetail.address) {
        const addressParts = userDetail.address.split('-');
        if (addressParts.length >= 3) {
          campus = addressParts[0];  // 校区
          address = `${addressParts[1]}-${addressParts[2]}`;  // 宿舍楼栋-宿舍号
        } else if (addressParts.length === 2) {
          campus = addressParts[0];
          address = addressParts[1];
        } else {
          address = userDetail.address;
        }
      }

      // 构建求购商品更新数据，确保包含所有必需字段
      const updatedGoods = {
        productId: this.data.editingGoodsId,
        sellerId: this.data.originalProductData.sellerId || userInfo.id, // 保留原始sellerId
        title: this.data.description,
        description: this.data.description,
        image: this.data.images,
        price: 0, // 求购商品价格通常为0
        quantity: this.data.quantity, // 添加商品数量
        transactionMethod: this.data.shippingMethod === 'buyer' ? 'Pickup' : 'Delivery',
        categoryId: 7, // 求购商品可以使用默认分类
        condition: 'NEW', // 求购商品成色
        productType: 'WANT',
        status: this.data.originalProductData.status || 'ON_SALE', // 保留原始状态
        campus: campus,
        address: address,
        postTime: this.data.originalProductData.postTime || new Date().toISOString(), // 保留原始发布时间
        updateTime: new Date().toISOString(), // 更新时间
        viewCount: this.data.originalProductData.viewCount || 0, // 保留原始浏览数
        favoriteCount: this.data.originalProductData.favoriteCount || 0, // 保留原始收藏数
        wantToBuy: this.data.originalProductData.wantToBuy || 0 // 保留原始想要数
      };

      // 调用统一的更新接口
      this.updateProduct(updatedGoods);
    }).catch(err => {
      console.error('获取用户信息失败:', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    });
  },

  // 提交出售商品修改
  submitSellGoodsEdit() {
    // 表单验证（出售商品逻辑）
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

    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    // 获取用户详细信息后提交
    this.getUserDetail(userInfo.id, token).then(userDetail => {
      // 解析用户地址信息
      let campus = "佛山大学";
      let address = "";

      if (userDetail.address) {
        const addressParts = userDetail.address.split('-');
        if (addressParts.length >= 3) {
          campus = addressParts[0];  // 校区
          address = `${addressParts[1]}-${addressParts[2]}`;  // 宿舍楼栋-宿舍号
        } else if (addressParts.length === 2) {
          campus = addressParts[0];
          address = addressParts[1];
        } else {
          address = userDetail.address;
        }
      }

      // 构建出售商品更新数据，确保包含所有必需字段
      const updatedGoods = {
        productId: this.data.editingGoodsId,
        sellerId: this.data.originalProductData.sellerId || userInfo.id, // 保留原始sellerId
        title: this.data.description,
        description: this.data.description,
        image: this.data.images,
        price: parseFloat(this.data.price),
        quantity: this.data.quantity, // 添加商品数量
        transactionMethod: this.data.shippingMethod === 'buyer' ? 'Pickup' : 'Delivery',
        categoryId: this.data.category.id,
        condition: this.data.condition.value,
        productType: 'SELL',
        status: this.data.originalProductData.status || 'ON_SALE', // 保留原始状态
        campus: campus,
        address: address,
        postTime: this.data.originalProductData.postTime || new Date().toISOString(), // 保留原始发布时间
        updateTime: new Date().toISOString(), // 更新时间
        viewCount: this.data.originalProductData.viewCount || 0, // 保留原始浏览数
        favoriteCount: this.data.originalProductData.favoriteCount || 0, // 保留原始收藏数
        wantToBuy: this.data.originalProductData.wantToBuy || 0 // 保留原始想要数
      };

      // 调用统一的更新接口
      this.updateProduct(updatedGoods);
    }).catch(err => {
      console.error('获取用户信息失败:', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    });
  },

  // 统一商品更新方法
  updateProduct(productData) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    // 前端基础验证
    if (!productData.productId) {
      wx.showToast({ title: '商品ID缺失', icon: 'none' });
      return;
    }
    if (!productData.sellerId) {
      wx.showToast({ title: '卖家信息缺失', icon: 'none' });
      return;
    }
    if (!productData.title) {
      wx.showToast({ title: '商品标题不能为空', icon: 'none' });
      return;
    }
    if (!productData.transactionMethod) {
      wx.showToast({ title: '交易方式不能为空', icon: 'none' });
      return;
    }
    if (productData.price === undefined || productData.price === null) {
      wx.showToast({ title: '价格信息缺失', icon: 'none' });
      return;
    }
    if (!productData.image || productData.image.length === 0) {
      wx.showToast({ title: '商品图片不能为空', icon: 'none' });
      return;
    }
    if (!productData.categoryId) {
      wx.showToast({ title: '商品分类不能为空', icon: 'none' });
      return;
    }
    if (!productData.campus) {
      wx.showToast({ title: '校区信息不能为空', icon: 'none' });
      return;
    }
    if (!productData.postTime) {
      wx.showToast({ title: '发布时间信息缺失', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    // 调用后端更新接口
    wx.request({
      url: app.globalData.baseUrl + '/products/edit',
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: productData,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          wx.showToast({
            title: '修改成功',
            icon: 'success',
            duration: 2000,
            success: () => {
              setTimeout(() => {
                wx.navigateBack();
              }, 2000);
            }
          });
        } else {
          wx.showToast({
            title: res.data.message || '修改失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('更新商品失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  }
});
