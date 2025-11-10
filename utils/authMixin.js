// mixins/authMixin.js
module.exports = {
  methods: {
    checkLogin() {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        const token = wx.getStorageSync('token');
        return !!(userInfo && userInfo.isLogin && token);
      } catch (error) {
        console.error('检查登录状态失败:', error);
        return false;
      }
    },

    requireLogin(operationName = '此操作') {
      if (!this.checkLogin()) {
        wx.showModal({
          title: '提示',
          content: `请先登录后再进行${operationName}`,
          confirmText: '去登录',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/login/login'
              });
            }
          }
        });
        return false;
      }
      return true;
    }
  }
};
