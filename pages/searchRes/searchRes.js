// pages/searchRes/searchRes.js
const { mockGoodsData } = require("../../mock/goods.js");

Page({
  data: {
    keyword: '',           // 当前搜索关键词
    goodsList: [],         // 原始搜索结果列表（未排序）
    sortedGoodsList: [],   // 排序后的商品列表（用于瀑布流展示）
    pageSize: 10,          // 每页数量
    currentPage: 1,        // 当前页码
    hasMore: true,         // 是否还有更多数据
    loading: false,        // 是否正在加载
    historyKeywords: [],   // 搜索历史
    showHistory: false,    // 是否显示搜索历史
    sortType: 'default',   // 当前排序类型：default/price/publishTime/views
    priceOrder: 'asc',     // 价格排序方向（asc/desc）
    timeOrder: 'asc',      // 发布时间排序方向（asc/desc）
    viewsOrder: 'desc',    // 浏览量排序方向（desc/asc，默认降序）
    netError: false,
  },

  onLoad(options) {
    const keyword = options.keyword || '';
    if (keyword) {
      this.setData({ keyword });
      this.searchGoods(keyword, true); // 初始加载默认排序
      this.addSearchHistory(keyword);
    }
    this.loadSearchResults();
  },

  // 执行搜索（含排序和分页）
  searchGoods(keyword, isReset = false) {
    if (isReset) {
      this.setData({
        currentPage: 1,
        goodsList: [],
        sortedGoodsList: [],
        hasMore: true,
      });
    }

    this.setData({ loading: true });

    setTimeout(() => {
      // 1. 过滤数据
      const filteredData = mockGoodsData.filter(item => 
        item.title.includes(keyword) || 
        (item.description && item.description.includes(keyword)) ||
        (item.tags && item.tags.some(tag => tag.includes(keyword)))
      );

      // 2. 应用排序
      const sortedData = this.sortGoods(filteredData);

      // 3. 分页处理
      const start = (this.data.currentPage - 1) * this.data.pageSize;
      const newResults = sortedData.slice(start, start + this.data.pageSize);
      const hasMore = sortedData.length > start + this.data.pageSize;

      this.setData({
        goodsList: isReset ? sortedData : this.data.goodsList.concat(newResults),
        sortedGoodsList: sortedData, // 保存完整排序数据用于后续加载
        currentPage: this.data.currentPage + 1,
        hasMore,
        loading: false,
      });
    }, 800);
  },

  // 排序处理函数
  handleSort(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ sortType: type }); // 更新当前排序类型

    // 切换对应排序方向
    switch (type) {
      case 'price':
        this.setData({ priceOrder: this.data.priceOrder === 'asc' ? 'desc' : 'asc' });
        break;
      case 'publishTime':
        this.setData({ timeOrder: this.data.timeOrder === 'asc' ? 'desc' : 'asc' });
        break;
      case 'views':
        this.setData({ viewsOrder: this.data.viewsOrder === 'desc' ? 'asc' : 'desc' });
        break;
    }

    // 重置页码并重新搜索（确保从第一页显示新排序结果）
    this.searchGoods(this.data.keyword, true);
    this.pageScrollToTop(); // 添加滚动逻辑
  },

  pageScrollToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300 // 滚动动画时长（毫秒）
    });
  },

  // 统一排序算法
  sortGoods(data) {
    const { sortType, priceOrder, timeOrder, viewsOrder } = this.data;
    const tempData = [...data];

    switch (sortType) {
      case 'price':
        return priceOrder === 'asc' 
          ? tempData.sort((a, b) => a.price - b.price) 
          : tempData.sort((a, b) => b.price - a.price);
          
      case 'publishTime':
        return timeOrder === 'asc' 
          ? tempData.sort((a, b) => new Date(a.publishTime) - new Date(b.publishTime)) 
          : tempData.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));
          
      case 'views':
        return viewsOrder === 'desc' 
          ? tempData.sort((a, b) => b.views - a.views) 
          : tempData.sort((a, b) => a.views - b.views);
          
      default: // 默认按最新发布（ID降序）
        return tempData.sort((a, b) => b.id - a.id);
    }
  },

  // 加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.searchGoods(this.data.keyword); // 保持当前排序和分页状态
    }
  },

  // 搜索历史相关方法（保持不变）
  addSearchHistory(keyword) {
    let history = wx.getStorageSync('search_history') || [];
    history = history.filter(item => item !== keyword);
    history.unshift(keyword);
    history.length > 10 && (history = history.slice(0, 10));
    wx.setStorageSync('search_history', history);
    this.setData({ historyKeywords: history });
  },

  deleteHistory(e) {
    const index = e.currentTarget.dataset.index;
    let history = this.data.historyKeywords;
    history.splice(index, 1);
    wx.setStorageSync('search_history', history);
    this.setData({ historyKeywords: history });
  },

  clearAllHistory() {
    wx.setStorageSync('search_history', []);
    this.setData({ historyKeywords: [] });
  },

  useHistoryKeyword(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword, showHistory: false });
    this.searchGoods(keyword, true);
    this.addSearchHistory(keyword);
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory, searchValue: '' });
  },

  onInput(e) {
    this.setData({ searchValue: e.detail });
  },

  onSearch(e) {
    const keyword = e.detail || this.data.searchValue;
    if (keyword) {
      this.setData({ keyword, showHistory: false });
      this.searchGoods(keyword, true);
      this.addSearchHistory(keyword);
    }
  },

  backToIndex() {
    wx.navigateBack();
  },

  loadSearchResults() {
    this.setData({ netError: false });
    // 这里用真实网络请求替换
    wx.request({
      url: 'https://jsonplaceholder.typicode.com/posts',
      timeout: 8000,
      success: (res) => {
        // 正常处理
      },
      fail: (err) => {
        this.setData({ netError: true });
      }
    });
  },

  reloadPage() {
    this.loadSearchResults();
  }
});