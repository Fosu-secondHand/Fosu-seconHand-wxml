Page({
  data: {
    faqList: [
      {
        id: 1,
        question: "如何修改我的收货地址？",
        answer: "您可以在个人中心-我的地址中修改或添加新的收货地址。",
        expanded: false
      },
      {
        id: 2,
        question: "如何查看我的订单状态？",
        answer: "您可以在个人中心-我的订单中查看所有订单的当前状态。",
        expanded: false
      },
      {
        id: 3,
        question: "如何申请退款？",
        answer: "在订单详情页点击'申请退款'，按提示填写退款原因并提交，我们会尽快处理。",
        expanded: false
      },
      {
        id: 4,
        question: "商品多久可以送达？",
        answer: "一般情况下，同城订单1-3天送达，异地订单3-5天送达，具体以物流信息为准。",
        expanded: false
      },
      {
        id: 5,
        question: "如何联系人工客服？",
        answer: "您可以通过在线客服、电话400-123-4567或邮件support@example.com联系我们。",
        expanded: false
      }
    ]
  },

  // 打开在线客服聊天
  openOnlineChat() {
    wx.navigateTo({
      url: '/pages/onlineChat/onlineChat'
    });
  },

  // 拨打电话
  makePhoneCall() {
    wx.makePhoneCall({
      phoneNumber: '4001234567'
    });
  },

  // 发送邮件
  sendEmail() {
    wx.setClipboardData({
      data: 'support@example.com',
      success: () => {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        });
      }
    });
  },

  // 切换FAQ展开/收起
  toggleFaq(e) {
    const id = e.currentTarget.dataset.id;
    const faqList = this.data.faqList.map(item => {
      if (item.id === id) {
        return { ...item, expanded: !item.expanded };
      }
      return item;
    });
    this.setData({ faqList });
  },

  // 跳转到反馈页面
  navigateToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  }
});