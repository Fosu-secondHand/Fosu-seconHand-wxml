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
    addressList = addressList.map(item => ({
      ...item,
      isDefault: item.id === addressId
    }));
    wx.setStorageSync('addressList', addressList);
    this.setData({ addressList });
    wx.showToast({ title: '已设为默认地址' });
  }
});