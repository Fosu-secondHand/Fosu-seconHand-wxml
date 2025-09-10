Page({
  data: {
    feedbackContent: '',
    imageSrc: ''
  },

  // 监听文本域输入
  handleTextareaInput(e) {
    this.setData({
      feedbackContent: e.detail.value
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          imageSrc: res.tempFilePaths[0]
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
      }
    });
  },

  // 提交反馈
  submitFeedback() {
    const { feedbackContent, imageSrc } = this.data;
    if (!feedbackContent.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      });
      return;
    }
    // 这里可以添加将反馈内容发送到服务器的逻辑，比如使用 wx.request
    wx.showToast({
      title: '反馈提交成功',
      icon: 'success'
    });
    // 提交后清空文本域和图片
    this.setData({
      feedbackContent: '',
      imageSrc: ''
    });
  }
});