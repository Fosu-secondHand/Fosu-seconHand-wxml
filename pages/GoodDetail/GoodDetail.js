// pages/GoodDetail/GoodDetail.js
const app = getApp();
const authMixin = require('../../utils/authMixin.js');

Page({
  data: {
    goodsDetail: null,    // 商品详情数据
    isStarred: false,     // 是否收藏
    starCount: 0,         // 收藏数（对应favorite count）
    wantCount: 0,         // 想要数
    viewCount: 0,         // 浏览量（对应view count）
    recommendGoods: [],   // 推荐商品列表
    recommendCurrentPage: 1,   // 推荐商品页码
    recommendPageSize: 6,      // 推荐每页数量
    recommendLoading: false,   // 推荐加载状态
    recommendNoMore: false,    // 推荐无更多数据
    loading: true,             // 页面加载状态
    error: false,              // 加载错误
    userInfo: null,            // 用户信息
    formattedPostTime: '',      // 格式化后的发布时间
    sellerAvatarUrl: '',        // ✅ 新增：卖家头像 URL
    isLogin: false  // ✅ 新增：登录状态
  },

  // ✅ 引入混入方法
  ...authMixin.methods,


  // 修改 onLoad 方法，确保 syncLoginStatus 完成后再执行 checkLoginStatus
  onLoad(options) {
    // ✅ 新增：使用统一的登录检查
    if (!this.checkLogin()) {
      console.warn('⚠️ GoodDetail: 用户未登录');
    }

    // 添加调试代码检查本地存储
    console.log('=== 检查本地存储 ===');
    console.log('token:', wx.getStorageSync('token'));
    console.log('userInfo:', wx.getStorageSync('userInfo'));
    console.log('====================');
    console.log('🎯 ========== 页面加载开始 ==========');
    console.log('📍 页面路径:', this.route);
    console.log('📦 原始options参数:', options);

    // ✅ 使用 mixin 提供的同步方法
    this.syncLoginState();

    // 检查是否通过分享卡片进入
    if (options.scene) {
      console.log('📱 通过分享卡片进入, scene参数:', options.scene);
      // 解码scene参数（如果有）
      try {
        const scene = decodeURIComponent(options.scene);
        console.log('🔍 解码后的scene:', scene);
      } catch (e) {
        console.error('Scene解码失败:', e);
      }
    }

    // 检查是否通过小程序码进入
    if (options.q) {
      console.log('🔗 通过小程序码进入, q参数:', options.q);
    }

    console.log('开始解析商品ID...');
    const goodsId = this.parseGoodsId(options);
    console.log('🔍 parseGoodsId解析结果:', goodsId);

    if (!goodsId) {
      console.error('❌ 商品ID解析失败');
      this.setData({
        error: true,
        loading: false,
        goodsDetail: null
      });

      wx.showToast({
        title: '商品ID无效',
        icon: 'none',
        duration: 3000
      });

      console.log('🎯 ========== 页面加载结束 ==========');
      return;
    }

    console.log('✅ 最终使用的商品ID:', goodsId, '类型:', typeof goodsId);
    console.log('准备调用 loadGoodsDetail 方法...');
    this.loadGoodsDetail(goodsId);
    console.log('loadGoodsDetail 方法调用完成');

    // 延迟一段时间再检查登录状态，确保 syncLoginStatus 完成
    setTimeout(() => {
      this.checkLoginStatus().then(loggedIn => {
        console.log('登录状态检查完成:', loggedIn ? '已登录' : '未登录');
      });
    }, 500);

    console.log('🎯 ========== 页面加载结束 ==========');
  },


  // 解析商品ID
  parseGoodsId(options) {
    console.log('=== 开始 parseGoodsId 方法 ===');
    if (!options) {
      console.error('options为null或undefined');
      console.log('=== 结束 parseGoodsId 方法 ===');
      return null;
    }

    console.log('=== 详细参数分析开始 ===');
    console.log('options对象:', options);
    console.log('options类型:', typeof options);
    console.log('参数数量:', Object.keys(options).length);

    // 详细检查每个参数
    Object.keys(options).forEach(key => {
      console.log(`参数 "${key}":`, {
        '值': options[key],
        '类型': typeof options[key],
        '是否undefined': options[key] === undefined,
        '是否null': options[key] === null,
        '是否空字符串': options[key] === '',
        '是否字符串0': options[key] === '0',
        '转换为数字': Number(options[key]),
        '转换为布尔值': !!options[key]
      });
    });

    // 尝试多种可能的参数名
    const possibleKeys = ['id', 'productId', 'goodsId', 'productid', 'goodsid', 'itemId', 'product_ld'];
    let idValue = null;
    let foundKey = null;

    for (const key of possibleKeys) {
      const value = options[key];
      console.log(`检查参数 "${key}":`, value);

      // 更宽松的检查：只要不是undefined、null、空字符串就接受
      if (value !== undefined && value !== null && value !== '') {
        idValue = value;
        foundKey = key;
        console.log(`✅ 从参数 "${key}" 获取到值:`, idValue, '类型:', typeof idValue);
        break;
      } else {
        console.log(`❌ 参数 "${key}" 的值为空:`, value);
      }
    }

    if (!idValue) {
      console.error('❌ 未找到有效的商品ID参数', {
        '所有参数键': Object.keys(options),
        '每个参数的值': Object.keys(options).map(key => `${key}: "${options[key]}"`),
        'options完整内容': JSON.stringify(options)
      });
      console.log('=== 详细参数分析结束 ===');
      console.log('=== 结束 parseGoodsId 方法 ===');
      return null;
    }

    // 转换为数字
    let idNum;
    if (typeof idValue === 'number') {
      idNum = idValue;
    } else if (typeof idValue === 'string') {
      // 如果是字符串，先尝试直接转换数字
      idNum = parseInt(idValue, 10);

      // 如果转换失败，尝试提取数字
      if (isNaN(idNum)) {
        const numbers = idValue.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          idNum = parseInt(numbers[0], 10);
          console.log('从字符串中提取数字:', idValue, '->', numbers[0], '->', idNum);
        }
      }
    } else {
      idNum = Number(idValue);
    }

    console.log('转换过程:', idValue, '->', idNum);

    if (isNaN(idNum)) {
      console.error('❌ 商品ID转换失败: 不是有效数字', idValue);
      console.log('=== 详细参数分析结束 ===');
      console.log('=== 结束 parseGoodsId 方法 ===');
      return null;
    }

    if (idNum <= 0) {
      console.error('❌ 商品ID必须大于0:', idNum);
      console.log('=== 详细参数分析结束 ===');
      console.log('=== 结束 parseGoodsId 方法 ===');
      return null;
    }

    console.log(`✅ 从参数"${foundKey}"成功解析商品ID:`, idNum);
    console.log('=== 详细参数分析结束 ===');
    console.log('=== 结束 parseGoodsId 方法 ===');
    return idNum;
  },

  // 错误处理
  handleError(message) {
    console.error(message);
    this.setData({ error: true, loading: false });
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    });
  },

  // 修改 checkLoginStatus 方法，添加更详细的错误处理和调试信息
  async checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token');
      console.log('检查登录状态，token:', token ? '存在' : '不存在');
      console.log('获取到的token值:', token);

      if (token && app.globalData.baseUrl) {
        const requestUrl = `${app.globalData.baseUrl}/users/info?token=${token}`;
        console.log('请求用户信息接口:', requestUrl);

        // 添加更详细的请求配置
        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: requestUrl,
            method: 'GET',
            timeout: 10000,
            success: (result) => {
              console.log('请求成功，原始响应:', result);
              resolve(result);
            },
            fail: (error) => {
              console.error('请求失败:', error);
              reject(error);
            }
          });
        });

        console.log('用户信息接口响应:', res);
        console.log('响应状态码:', res.statusCode);
        console.log('响应数据:', res.data);

        // 检查响应对象
        if (!res) {
          console.error('网络请求无响应');
          return false;
        }

        // 检查响应对象是否包含必要的字段
        if (res.statusCode === undefined || res.data === undefined) {
          console.error('响应格式不正确，可能后端接口异常或请求失败');
          console.error('完整的响应对象:', res);
          return false;
        }

        // 关键修改：正确访问嵌套的数据结构
        if (res.statusCode === 200 && res.data && res.data.data && res.data.data.success) {
          console.log('用户登录有效，用户信息:', res.data.data.data);

          // ✅ 修复：同时更新页面数据和本地存储
          const userInfo = res.data.data.data;

          // 确保 userInfo 包含必要字段
          if (userInfo.id || userInfo.userId) {
            const normalizedUserInfo = {
              ...userInfo,
              id: userInfo.id || userInfo.userId,
              isLogin: true
            };

            this.setData({ userInfo: normalizedUserInfo });
            wx.setStorageSync('userInfo', normalizedUserInfo);
            console.log('✅ 用户信息已同步到本地存储');
          } else {
            console.error('❌ 用户信息缺少 ID 字段');
            return false;
          }

          return true;
        } else {
          console.warn('用户token无效:', res.data);
          console.warn('响应状态码:', res.statusCode);

          // ✅ 修复：不要直接清除本地存储，先检查是否有有效的 token
          const localToken = wx.getStorageSync('token');
          const localUserInfo = wx.getStorageSync('userInfo');

          if (!localToken || !localUserInfo || !localUserInfo.id) {
            console.warn('⚠️ 本地也没有有效的登录状态，清除缓存');
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
          } else {
            console.warn('⚠️ 接口返回失败，但本地有有效登录状态，保留');
          }

          return false;
        }
      } else {
        console.log('缺少token或baseUrl');
        console.log('token:', token);
        console.log('baseUrl:', app.globalData.baseUrl);
        return false;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);

      // ✅ 修复：捕获异常时不要直接清除本地存储
      const localToken = wx.getStorageSync('token');
      const localUserInfo = wx.getStorageSync('userInfo');

      if (!localToken || !localUserInfo || !localUserInfo.id) {
        console.warn('⚠️ 本地也没有有效的登录状态，清除缓存');
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
      } else {
        console.warn('⚠️ 请求失败，但本地有有效登录状态，保留');
      }

      return false;
    }
  },



  // 加载商品详情
  async loadGoodsDetail(goodsId) {
    this.setData({ loading: true, error: false });

    // 检查baseUrl是否已设置
    if (!app.globalData.baseUrl) {
      console.error('baseUrl未设置');
      this.setData({ error: true, loading: false });
      wx.showToast({ title: '配置错误', icon: 'none' });
      return;
    }

    // 再次验证goodsId
    if (goodsId === undefined || goodsId === null) {
      console.error('商品ID为undefined或null');
      this.setData({ error: true, loading: false });
      wx.showToast({ title: '商品ID无效', icon: 'none' });
      return;
    }

    if (isNaN(goodsId)) {
      console.error('商品ID不是有效数字:', goodsId);
      this.setData({ error: true, loading: false });
      wx.showToast({ title: '商品ID无效', icon: 'none' });
      return;
    }

    if (goodsId <= 0) {
      console.error('商品ID必须大于0:', goodsId);
      this.setData({ error: true, loading: false });
      wx.showToast({ title: '商品ID无效', icon: 'none' });
      return;
    }

    try {
      console.log('开始请求商品详情，商品ID:', goodsId);
      const requestUrl = `${app.globalData.baseUrl}/products/detail?productId=${goodsId}`;
      console.log('请求URL:', requestUrl);

      // 正确处理 wx.request 的异步操作
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: requestUrl,
          method: 'GET',
          timeout: 10000,
          success: (result) => {
            console.log('请求成功回调:', result);
            resolve(result);
          },
          fail: (error) => {
            console.error('请求失败回调:', error);
            reject(new Error(`网络请求失败: ${error.errMsg || '未知错误'}`));
          },
          complete: (result) => {
            console.log('请求完成回调:', result);
          }
        });
      });

      console.log('商品详情接口完整响应对象:', res);
      console.log('商品详情接口响应状态:', res.statusCode);
      console.log('商品详情接口响应数据:', res.data);
      console.log('商品详情接口错误信息:', res.errMsg);

      // 检查请求是否成功发送并收到响应
      if (res === undefined || res === null) {
        throw new Error('请求未返回任何响应');
      }

      // 检查是否存在网络错误
      if (res.errMsg && res.errMsg.includes('fail')) {
        console.warn('请求存在网络错误:', res.errMsg);
        throw new Error(`网络请求失败: ${res.errMsg}`);
      }

      // 检查HTTP状态码
      if (res.statusCode !== 200) {
        throw new Error(`HTTP ${res.statusCode}: ${res.errMsg || '请求失败'}`);
      }

      // 检查是否有返回数据
      if (!res.data) {
        throw new Error('服务器未返回数据');
      }

      // 检查业务逻辑是否成功 - 修复错误的检查逻辑
      // 根据你的日志，后端返回的数据格式是 {code: 200, message: "success", data: {...}}
      if (res.data.code !== 200) {
        throw new Error(res.data.message || '获取商品详情失败');
      }

      // 关键修改：检查data是否为null
      if (!res.data.data) {
        console.warn('服务器返回data为null，商品可能不存在');
        throw new Error('未找到该商品的信息');
      }

      const goodsDetail = res.data.data;
      console.log('原始商品详情数据:', goodsDetail);

      // 关键修改：根据数据库表头映射字段
      // 在 loadGoodsDetail 方法中处理返回的数据时
      const mappedGoodsDetail = this.mapGoodsDetailFields(goodsDetail);

      // ✅ 修复：处理图片 URL - 智能判断是否已有 /api 前缀
      const baseURL = app.globalData.baseUrl; // http://139.199.87.181:8080/api
      console.log('=== 图片 URL 处理开始 ===');
      console.log('baseURL:', baseURL);
      console.log('原始图片数据:', mappedGoodsDetail.image);

      if (mappedGoodsDetail.image) {
        if (Array.isArray(mappedGoodsDetail.image)) {
          mappedGoodsDetail.image = mappedGoodsDetail.image.map((img, index) => {
            console.log(`\n处理图片[${index}]:`);
            console.log('  原始值:', img);

            // 如果已经是完整 URL，直接返回
            if (img.startsWith('http')) {
              console.log('  ✅ 使用完整 URL');
              return img;
            }

            // ✅ 关键修复：如果图片路径已经包含 /api，直接使用服务器根地址拼接
            let finalUrl;
            if (img.startsWith('/api')) {
              // 后端返回的是 /api/uploads/xxx.png
              // 需要从 baseURL 中提取服务器根地址（去掉 /api）
              const serverRoot = baseURL.replace(/\/api$/, '');
              finalUrl = serverRoot + img;
              console.log('  ⚠️ 图片路径已含 /api，使用服务器根地址拼接');
              console.log('  服务器根地址:', serverRoot);
              console.log('  ✅ 拼接后的 URL:', finalUrl);
            } else {
              // 后端返回的是 /uploads/xxx.png（没有 /api）
              finalUrl = baseURL + (img.startsWith('/') ? img : '/' + img);
              console.log('  ✅ 普通拼接:', finalUrl);
            }

            return finalUrl;
          });
        } else {
          // 单个图片处理
          console.log('单张图片:', mappedGoodsDetail.image);
          if (!mappedGoodsDetail.image.startsWith('http')) {
            let finalUrl;
            if (mappedGoodsDetail.image.startsWith('/api')) {
              const serverRoot = baseURL.replace(/\/api$/, '');
              finalUrl = serverRoot + mappedGoodsDetail.image;
              console.log('⚠️ 图片路径已含 /api，使用服务器根地址拼接');
              console.log('服务器根地址:', serverRoot);
              console.log('拼接后:', finalUrl);
            } else {
              finalUrl = baseURL + (mappedGoodsDetail.image.startsWith('/') ? mappedGoodsDetail.image : '/' + mappedGoodsDetail.image);
              console.log('普通拼接:', finalUrl);
            }
            mappedGoodsDetail.image = finalUrl;
          }
        }
      }
      console.log('\n最终图片 URL 数组:', mappedGoodsDetail.image);
      console.log('=== 图片 URL 处理结束 ===');

      console.log('映射后的商品详情:', mappedGoodsDetail);

      // ✅ 新增：处理卖家头像 URL
      let sellerAvatarUrl = '/static/assets/icons/default-avatar.png';
      if (mappedGoodsDetail.seller && mappedGoodsDetail.seller.avatar) {
        const avatarPath = mappedGoodsDetail.seller.avatar;

        // 如果是相对路径，拼接完整域名
        if (!avatarPath.startsWith('http')) {
          const serverRoot = baseURL.replace(/\/api$/, '');
          sellerAvatarUrl = serverRoot + (avatarPath.startsWith('/') ? avatarPath : '/' + avatarPath);
          console.log('✅ 卖家头像 URL 拼接完成:', sellerAvatarUrl);
        } else {
          sellerAvatarUrl = avatarPath;
        }
      }

      // 格式化发布时间
      const formattedPostTime = this.formatPostTime(mappedGoodsDetail.postTime);

      // 检查当前用户是否已收藏该商品
      const isStarred = await this.checkIfStarred(this.data.userInfo?.id, goodsDetail.productId);

      this.setData({
        goodsDetail: mappedGoodsDetail,
        starCount: mappedGoodsDetail.favorite_count || 0,
        wantCount: mappedGoodsDetail.wantCount || 0,
        viewCount: mappedGoodsDetail.view_count || 0,
        isStarred: isStarred,
        loading: false,
        formattedPostTime: formattedPostTime,
        sellerAvatarUrl: sellerAvatarUrl  // ✅ 设置卖家头像
      });

      // 加载推荐商品 - 使用映射后的分类字段
      if (mappedGoodsDetail.category_ld || mappedGoodsDetail.category) {
        const category = mappedGoodsDetail.category_ld || mappedGoodsDetail.category;
        console.log('开始加载推荐商品，分类:', category);
        this.loadRecommendGoods(category);
      } else {
        console.warn('商品详情中没有分类信息，跳过推荐商品加载');
      }
    } catch (error) {
      console.error('加载商品详情失败:', error);
      // 添加更详细的错误信息显示
      let errorMsg = '加载失败';
      if (error.message) {
        errorMsg += ': ' + error.message;
      }
      this.setData({ error: true, loading: false });
      wx.showModal({
        title: '加载失败',
        content: errorMsg,
        showCancel: false
      });
    }
  },

  // 检查当前用户是否已收藏该商品
  async checkIfStarred(userId, productId) {
    if (!userId || !productId) {
      console.log('用户ID或商品ID缺失，无法检查收藏状态');
      return false;
    }

    try {
      const token = wx.getStorageSync('token');
      if (!token) {
        console.log('未登录，无法检查收藏状态');
        return false;
      }

      const requestUrl = `${app.globalData.baseUrl}/product/detail/checkStar?userId=${userId}&productId=${productId}`;
      console.log('检查收藏状态请求URL:', requestUrl);

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: requestUrl,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: (result) => {
            console.log('检查收藏状态成功回调:', result);
            resolve(result);
          },
          fail: (error) => {
            console.error('检查收藏状态失败回调:', error);
            reject(new Error(`网络请求失败: ${error.errMsg || '未知错误'}`));
          }
        });
      });

      if (res.statusCode === 200 && res.data) {
        return res.data.isStarred || false;
      }

      return false;
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      return false;
    }
  },

  // 根据数据库表头映射字段
  mapGoodsDetailFields(originalData) {
    if (!originalData) return {};

    // 根据实际后端返回的数据结构进行映射
    const mappedData = {
      product_ld: originalData.productId,
      productId: originalData.productId,
      seller_id: originalData.sellerId,
      seller_Id: originalData.sellerId, // 兼容原始代码中的'seller Id'写法
      title: originalData.title,
      description: originalData.description,
      price: originalData.price,
      condition: originalData.condition,
      item_condition: originalData.condition,
      image: originalData.image,
      images: Array.isArray(originalData.image) ? originalData.image : [originalData.image],
      status: originalData.status,
      post_time: originalData.postTime,
      postTime: originalData.postTime,
      update_time: originalData.updateTime,
      updateTime: originalData.updateTime,
      view_count: originalData.viewCount,
      viewCount: originalData.viewCount,
      campus: originalData.campus,
      favorite_count: originalData.favoriteCount,
      favoriteCount: originalData.favoriteCount,
      transaction_method: originalData.transactionMethod,
      transactionMethod: originalData.transactionMethod,
      category_ld: originalData.category ? originalData.category.categoryId : null,
      category: originalData.category ? originalData.category.name : null,
      seller: originalData.seller,
      wantCount: originalData.wantToBuy,
      want_count: originalData.wantToBuy,
      soldCount: originalData.soldCount || 0,
      soldQuantity: originalData.soldQuantity || 0
    };

    // 复制所有原始数据字段
    Object.keys(originalData).forEach(key => {
      if (mappedData[key] === undefined) {
        mappedData[key] = originalData[key];
      }
    });

    console.log('字段映射结果:', mappedData);
    return mappedData;
  },

  // 查找可能的字段别名
  findPossibleAliases(targetField, data) {
    const aliases = {
      'title': ['name', 'product_name', 'goods_name'],
      'price': ['current_price', 'product_price'],
      'description': ['desc', 'product_desc', 'detail'],
      'images': ['image', 'pictures', 'photos', 'img_urls'],
      'category': ['category_id', 'category_ld', 'type', 'product_type'],
      'view_count': ['views', 'view_count', 'page_views'],
      'favorite_count': ['favorites', 'star_count', 'like_count']
    };

    const targetAliases = aliases[targetField] || [];
    return targetAliases.filter(alias => data[alias] !== undefined);
  },

  // 解析图片数据
  parseImages(imageData) {
    if (!imageData) return [];

    if (Array.isArray(imageData)) {
      return imageData;
    }

    if (typeof imageData === 'string') {
      // 尝试解析JSON字符串
      try {
        const parsed = JSON.parse(imageData);
        return Array.isArray(parsed) ? parsed : [imageData];
      } catch (e) {
        // 如果是逗号分隔的字符串
        if (imageData.includes(',')) {
          return imageData.split(',').map(img => img.trim());
        }
        return [imageData];
      }
    }

    return [];
  },

// 格式化发布时间
  formatPostTime(postTime) {
    if (!postTime) return '';

    try {
      // 后端返回的UTC时间比数据库时间多了8小时，需要减回去
      const date = new Date(postTime);
      // 减去8小时（8 * 60 * 60 * 1000 毫秒）
      const correctDate = new Date(date.getTime() - 8 * 60 * 60 * 1000);

      const year = correctDate.getFullYear();
      const month = String(correctDate.getMonth() + 1).padStart(2, '0');
      const day = String(correctDate.getDate()).padStart(2, '0');
      const hours = String(correctDate.getHours()).padStart(2, '0');
      const minutes = String(correctDate.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error('格式化发布时间失败:', error);
      return postTime;
    }
  },


// 加载推荐商品
  async loadRecommendGoods(category, reset = false) {
    if (!app.globalData.baseUrl) {
      console.warn('baseUrl未设置，跳过推荐商品加载');
      this.setData({ recommendLoading: false });
      return;
    }

    if (reset) {
      this.setData({
        recommendCurrentPage: 1,
        recommendGoods: []
      });
    }

    this.setData({ recommendLoading: true });

    try {
      // 使用商品ID获取推荐商品，而不是分类
      const productId = this.data.goodsDetail.productId || this.data.goodsDetail.product_ld || this.data.goodsDetail.id;

      // 获取认证token
      const token = wx.getStorageSync('token');

      // 修正请求URL，确保参数正确传递，并添加认证头
      const requestUrl = `${app.globalData.baseUrl}/products/recommend?productId=${productId}&limit=6`;
      console.log('推荐商品请求URL:', requestUrl);

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: requestUrl,
          method: 'GET',
          header: {
            'Authorization': token ? `Bearer ${token}` : ''  // 添加认证头
          },
          timeout: 10000,
          success: (result) => {
            console.log('推荐商品请求成功:', result);
            resolve(result);
          },
          fail: (error) => {
            console.error('推荐商品请求失败:', error);
            reject(error);
          }
        });
      });

      console.log('推荐商品响应:', res);

      if (res.statusCode === 200 && res.data && res.data.code === 200) {
        const newData = res.data.data || [];
        console.log('获取到推荐商品数量:', newData.length);

        // 对推荐商品也进行字段映射和图片处理
        const mappedGoods = newData.map(item => {
          const mappedItem = this.mapGoodsDetailFields(item);

          // ✅ 修复：处理图片 URL - 智能判断是否已有 /api 前缀
          const baseURL = app.globalData.baseUrl;
          if (mappedItem.image) {
            if (Array.isArray(mappedItem.image)) {
              mappedItem.image = mappedItem.image.map(img => {
                // 如果已经是完整 URL，直接使用
                if (img.startsWith('http')) {
                  return img;
                }

                // ✅ 关键修复：智能判断
                if (img.startsWith('/api')) {
                  const serverRoot = baseURL.replace(/\/api$/, '');
                  return serverRoot + img;
                } else {
                  return baseURL + (img.startsWith('/') ? img : '/' + img);
                }
              });
            } else {
              if (!mappedItem.image.startsWith('http')) {
                if (mappedItem.image.startsWith('/api')) {
                  const serverRoot = baseURL.replace(/\/api$/, '');
                  mappedItem.image = serverRoot + mappedItem.image;
                } else {
                  mappedItem.image = baseURL + (mappedItem.image.startsWith('/') ? mappedItem.image : '/' + mappedItem.image);
                }
              }
            }
          }

          return mappedItem;
        });

        this.setData({
          recommendGoods: mappedGoods,
          recommendLoading: false
        });
      } else {
        console.warn('推荐商品请求失败:', res.data);
        this.setData({
          recommendLoading: false,
          recommendGoods: [] // 确保在失败时清空推荐商品列表
        });
      }
    } catch (error) {
      console.error('加载推荐商品失败:', error);
      this.setData({
        recommendLoading: false,
        recommendGoods: [] // 确保在异常时清空推荐商品列表
      });
    }
  },

// 推荐商品点击事件
  onGoodsTap(e) {
    const productId = e.currentTarget.dataset.id;
    if (productId) {
      wx.navigateTo({
        url: `/pages/GoodDetail/GoodDetail?id=${productId}`
      });
    }
  },


  // 推荐商品上拉加载更多
  onRecommendLoadMore() {
    if (!this.data.recommendLoading && !this.data.recommendNoMore && this.data.goodsDetail) {
      console.log('加载更多推荐商品');
      const category = this.data.goodsDetail.category_ld || this.data.goodsDetail.category;
      if (category) {
        this.loadRecommendGoods(category);
      }
    }
  },

// 聊一聊按钮点击事件
  async handleChat() {
    console.log('=== 点击聊一聊按钮 ===');

    // ✅ 改用 mixin 提供的登录检查
    if (!this.requireLogin('发起聊天')) {
      console.log('❌ 用户未登录，已返回');
      return;
    }

    const { goodsDetail } = this.data;
    console.log('📦 商品详情:', goodsDetail);


    if (!goodsDetail) {
      console.log('❌ 商品详情为空');
      wx.showToast({ title: '商品信息加载中', icon: 'none' });
      return;
    }

    // 检查商品状态
    if (goodsDetail.status === 'SOLD') {
      console.log('❌ 商品已售出');
      wx.showToast({ title: '该商品已售出', icon: 'none' });
      return;
    }

    // 使用映射后的卖家 ID 字段
    const sellerId = goodsDetail.seller_id || goodsDetail['seller Id'];
    console.log('👤 卖家 ID:', sellerId, '类型:', typeof sellerId);

    if (!sellerId) {
      console.log('❌ 无法获取卖家信息');
      wx.showToast({ title: '无法获取卖家信息', icon: 'none' });
      return;
    }

    // 获取当前用户信息
    const currentUserId = this.data.userInfo?.id;
    console.log('👤 当前用户 ID:', currentUserId);

    if (!currentUserId) {
      console.log('❌ 用户信息异常');
      wx.showToast({ title: '用户信息异常', icon: 'none' });
      return;
    }

    // 对于求购商品，不需要执行想要操作，直接跳转到聊天
    if (goodsDetail.productType !== 'WANT') {
      // 先执行想要的操作
      const token = wx.getStorageSync('token');
      if (!token) {
        console.log('❌ 请先登录');
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      const { wantCount } = this.data;
      const productId = goodsDetail.product_ld || goodsDetail.id;
      console.log('📝 想要操作，商品 ID:', productId);

      try {
        // 修改参数名以匹配后端期望的参数
        const requestUrl = `${app.globalData.baseUrl}/products/detail/toggleWant?userId=${this.data.userInfo.id}&productId=${productId}&reduceOrAdd=add`;
        console.log('想要操作请求 URL:', requestUrl);

        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: requestUrl,
            method: 'GET',
            header: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 10000,
            success: (result) => {
              console.log('想要操作请求成功回调:', result);
              resolve(result);
            },
            fail: (error) => {
              console.error('想要操作请求失败回调:', error);
              reject(error);
            }
          });
        });

        // 添加更多调试信息
        console.log('想要操作响应:', res);

        // 增强响应检查
        if (!res) {
          console.warn('网络请求无响应');
        } else if (res.statusCode === undefined || res.data === undefined) {
          console.warn('响应格式不正确:', res);
        } else if (res.statusCode === 200) {
          if (res.data && res.data.success) {
            // 操作成功，更新想要数
            this.setData({ wantCount: wantCount + 1 });
            wx.showToast({ title: '已通知卖家', icon: 'success' });
          } else if (res.data && res.data.code === 500) {
            // 静默处理：已经添加过的情况，不显示错误提示
            if (res.data.message && res.data.message.includes("already in the user's want list")) {
              console.log('用户已添加过想要，无需重复添加');
              // 不显示错误提示，继续执行跳转
            } else {
              // 其他 500 错误仍需处理
              console.error('服务器内部错误:', res.data.message);
            }
          }
        }
      } catch (error) {
        console.error('想要操作失败:', error);
        // 静默处理错误，不向用户显示
      }
    }

    // ✅ 修复：直接跳转到 chat 页面，而不是 message 页面
    const targetUserName = goodsDetail.seller?.name || '卖家';

    console.log('✅ 准备跳转到 chat 页面，参数:', {
      receiver: sellerId,
      name: targetUserName,
      currentUserId: currentUserId
    });

    // ✅ 使用 wx.navigateTo 跳转到 chat 页面（非 TabBar 页面）
    wx.navigateTo({
      url: `/pages/chat/chat?receiver=${sellerId}&name=${encodeURIComponent(targetUserName)}&currentUserId=${currentUserId}`,
      success: () => {
        console.log('✅ 跳转到 chat 页面成功');
      },
      fail: (err) => {
        console.error('❌ 跳转到 chat 页面失败:', err);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 立即购买按钮点击事件
  handleBuy() {
    // ✅ 改用 mixin 提供的登录检查
    if (!this.requireLogin('购买商品')) return;

    const { goodsDetail } = this.data;
    if (!goodsDetail) {
      wx.showToast({ title: '商品信息加载中', icon: 'none' });
      return;
    }


    // 检查商品状态
    if (goodsDetail.status === 'SOLD') {
      wx.showToast({ title: '该商品已售出', icon: 'none' });
      return;
    }

    // 检查商品类型
    if (goodsDetail.productType === 'WANT') {
      wx.showToast({ title: '这是求购商品，无法购买', icon: 'none' });
      return;
    }

    // 跳转到支付页面，传递商品ID
    wx.navigateTo({
      url: `/pages/payment/payment?goodsId=${goodsDetail.productId || goodsDetail.product_ld || goodsDetail.id}`
    });
  },
  // 添加token验证方法（放在页面对象内，与其他方法同级）
  async validateToken(token) {
    try {
      const res = await wx.request({
        url: `${app.globalData.baseUrl}/user/info?token=${token}`,
        method: 'GET'
      });
      return res.statusCode === 200;
    } catch (error) {
      return false;
    }
  },


  async handleStar() {
    // ✅ 改用 mixin 提供的登录检查
    if (!this.requireLogin('收藏商品')) return;

    // 确保用户信息是最新的
    await this.checkLoginStatus();
    const { userInfo, goodsDetail, isStarred, starCount } = this.data;

    const token = wx.getStorageSync('token');

    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 检查用户信息
    if (!userInfo || !userInfo.id) {
      wx.showToast({ title: '用户信息异常，请重新登录', icon: 'none' });
      return;
    }

    if (!goodsDetail) return;

    // 修改这里：使用后端期望的参数名
    const reduceOrAdd = isStarred ? 'reduce' : 'add';
    const productId = goodsDetail.productId || goodsDetail.product_ld || goodsDetail.id;

    // 验证商品ID
    if (!productId) {
      wx.showToast({ title: '商品信息异常', icon: 'none' });
      return;
    }

    try {
      const requestUrl = `${app.globalData.baseUrl}/products/detail/toggleStar?userId=${userInfo.id}&productId=${productId}&reduceOrAdd=${reduceOrAdd}`;
      console.log('收藏操作请求URL:', requestUrl);

      // 验证参数
      if (!userInfo.id || !productId) {
        throw new Error('用户ID或商品ID无效');
      }

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: requestUrl,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: (result) => {
            console.log('收藏操作成功回调:', result);
            resolve(result);
          },
          fail: (error) => {
            console.error('收藏操作失败回调:', error);
            reject(new Error(`网络请求失败: ${error.errMsg || '未知错误'}`));
          }
        });
      });

      if (res.statusCode === 200 && res.data.code === 200) {
        this.setData({
          isStarred: !isStarred,
          starCount: isStarred ? Math.max(0, starCount - 1) : starCount + 1
        });

        wx.showToast({
          title: isStarred ? '已取消收藏' : '已收藏',
          icon: 'success'
        });
      } else {
        throw new Error(res.data?.message || '操作失败');
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({ title: '操作失败: ' + (error.message || ''), icon: 'none' });
    }
  },

  // checkAuth() {
  //   let userInfo = wx.getStorageSync('userInfo');
  //   let token = wx.getStorageSync('token');
  //
  //   console.log('检查用户登录状态:', {
  //     userInfo: userInfo,
  //     token: token,
  //     isLogin: userInfo?.isLogin
  //   });
  //
  //   // 添加更详细的调试信息
  //   console.log('详细检查:', {
  //     userInfoExists: !!userInfo,
  //     isLoginValid: !!userInfo?.isLogin,
  //     tokenExists: !!token,
  //     tokenLength: token ? token.length : 0
  //   });
  //
  //   // 如果 token 不存在但 userInfo 中有 token，则使用 userInfo 中的 token
  //   if (!token && userInfo && userInfo.token) {
  //     token = userInfo.token;
  //     // 同步存储 token
  //     wx.setStorageSync('token', token);
  //   }
  //
  //   // 检查用户是否登录（增强判断逻辑）
  //   if (!userInfo || !userInfo.isLogin || !token) {
  //     console.log('用户未登录，准备跳转到登录页面');
  //     wx.showModal({
  //       title: '提示',
  //       content: '请先登录后再操作',
  //       confirmText: '去登录',
  //       success: (res) => {
  //         if (res.confirm) {
  //           console.log('用户点击去登录');
  //           wx.navigateTo({
  //             url: '/pages/login/login'
  //           });
  //         }
  //       }
  //     });
  //     return false;
  //   }
  //   console.log('用户已登录');
  //   return true;
  // },

// 添加同步登录状态方法
  syncLoginStatus() {
    try {
      let token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');

      console.log('同步登录状态 - token:', token ? '存在' : '不存在');
      console.log('同步登录状态 - userInfo:', userInfo);
      console.log('同步登录状态 - userInfo.isLogin:', userInfo?.isLogin);

      // 如果 token 不存在但 userInfo 中有 token，则同步存储
      if (!token && userInfo && userInfo.token) {
        token = userInfo.token;
        wx.setStorageSync('token', token);
        console.log('从 userInfo 中提取 token 并存储');
      }

      if (token && userInfo && userInfo.isLogin) {
        // 确保userInfo结构正确
        const normalizedUserInfo = {
          id: userInfo.id || userInfo.userId,
          ...userInfo,
          isLogin: true  // ✅ 确保 isLogin 为 true
        };

        // ✅ 验证 id 是否有效
        if (!normalizedUserInfo.id || normalizedUserInfo.id === 'undefined') {
          console.error('❌ syncLoginStatus: 用户 ID 无效');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          return;
        }

        // ✅ 确保 id 是数字类型
        if (typeof normalizedUserInfo.id === 'string') {
          const numericId = parseInt(normalizedUserInfo.id);
          if (!isNaN(numericId) && numericId > 0) {
            normalizedUserInfo.id = numericId;
          } else {
            console.error('❌ syncLoginStatus: 用户 ID 无法转换为数字');
            wx.removeStorageSync('userInfo');
            wx.removeStorageSync('token');
            return;
          }
        }

        this.setData({ userInfo: normalizedUserInfo });

        // ✅ 关键修复：同步到本地存储
        wx.setStorageSync('userInfo', normalizedUserInfo);

        console.log('同步登录状态成功:', normalizedUserInfo);
      } else if (token) {
        // 有token但没有userInfo，尝试获取用户信息
        this.checkLoginStatus();
      } else {
        // 没有token，清除用户信息
        wx.removeStorageSync('userInfo');
      }
    } catch (error) {
      console.error('同步登录状态失败:', error);
    }
  },

  // 重新加载
  onRetry() {
    console.log('重新加载商品详情');
    const goodsId = this.data.goodsDetail?.product_ld || this.data.goodsDetail?.id || this.parseGoodsId(this.options);
    if (goodsId) {
      this.loadGoodsDetail(goodsId);
    } else {
      console.error('无法获取商品ID进行重试');
      wx.showToast({ title: '无法重新加载', icon: 'none' });
    }
  },

  // 分享按钮点击事件
  onShareAppMessage() {
    const goodsDetail = this.data.goodsDetail;
    if (!goodsDetail) return {};

    const goodsId = goodsDetail.product_ld || goodsDetail.id;

    return {
      title: goodsDetail.title || '发现一个超棒的二手好物！',
      path: `/pages/GoodDetail/GoodDetail?id=${goodsId}`,
      // ✅ 新增：自定义分享图片，提高点击率
      imageUrl: goodsDetail.image && goodsDetail.image.length > 0 ? goodsDetail.image[0] : ''
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const goodsDetail = this.data.goodsDetail;
    if (!goodsDetail) return {};

    const goodsId = goodsDetail.product_ld || goodsDetail.id;

    return {
      title: goodsDetail.title || '发现一个超棒的二手好物！',
      // ✅ 朋友圈分享通常只支持 query 参数
      query: `id=${goodsId}`,
      // ✅ 自定义海报图片
      imageUrl: goodsDetail.image && goodsDetail.image.length > 0 ? goodsDetail.image[0] : ''
    };
  },

  // ✅ 新增：跳转到卖家主页
  goToSellerHome() {
    if (!this.data.goodsDetail || !this.data.goodsDetail.seller) {
      wx.showToast({
        title: '卖家信息不存在',
        icon: 'none'
      });
      return;
    }

    const sellerId = this.data.goodsDetail.seller.id || this.data.goodsDetail.seller.userId;

    if (!sellerId) {
      wx.showToast({
        title: '卖家 ID 不存在',
        icon: 'none'
      });
      return;
    }

    console.log('跳转到卖家主页，卖家 ID:', sellerId);

    wx.navigateTo({
      url: `/pages/userHome/userHome?userId=${sellerId}`,
      success: () => {
        console.log('✅ 跳转到卖家主页成功');
      },
      fail: (err) => {
        console.error('❌ 跳转到卖家主页失败:', err);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 页面显示时触发（用于调试）
  onShow() {
    console.log('页面显示，当前商品详情:', this.data.goodsDetail);
  }
});

