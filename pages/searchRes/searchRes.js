// pages/searchRes/searchRes.js
const app = getApp();

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
    // 移除原来的loadSearchResults调用，因为我们现在使用真实的搜索接口
  },

  // 执行搜索（含排序和分页）
  searchGoods(keyword, isReset = false) {
    if (!keyword) return;
    
    if (isReset) {
      this.setData({
        currentPage: 1,
        goodsList: [],
        sortedGoodsList: [],
        hasMore: true,
      });
    }

    this.setData({ loading: true, netError: false });

    // 构建请求URL
    let url = `${app.globalData.baseUrl}/products/search?keyword=${encodeURIComponent(keyword)}`;
    url += `&page=${this.data.currentPage}`;
    url += `&size=${this.data.pageSize}`;
    
    // 添加排序参数
    const { sortType, priceOrder, timeOrder, viewsOrder } = this.data;
    switch (sortType) {
      case 'price':
        url += `&sortBy=price&order=${priceOrder}`;
        break;
      case 'publishTime':
        url += `&sortBy=time&order=${timeOrder}`;
        break;
      case 'views':
        url += `&sortBy=views&order=${viewsOrder}`;
        break;
      default:
        url += `&sortBy=default`;
        break;
    }

    wx.request({
      url: url,
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          const newData = res.data.data || [];
          const hasMore = newData.length === this.data.pageSize;
          
          // 更新数据
          this.setData({
            goodsList: isReset ? newData : this.data.goodsList.concat(newData),
            sortedGoodsList: isReset ? newData : this.data.sortedGoodsList.concat(newData),
            currentPage: this.data.currentPage + 1,
            hasMore: hasMore,
            loading: false
          });
        } else {
          console.error('搜索接口返回错误:', res);
          this.setData({ 
            netError: true, 
            loading: false 
          });
        }
      },
      fail: (err) => {
        console.error('搜索请求失败:', err);
        this.setData({ 
          netError: true, 
          loading: false 
        });
      }
    });
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

  // 加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.searchGoods(this.data.keyword, false); // 保持当前排序和分页状态
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

  reloadPage() {
    this.searchGoods(this.data.keyword, true);
  }
});
