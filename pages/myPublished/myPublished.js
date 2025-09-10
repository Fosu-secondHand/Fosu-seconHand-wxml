Page({
  data: {
    goodsList: []
  },

  onLoad() {
    this.loadGoodsList();
  },

  onShow() {
    this.loadGoodsList();
  },

  loadGoodsList() {
    // 这里模拟从缓存获取商品列表，实际应用中应从服务器获取
    const goodsList = wx.getStorageSync('myPublishGoodsList') || [];
    this.setData({ goodsList });
  },

  editGoods(e) {
    try {
      const goodsId = parseInt(e.currentTarget.dataset.id);
      console.log('正在编辑商品ID:', goodsId);
      
      const goods = this.data.goodsList.find(item => item.id === goodsId);
      console.log('找到的商品信息:', goods);
      
      if (goods) {
        // 将商品信息存储到本地，以便在编辑页面使用
        wx.setStorageSync('editingGoods', goods);
        
        // 跳转到编辑页面
        wx.navigateTo({
          url: '/pages/editIdle/editIdle',
          success: () => {
            console.log('跳转到编辑页面成功');
          },
          fail: (error) => {
            console.error('跳转失败，错误信息:', error);
            wx.showToast({
              title: '跳转失败: ' + error.errMsg,
              icon: 'none',
              duration: 2000
            });
          }
        });
      } else {
        console.error('未找到商品信息');
        wx.showToast({
          title: '商品信息获取失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('编辑商品时发生错误:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  deleteGoods(e) {
    const goodsId = e.currentTarget.dataset.id;
    const goodsList = this.data.goodsList;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件商品吗？',
      success: (res) => {
        if (res.confirm) {
          const newGoodsList = goodsList.filter(item => item.id!== goodsId);
          wx.setStorageSync('myPublishGoodsList', newGoodsList);
          this.setData({ goodsList: newGoodsList });
          wx.showToast({ title: '商品已删除' });
        }
      }
    });
  }
});