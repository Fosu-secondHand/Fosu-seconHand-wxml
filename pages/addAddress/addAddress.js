Page({
  data: {
    dormitory: '',         // 宿舍楼（直接填写）
    roomNumber: '',
    contactName: '',
    phoneNumber: '',
    gender: 'male',
    campus: '北区',        // 校区选择：仙溪北区或仙溪南区
    addressId: null,      // 地址ID（编辑时存在）
    isSubmitting: false,
    originalData: {}
  },

  onLoad(options) {
    // 检查是否为编辑模式
    const addressId = options.id;
    if (addressId) {
      // 确保addressId为数字类型
      const numAddressId = parseInt(addressId);
      this.setData({ addressId: numAddressId });
      this.loadAddressData();
    }

    // ✅ 修改：优先从后端获取最新用户信息，失败则降级使用本地缓存
    this.loadUserInfoWithFallback();
  },
  // ✅ 新增：混合策略加载用户信息（优先后端，降级本地）
  loadUserInfoWithFallback() {
    console.log('\n=== loadUserInfoWithFallback 开始执行 ===');

    // 第1步：尝试从后端获取最新数据
    this.fetchLatestUserInfoFromBackend().then(success => {
      if (!success) {
        // 第2步：后端失败，降级使用本地缓存
        console.warn('⚠️ 后端获取失败，使用本地缓存');
        this.autoFillUserInfo();
      }
    });
  },


  // ✅ 新增：从后端获取最新用户信息
  fetchLatestUserInfoFromBackend() {
    return new Promise((resolve) => {
      const app = getApp();
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');

      if (!userInfo || !userInfo.id || !token) {
        console.warn('⚠️ 用户未登录，跳过获取用户信息');
        resolve(false);
        return;
      }

      console.log('📡 从后端获取最新用户信息...');

      wx.request({
        url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
        method: 'GET',
        timeout: 10000,
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.data.code === 200 && res.data.data) {
            const userData = res.data.data;

            console.log('✅ 从后端获取到最新用户信息:', {
              nickname: userData.nickname,
              avatar: userData.avatar,
              phone: userData.phone
            });

            // ✅ 修复：同时更新本地缓存和 globalData
            const localUserInfo = wx.getStorageSync('userInfo') || {};
            const updatedUserInfo = {
              ...localUserInfo,
              nickname: userData.nickname,
              nickName: userData.nickname,  // ✅ 同时更新 nickName（兼容旧代码）
              avatar: userData.avatar,
              avatarUrl: userData.avatar,
              phone: userData.phone,
              address: userData.address
            };

            // 1️⃣ 更新本地缓存
            wx.setStorageSync('userInfo', updatedUserInfo);

            // 2️⃣ ✅ 关键修复：同步更新 app.globalData.userInfo
            app.globalData.userInfo = updatedUserInfo;

            console.log('✅ 已同步更新本地缓存和 globalData:', {
              nickname: updatedUserInfo.nickname,
              nickName: updatedUserInfo.nickName,
              avatar: updatedUserInfo.avatar
            });

            // ✅ 自动填充表单
            this.autoFillUserInfoFromBackend(userData);
            resolve(true);
          } else {
            console.error('❌ 后端返回数据格式错误:', res.data);
            resolve(false);
          }
        },
        fail: (err) => {
          console.error('❌ 获取用户信息失败，使用本地缓存', err);
          resolve(false);
        }
      });
    });
  },

  // ✅ 新增：从后端数据自动填充表单
  autoFillUserInfoFromBackend(userData) {
    console.log('\n=== autoFillUserInfoFromBackend 开始执行 ===');

    const nickname = typeof userData.nickname === 'string' ? userData.nickname : '';
    const phone = typeof userData.phone === 'string' ? userData.phone : '';
    const address = typeof userData.address === 'string' ? userData.address : '';

    console.log('解析后的用户信息:', { nickname, phone, address });

    // 解析地址字段
    let campus = '北区';
    let dormitory = '';
    let roomNumber = '';

    if (address) {
      const parts = address.split('-');
      if (parts.length >= 3) {
        campus = parts[0];
        dormitory = parts[1];
        roomNumber = parts[2];
      }
    }

    // 只有在表单为空时才自动填充
    if (!this.data.contactName && nickname) {
      this.setData({
        contactName: nickname,
        phoneNumber: this.data.phoneNumber || phone,
        campus: this.data.campus || campus,
        dormitory: this.data.dormitory || dormitory,
        roomNumber: this.data.roomNumber || roomNumber
      });
      console.log('✅ 自动填充完成:', {
        contactName: nickname,
        phoneNumber: phone
      });
    } else {
      console.log('⚠️ 联系人姓名已有值，跳过自动填充');
    }

    console.log('=== autoFillUserInfoFromBackend 执行结束 ===\n');
  },

  // ✅ 修改：页面显示时重新获取用户信息（确保获取最新昵称）
  onShow() {
    console.log('\n=== onShow: 页面显示，刷新用户信息 ===');

    // 只在添加模式下刷新联系人姓名（编辑模式不覆盖用户已输入的内容）
    if (!this.data.addressId) {
      // ✅ 修改：优先从后端获取最新数据
      this.fetchLatestUserInfoFromBackend().then(success => {
        if (!success) {
          // 降级：使用本地缓存
          console.warn('⚠️ onShow: 后端获取失败，使用本地缓存');
          const storedUserInfo = wx.getStorageSync('userInfo') || {};

          // 如果当前联系人为空，或者仍然是默认值，尝试重新填充
          if (!this.data.contactName || this.data.contactName === '微信用户') {
            console.log('检测到联系人姓名为空或默认值，尝试重新填充');

            let contactName = '';

            // ✅ 统一使用 nickname 字段
            if (storedUserInfo.nickname && storedUserInfo.nickname !== '未设置昵称') {
              contactName = storedUserInfo.nickname;
            } else if (storedUserInfo.nickName && storedUserInfo.nickName !== '微信用户') {
              contactName = storedUserInfo.nickName;
            }

            if (contactName) {
              console.log('✅ onShow: 更新联系人姓名为:', contactName);
              this.setData({ contactName: contactName });
            }
          }
        }
      });
    }
  },

  // 修改 autoFillUserInfo 方法（作为降级方案保留）
  autoFillUserInfo() {
    console.log('\n=== autoFillUserInfo 开始执行（降级方案） ===');

    // ✅ 修复：每次都从本地存储重新获取最新的 userInfo
    const storedUserInfo = wx.getStorageSync('userInfo') || {};
    console.log('当前本地 userInfo:', storedUserInfo);

    // 如果是编辑模式，则从接口获取最新用户信息
    if (this.data.addressId) {
      console.log('编辑模式，从接口获取用户信息');

      // 获取用户信息
      const app = getApp();
      const userInfo = app.globalData.userInfo;
      const token = wx.getStorageSync('token');

      if (userInfo && userInfo.id && token) {
        // 调用接口获取用户详细信息
        wx.request({
          url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
          method: 'GET',
          timeout: 10000,
          header: {
            'Authorization': token,
            'Content-Type': 'application/json'
          },
          success: (res) => {
            if (res.data.code === 200 && res.data.data) {
              const userData = res.data.data;

              // 安全访问字段并默认为空字符串
              const nickname = typeof userData.nickname === 'string' ? userData.nickname : '';
              const phone = typeof userData.phone === 'string' ? userData.phone : '';
              const address = typeof userData.address === 'string' ? userData.address : '';

              console.log('接口返回的用户信息:', { nickname, phone, address });

              // 解析地址字段
              let campus = '北区';
              let dormitory = '';
              let roomNumber = '';

              if (address) {
                const addressParts = address.split('-');
                if (addressParts.length >= 3) {
                  campus = addressParts[0];
                  dormitory = addressParts[1];
                  roomNumber = addressParts[2];
                }
              }

              const autoFilledData = {
                contactName: this.data.contactName || nickname,
                phoneNumber: this.data.phoneNumber || phone,
                campus: this.data.campus || campus,
                dormitory: this.data.dormitory || dormitory,
                roomNumber: this.data.roomNumber || roomNumber
              };

              // 编辑模式下设置原始数据
              const originalDataUpdate = {
                contactName: nickname,
                phoneNumber: phone,
                campus: campus,
                dormitory: dormitory,
                roomNumber: roomNumber
              };

              this.setData({
                ...autoFilledData,
                originalData: { ...this.data.originalData, ...originalDataUpdate }
              });

              console.log('✅ 编辑模式自动填充完成');
            }
          },
          fail: (err) => {
            console.error('获取用户信息失败:', err);
          }
        });
      }
    } else {
      // ✅ 修复：添加模式下，优先使用最新的本地缓存数据
      console.log('添加模式，从本地缓存获取用户信息');

      // ✅ 统一使用 nickname 字段
      let contactName = '';

      if (storedUserInfo.nickname && storedUserInfo.nickname !== '未设置昵称') {
        // 优先使用后端返回的昵称
        contactName = storedUserInfo.nickname;
        console.log('使用后端昵称:', contactName);
      } else if (storedUserInfo.nickName && storedUserInfo.nickName !== '微信用户') {
        // 其次使用微信授权的昵称
        contactName = storedUserInfo.nickName;
        console.log('使用微信授权昵称:', contactName);
      } else if (storedUserInfo.nickname) {
        // 如果昵称为"未设置昵称"，也使用它
        contactName = storedUserInfo.nickname;
        console.log('使用默认昵称:', contactName);
      }

      // 只有当联系人姓名为空时才填充
      if (!this.data.contactName && contactName) {
        console.log('✅ 自动填充联系人姓名:', contactName);
        this.setData({
          contactName: contactName
        });
      } else {
        console.log('⚠️ 联系人姓名已有值或无可用昵称，跳过自动填充');
      }
    }

    console.log('=== autoFillUserInfo 执行结束 ===\n');
  },


  // 修改 loadAddressData 方法
  loadAddressData() {
    const addressId = this.data.addressId; // 已经是数字类型
    const addressList = wx.getStorageSync('addressList') || [];
    const addressData = addressList.find(item => item.id === addressId);

    if (addressData) {
      this.setData({
        dormitory: addressData.dormitory,
        roomNumber: addressData.roomNumber,
        contactName: addressData.contactName,
        phoneNumber: addressData.phoneNumber,
        gender: addressData.gender === '先生' ? 'male' : 'female',
        campus: addressData.campus || '北区',
        // 不要直接将 addressData 设置为 originalData，而是保留已有的 originalData
        // originalData 字段应该包含用户原始信息，已经在 autoFillUserInfo 中设置
      });
    } else {
      wx.showToast({
        title: '地址不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // ===== 表单输入处理 =====

  handleDormitoryInput(e) {
    this.setData({ dormitory: e.detail.value });
  },

  handleRoomNumberInput(e) {
    this.setData({ roomNumber: e.detail.value });
  },

  handleContactNameInput(e) {
    this.setData({ contactName: e.detail.value });
  },

  handlePhoneNumberInput(e) {
    this.setData({ phoneNumber: e.detail.value });
  },

  // ===== 性别和校区选择 =====
  selectGender(e) {
    this.setData({ gender: e.currentTarget.dataset.gender });
  },

  selectCampus(e) {
    this.setData({ campus: e.currentTarget.dataset.campus });
  },

  // ===== 表单验证 =====
  validateForm() {
    const { dormitory, roomNumber, contactName, phoneNumber } = this.data;

    if (!dormitory) {
      wx.showToast({ title: '请填写宿舍楼', icon: 'none' });
      return false;
    }

    if (!roomNumber) {
      wx.showToast({ title: '请填写门牌号', icon: 'none' });
      return false;
    }

    if (!contactName) {
      wx.showToast({ title: '请填写联系人姓名', icon: 'none' });
      return false;
    }

    if (!phoneNumber) {
      wx.showToast({ title: '请填写手机号', icon: 'none' });
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return false;
    }

    return true;
  },

  // ===== 提交地址 =====
  submitAddress() {
    console.log('=== submitAddress 被调用 ===');
    console.log('当前 data:', this.data);

    // 防止重复提交
    if (this.data.isSubmitting) {
      console.log('⚠️ 正在提交中，跳过');
      return;
    }

    // 表单验证
    if (!this.validateForm()) {
      console.log('⚠️ 表单验证失败，跳过');
      return;
    }

    // 显示加载状态
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...', mask: true });

    // 构建地址数据
    const addressId = this.data.addressId;
    const numAddressId = addressId || Date.now();

    const addressData = {
      id: numAddressId,
      dormitory: this.data.dormitory,
      roomNumber: this.data.roomNumber,
      contactName: this.data.contactName,
      phoneNumber: this.data.phoneNumber,
      gender: this.data.gender === 'male' ? '先生' : '女士',
      campus: this.data.campus,
      createTime: addressId
          ? wx.getStorageSync('addressList').find(item => item.id === addressId)?.createTime
          : new Date().toISOString(),
      isDefault: addressId
          ? wx.getStorageSync('addressList').find(item => item.id === addressId)?.isDefault
          : wx.getStorageSync('addressList').length === 0,
    };

    console.log('📦 构建的地址数据:', addressData);

    // 保存到本地缓存
    const addressList = wx.getStorageSync('addressList') || [];
    console.log('📋 当前地址列表:', addressList);

    if (this.data.addressId) {
      // 编辑模式：替换原有地址
      const index = addressList.findIndex(item => item.id === this.data.addressId);
      if (index !== -1) {
        addressList[index] = addressData;
        console.log('✏️ 编辑模式，替换索引:', index);
      }
    } else {
      // 新增模式：添加新地址
      addressList.push(addressData);
      console.log('➕ 新增模式，地址列表长度:', addressList.length);
    }

    wx.setStorageSync('addressList', addressList);
    console.log('✅ 地址已保存到本地存储');

    // ✅ 无论是否是默认地址，都要调用接口更新用户信息
    console.log('🔍 检查 isDefault:', addressData.isDefault);

    if (addressData.isDefault) {
      console.log('📞 准备调用 updateUserDefaultAddress');
      this.updateUserDefaultAddress(addressData);
    } else {
      console.log('📞 准备调用 forceUpdateUserAddress');
      this.forceUpdateUserAddress(addressData);
    }

    // 隐藏加载状态，显示成功提示
    wx.hideLoading();
    wx.showToast({
      title: this.data.addressId ? '地址更新成功' : '地址添加成功',
      icon: 'success',
      duration: 2000
    });

    console.log('✅ 提交完成，准备返回上一页');
    // 延迟返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 2000);
  },

  forceUpdateUserAddress(addressData) {
    console.log('\n=== 🔥 forceUpdateUserAddress 开始执行 ===');

    const app = getApp();
    const userInfo = app.globalData.userInfo;
    const token = wx.getStorageSync('token');

    console.log('📌 app.globalData.userInfo:', userInfo);
    console.log('📌 wx.getStorageSync("userInfo"):', wx.getStorageSync('userInfo'));
    console.log('📌 token:', token);

    // 详细检查每个条件
    console.log('\n🔍 条件检查:');
    console.log('  - userInfo 存在？', !!userInfo);
    console.log('  - userInfo.id 存在？', userInfo ? !!userInfo.id : 'N/A');
    console.log('  - token 存在？', !!token);
    console.log('  - 所有条件满足？', !!(userInfo && userInfo.id && token));

    if (userInfo && userInfo.id && token) {
      // ✅ 修复：获取当前最新的头像和昵称，一起发送给后端
      const currentAvatar = userInfo.avatarUrl || userInfo.avatar || '';
      const currentNickname = userInfo.nickname || userInfo.nickName || '';

      console.log('📸 当前头像:', currentAvatar);
      console.log('👤 当前昵称:', currentNickname);

      const userData = {
        userId: userInfo.id,
        address: `${addressData.campus}-${addressData.dormitory}-${addressData.roomNumber}`,
        phone: addressData.phoneNumber,
        avatar: currentAvatar,        // ✅ 保留当前头像
        nickname: currentNickname,    // ✅ 保留当前昵称
        Username: currentNickname     // ✅ 保留当前用户名
      };

      console.log('\n📤 准备发送的请求数据:', userData);
      console.log('请求 URL:', `${app.globalData.baseUrl}/users/${userInfo.id}`);
      console.log('请求方法：PUT');
      console.log('请求头:', {
        'Authorization': token,
        'Content-Type': 'application/json'
      });

      wx.request({
        url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
        method: 'PUT',
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        data: userData,
        success: (res) => {
          console.log('\n✅ 请求成功！响应数据:');
          console.log('完整响应:', JSON.stringify(res, null, 2));
          console.log('res.data.code:', res.data.code);
          console.log('res.data.message:', res.data.message);

          if (res.data.code === 200) {
            console.log('🎉 用户地址已成功更新到数据库');

            // ✅ 修复：同步更新本地缓存和 globalData（包含头像和昵称）
            const localUserInfo = wx.getStorageSync('userInfo') || {};
            const updatedUserInfo = {
              ...localUserInfo,
              phone: addressData.phoneNumber,
              address: userData.address,
              avatar: currentAvatar,      // ✅ 保留头像
              avatarUrl: currentAvatar,   // ✅ 保留头像URL
              nickname: currentNickname,  // ✅ 保留昵称
              nickName: currentNickname   // ✅ 同时更新 nickName
            };

            // 1️⃣ 更新本地缓存
            wx.setStorageSync('userInfo', updatedUserInfo);

            // 2️⃣ ✅ 关键修复：同步更新 app.globalData.userInfo
            app.globalData.userInfo = updatedUserInfo;

            console.log('✅ 本地 userInfo 和 globalData 已更新（保留原有头像和昵称）');
          } else {
            console.error('❌ 更新地址失败:', res.data.message);
            wx.showToast({ title: '更新失败：' + (res.data.message || ''), icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('\n❌ 请求失败:', err);
          console.error('错误类型:', typeof err);
          console.error('错误详情:', JSON.stringify(err, null, 2));
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });

      console.log('\n📡 wx.request 已调用，等待响应...');
    } else {
      console.warn('\n⚠️ 缺少必要参数，跳过接口调用');
      console.warn('缺失的参数:', {
        userInfo: !userInfo,
        userInfoId: userInfo && !userInfo.id,
        token: !token
      });
      wx.showToast({
        title: '用户未登录',
        icon: 'none',
        duration: 2000
      });

      // 尝试从 storage 恢复 userInfo 到 globalData
      console.log('\n🔄 尝试从 storage 恢复 userInfo...');
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo) {
        app.globalData.userInfo = storedUserInfo;
        console.log('✅ 已恢复 userInfo 到 globalData');
      }
    }
  },



  updateUserDefaultAddress(addressData) {
    console.log('\n=== 🌟 updateUserDefaultAddress 开始执行 ===');

    const app = getApp();
    const userInfo = app.globalData.userInfo;
    const token = wx.getStorageSync('token');

    console.log('📌 app.globalData.userInfo:', userInfo);
    console.log('📌 token:', token);

    if (userInfo && userInfo.id && token) {
      // ✅ 修复：获取当前最新的头像和昵称
      const currentAvatar = userInfo.avatarUrl || userInfo.avatar || '';
      const currentNickname = userInfo.nickname || userInfo.nickName || '';

      console.log('📸 当前头像:', currentAvatar);
      console.log('👤 当前昵称:', currentNickname);

      const userData = {
        userId: userInfo.id,
        address: `${addressData.campus}-${addressData.dormitory}-${addressData.roomNumber}`,
        avatar: currentAvatar,        // ✅ 保留当前头像
        nickname: currentNickname,    // ✅ 保留当前昵称
        Username: currentNickname     // ✅ 保留当前用户名
      };

      console.log('\n📤 准备发送的请求数据:', userData);
      console.log('请求 URL:', `${app.globalData.baseUrl}/users/${userInfo.id}`);

      wx.request({
        url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
        method: 'PUT',
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        data: userData,
        success: (res) => {
          console.log('\n✅ 请求成功！响应数据:');
          console.log('完整响应:', JSON.stringify(res, null, 2));

          if (res.data.code === 200) {
            console.log('🎉 用户默认地址已更新');
            wx.showToast({ title: '默认地址已更新', icon: 'success' });

            // ✅ 同步更新本地缓存和 globalData（包含头像和昵称）
            const localUserInfo = wx.getStorageSync('userInfo') || {};
            const updatedUserInfo = {
              ...localUserInfo,
              address: userData.address,
              avatar: currentAvatar,      // ✅ 保留头像
              avatarUrl: currentAvatar,   // ✅ 保留头像URL
              nickname: currentNickname,  // ✅ 保留昵称
              nickName: currentNickname   // ✅ 同时更新 nickName
            };

            // 1️⃣ 更新本地缓存
            wx.setStorageSync('userInfo', updatedUserInfo);

            // 2️⃣ ✅ 关键修复：同步更新 app.globalData.userInfo
            app.globalData.userInfo = updatedUserInfo;

            console.log('✅ 本地 userInfo 和 globalData 已更新');
          } else {
            console.error('❌ 更新默认地址失败:', res.data.message);
            wx.showToast({ title: '更新失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('\n❌ 请求失败:', err);
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });

      console.log('\n📡 wx.request 已调用，等待响应...');
    } else {
      console.warn('\n⚠️ 缺少必要参数，跳过接口调用');
      wx.showToast({ title: '用户未登录', icon: 'none' });
    }
  },




  // ✅ 修复：只更新地址和手机号
  updateUserInfoOnServer(addressData) {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    const token = wx.getStorageSync('token');

    if (userInfo && userInfo.id && token) {
      // ✅ 修复：只发送地址和手机号，不发送昵称
      const userData = {
        userId: userInfo.id,
        address: `${addressData.campus}-${addressData.dormitory}-${addressData.roomNumber}`,
        phone: addressData.phoneNumber
        // ❌ 删除 nickname 和 Username 字段
      };

      console.log('=== updateUserInfoOnServer: 更新用户信息 ===');
      console.log('发送数据:', userData);

      // 调用接口更新用户信息
      wx.request({
        url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
        method: 'PUT',
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        data: userData,
        success: (res) => {
          console.log('服务器响应:', res);
          if (res.data.code === 200) {
            console.log('✅ 用户信息更新成功');
            // ✅ 同步更新本地缓存（只更新地址和手机号）
            const localUserInfo = wx.getStorageSync('userInfo') || {};
            Object.assign(localUserInfo, {
              phone: addressData.phoneNumber,
              address: userData.address
              // ❌ 不更新 nickname
            });
            wx.setStorageSync('userInfo', localUserInfo);
          } else {
            console.error('❌ 用户信息更新失败:', res.data.message);
            wx.showToast({ title: '更新失败：' + (res.data.message || ''), icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('❌ 更新用户信息请求失败:', err);
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });
    }
  },

// 修改 getChangedFields 方法（保留备用，但现在不使用）
  getChangedFields() {
    const changedFields = {};
    const { originalData } = this.data;

    // 只有当字段值发生变化时才添加到 changedFields 中
    if (this.data.contactName !== originalData.contactName) {
      changedFields.nickname = this.data.contactName;
      changedFields.Username = this.data.contactName;
    }
    if (this.data.phoneNumber !== originalData.phoneNumber) {
      changedFields.phone = this.data.phoneNumber;
    }
    if (this.data.dormitory !== originalData.dormitory ||
        this.data.roomNumber !== originalData.roomNumber ||
        this.data.campus !== originalData.campus) {
      changedFields.address = `${this.data.campus}-${this.data.dormitory}-${this.data.roomNumber}`;
    }
    if (this.data.gender !== originalData.gender) {
      changedFields.gender = this.data.gender === 'male' ? 0 : 1;
    }

    return changedFields;
  }



});
