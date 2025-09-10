Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/static/cd865e0a907822eb17935e49fb102d9-imageonline.co-4838881.png",
        selectedIconPath: "/static/cd865e0a907822eb17935e49fb102d9-imageonline.co-4838881.png"
      },
      {
        pagePath: "/pages/chooseIdle/chooseIdle",
        text: "闲置",
        iconPath: "/static/9db7639e2f93f96d424dbaef7790a1b-imageonline.co-5587387.png",
        selectedIconPath: "/static/9db7639e2f93f96d424dbaef7790a1b-imageonline.co-5587387.png"
      },
      {
        pagePath: "/pages/message/message",
        text: "消息",
        iconPath: "/static/961df7afec79a199b774eea2cc5e038-imageonline.co-2303977.png",
        selectedIconPath: "/static/961df7afec79a199b774eea2cc5e038-imageonline.co-2303977.png"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        iconPath: "/static/40a249b86c909991b0c2f843b22a5f6-imageonline.co-3730619.png",
        selectedIconPath: "/static/40a249b86c909991b0c2f843b22a5f6-imageonline.co-3730619.png"
      }
    ]
  },
  methods: {
    onTabTap(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];
      if (!item) return;
      wx.switchTab({ url: item.pagePath });
    },
    setSelected(index) {
      this.setData({ selected: index });
    }
  }
});

