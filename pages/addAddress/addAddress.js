Page({
  data: {
    dormitory: '',         // 宿舍楼（直接填写）
    roomNumber: '',
    contactName: '',
    phoneNumber: '',
    gender: 'male',
    tag: 'dormitory',
    imageSrc: '',
    addressId: null,      // 地址ID（编辑时存在）
    isSubmitting: false
  },

  onLoad(options) {
    // 检查是否为编辑模式
    const addressId = options.id;
    if (addressId) {
      this.setData({ addressId });
      this.loadAddressData();
    }
  },

  // 加载要编辑的地址数据
  loadAddressData() {
    const addressId = this.data.addressId;
    const addressList = wx.getStorageSync('addressList') || [];
    const addressData = addressList.find(item => item.id === parseInt(addressId));
    
    if (addressData) {
      this.setData({
        dormitory: addressData.dormitory,
        roomNumber: addressData.roomNumber,
        contactName: addressData.contactName,
        phoneNumber: addressData.phoneNumber,
        gender: addressData.gender === '先生' ? 'male' : 'female',
        tag: addressData.tag,
        imageSrc: addressData.imageUrl || ''
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

  // ===== 性别和标签选择 =====
  selectGender(e) {
    this.setData({ gender: e.currentTarget.dataset.gender });
  },

  selectTag(e) {
    this.setData({ tag: e.currentTarget.dataset.tag });
  },

  // ===== 图片上传 =====
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ imageSrc: res.tempFilePaths[0] });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
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
    const addressData = {
      id: this.data.addressId || Date.now(),  // 编辑时使用原有ID，新增时生成新ID
      dormitory: this.data.dormitory,
      roomNumber: this.data.roomNumber,
      contactName: this.data.contactName,
      phoneNumber: this.data.phoneNumber,
      gender: this.data.gender === 'male' ? '先生' : '女士',
      tag: this.data.tag,
      imageUrl: this.data.imageSrc || '',
      createTime: this.data.addressId 
        ? wx.getStorageSync('addressList').find(item => item.id === this.data.addressId)?.createTime 
        : new Date().toISOString(),  // 保留原有创建时间
      isDefault: this.data.addressId 
        ? wx.getStorageSync('addressList').find(item => item.id === this.data.addressId)?.isDefault 
        : wx.getStorageSync('addressList').length === 0  // 新增时如果是第一个地址设为默认
    };
    
    // 保存到本地缓存
    const addressList = wx.getStorageSync('addressList') || [];
    
    if (this.data.addressId) {
      // 编辑模式：替换原有地址
      const index = addressList.findIndex(item => item.id === this.data.addressId);
      if (index !== -1) {
        addressList[index] = addressData;
      }
    } else {
      // 新增模式：添加新地址
      addressList.push(addressData);
    }
    
    wx.setStorageSync('addressList', addressList);
    
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
  }
});