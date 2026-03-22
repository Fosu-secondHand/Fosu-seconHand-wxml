Page({
  data: {
    // 商品信息
    goodsInfo: {
      title: '',
      price: 0,
      image: '',
      sellerInfo: ''
    },
    // 收货地址
    address: null,
    // 购买数量
    quantity: 1,
    // 商品库存
    productQuantity: 0,
    // 支付方式
    paymentMethod: 'wechatpay',
    // 加载状态
    loading: false,
    // 总价
    totalPrice: 0,
    // 商品ID
    goodsId: null
  },

  onLoad(options) {
    console.log('payment.js onLoad, options:', options);

    // 从选项中获取商品ID
    if (options.goodsId) {
      const goodsId = parseInt(options.goodsId);
      this.setData({ goodsId });
      this.loadGoodsInfo(goodsId);
    } else {
      console.log('未收到商品ID参数');
      wx.showToast({ title: '缺少商品信息', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }

    // 加载默认地址
    this.loadDefaultAddress();
  },

  // 从接口加载商品信息
  loadGoodsInfo(goodsId) {
    const app = getApp();
    const token = wx.getStorageSync('token');

    if (!app.globalData.baseUrl) {
      console.error('baseUrl未设置');
      wx.showToast({ title: '配置错误', icon: 'none' });
      return;
    }

    wx.request({
      url: `${app.globalData.baseUrl}/products/detail?productId=${goodsId}`,
      method: 'GET',
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const goodsDetail = res.data.data;

          // 调试：打印商品详情内容，检查是否包含 sellerId 字段
          console.log('商品详情数据:', goodsDetail);
          console.log('商品详情中的字段:', Object.keys(goodsDetail));
          console.log('sellerId 字段值:', goodsDetail.sellerId);
          console.log('seller_id 字段值:', goodsDetail.seller_id);

          // 处理图片URL
          let imageUrl = '/static/assets/default-image.png';
          if (goodsDetail.image) {
            if (Array.isArray(goodsDetail.image)) {
              imageUrl = goodsDetail.image[0];
            } else {
              imageUrl = goodsDetail.image;
            }
          } else if (goodsDetail.images && goodsDetail.images.length > 0) {
            imageUrl = goodsDetail.images[0];
          }

          // 如果是相对路径，拼接基础URL
          const baseURL = app.globalData.baseUrl;
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/static')) {
            imageUrl = baseURL + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
          }

          // 修改 loadGoodsInfo 方法中的 setData 部分
          this.setData({
            goodsInfo: {
              title: goodsDetail.title || '未知商品',
              price: goodsDetail.price || 0,
              image: imageUrl,
              sellerId: goodsDetail.sellerId || goodsDetail.seller_id // 尝试两种可能的字段名
            },
            // 设置商品库存
            productQuantity: goodsDetail.quantity || 0
          });

          // 调试：打印设置后的 goodsInfo 数据
          console.log('设置后的 goodsInfo:', this.data.goodsInfo);

          // 初始化总价
          this.setData({
            totalPrice: this.calculateTotalPrice()
          });
        } else {
          console.error('获取商品详情失败:', res.data);
          wx.showToast({ title: '获取商品信息失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('请求商品详情失败:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      }
    });
  },

  // 加载默认地址
  loadDefaultAddress() {
    const addressList = wx.getStorageSync('addressList') || [];
    // 查找默认地址或第一个地址
    const defaultAddress = addressList.find(item => item.isDefault) || addressList[0];

    if (defaultAddress) {
      this.setData({
        address: defaultAddress
      });
    } else {
      this.setData({ address: null });
    }
  },

  // 选择地址
  chooseAddress() {
    wx.navigateTo({
      url: '/pages/address/address?selectMode=true'
    });
  },

  // 增加数量
  // 增加数量
  increaseQuantity() {
    // 检查是否超过库存
    if (this.data.quantity >= this.data.productQuantity) {
      wx.showToast({
        title: `最多只能购买${this.data.productQuantity}件`,
        icon: 'none'
      });
      return;
    }

    const newQuantity = this.data.quantity + 1;
    this.setData({
      quantity: newQuantity,
      totalPrice: this.calculateTotalPrice()
    });
  },

  // 减少数量
  decreaseQuantity() {
    if (this.data.quantity > 1) {
      const newQuantity = this.data.quantity - 1;
      this.setData({
        quantity: newQuantity,
        totalPrice: this.calculateTotalPrice()
      });
    }
  },

  // 选择支付方式
  selectPaymentMethod(e) {
    this.setData({
      paymentMethod: e.currentTarget.dataset.method
    });
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  // 计算总价
  calculateTotalPrice() {
    const { price } = this.data.goodsInfo;
    const { quantity } = this.data;
    return parseFloat((parseFloat(price) * quantity).toFixed(2));
  },

  // 页面显示时更新数据
  onShow() {
    // 重新加载地址信息
    this.loadDefaultAddress();
    // 更新总价显示
    this.setData({
      totalPrice: this.calculateTotalPrice()
    });
  },

// 修改 confirmPurchase 方法
  confirmPurchase() {
    // 检查是否有地址
    if (!this.data.address) {
      wx.showToast({ title: '请先添加收货地址', icon: 'none' });
      return;
    }

    // 防止重复提交
    if (this.data.loading) return;

    this.setData({ loading: true });

    // 调用后端接口发起交易请求
    this.sendTradeRequest();
  },
// 新增 sendTradeRequest 方法，用于发送交易请求
  sendTradeRequest() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) {
      wx.showToast({ title: '用户未登录', icon: 'none' });
      this.setData({ loading: false });
      return;
    }

    // 构建交易请求数据
    const requestData = {
      productId: this.data.goodsId,
      buyerId: userInfo.id,
      deliveryMethod: this.data.goodsInfo.transactionMethod === 'Delivery' ? 'express' : 'meet',
      buyerRemark: '请尽快发货',
      quantity: this.data.quantity
    };

    // 调试：打印发送的交易请求数据
    console.log('发送的交易请求数据:', requestData);

    // 调用交易请求接口
    wx.request({
      url: `${app.globalData.baseUrl}/trade-requests/create`,
      method: 'POST',
      header: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: requestData,
      success: (res) => {
        console.log('发起交易请求接口响应:', res);
        if (res.data.code === 200) {
          // 交易请求发送成功
          this.handleTradeRequestSuccess();
        } else {
          console.error('发起交易请求失败:', res.data);
          wx.showToast({ title: res.data.message || '发起交易请求失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('请求发起交易失败:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },



  handleTradeRequestSuccess() {
    try {
      // 创建本地交易请求数据（用于在消息页面显示）
      const tradeRequestData = {
        id: Date.now(), // 临时ID
        goods: {
          id: this.data.goodsId,
          title: this.data.goodsInfo.title,
          price: this.data.goodsInfo.price,
          imageUrl: this.data.goodsInfo.image
        },
        quantity: this.data.quantity,
        totalPrice: this.calculateTotalPrice(),
        address: this.data.address,
        tradeTime: new Date().toISOString(),
        status: 'pending', // 待确认状态
        buyerRemark: '请尽快发货'
      };

      // 保存交易请求到本地存储（模拟消息系统）
      const pendingTradeRequests = wx.getStorageSync('pendingTradeRequests') || [];
      pendingTradeRequests.push(tradeRequestData);
      wx.setStorageSync('pendingTradeRequests', pendingTradeRequests);

      wx.showToast({
        title: '交易请求已发送',
        icon: 'success',
        duration: 2000
      });

      // 跳转到消息页面，让用户等待卖家回复
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/message/message'
        });
      }, 2000);

    } catch (error) {
      console.error('处理交易请求逻辑失败:', error);
      wx.showToast({ title: '处理交易信息失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }



});
