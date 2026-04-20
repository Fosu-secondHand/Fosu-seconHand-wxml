Page({
  data: {
    faqList: [
      {
        id: 1,
        question: "如何进行交易？",
        answer: "买家可在商品详情页点击‘发起交易’按钮等待卖家回应，卖家可在消息页面选择同意或拒绝买家的交易请求，若同意请求则完成交易，商品会显示已卖出。",
        expanded: false
      },
      {
        id: 2,
        question: "如何联系卖家？",
        answer: "用户可在商品详情页点击‘聊一聊’按钮发起聊天，并在消息页面接收与发送后续消息。",
        expanded: false
      },
      {
        id: 3,
        question: "如何查看我的订单状态？",
        answer: "您可以在个人中心-我的订单中查看所有订单的当前状态。",
        expanded: false
      },
      {
        id: 4,
        question: "如何修改我的收货地址？",
        answer: "您可以在个人中心-我的地址中修改或添加新的收货地址。",
        expanded: false
      },

      {
        id: 5,
        question: "如何联系人工客服？",
        answer: "您可以通过在线客服或邮件 fosu_secondhand@163.com 联系我们。",
        expanded: false
      }
    ]
  },

  // 发送邮件
  sendEmail() {
    wx.setClipboardData({
      data: 'fosu_secondhand@163.com',
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
  }
});
