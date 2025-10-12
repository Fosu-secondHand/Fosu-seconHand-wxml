const app = getApp();

Page({
  data: {
    value: '',
    active: 0,
    goodsList: [],
    pageSize: 10,
    currentPage: 1,
    hasMore: true,
    loading: false,
    historyKeywords: [],   // 搜索历史
    showHistory: false,    // 是否显示搜索历史
    tabData: {}, // 存储每个标签页的数据
    categoryOptions: ['教材书籍', '服饰鞋包', '生活用品', '数码产品', '美妆个护', '交通出行', '其他闲置'],
    selectedCategories: [],
    categoryMap: {
      0: '猜你喜欢',
      1: '最新发布',
      2: '免费赠送',
      3: '求购专区',
      4: '租赁服务',
      5: '毕业甩卖'
    },
    campusOptions: ['南区', '北区'],
    selectedCampus: '',
    showCampusDropdown: false,
    selectedCategory: '',
    showCategoryDropdown: false,
    netError: false
  },

  onLoad() {
    this.setData({ selectedCategories: [] });
    this.loadGoodsList(true); // 页面加载时调用真实API
    console.log('页面加载');
    // 加载搜索历史
    this.loadSearchHistory();
  },

  onShow() {
    if (this.getTabBar) {
      const tabbar = this.getTabBar();
      if (tabbar && tabbar.setData) {
        tabbar.setData({ selected: 0 });
      }
    }
  },

  // 字段映射方法，确保后端数据与前端模板字段一致
  mapGoodsFields(originalData) {
    if (!originalData) return {};
    
    return {
      id: originalData.id || originalData.productId || originalData.product_ld,
      product_ld: originalData.productId || originalData.id || originalData.product_ld,
      productId: originalData.productId || originalData.id || originalData.product_ld,
      title: originalData.title,
      price: originalData.price,
      image: originalData.image || originalData.images,
      images: Array.isArray(originalData.image) ? originalData.image : [originalData.image],
      postTime: originalData.postTime || originalData.post_time,
      viewCount: originalData.viewCount || originalData.view_count,
      favoriteCount: originalData.favoriteCount || originalData.favorite_count,
      category: originalData.category,
      // 添加其他需要的字段
      ...originalData // 保留所有原始字段
    };
  },

  loadGoodsList(reset = false) {
    console.log('loadGoodsList 被调用，reset:', reset);
    const activeTab = this.data.active;
    if (reset) {
      this.setData({
        currentPage: 1,
        goodsList: [],
        tabData: { [activeTab]: { goodsList: [], currentPage: 1, hasMore: true } }
      });
    }

    this.setData({ loading: true, netError: false });

    // 调用后端API获取商品列表
    wx.request({
      url: app.globalData.baseUrl + '/products/list', // 使用您定义的基础URL
      method: 'GET',
      success: (res) => {
        console.log('API返回数据:', res);
        if (res.statusCode === 200 && res.data.code === 200) {
          // 根据您的response格式，数据在res.data.data中
          const productsData = res.data.data || [];


          console.log('商品列表数据:', productsData);
          // 检查每个商品的ID字段
          productsData.forEach((product, index) => {
            console.log(`商品${index} ID信息:`, {
              id: product.id,
              product_ld: product.product_ld,
              productId: product.productId,
              otherIdFields: Object.keys(product).filter(key => key.toLowerCase().includes('id'))
            });
          });


          // 处理分页逻辑
          const start = (this.data.currentPage - 1) * this.data.pageSize;
          const end = start + this.data.pageSize;
          // 对商品数据进行字段映射处理
          const mappedData = productsData.map(item => this.mapGoodsFields(item));
          const newData = mappedData.slice(start, end);
          const hasMore = end < mappedData.length;

          this.setData({
            goodsList: reset ? newData : this.data.goodsList.concat(newData),
            currentPage: this.data.currentPage + 1,
            hasMore: hasMore,
            loading: false
          });

          // 更新tabData
          if (!reset) {
            this.data.tabData[activeTab] = {
              goodsList: this.data.goodsList,
              currentPage: this.data.currentPage,
              hasMore: hasMore
            };
            this.setData({ tabData: this.data.tabData });
          }
        } else {
          console.error('API返回错误:', res);
          this.setData({ netError: true, loading: false });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        this.setData({ netError: true, loading: false });
      }
    });
  },

  onTabChange(event) {
    const activeTab = event.detail.index; // 获取当前激活的标签页索引
    this.setData({ active: activeTab, scrollTop: 0 });
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300 // 滚动动画时长（毫秒）
    });

    const tabData = this.data.tabData[activeTab];
    if (tabData) {
      this.setData({
        goodsList: tabData.goodsList,
        currentPage: tabData.currentPage,
        hasMore: tabData.hasMore
      });
    } else {
      this.setData({ goodsList: [], currentPage: 1, hasMore: true });
      this.loadGoodsList();
    }
  },

  onSearch(e) {
    console.log("搜索");
    const keyword = e.detail.trim();
    console.log("搜索关键词（从事件获取）:", keyword);
    if (keyword) {
      this.saveSearchHistory(keyword);
      wx.navigateTo({
        url: `/pages/searchRes/searchRes?keyword=${keyword}`
      });
    }
  },

  onPullDownRefresh() {
    console.log('下拉刷新触发');
    this.setData({
      tabData: {}, // 清空所有缓存
      currentPage: 1,
      goodsList: [],
      hasMore: true,
      scrollTop: 0
    });
    this.loadGoodsList(true);
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    console.log('触底事件触发，hasMore:', this.data.hasMore, 'loading:', this.data.loading);
    console.log('当前商品数量:', this.data.goodsList.length);
    if (this.data.hasMore && !this.data.loading) {
      console.log('开始加载更多数据...');
      this.loadGoodsList();
    } else {
      console.log('不满足加载条件：hasMore=', this.data.hasMore, 'loading=', this.data.loading);
    }
  },

  goChooseIdle() {
    wx.navigateTo({ url: '/pages/chooseIdle/chooseIdle' });
  },

  onCategoryMultiSelect(e) {
    const value = e.currentTarget.dataset.value;
    let selected = this.data.selectedCategories.slice();
    const idx = selected.indexOf(value);
    if (idx === -1) {
      selected.push(value);
    } else {
      selected.splice(idx, 1);
    }
    this.setData({ selectedCategories: selected }, this.filterGoodsListByCategory);
  },

  filterGoodsListByCategory() {
    // 这里也应该调用带分类筛选的API
    this.loadGoodsList(true);
  },

  toggleCampusDropdown() {
    this.setData({
      showCampusDropdown: !this.data.showCampusDropdown,
      showCategoryDropdown: false
    });
  },

  selectCampus(e) {
    this.setData({
      selectedCampus: e.currentTarget.dataset.value,
      showCampusDropdown: false
    });
    // 可在此处添加筛选逻辑
  },

  toggleCategoryDropdown() {
    this.setData({
      showCategoryDropdown: !this.data.showCategoryDropdown,
      showCampusDropdown: false
    });
  },

  selectCategory(e) {
    this.setData({
      selectedCategory: e.currentTarget.dataset.value,
      showCategoryDropdown: false
    });
    // 可在此处添加筛选逻辑
  },

  reloadPage() {
    this.setData({ netError: false });
    this.loadGoodsList(true);
  },

  // 加载搜索历史
  loadSearchHistory() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ historyKeywords: history });
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    let history = wx.getStorageSync('searchHistory') || [];
    // 如果关键词已存在，先移除它
    const index = history.indexOf(keyword);
    if (index > -1) {
      history.splice(index, 1);
    }
    // 将新关键词添加到开头
    history.unshift(keyword);
    // 限制历史记录数量为10条
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    wx.setStorageSync('searchHistory', history);
    this.setData({ historyKeywords: history });
  },

  // 显示搜索历史
  showSearchHistory() {
    this.loadSearchHistory();
    this.setData({ showHistory: true });
  },

  // 隐藏搜索历史
  hideSearchHistory() {
    this.setData({ showHistory: false });
  },

  // 清除搜索历史
  clearSearchHistory() {
    wx.removeStorageSync('searchHistory');
    this.setData({
      historyKeywords: [],
      showHistory: false
    });
    wx.showToast({
      title: '搜索历史已清除',
      icon: 'none'
    });
  },

  // 点击历史记录进行搜索
  searchByHistory(e) {
    const keyword = e.currentTarget.dataset.keyword;
    if (keyword) {
      this.setData({
        value: keyword,
        showHistory: false
      });
      // 触发搜索
      this.onSearch({ detail: keyword });
    }
  },

  // 输入框聚焦时显示搜索历史
  onSearchFocus() {
    this.loadSearchHistory();
    this.setData({ showHistory: true });
  },

  // 输入框失去焦点时隐藏搜索历史（延迟一点时间以确保点击事件能正常执行）
  onSearchBlur() {
    setTimeout(() => {
      this.setData({ showHistory: false });
    }, 200);
  },

  // 输入框内容变化时的处理
  onSearchInput(e) {
    const value = e.detail.value;
    this.setData({ value: value });

    // 如果输入框有内容，显示搜索历史
    if (value.trim()) {
      this.showSearchHistory();
    } else {
      // 如果输入框为空，也显示搜索历史
      this.showSearchHistory();
    }
  }
});
