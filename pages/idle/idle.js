// pages/idle/idle.js
const authMixin = require('../../utils/authMixin.js');

Page({
    data: {
        description: '',      // 商品描述
        images: [],           // 已选图片
        price: '',            // 价格
        quantity: 1,          // 商品数量，默认为1
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
        newCategoryName: '',
        needContinuePublish: false,
        isLogin: false  // ✅ 新增：登录状态
    },

    // ✅ 引入混入方法
    ...authMixin.methods,


    onLoad(options) {
        // ✅ 新增：使用统一的登录检查方法
        if (!this.requireLogin('发布商品')) {
            return;
        }

        // 获取全局app实例
        const app = getApp();
        this.baseURL = app.globalData.baseUrl;

        // ✅ 同步用户登录状态（使用 mixin 提供的方法）
        this.syncLoginState();

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


    onShow() {
        // ✅ 修改：重新检查登录状态，使用弹窗提示
        if (!this.checkLogin()) {
            console.warn('⚠️ onShow: 用户未登录，显示弹窗提示');
            wx.showModal({
                title: '提示',
                content: '请先登录后再发布商品',
                confirmText: '去登录',
                cancelText: '取消',
                confirmColor: '#07c160',
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

        // 每次页面显示时检查用户地址信息
        const token = wx.getStorageSync('token');
        const userInfo = wx.getStorageSync('userInfo');

        if (token && userInfo && userInfo.id) {
            // ✅ 重新获取用户详细信息，更新地址状态
            this.getUserDetail(userInfo.id, token).then(userDetail => {
                console.log('onShow: 用户地址信息已更新', userDetail.address);

                // ✅ 检查用户是否有地址信息
                if (userDetail.address && userDetail.address.trim() !== '') {
                    // 如果有地址且之前因为没地址而中断了发布流程，现在可以继续
                    if (this.data.loading && this.data.needContinuePublish) {
                        console.log('onShow: 地址已填写，继续发布流程');
                        this.continuePublish(userInfo, token);
                        this.setData({
                            needContinuePublish: false
                        });
                    }
                } else {
                    console.log('onShow: 用户仍未填写地址');
                }
            }).catch(err => {
                console.error('onShow: 获取用户信息失败:', err);
            });
        }
    },



    // Deleted:// 同步登录状态方法
    // Deleted:syncLoginStatus() {
    // Deleted:try {
    // Deleted:// 检查本地存储的用户信息
    // Deleted:const token = wx.getStorageSync('token');
    // Deleted:const userInfo = wx.getStorageSync('userInfo');
    // Deleted:
    // Deleted:console.log('同步登录状态 - token:', token ? '存在' : '不存在');
    // Deleted:console.log('同步登录状态 - userInfo:', userInfo);
    // Deleted:
    // Deleted:if (token && userInfo && userInfo.isLogin) {
    // Deleted:// 确保用户信息结构正确
    // Deleted:const normalizedUserInfo = {
    // Deleted:id: userInfo.id || userInfo.userId,
    // Deleted:...userInfo
    // Deleted:};
    // Deleted:// 这里可以设置一些页面需要的用户数据
    // Deleted:console.log('同步登录状态成功:', normalizedUserInfo);
    // Deleted:} else if (token) {
    // Deleted:// 有token但没有userInfo，可能需要重新获取用户信息
    // Deleted:console.log('有token但缺少用户信息');
    // Deleted:} else {
    // Deleted:// 没有token，可能需要重新登录
    // Deleted:console.log('未检测到登录状态');
    // Deleted:}
    // Deleted:} catch (error) {
    // Deleted:console.error('同步登录状态失败:', error);
    // Deleted:}
    // Deleted:},


    fetchCategories() {
        // ✅ 新增：使用统一的登录检查
        if (!this.checkLogin()) {
            console.warn('⚠️ fetchCategories: 用户未登录');
            return;
        }

        // 检查 baseUrl 是否有效
        if (!this.baseURL) {
            console.error('API 地址未配置');
            return;
        }

        // ✅ 获取 token
        const token = wx.getStorageSync('token');

        wx.request({
            url: this.baseURL + '/products/categories',
            method: 'GET',
            header: {
                // ✅ 添加认证头（如果需要登录）
                'Authorization': token ? `Bearer ${token}` : ''
            },
            success: (res) => {
                console.log('=== 获取分类列表原始响应 ===');
                console.log('完整响应:', res);
                console.log('res.data:', res.data);

                if (res.statusCode === 200 && res.data) {
                    // ✅ 详细打印每个分类对象的所有字段
                    console.log('\n=== 分类列表详细信息 ===');
                    res.data.forEach((category, index) => {
                        console.log(`\n分类${index + 1}:`);
                        console.log('  完整对象:', category);
                        console.log('  所有键名:', Object.keys(category));

                        // 检查可能的 ID 字段
                        const possibleIdFields = ['id', 'category_id', 'categoryId', 'category_Id'];
                        possibleIdFields.forEach(field => {
                            if (category[field] !== undefined) {
                                console.log(`  ✅ 找到字段 "${field}":`, category[field]);
                            }
                        });
                    });

                    // ✅ 标准化分类数据结构，统一使用 id 字段
                    const normalizedCategories = res.data.map(category => {
                        // 尝试不同的 ID 字段名，优先级：category_Id > categoryId > category_id > id
                        let id = category.category_Id || category.categoryId || category.category_id || category.id;
                        // 尝试不同的 name 字段名
                        let name = category.name || category.category_name || category.categoryName;

                        return {
                            id: id,  // 统一使用 id 字段
                            name: name,
                            originalData: category // 保留原始数据以便调试
                        };
                    });

                    console.log('\n=== 标准化后的分类列表 ===');
                    console.log(normalizedCategories);

                    this.setData({
                        categoryOptions: normalizedCategories
                    });

                    console.log('\n✅ 分类列表已设置到页面 data 中');
                } else if (res.statusCode === 401) {
                    console.error('未授权访问，请先登录');
                    wx.showModal({
                        title: '提示',
                        content: '请先登录',
                        confirmText: '去登录',
                        success: (confirmRes) => {
                            if (confirmRes.confirm) {
                                wx.navigateTo({
                                    url: '/pages/login/login'
                                });
                            }
                        }
                    });
                } else {
                    console.error('获取分类列表失败，状态码:', res.statusCode);
                    console.error('响应数据:', res.data);
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

    // 选择图片（增加拍照选项）
    chooseImage() {
        // ✅ 新增：使用统一的登录检查
        if (!this.requireLogin('上传图片')) {
            return;
        }

        const maxCount = 9 - this.data.images.length;
        if (maxCount <= 0) {
            wx.showToast({ title: '最多上传 9 张图片', icon: 'none' });
            return;
        }

        // ✅ 显示选择菜单：让用户选择相册或拍照
        wx.showActionSheet({
            itemList: ['从相册选择', '拍照'],
            itemColor: '#333',
            success: (res) => {
                if (!res.cancel) {
                    const sourceType = res.tapIndex === 0 ? ['album'] : ['camera'];

                    wx.chooseImage({
                        count: sourceType[0] === 'camera' ? 1 : maxCount, // 拍照只能拍 1 张
                        sizeType: ['compressed'],
                        sourceType: sourceType,
                        success: (chooseRes) => {
                            this.setData({
                                images: [...this.data.images, ...chooseRes.tempFilePaths]
                            });
                        },
                        fail: (err) => {
                            // 只在非取消操作时才显示错误提示
                            if (err.errMsg && !err.errMsg.includes('fail cancel')) {
                                console.error('选择图片失败:', err);
                                wx.showToast({
                                    title: sourceType[0] === 'camera' ? '拍照失败' : '选择图片失败',
                                    icon: 'none'
                                });
                            }
                        }
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
    submitPublish() {
        // ✅ 新增：使用统一的登录检查
        if (!this.requireLogin('发布商品')) {
            return;
        }

        // ✅ 新增：获取用户信息并验证
        const token = wx.getStorageSync('token');
        const userInfo = wx.getStorageSync('userInfo');

        console.log('=== submitPublish: 检查用户信息 ===');
        console.log('userInfo:', userInfo);
        console.log('userInfo.id:', userInfo?.id);
        console.log('userInfo.id 类型:', typeof userInfo?.id);

        // ✅ 关键修复：验证 userInfo.id 是否有效
        if (!userInfo || !userInfo.id || userInfo.id === 'undefined' || userInfo.id === undefined || userInfo.id === null) {
            console.error('❌ 用户 ID 无效:', userInfo?.id);
            wx.showModal({
                title: '登录状态异常',
                content: '您的登录信息已过期，请重新登录',
                confirmText: '去登录',
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

        // ✅ 确保 userId 是数字类型
        const userId = parseInt(userInfo.id);
        if (isNaN(userId) || userId <= 0) {
            console.error('❌ 用户 ID 格式错误:', userInfo.id);
            wx.showToast({
                title: '用户信息异常',
                icon: 'none'
            });
            return;
        }

        console.log('✅ 用户 ID 验证通过:', userId);

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

        // ✅ 新增：验证分类 ID 是否有效
        if (!this.data.category.id || typeof this.data.category.id !== 'number') {
            console.error('无效的分类 ID:', this.data.category);
            return wx.showToast({
                title: '分类信息无效，请重新选择',
                icon: 'none'
            });
        }

        // ✅ 打印当前选择的分类信息
        console.log('=== 提交前验证分类信息 ===');
        console.log('选中的分类:', this.data.category);
        console.log('分类 ID:', this.data.category.id);
        console.log('分类名称:', this.data.category.name);

        // ✅ 验证分类是否存在于列表中
        const categoryExists = this.data.categoryOptions.some(cat => cat.id === this.data.category.id);
        console.log('分类是否在选项中存在:', categoryExists);

        if (!categoryExists) {
            console.warn('⚠️ 分类不在有效列表中，请重新选择');
            return wx.showToast({
                title: '分类无效，请重新选择',
                icon: 'none'
            });
        }

        // ✅ 删除旧的登录检查逻辑，改用 mixin 提供的 checkLogin()
        // Deleted:const token = wx.getStorageSync('token');
        // Deleted:const userInfo = wx.getStorageSync('userInfo');

        // 检查用户地址信息
        this.checkUserAddress(userInfo, token);
    },



    checkUserAddress(userInfo, token) {
        this.setData({ loading: true });

        console.log('=== 开始检查用户地址 ===');
        console.log('用户 ID:', userInfo.id);
        console.log('Token:', token ? '存在' : '不存在');

        // ✅ 新增：再次验证 userInfo.id 是否有效
        if (!userInfo.id || userInfo.id === 'undefined' || userInfo.id === undefined) {
            console.error('❌ checkUserAddress: 用户 ID 无效');
            this.setData({ loading: false });
            wx.showModal({
                title: '登录状态异常',
                content: '您的登录信息已损坏，请重新登录',
                confirmText: '去登录',
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

        // ✅ 确保 userId 是数字类型
        const userId = parseInt(userInfo.id);
        if (isNaN(userId)) {
            console.error('❌ checkUserAddress: 用户 ID 格式错误:', userInfo.id);
            this.setData({ loading: false });
            wx.showToast({
                title: '用户信息异常',
                icon: 'none'
            });
            return;
        }

        // 获取用户详细信息
        this.getUserDetail(userId, token).then(userDetail => {
            console.log('=== 获取到用户详情 ===');
            console.log('完整用户数据:', userDetail);
            console.log('address 字段值:', userDetail.address);
            console.log('address 类型:', typeof userDetail.address);
            console.log('address 是否为空字符串:', userDetail.address === '');
            console.log('address trim 后:', userDetail.address ? userDetail.address.trim() : 'null');

            // 检查用户是否有地址信息
            if (!userDetail.address || userDetail.address.trim() === '') {
                console.log('❌ 结论：用户没有地址，需要提示填写');

                this.setData({
                    loading: false,
                    needContinuePublish: true  // 添加标记，表示需要继续发布
                });
                // 如果没有地址信息，提示用户先填写地址
                wx.showModal({
                    title: '提示',
                    content: '请先完善您的收货地址信息',
                    confirmText: '去填写',
                    cancelText: '取消',
                    success: (res) => {
                        if (res.confirm) {
                            console.log('用户点击去填写，跳转到地址页');
                            wx.navigateTo({
                                url: '/pages/address/address'
                            });
                        } else {
                            // 用户取消时也需要重置状态
                            console.log('用户取消填写地址');
                            this.setData({
                                needContinuePublish: false
                            });
                        }
                    }
                });
                return;
            }

            console.log('✅ 结论：用户有地址，继续发布流程');
            // 如果有地址信息，继续执行发布操作
            this.continuePublish(userInfo, token);
        }).catch(err => {
            console.error('❌ 获取用户信息失败:', err);
            this.setData({
                loading: false,
                needContinuePublish: false
            });
            wx.showToast({
                title: '获取用户信息失败',
                icon: 'none'
            });
        });
    },




    // 继续执行发布流程
    continuePublish(userInfo, token) {
        // ✅ 新增：验证 userInfo.id
        if (!userInfo.id || userInfo.id === 'undefined') {
            console.error('❌ continuePublish: 用户 ID 无效');
            this.setData({ loading: false });
            wx.showModal({
                title: '登录状态异常',
                content: '您的登录信息已损坏，请重新登录',
                confirmText: '去登录',
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

        const sellerId = parseInt(userInfo.id);

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
                    quantity: this.data.quantity, // 添加商品数量
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
                    quantity: newGoods.quantity, // 添加quantity到检查中
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
                                            quantity: 1, // 重置商品数量为默认值
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
            // ✅ 新增：验证 userId 是否有效
            if (!userId || userId === 'undefined' || userId === undefined || isNaN(parseInt(userId))) {
                console.error('❌ getUserDetail: userId 无效:', userId);
                reject(new Error('用户 ID 无效'));
                return;
            }

            const numericUserId = parseInt(userId);

            wx.request({
                url: `${this.baseURL}/users/${numericUserId}`,
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

            // 检查 baseUrl 是否有效
            if (!this.baseURL) {
                reject(new Error('API 地址未配置'));
                return;
            }

            // 获取认证 token
            const token = wx.getStorageSync('token');
            console.log('获取到的 token:', token);
            if (!token) {
                reject(new Error('用户未登录，请先登录'));
                return;
            }

            const uploadPromises = this.data.images.map((imagePath, index) => {
                return new Promise((resolve, reject) => {
                    wx.uploadFile({
                        url: this.baseURL + '/products/upload/image',
                        filePath: imagePath,
                        name: 'file',
                        header: {
                            'Authorization': `Bearer ${token}`
                        },
                        success: (res) => {
                            console.log(`第${index+1}张图片上传响应:`, res);
                            console.log(`第${index+1}张图片上传响应 data 字段:`, res.data);

                            if (res.statusCode === 200) {
                                try {
                                    const data = JSON.parse(res.data);
                                    console.log(`第${index+1}张图片上传解析后的数据:`, data);

                                    // 根据接口返回获取图片 URL
                                    let imageUrl = data.data || data.url || data.imageUrl || null;

                                    if (imageUrl) {
                                        console.log(`第${index+1}张图片原始 URL:`, imageUrl);

                                        // ✅ 判断是否为完整 URL
                                        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                                            // 已经是完整 URL，强制转换为 HTTP（开发环境）
                                            if (imageUrl.startsWith('https://')) {
                                                imageUrl = imageUrl.replace('https://', 'http://');
                                                console.log(`⚠️ 将 HTTPS 转换为 HTTP:`, imageUrl);
                                            }
                                            console.log(`第${index+1}张图片使用完整 URL`);
                                            resolve(imageUrl);
                                        } else if (imageUrl.startsWith('/')) {
                                            // 相对路径，需要拼接域名
                                            // 从 baseURL 提取域名部分（去掉 /api）
                                            const domain = this.baseURL.replace('/api', '');

                                            // ✅ 确保使用 HTTP 协议
                                            const finalUrl = domain.startsWith('http://') ? domain + imageUrl : 'http://' + domain.replace(/^https?:\/\//, '') + imageUrl;

                                            console.log(`第${index+1}张图片拼接后的 URL:`, finalUrl);
                                            resolve(finalUrl);
                                        } else {
                                            // 不带斜杠的相对路径
                                            const domain = this.baseURL.replace('/api', '');

                                            // ✅ 确保使用 HTTP 协议
                                            const finalUrl = domain.startsWith('http://') ? domain + '/' + imageUrl : 'http://' + domain.replace(/^https?:\/\//, '') + '/' + imageUrl;

                                            console.log(`第${index+1}张图片拼接后的 URL:`, finalUrl);
                                            resolve(finalUrl);
                                        }
                                    } else {
                                        console.error(`第${index+1}张图片上传返回数据格式不正确:`, data);
                                        reject(new Error(`第${index+1}张图片上传返回数据格式不正确`));
                                    }
                                } catch (parseError) {
                                    console.error(`第${index+1}张图片上传数据解析失败:`, parseError);
                                    console.error(`原始响应数据:`, res.data);
                                    reject(new Error(`第${index+1}张图片上传数据解析失败：${parseError.message}`));
                                }
                            } else {
                                console.error(`第${index+1}张图片上传失败，状态码:`, res.statusCode);
                                reject(new Error(`第${index+1}张图片上传失败，状态码：${res.statusCode}`));
                            }
                        },
                        fail: (err) => {
                            console.error(`第${index+1}张图片上传失败:`, err);
                            reject(new Error(`第${index+1}张图片上传失败：${err.errMsg || '网络错误'}`));
                        }
                    });
                });
            });


            Promise.all(uploadPromises)
                .then(urls => {
                    console.log('所有图片上传成功，URL 列表:', urls);
                    resolve(urls);
                })
                .catch(err => {
                    console.error('图片上传失败:', err);
                    reject(err);
                });
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

        // 根据 ID 找到对应的分类对象
        const selectedCategory = this.data.categoryOptions[categoryIndex];

        // ✅ 打印选择的分类信息（包含所有可能用于发送的字段）
        console.log('\n=== 用户选择分类 ===');
        console.log('选中的分类:', selectedCategory);
        console.log('分类 ID:', selectedCategory.id);
        console.log('分类名称:', selectedCategory.name);
        console.log('原始数据:', selectedCategory.originalData);

        // ✅ 提示用户将要在请求中使用的值
        console.log('\n📤 提交时将使用 categoryId:', selectedCategory.id);

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
    }
});
