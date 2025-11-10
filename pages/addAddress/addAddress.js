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

    // 自动填充用户信息
    this.autoFillUserInfo();
  },

  // 修改 autoFillUserInfo 方法，避免在添加模式下自动填充
  autoFillUserInfo() {
    // 如果是编辑模式，则自动填充用户信息
    if (this.data.addressId) {
      // 获取用户信息
      const app = getApp();
      const userInfo = app.globalData.userInfo;
      const token = wx.getStorageSync('token');

      if (userInfo && userInfo.id && token) {
        // 调用接口获取用户详细信息
        wx.request({
          url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
          method: 'GET',
          timeout: 10000, // 添加超时时间
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
            }
          },
          fail: (err) => {
            console.error('获取用户信息失败:', err);
          }
        });
      }
    }
    // 添加模式下不自动填充用户信息，保持表单为空
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
    // 防止重复提交
    if (this.data.isSubmitting) return;

    // 表单验证
    if (!this.validateForm()) return;

    // 显示加载状态
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    // 构建地址数据
    const addressId = this.data.addressId;
    const numAddressId = addressId || Date.now();

    const addressData = {
      id: numAddressId,  // 编辑时使用数字类型的ID，新增时生成新ID
      dormitory: this.data.dormitory,
      roomNumber: this.data.roomNumber,
      contactName: this.data.contactName,
      phoneNumber: this.data.phoneNumber,
      gender: this.data.gender === 'male' ? '先生' : '女士',
      campus: this.data.campus,
      createTime: addressId
          ? wx.getStorageSync('addressList').find(item => item.id === addressId)?.createTime
          : new Date().toISOString(),  // 保留原有创建时间
      isDefault: addressId
          ? wx.getStorageSync('addressList').find(item => item.id === addressId)?.isDefault
          : wx.getStorageSync('addressList').length === 0,  // 新增时如果是第一个地址设为默认
    };

    // 保存到本地缓存
    const addressList = wx.getStorageSync('addressList') || [];

    if (this.data.addressId) {
      // 编辑模式：替换原有地址
      // addressId已经是数字类型，可以直接比较
      const index = addressList.findIndex(item => item.id === this.data.addressId);
      if (index !== -1) {
        addressList[index] = addressData;
      }
    } else {
      // 新增模式：添加新地址
      addressList.push(addressData);
    }

    wx.setStorageSync('addressList', addressList);

    // 如果这是默认地址，或者这是第一个地址（自动设为默认），则更新用户信息
    if (addressData.isDefault) {
      this.updateUserDefaultAddress(addressData);
    }

    // 同时更新后端用户信息
    this.updateUserInfoOnServer(addressData);

    // 隐藏加载状态，显示成功提示
    wx.hideLoading();
    wx.showToast({
      title: this.data.addressId ? '地址更新成功' : '地址添加成功',
      icon: 'success',
      duration: 2000
    });

    // 延迟返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 2000);
  },

// 新增方法：更新用户信息中的默认地址
  updateUserDefaultAddress(addressData) {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    const token = wx.getStorageSync('token');

    if (userInfo && userInfo.id && token) {
      const userData = {
        userId: userInfo.id,
        address: `${addressData.campus}-${addressData.dormitory}-${addressData.roomNumber}`
      };

      wx.request({
        url: `${app.globalData.baseUrl}/users/${userInfo.id}`,
        method: 'PUT',
        header: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        data: userData,
        success: (res) => {
          if (res.data.code === 200) {
            console.log('用户默认地址已更新');
            wx.showToast({ title: '默认地址已更新', icon: 'success' });
          } else {
            console.error('更新默认地址失败:', res.data.message);
            wx.showToast({ title: '更新失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('更新默认地址请求失败:', err);
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });
    }
  },


  // 修改 updateUserInfoOnServer 方法，确保完全不传递 openid 字段
  updateUserInfoOnServer(addressData) {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    const token = wx.getStorageSync('token');

    if (userInfo && userInfo.id && token) {
      // 获取变更字段
      const changedFields = this.getChangedFields();
      console.log('变更的字段:', changedFields);

      // 如果没有字段变更，则不发送请求
      if (Object.keys(changedFields).length === 0) {
        console.log('没有字段变更，无需更新用户信息');
        wx.showToast({ title: '没有信息变更', icon: 'none' });
        return;
      }

      // 构建用户信息更新数据，明确排除不需要的字段
      const userData = {
        userId: userInfo.id,
        ...changedFields
      };

      // 确保不传递以下字段
      const excludeFields = ['openid', 'avatar', 'datetime', 'lastLogin', 'creditScore', 'status'];
      excludeFields.forEach(field => {
        delete userData[field];
      });

      console.log('发送到服务器的数据:', userData);

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
            console.log('用户信息更新成功');
            wx.showToast({ title: '信息更新成功', icon: 'success' });
          } else {
            console.error('用户信息更新失败:', res.data.message);
            wx.showToast({ title: '更新失败: ' + (res.data.message || ''), icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('更新用户信息请求失败:', err);
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });
    }
  },
// 修改 getChangedFields 方法
  getChangedFields() {
    const changedFields = {};
    const { originalData } = this.data;

    // 只有当字段值发生变化时才添加到changedFields中
    if (this.data.contactName !== originalData.contactName) {
      changedFields.nickname = this.data.contactName;
      changedFields.Username = this.data.contactName; // 同步更新Username
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
