Page({
  data: {
    addressList: []
  },

  onLoad() {
    this.loadAddressList();
  },

  onShow() {
    this.loadAddressList();
  },

  loadAddressList() {
    const addressList = wx.getStorageSync('addressList') || [];
    this.setData({ addressList });
  },

  navigateToAddAddress() {
    wx.navigateTo({
      url: '/pages/addAddress/addAddress'
    });
  },

  navigateToEditAddress(e) {
    // 确保获取到的ID是数字类型
    const addressId = parseInt(e.currentTarget.dataset.id);
    wx.navigateTo({
      url: `/pages/addAddress/addAddress?id=${addressId}`
    });
  },

  deleteAddress(e) {
    // 确保使用数字类型的ID
    const addressId = parseInt(e.currentTarget.dataset.id);
    const addressList = this.data.addressList;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          const newAddressList = addressList.filter(item => item.id !== addressId);

          // 如果删除后没有地址了，清空用户信息中的地址字段
          if (newAddressList.length === 0) {
            this.clearUserAddress();
          } else {
            // 检查删除的是否是默认地址
            const deletedAddress = addressList.find(item => item.id === addressId);
            if (deletedAddress && deletedAddress.isDefault) {
              // 如果删除的是默认地址，将第一个地址设为默认地址
              newAddressList[0].isDefault = true;
              // 更新用户信息中的地址字段
              this.updateUserDefaultAddress(newAddressList[0]);
            }
          }

          wx.setStorageSync('addressList', newAddressList);
          this.setData({ addressList: newAddressList });
          wx.showToast({ title: '地址已删除' });
        }
      }
    });
  },

  setDefaultAddress(e) {
    // 确保使用数字类型的ID
    const addressId = parseInt(e.currentTarget.dataset.id);
    let addressList = this.data.addressList;

    // 更新地址列表中的默认地址设置
    addressList = addressList.map(item => ({
      ...item,
      isDefault: item.id === addressId
    }));

    wx.setStorageSync('addressList', addressList);
    this.setData({ addressList });

    // 获取新的默认地址并更新到用户信息中
    const newDefaultAddress = addressList.find(item => item.id === addressId);
    if (newDefaultAddress) {
      this.updateUserDefaultAddress(newDefaultAddress);
    }

    wx.showToast({ title: '已设为默认地址' });
  },

  // 新增方法：更新用户信息中的默认地址
  updateUserDefaultAddress(addressData) {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    const token = wx.getStorageSync('token');

    if (userInfo && userInfo.id && token) {
      const userData = {
        userId: userInfo.id,
        address: `${addressData.campus}-${addressData.dormitory}-${addressData.roomNumber}`,
        phone: addressData.phoneNumber,  // 添加手机号更新
        nickname: addressData.contactName  // 添加昵称更新
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

  // 在 address.js 中添加以下方法
  clearUserAddress() {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    const token = wx.getStorageSync('token');

    if (userInfo && userInfo.id && token) {
      const userData = {
        userId: userInfo.id,
        address: "" // 清空地址字段
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
            console.log('用户地址已清空');
            wx.showToast({ title: '地址已清空', icon: 'success' });
          } else {
            console.error('清空地址失败:', res.data.message);
            wx.showToast({ title: '清空失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('清空地址请求失败:', err);
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });
    }
  }
});
