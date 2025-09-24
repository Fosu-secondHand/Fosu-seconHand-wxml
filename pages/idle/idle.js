// pages/idle/idle.js
Page({
    data: {
      description: '',      // 商品描述
      images: [],           // 已选图片
      price: '',            // 价格
      shippingMethod: 'Pickup', // 交易方式：Pickup(自取)/Delivery(送货)
      loading: false,       // 加载状态
      isEditMode: false,    // 是否为编辑模式
      editingGoodsId: null,  // 正在编辑的商品ID
      showPriceModal: false,
      modalPrice: '',
      showKeyboard: false,
      keyboardTarget: '', // 'price' or 'origin'
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
      // 添加新分类相关字段
      showAddCategory: false,
      newCategoryName: ''
    },

    // 可以先获取有效的分类列表
    onLoad(options) {
        // 获取全局app实例
        const app = getApp();
        this.baseURL = app.globalData.baseUrl;

        // 获取分类列表
        this.fetchCategories();

        // 检查是否为编辑模式
        if (options.mode === 'edit') {
            const editingGoods = wx.getStorageSync('editingGoods');
            if (editingGoods) {
                this.setData({
                    description: editingGoods.description,
                    images: editingGoods.images,
                    price: editingGoods.price,
                    shippingMethod: editingGoods.shippingMethod === 'buyer' ? 'Pickup' : 'Delivery',
                    isEditMode: true,
                    editingGoodsId: editingGoods.id
                });
                // 清除编辑状态
                wx.removeStorageSync('editingGoods');
            }
        }
    },

    fetchCategories() {
        wx.request({
            url: this.baseURL + '/products/categories', // 假设这个接口获取分类列表
            method: 'GET',
            success: (res) => {
                if (res.statusCode === 200 && res.data) {
                    this.setData({
                        categoryOptions: res.data
                    });
                }
            },
            fail: (err) => {
                console.error('获取分类列表失败:', err);
                // 使用默认分类
            }
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
  
    // 价格输入
    onPriceInput(e) {
      let value = e.detail.value.replace(/[^\d.]/g, ''); // 只保留数字和小数点
      // 只允许一个小数点，且最多两位小数
      value = value.replace(/^(\d+)(\.\d{0,2})?.*$/, (match, int, dec) => int + (dec || ''));
      this.setData({ price: value });
    },
  
    // 切换交易方式
    onShippingChange(e) {
      // 根据前端显示转换为后端需要的值
      const method = e.detail.value === 'buyer' ? 'Pickup' : 'Delivery';
      this.setData({ shippingMethod: method });
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

    // ... existing code ...
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

        // 获取当前用户ID（这里应该是从全局数据或登录信息中获取）
        const app = getApp();
        const userInfo = app.globalData.userInfo;
        if (!userInfo || !userInfo.id) {
            this.setData({ loading: false });
            return wx.showToast({ title: '请先登录', icon: 'none' });
        }

        const sellerId = userInfo.id; // 从实际用户信息中获取

        // 构建新商品数据（符合后端要求的格式）
        const newGoods = {
            sellerId: sellerId,
            title: this.data.description,
            description: this.data.description,
            transactionMethod: this.data.shippingMethod, // Pickup or Delivery
            categoryId: this.data.category.id,
            price: parseFloat(this.data.price),
            condition: this.data.condition.value, // NEW, GOOD, FAIR
            image: this.data.images, // 注意：这里需要真实的图片URL，而不是本地路径
            status: "ON_SALE",
            postTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            viewCount: 0,
            campus: "佛山大学", // 需要根据实际情况设置
            favoriteCount: 0,
            wantToBuy: 0
        };

        // 如果是编辑模式，添加商品ID
        if (this.data.isEditMode && this.data.editingGoodsId) {
            newGoods.id = this.data.editingGoodsId;
        }

        // 打印请求数据以便调试
        console.log('发送商品发布请求:', newGoods);

        // 首先上传图片
        this.uploadImages().then(imageUrls => {
            // 替换图片路径为上传后的URL
            newGoods.image = imageUrls;

            // 调用商品发布接口
            wx.request({
                url: this.baseURL + '/products/publish',
                method: 'POST',
                header: {
                    'content-type': 'application/json'
                },
                data: newGoods,
                success: (res) => {
                    console.log('发布接口返回:', res);

                    // 检查响应状态码和业务状态码
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        // 检查业务是否成功
                        if (res.data && (res.data.code === 200 || res.data.code === 201 || !res.data.code)) {
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
                                        shippingMethod: 'Pickup',
                                        loading: false,
                                        isEditMode: false,
                                        editingGoodsId: null,
                                        category: null,
                                        condition: null
                                    });

                                    // 返回上一页
                                    setTimeout(() => {
                                        wx.navigateBack();
                                    }, 2000);
                                }
                            });
                        } else {
                            // 业务处理失败
                            this.setData({ loading: false });

                            let errorMsg = '发布失败';
                            if (res.data && res.data.message) {
                                errorMsg = res.data.message;
                                // 截取关键错误信息
                                if (errorMsg.length > 20) {
                                    errorMsg = errorMsg.substring(0, 20) + '...';
                                }
                            }

                            wx.showToast({
                                title: errorMsg,
                                icon: 'none',
                                duration: 3000
                            });
                            console.error('业务处理失败:', res);
                        }
                    } else {
                        // 服务器返回错误状态码
                        this.setData({ loading: false });

                        // 显示详细的错误信息
                        let errorMsg = `发布失败: ${res.statusCode}`;
                        if (res.data && res.data.message) {
                            errorMsg += ` - ${res.data.message}`;
                        }

                        wx.showToast({
                            title: errorMsg,
                            icon: 'none',
                            duration: 3000
                        });
                        console.error('服务器返回错误:', res);
                    }
                },
                fail: (err) => {
                    console.error('发布请求失败:', err);
                    this.setData({ loading: false });

                    // 如果是URL错误，给出更具体的提示
                    if (err.errno === 600009) {
                        wx.showToast({
                            title: '配置错误，请检查API地址',
                            icon: 'none'
                        });
                    } else {
                        wx.showToast({
                            title: '发布失败，请重试',
                            icon: 'none'
                        });
                    }
                }
            });
        }).catch(err => {
            console.error('图片上传失败:', err);
            this.setData({ loading: false });
            wx.showToast({
                title: '图片上传失败',
                icon: 'none'
            });
        });
    },

    // 上传图片方法
    uploadImages() {
        return new Promise((resolve, reject) => {
            if (this.data.images.length === 0) {
                resolve([]);
                return;
            }

            const uploadPromises = this.data.images.map((imagePath) => {
                return new Promise((resolve, reject) => {
                    wx.uploadFile({
                        url: this.baseURL + '/upload', // 假设这是图片上传接口
                        filePath: imagePath,
                        name: 'file',
                        success: (res) => {
                            if (res.statusCode === 200) {
                                const data = JSON.parse(res.data);
                                resolve(data.url || data.data); // 根据实际返回结构调整
                            } else {
                                reject(new Error('图片上传失败'));
                            }
                        },
                        fail: (err) => {
                            reject(err);
                        }
                    });
                });
            });

            Promise.all(uploadPromises)
                .then(resolve)
                .catch(reject);
        });
    },
// ... existing code ...


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
      const categoryId = e.currentTarget.dataset.id;
      const categoryIndex = e.currentTarget.dataset.index;
      
      // 根据ID找到对应的分类对象
      const selectedCategory = this.data.categoryOptions[categoryIndex];
      
      this.setData({ 
        category: selectedCategory,
        showAddCategory: false,
        newCategoryName: ''
      });
    },
  
    // 成色选择
    onConditionSelect(e) {
      const conditionIndex = e.currentTarget.dataset.index;
      const selectedCondition = this.data.conditionOptions[conditionIndex];
      
      this.setData({ condition: selectedCondition });
    },
    
    // 新分类名称输入
    onNewCategoryInput(e) {
      this.setData({ newCategoryName: e.detail.value });
    },
    
    // 确认添加新分类
    confirmAddCategory() {
      if (!this.data.newCategoryName.trim()) {
        wx.showToast({ title: '请输入分类名称', icon: 'none' });
        return;
      }
      
      // 调用创建分类接口
      wx.request({
        url: this.baseURL + '/products/postCategories',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          name: this.data.newCategoryName // 根据后端接口要求调整字段名
        },
        success: (res) => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            wx.showToast({ title: '分类创建成功', icon: 'success' });
            
            // 更新分类选项（实际项目中你可能需要从服务器获取最新的分类列表）
            const newCategory = {
              id: Date.now(), // 临时ID，实际应该由后端返回
              name: this.data.newCategoryName
            };
            
            const updatedCategories = [...this.data.categoryOptions, newCategory];
            
            this.setData({
              category: newCategory,
              categoryOptions: updatedCategories,
              showAddCategory: false,
              newCategoryName: ''
            });
          } else {
            wx.showToast({ title: '分类创建失败', icon: 'none' });
            console.error('创建分类失败:', res);
          }
        },
        fail: (err) => {
          console.error('创建分类请求失败:', err);
          wx.showToast({ title: '网络错误，创建失败', icon: 'none' });
        }
      });
    },
    
    // 取消添加新分类
    cancelAddCategory() {
      this.setData({
        showAddCategory: false,
        newCategoryName: '',
        category: null
      });
    }
  });
  