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
    paymentMethod: 'wechatpay', // 'wechatpay'
    // 加载状态
    loading: false,
    // 总价
    totalPrice: 0
  },

  onLoad(options) {
    console.log('payment.js onLoad, options:', options);
    
    // 从选项中获取商品ID或直接传递的商品信息
    if (options.goodsId) {
      this.loadGoodsInfo(options.goodsId);
    } else if (options.goodsInfo) {
      try {
        // 先解码再解析
        const decodedGoodsInfo = decodeURIComponent(options.goodsInfo);
        const goodsInfo = JSON.parse(decodedGoodsInfo);
        console.log('成功解析商品信息:', goodsInfo);
        this.setData({ goodsInfo });
      } catch (e) {
        console.error('解析商品信息失败:', e);
        wx.showToast({ title: '获取商品信息失败', icon: 'none' });
        // 失败时使用默认数据
        this.setDefaultGoodsInfo();
      }
    } else {
      console.log('未收到商品参数，使用默认数据');
      // 模拟数据，实际应用中应从服务器获取
      this.setDefaultGoodsInfo();
    }
    
    // 加载默认地址
    this.loadDefaultAddress();
    
    // 初始化总价
    this.setData({
      totalPrice: this.calculateTotalPrice()
    });
  },

  // 设置默认商品信息
  setDefaultGoodsInfo() {
    this.setData({
      goodsInfo: {
        title: 'Teenie weenie/小熊，清仓包邮，一件代发',
        price: 18.80,
        image: '/static/40a249b86c909991b0c2f843b22a5f6-imageonline.co-3730619.png'
      }
    });
  },

  // 加载商品信息
  loadGoodsInfo(goodsId) {
    console.log('尝试加载商品信息，ID:', goodsId);
    // 引入mock数据
    const { mockGoodsData } = require("../../mock/goods.js");
    
    try {
      // 从mock数据中查找商品
      const goods = mockGoodsData.find(item => item.id === parseInt(goodsId));
      
      if (goods) {
        console.log('找到商品:', goods);
        this.setData({
          goodsInfo: {
            title: goods.title || '未知商品',
            price: goods.price || 0,
            image: goods.image || (goods.images && goods.images[0]) || '/static/assets/default-image.png'
          }
        });
      } else {
        console.warn('商品不存在，使用默认数据');
        wx.showToast({ title: '商品信息获取失败，使用默认数据', icon: 'none' });
        this.setDefaultGoodsInfo();
      }
    } catch (error) {
      console.error('加载商品信息出错:', error);
      wx.showToast({ title: '加载商品信息失败', icon: 'none' });
      this.setDefaultGoodsInfo();
    }
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
      // 如果没有地址，不设置模拟地址，让页面显示'请选择收货地址'提示
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
    // 先计算新的数量
    const newQuantity = this.data.quantity + 1;
    // 更新数量
    this.setData({ quantity: newQuantity });
    // 基于新的数量计算并更新总价
    this.setData({ totalPrice: this.calculateTotalPrice() });
  },

  // 减少数量
  decreaseQuantity() {
    if (this.data.quantity > 1) {
      // 先计算新的数量
      const newQuantity = this.data.quantity - 1;
      // 更新数量
      this.setData({ quantity: newQuantity });
      // 基于新的数量计算并更新总价
      this.setData({ totalPrice: this.calculateTotalPrice() });
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
    // 返回数字类型，避免字符串与数字类型不匹配的问题
    return parseFloat((parseFloat(price) * quantity).toFixed(2));
  },
  
  // 页面显示时更新数据
  onShow() {
    // 重新加载地址信息，确保从地址选择页面返回后能显示最新选择的地址
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
    
    // 模拟支付请求
    setTimeout(() => {
      try {
        // 创建订单数据
        const orderData = {
          id: Date.now(),
          goods: {
            id: Date.now(),
            title: this.data.goodsInfo.title,
            price: this.data.goodsInfo.price,
            imageUrl: this.data.goodsInfo.image
          },
          quantity: this.data.quantity,
          totalPrice: this.calculateTotalPrice(),
          address: this.data.address,
          paymentMethod: this.data.paymentMethod,
          status: '待发货',
          tradeTime: new Date().toISOString(),
          sellerName: '卖家'
        };
        
        // 保存到已买到的订单列表
        const myBoughtOrdersList = wx.getStorageSync('myBoughtOrdersList') || [];
        myBoughtOrdersList.push(orderData);
        wx.setStorageSync('myBoughtOrdersList', myBoughtOrdersList);
        
        // 保存到卖家已卖出的订单列表
        const mySoldOrdersList = wx.getStorageSync('mySoldOrdersList') || [];
        mySoldOrdersList.push({
          ...orderData,
          buyerName: this.data.address.contactName
        });
        wx.setStorageSync('mySoldOrdersList', mySoldOrdersList);
        
        wx.hideLoading();
        wx.showToast({
          title: '支付成功',
          icon: 'success',
          duration: 2000
        });
        
        // 跳转到订单详情或成功页面
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/myBought/myBought'
          });
        }, 2000);
        
      } catch (error) {
        console.error('支付失败:', error);
        wx.showToast({ title: '支付失败，请重试', icon: 'none' });
      } finally {
        this.setData({ loading: false });
      }
    }, 2000);
  }
});