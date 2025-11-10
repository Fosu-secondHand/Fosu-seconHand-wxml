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
    categoryOptions: ['所有分类','教材书籍', '服饰鞋包', '生活用品', '数码产品', '美妆个护', '交通出行', '其他闲置'],
    selectedCategory: '',
    categoryMap: {
      0: '猜你喜欢',
      1: '最新发布',
      2: '免费赠送',
      3: '求购专区',
      4: '租赁服务',
      5: '毕业甩卖'
    },
    campusOptions: ['所有校区','南区', '北区'],
    selectedCampus: '',
    showCampusDropdown: false,
    showCategoryDropdown: false,
    netError: false
  },

  onLoad() {
    // 不要覆盖data中已经设置好的默认值
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

    // 处理图片URL，确保支持HTTPS并正确拼接路径
    let processedImage = originalData.image || originalData.images;
    const baseURL = app.globalData.baseUrl ? app.globalData.baseUrl.replace('http://', 'https://') : '';

    if (processedImage) {
      if (Array.isArray(processedImage)) {
        // 处理图片数组
        processedImage = processedImage.map(img => {
          if (typeof img === 'string') {
            // 如果是完整URL（http或https），直接返回并确保使用HTTPS
            if (img.startsWith('http')) {
              return img.replace('http://', 'https://');
            }
            // 如果是相对路径，拼接基础URL
            // 确保路径正确连接（处理baseURL末尾是否有/的情况）
            return baseURL + (img.startsWith('/') ? img : '/' + img);
          }
          return img;
        });
      } else if (typeof processedImage === 'string') {
        // 处理单个图片
        if (processedImage.startsWith('http')) {
          // 确保使用HTTPS
          processedImage = processedImage.replace('http://', 'https://');
        } else {
          // 如果是相对路径，拼接基础URL
          processedImage = baseURL + (processedImage.startsWith('/') ? processedImage : '/' + processedImage);
        }
      }
    }

    return {
      id: originalData.id || originalData.productId || originalData.product_ld,
      product_ld: originalData.productId || originalData.id || originalData.product_ld,
      productId: originalData.productId || originalData.id || originalData.product_ld,
      title: originalData.title,
      price: originalData.price,
      image: processedImage,
      images: Array.isArray(processedImage) ? processedImage : [processedImage],
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

    // 根据标签页类型确定请求参数
    let params = '';
    switch (activeTab) {
      case 0: // 猜你喜欢
        params = 'type=recommend';
        break;
      case 1: // 最新发布
        params = 'type=latest';
        break;
      case 2: // 免费赠送
        params = 'type=free';
        break;
      case 3: // 求购专区
        params = 'type=wanted';
        break;
      case 4: // 租赁服务
        params = 'categories=租赁服务';
        break;
      case 5: // 毕业甩卖
        params = 'categories=毕业甩卖';
        break;
      default:
        params = 'type=recommend';
    }

    // 添加分页参数
    const page = reset ? 1 : this.data.currentPage;
    params += `&page=${page}&size=${this.data.pageSize}`;

    // 调用后端API获取商品列表
    wx.request({
      url: `${app.globalData.baseUrl}/products/filter?${params}`,
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

          // 对商品数据进行字段映射处理
          const mappedData = productsData.map(item => this.mapGoodsFields(item));

          // 处理分页逻辑
          const hasMore = productsData.length === this.data.pageSize; // 如果返回数据少于请求数量，说明没有更多了

          this.setData({
            goodsList: reset ? mappedData : this.data.goodsList.concat(mappedData),
            currentPage: page + 1,
            hasMore: hasMore,
            loading: false
          });

          // 更新tabData
          const tabData = { ...this.data.tabData };
          tabData[activeTab] = {
            goodsList: this.data.goodsList,
            currentPage: this.data.currentPage,
            hasMore: hasMore
          };
          this.setData({ tabData: tabData });
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
      this.loadGoodsList(true); // 传入true表示重置数据
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

  // 修改分类多选方法，增加调试信息
  onCategoryMultiSelect(e) {
    const value = e.currentTarget.dataset.value;
    console.log('选择分类:', value);
    let selected = this.data.selectedCategories.slice();

    if (value === '所有分类') {
      // 如果点击"所有分类"，则清空其他选择
      selected = ['所有分类'];
      console.log('选择所有分类，清空其他选择');
    } else {
      // 如果点击其他分类项
      const allIndex = selected.indexOf('所有分类');
      if (allIndex > -1) {
        // 移除"所有分类"
        selected.splice(allIndex, 1);
        console.log('移除"所有分类"选项');
      }

      const idx = selected.indexOf(value);
      if (idx === -1) {
        selected.push(value);
        console.log('添加分类:', value);
      } else {
        selected.splice(idx, 1);
        console.log('移除分类:', value);
      }

      // 如果取消了所有分类选择，则默认选择"所有分类"
      if (selected.length === 0) {
        selected = ['所有分类'];
        console.log('没有选择任何分类，恢复到"所有分类"');
      }
    }

    console.log('当前选中的分类:', selected);

    this.setData({
      selectedCategories: selected
    });

    // 选择分类后立即筛选
    this.filterGoods();
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

  // 修改校区选择方法
  selectCampus(e) {
    const selectedValue = e.currentTarget.dataset.value;

    this.setData({
      selectedCampus: selectedValue,
      showCampusDropdown: false
    });

    // 选择校区后立即筛选
    this.filterGoods();
  },
// 新增完成分类选择方法
  finishCategorySelection() {
    this.setData({
      showCategoryDropdown: false
    });
    // 完成分类选择后立即筛选
    this.filterGoods();
  },

  // 修改分类下拉切换方法
  toggleCategoryDropdown() {
    this.setData({
      showCategoryDropdown: !this.data.showCategoryDropdown,
      showCampusDropdown: false
    });
  },

  // 修改分类选择方法
  selectCategory(e) {
    const selectedValue = e.currentTarget.dataset.value;

    this.setData({
      selectedCategory: selectedValue,
      showCategoryDropdown: false
    });

    // 选择分类后立即筛选
    this.filterGoods();
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
// 修改筛选商品的方法
  filterGoods() {
    this.setData({ loading: true });

    // 构建筛选参数
    let params = '';

    // 添加分类筛选参数（空值或"所有分类"都不发送参数）
    if (this.data.selectedCategory && this.data.selectedCategory !== '所有分类') {
      params += `categories=${encodeURIComponent(this.data.selectedCategory)}`;
    }

    // 添加校区筛选参数（空值或"所有校区"都不发送参数）
    if (this.data.selectedCampus && this.data.selectedCampus !== '所有校区') {
      if (params) params += '&';
      params += `campus=${encodeURIComponent(this.data.selectedCampus)}`;
    }

    // 如果没有筛选条件，则使用当前标签页的类型
    if (!params) {
      switch (this.data.active) {
        case 0: // 猜你喜欢
          params = 'type=recommend';
          break;
        case 1: // 最新发布
          params = 'type=latest';
          break;
        case 2: // 免费赠送
          params = 'type=free';
          break;
        case 3: // 求购专区
          params = 'type=wanted';
          break;
        case 4: // 租赁服务
          params = 'categories=租赁服务';
          break;
        case 5: // 毕业甩卖
          params = 'categories=毕业甩卖';
          break;
        default:
          params = 'type=recommend';
      }
    }

    // 添加分页参数
    params += `&page=1&size=${this.data.pageSize}`;

    // 构造完整的URL
    const url = `${app.globalData.baseUrl}/products/filter?${params}`;

    console.log('筛选请求URL:', url);

    // 发起筛选请求
    wx.request({
      url: url,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          const productsData = res.data.data || [];
          // 对商品数据进行字段映射处理，包括图片URL处理
          const mappedData = productsData.map(item => this.mapGoodsFields(item));

          this.setData({
            goodsList: mappedData,
            loading: false,
            currentPage: 2,
            hasMore: productsData.length === this.data.pageSize
          });
        } else {
          console.error('筛选API返回错误:', res);
          this.setData({ loading: false });
          wx.showToast({
            title: '筛选失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('筛选请求失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

// 重置筛选条件
  resetFilter() {
    this.setData({
      selectedCategory: '',
      selectedCampus: '',
      showCampusDropdown: false,
      showCategoryDropdown: false
    });
    // 重新加载所有商品
    this.loadGoodsList(true);
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
