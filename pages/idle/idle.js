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

        // 同步用户登录状态
        this.syncLoginStatus();

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

// 同步登录状态方法
    syncLoginStatus() {
        try {
            // 检查本地存储的用户信息
            const token = wx.getStorageSync('token');
            const userInfo = wx.getStorageSync('userInfo');

            console.log('同步登录状态 - token:', token ? '存在' : '不存在');
            console.log('同步登录状态 - userInfo:', userInfo);

            if (token && userInfo && userInfo.isLogin) {
                // 确保用户信息结构正确
                const normalizedUserInfo = {
                    id: userInfo.id || userInfo.userId,
                    ...userInfo
                };
                // 这里可以设置一些页面需要的用户数据
                console.log('同步登录状态成功:', normalizedUserInfo);
            } else if (token) {
                // 有token但没有userInfo，可能需要重新获取用户信息
                console.log('有token但缺少用户信息');
            } else {
                // 没有token，可能需要重新登录
                console.log('未检测到登录状态');
            }
        } catch (error) {
            console.error('同步登录状态失败:', error);
        }
    },


    fetchCategories() {
        // 检查baseUrl是否有效
        if (!this.baseURL) {
            console.error('API地址未配置');
            return;
        }

        wx.request({
            url: this.baseURL + '/products/categories', // 假设这个接口获取分类列表
            method: 'GET',
            success: (res) => {
                if (res.statusCode === 200 && res.data) {
                    this.setData({
                        categoryOptions: res.data
                    });
                } else {
                    console.error('获取分类列表失败，状态码:', res.statusCode);
                }
            },
            fail: (err) => {
                console.error('获取分类列表失败:', err);
                wx.showToast({
                    title: '获取分类失败',
                    icon: 'none'
                });
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
            },
            fail: (err) => {
                console.error('选择图片失败:', err);
                if (err.errMsg && !err.errMsg.includes('fail cancel')) {
                    wx.showToast({
                        title: '选择图片失败',
                        icon: 'none'
                    });
                }
            }
        });
    },

    // 删除图片
    deleteImage(e) {
        const index = e.currentTarget.dataset.index;
        // 边界检查
        if (index < 0 || index >= this.data.images.length) {
            console.warn('无效的图片索引:', index);
            return;
        }
        const images = [...this.data.images];
        images.splice(index, 1);
        this.setData({ images });
    },

    // 价格输入
    onPriceInput(e) {
        let value = e.detail.value.replace(/[^\d.]/g, ''); // 只保留数字和小数点
        // 只允许一个小数点，且最多两位小数
        value = value.replace(/^(\d+)(\.\d{0,2})?.*$/, (match, int, dec) => int + (dec || ''));
        // 防止负数和过大数值
        const numValue = parseFloat(value);
        if (numValue > 999999) {
            value = '999999';
        }
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

    // 跳转拍卖
    goAuction() {
        wx.navigateTo({ url: '/pages/auctionPrice/auctionPrice' }); // 如无此页面可后续补充
    },

    // 修改 submitPublish 方法
    submitPublish() {
        // 表单验证
        if (!this.data.description.trim()) {
            return wx.showToast({ title: '请填写商品描述', icon: 'none' });
        }
        if (this.data.images.length === 0) {
            return wx.showToast({ title: '请上传图片', icon: 'none' });
        }
        if (!this.data.price || parseFloat(this.data.price) <= 0) {
            return wx.showToast({ title: '请设置正确价格', icon: 'none' });
        }
        if (!this.data.category) {
            return wx.showToast({ title: '请选择分类', icon: 'none' });
        }
        if (!this.data.condition) {
            return wx.showToast({ title: '请选择成色', icon: 'none' });
        }

        // 添加额外的数据验证
        if (this.data.description.trim().length > 200) {
            return wx.showToast({ title: '商品描述过长', icon: 'none' });
        }

        if (parseFloat(this.data.price) > 999999) {
            return wx.showToast({ title: '价格超出限制', icon: 'none' });
        }

        // 检查用户登录状态
        const token = wx.getStorageSync('token');
        const userInfo = wx.getStorageSync('userInfo');

        // 如果未登录，显示登录提示弹窗
        if (!token || !userInfo || !userInfo.id) {
            wx.showModal({
                title: '提示',
                content: '请先登录后再发布商品',
                confirmText: '去登录',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        wx.navigateTo({
                            url: '/pages/login/login'
                        });
                    }
                }
            });
            return;
        }

        // 检查用户地址信息
        this.checkUserAddress(userInfo, token);
    },

// 新增检查用户地址信息的方法
    checkUserAddress(userInfo, token) {
        this.setData({ loading: true });

        // 获取用户详细信息
        this.getUserDetail(userInfo.id, token).then(userDetail => {
            // 检查用户是否有地址信息
            if (!userDetail.address || userDetail.address.trim() === '') {
                this.setData({ loading: false });
                // 如果没有地址信息，提示用户先填写地址
                wx.showModal({
                    title: '提示',
                    content: '请先完善您的收货地址信息',
                    confirmText: '去填写',
                    cancelText: '取消',
                    success: (res) => {
                        if (res.confirm) {
                            wx.navigateTo({
                                url: '/pages/address/address'
                            });
                        }
                    }
                });
                return;
            }

            // 如果有地址信息，继续执行发布操作
            this.continuePublish(userInfo, token);
        }).catch(err => {
            console.error('获取用户信息失败:', err);
            this.setData({ loading: false });
            wx.showToast({
                title: '获取用户信息失败',
                icon: 'none'
            });
        });
    },



    // 继续执行发布流程
    continuePublish(userInfo, token) {
        const sellerId = userInfo.id;

        // 首先获取用户详细信息
        this.getUserDetail(sellerId, token).then(userDetail => {
            // 首先上传图片
            this.uploadImages().then(imageUrls => {
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

                // 图片上传成功后，构建新商品数据（符合后端要求的格式）
                const newGoods = {
                    sellerId: sellerId,
                    title: this.data.description,
                    description: this.data.description,
                    transactionMethod: this.data.shippingMethod,
                    categoryId: this.data.category.id,
                    price: parseFloat(this.data.price),
                    condition: this.data.condition.value,
                    image: imageUrls, // 使用上传后的URL数组
                    status: "ON_SALE",
                    postTime: new Date().toISOString(),
                    updateTime: new Date().toISOString(),
                    viewCount: 0,
                    campus: campus, // 解析后的校区
                    address: address, // 解析后的宿舍信息
                    favoriteCount: 0,
                    wantToBuy: 0,
                    productType: "SELL" //标识为出售商品
                };

                // 如果是编辑模式，添加商品ID
                if (this.data.isEditMode && this.data.editingGoodsId) {
                    newGoods.id = this.data.editingGoodsId;
                }

                // 打印请求数据以便调试
                console.log('准备发送的商品数据:', JSON.stringify(newGoods, null, 2));

                // 检查关键字段
                console.log('关键字段检查:', {
                    sellerId: newGoods.sellerId,
                    title: newGoods.title,
                    categoryId: newGoods.categoryId,
                    price: newGoods.price,
                    condition: newGoods.condition,
                    image: newGoods.image,
                    productType: newGoods.productType
                });

                // 打印请求数据以便调试
                console.log('发送商品发布请求:', newGoods);

                // 检查baseUrl是否有效
                if (!this.baseURL) {
                    throw new Error('API地址未配置');
                }

                // 调用商品发布接口
                wx.request({
                    url: this.baseURL + '/products/publish',
                    method: 'POST',
                    header: {
                        'content-type': 'application/json',
                        'Authorization': `Bearer ${token}`
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
                                    // 对于服务器内部错误，给出通用提示
                                    if (errorMsg.includes('服务器内部错误')) {
                                        errorMsg = '发布失败，请稍后重试';
                                    } else if (errorMsg.length > 20) {
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
                    title: '图片上传失败: ' + (err.message || ''),
                    icon: 'none'
                });
            });
        }).catch(err => {
            console.error('获取用户信息失败:', err);
            this.setData({ loading: false });
            wx.showToast({
                title: '获取用户信息失败',
                icon: 'none'
            });
        });
    },

// 获取用户详细信息
    getUserDetail(userId, token) {
        return new Promise((resolve, reject) => {
            wx.request({
                url: `${this.baseURL}/users/${userId}`,
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

    // 上传图片方法
    uploadImages() {
        return new Promise((resolve, reject) => {
            if (this.data.images.length === 0) {
                resolve([]);
                return;
            }

            // 检查baseUrl是否有效
            if (!this.baseURL) {
                reject(new Error('API地址未配置'));
                return;
            }

            // 获取认证token
            const token = wx.getStorageSync('token');
            console.log('获取到的token:', token); // 调试信息
            if (!token) {
                reject(new Error('用户未登录，请先登录'));
                return;
            }

            const uploadPromises = this.data.images.map((imagePath, index) => {
                return new Promise((resolve, reject) => {
                    wx.uploadFile({
                        url: this.baseURL + '/products/upload/image', // 更新为新的图片上传接口
                        filePath: imagePath,
                        name: 'file', // 根据接口文档，参数名为file
                        header: {
                            'Authorization': `Bearer ${token}` // 添加认证头
                        },
                        success: (res) => {
                            console.log(`第${index+1}张图片上传响应:`, res); // 调试信息
                            if (res.statusCode === 200) {
                                try {
                                    const data = JSON.parse(res.data);
                                    // 根据新接口返回结构调整，获取图片URL
                                    // 假设图片URL在data字段中
                                    const imageUrl = data.data || data.url || null;
                                    if (imageUrl) {
                                        resolve(imageUrl);
                                    } else {
                                        reject(new Error(`第${index+1}张图片上传返回数据格式不正确`));
                                    }
                                } catch (parseError) {
                                    reject(new Error(`第${index+1}张图片上传数据解析失败`));
                                }
                            } else {
                                reject(new Error(`第${index+1}张图片上传失败，状态码: ${res.statusCode}`));
                            }
                        },
                        fail: (err) => {
                            console.error(`第${index+1}张图片上传失败:`, err);
                            reject(new Error(`第${index+1}张图片上传失败: ${err.errMsg || '网络错误'}`));
                        }
                    });
                });
            });

            Promise.all(uploadPromises)
                .then(resolve)
                .catch(reject);
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
            category: selectedCategory,
            showAddCategory: false,
            newCategoryName: ''
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

        // 检查baseUrl是否有效
        if (!this.baseURL) {
            wx.showToast({ title: 'API地址未配置', icon: 'none' });
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
                wx.showToast({
                    title: '网络错误，创建失败: ' + (err.errMsg || ''),
                    icon: 'none'
                });
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
