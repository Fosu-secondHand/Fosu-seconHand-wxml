// pages/GoodDetail/GoodDetail.js
const { mockGoodsData } = require("../../mock/goods.js"); // 引入mock数据

Page({
  data: {
    goodsDetail: null,    // 商品详情数据
    isStarred: false,     // 是否收藏
    starCount: 0,         // 收藏数
    wantCount: 0,         // 想要数
    viewCount: 0,          // 浏览量
    goodsDetail: null,         // 当前商品详情
    recommendGoods: [],        // 推荐商品列表
    recommendCurrentPage: 1,   // 推荐商品页码
    recommendPageSize: 6,      // 推荐每页数量
    recommendLoading: false,   // 推荐加载状态
    recommendNoMore: false     // 推荐无更多数据
  },

  onLoad(options) {
    const goodsId = Number(options.id);
    const goodsDetail = mockGoodsData.find(item => item.id === goodsId);
    // 补充tradeLocation和tradeMethod字段，防止mock数据遗漏
    if (goodsDetail) {
      goodsDetail.tradeLocation = goodsDetail.tradeLocation || goodsDetail.location || '面议';
      goodsDetail.tradeMethod = goodsDetail.tradeMethod || '自取';
      // 补充额外数据（模拟）
      goodsDetail.condition = goodsDetail.condition || "95新"; // 成色
      goodsDetail.soldCount = goodsDetail.soldCount || Math.floor(Math.random() * 50); // 已售数量
      this.loadRecommendGoods(goodsDetail.category); // 根据当前商品分类加载推荐
      
      // 设置页面数据
      this.setData({
        goodsDetail,
        starCount: Math.floor(Math.random() * 100), // 随机生成收藏数
        wantCount: Math.floor(Math.random() * 200), // 随机生成想要数
        viewCount: 1000 + Math.floor(Math.random() * 5000) // 随机生成浏览量
      });
    } else {
      wx.showToast({ title: '商品不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  // 加载推荐商品（根据分类推荐）
  loadRecommendGoods(category, reset = false) {
    if (reset) {
      this.setData({
        recommendCurrentPage: 1,
        recommendGoods: []
      });
    }

    this.setData({ recommendLoading: true });
    
    // 过滤当前商品，避免推荐自身
    const currentGoodsId = this.data.goodsDetail?.id || 0;
    const filteredData = mockGoodsData.filter(
      item => item.category === category && item.id !== currentGoodsId
    );

    const start = (this.data.recommendCurrentPage - 1) * this.data.recommendPageSize;
    const end = start + this.data.recommendPageSize;
    const newData = filteredData.slice(start, end);

    this.setData({
      recommendGoods: this.data.recommendGoods.concat(newData),
      recommendCurrentPage: this.data.recommendCurrentPage + 1,
      recommendNoMore: end >= filteredData.length,
      recommendLoading: false
    });
  },

  // 推荐商品上拉加载更多
  onRecommendLoadMore() {
    if (!this.data.recommendLoading && !this.data.recommendNoMore) {
      this.loadRecommendGoods(this.data.goodsDetail.category);
    }
  },

  // 聊一聊按钮点击事件
  handleChat() {
    wx.switchTab({
      url: '/pages/message/message'
    });
  },

  // 立即购买按钮点击事件
  handleBuy() {
    wx.showModal({
      title: '支付提示',
      content: '支付页面开发中，敬请期待~',
      showCancel: false
    });
  },

  // 收藏按钮点击事件
  handleStar() {
    this.setData({
      isStarred: !this.data.isStarred
    });
    wx.showToast({
      title: this.data.isStarred ? '已收藏' : '已取消收藏',
      icon: 'success'
    });
  },

  // 分享按钮点击事件
  onShareAppMessage() {
    return {
      title: this.data.goodsDetail.title,
      path: `/pages/goodsDetail/goodsDetail?id=${this.data.goodsDetail.id}`
    };
  },

  // 我想要按钮点击事件
  handleWant() {
    wx.showToast({ title: '已通知卖家', icon: 'success' });
  }
});