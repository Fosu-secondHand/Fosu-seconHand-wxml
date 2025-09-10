const { mockGoodsData } = require("../../mock/goods.js");

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
    this.filterGoodsListByCategory();
    console.log('页面加载');
  },

  onShow() {
    if (this.getTabBar) {
      const tabbar = this.getTabBar();
      if (tabbar && tabbar.setData) {
        tabbar.setData({ selected: 0 });
      }
    }
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
    try {
      const categoryMap = this.data.categoryMap;
      // 由于mock数据的分类与categoryMap不匹配，暂时显示所有数据
      const filteredData = mockGoodsData;
      console.log('当前标签页:', activeTab, '分类名称:', categoryMap[activeTab]);
      console.log('过滤后的数据总量:', filteredData.length);
      const start = (this.data.currentPage - 1) * this.data.pageSize;
      const end = start + this.data.pageSize;
      console.log('分页范围:', start, '到', end);
      const newData = filteredData.slice(start, end);
      console.log('本次加载的数据量:', newData.length);
      const hasMore = end < filteredData.length;
      console.log('是否还有更多数据:', hasMore);
      this.setData({
        goodsList: this.data.goodsList.concat(newData),
        currentPage: this.data.currentPage + 1,
        hasMore,
        loading: false
      });
      if (!reset) {
        this.data.tabData[activeTab] = {
          goodsList: this.data.goodsList,
          currentPage: this.data.currentPage,
          hasMore
        };
        this.setData({ tabData: this.data.tabData });
      }
    } catch (err) {
      console.error('加载数据出错:', err);
      this.setData({ netError: true, loading: false });
    }
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
    const { selectedCategories } = this.data;
    let filtered = [];
    if (selectedCategories.length === 0) {
      filtered = mockGoodsData;
    } else {
      filtered = mockGoodsData.filter(item => selectedCategories.includes(item.category));
    }
    this.setData({
      goodsList: filtered.slice(0, this.data.pageSize),
      currentPage: 2,
      hasMore: filtered.length > this.data.pageSize
    });
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
  }
});