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
            }
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
  increaseQuantity() {
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

// 确认购买
  confirmPurchase() {
    // 检查是否有地址
    if (!this.data.address) {
      wx.showToast({ title: '请先添加收货地址', icon: 'none' });
      return;
    }

    // 防止重复提交
    if (this.data.loading) return;

    this.setData({ loading: true });

    // 调用后端接口创建订单
    this.createOrder();
  },

// 修改 createOrder 方法
  createOrder() {
    const app = getApp();
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) {
      wx.showToast({ title: '用户未登录', icon: 'none' });
      this.setData({ loading: false });
      return;
    }

    // 调试：打印创建订单前的相关数据
    console.log('准备创建订单的数据:');
    console.log('goodsId:', this.data.goodsId);
    console.log('userInfo.id:', userInfo.id);
    console.log('goodsInfo:', this.data.goodsInfo);
    console.log('goodsInfo.sellerId:', this.data.goodsInfo.sellerId);

    // 修改 createOrder 方法中的 orderData 构建部分
    const orderData = {
      productId: this.data.goodsId,
      buyerId: userInfo.id,
      // 需要从商品详情中获取 sellerId
      sellerId: this.data.goodsInfo.sellerId, // 添加 sellerId 字段
      deliveryMethod: this.data.goodsInfo.transactionMethod === 'Delivery' ? 'express' : 'meet',
      buyerRemark: '请尽快发货'
    };

    // 调试：打印最终发送的 orderData
    console.log('发送的订单数据 orderData:', orderData);

    // 调用创建订单接口
    wx.request({
      url: `${app.globalData.baseUrl}/orders/create`,
      method: 'POST',
      header: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: orderData, // 直接传递对象，微信小程序会自动处理为表单格式
      success: (res) => {
        console.log('创建订单接口响应:', res);
        if (res.data.code === 200) {
          // 订单创建成功，更新本地数据
          this.handleOrderSuccess(res.data.data);
        } else {
          console.error('创建订单失败:', res.data);
          wx.showToast({ title: res.data.message || '创建订单失败', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('请求创建订单失败:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },

// 处理订单创建成功后的逻辑
  handleOrderSuccess(orderInfo) {
    try {
      // 创建本地订单数据
      const localOrderData = {
        id: orderInfo.id || Date.now(),
        goods: {
          id: this.data.goodsId,
          title: this.data.goodsInfo.title,
          price: this.data.goodsInfo.price,
          imageUrl: this.data.goodsInfo.image
        },
        quantity: this.data.quantity,
        totalPrice: this.calculateTotalPrice(),
        address: this.data.address,
        paymentMethod: this.data.paymentMethod,
        tradeTime: new Date().toISOString(),
        sellerName: '卖家'
      };

      // 保存到已买到的订单列表
      const myBoughtOrdersList = wx.getStorageSync('myBoughtOrdersList') || [];
      myBoughtOrdersList.push(localOrderData);
      wx.setStorageSync('myBoughtOrdersList', myBoughtOrdersList);

      // 保存到卖家已卖出的订单列表
      const mySoldOrdersList = wx.getStorageSync('mySoldOrdersList') || [];
      mySoldOrdersList.push({
        ...localOrderData,
        buyerName: this.data.address.contactName
      });
      wx.setStorageSync('mySoldOrdersList', mySoldOrdersList);

      wx.showToast({
        title: '支付成功',
        icon: 'success',
        duration: 2000
      });

      // 修改这里的跳转路径到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 2000);

    } catch (error) {
      console.error('处理订单成功逻辑失败:', error);
      wx.showToast({ title: '处理订单信息失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }



});
