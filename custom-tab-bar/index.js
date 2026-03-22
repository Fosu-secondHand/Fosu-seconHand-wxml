// custom-tab-bar/index.js
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
        selectedIconPath: "/static/961df7afec79a199b774eea2cc5e038-imageonline.co-2303977.png",
        badge: 0  // 消息红点数字
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        iconPath: "/static/40a249b86c909991b0c2f843b22a5f6-imageonline.co-3730619.png",
        selectedIconPath: "/static/40a249b86c909991b0c2f843b22a5f6-imageonline.co-3730619.png"
      }
    ]
  },

  // 组件生命周期
  lifetimes: {
    attached() {
      console.log('=== TabBar 组件已加载 ===');

      // 组件实例进入页面节点树时执行
      this.updateBadgeFromGlobal();

      // ✅ 修复：从本地存储恢复选中状态
      const lastSelected = wx.getStorageSync('lastSelectedTab') || 0;
      if (lastSelected !== this.data.selected) {
        this.setData({
          selected: lastSelected
        });
      }

      // 监听全局数据变化
      const app = getApp();
      if (app) {
        this.app = app;
      }
    },

    // 组件销毁时清理
    detached() {
      console.log('=== TabBar 组件已卸载 ===');
      this.stopObserving();
    }
  },

  // 监听全局数据变化
  pageLifetimes: {
    show() {
      // 页面显示时更新红点和选中状态
      console.log('=== TabBar show，更新红点 ===');

      // ✅ 修复：强制立即更新，不依赖延迟
      this.updateBadgeFromGlobal();

      // ✅ 同步选中状态 - 延迟一点确保页面栈已经更新
      setTimeout(() => {
        this.syncSelectedState();
      }, 50);
    },
    hide() {
      // 页面隐藏时也更新红点
      console.log('=== TabBar hide，更新红点 ===');
      this.updateBadgeFromGlobal();
    }
  },

  methods: {
    // ✅ 新增：同步选中状态的方法
    syncSelectedState() {
      try {
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];

        if (!currentPage) return;

        const currentPagePath = '/' + currentPage.route;
        console.log('=== 当前页面路径:', currentPagePath);

        this.data.list.forEach((item, index) => {
          if (item.pagePath === currentPagePath) {
            console.log('=== 匹配到索引:', index);
            if (this.data.selected !== index) {
              this.setData({
                selected: index
              });
              wx.setStorageSync('lastSelectedTab', index);
            }
          }
        });
      } catch (error) {
        console.error('=== 同步选中状态失败:', error);
      }
    },


    // 切换页面方法
    onTabTap(e) {
      const index = e.currentTarget.dataset.index;
      const pagePath = this.data.list[index].pagePath;

      console.log('=== 点击 TabBar 索引:', index, '路径:', pagePath);

      // ✅ 修复：先更新选中状态
      this.setData({
        selected: index
      });

      // 保存到本地存储
      wx.setStorageSync('lastSelectedTab', index);

      // ✅ 新增：检查是否是当前页面，如果是则不跳转
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentPath = '/' + currentPage.route;

      if (currentPath === pagePath) {
        console.log('=== 已在目标页面，无需跳转 ===');
        return;
      }

      // 跳转到对应页面
      wx.switchTab({
        url: pagePath,
        success: () => {
          console.log('=== switchTab 成功 ===');
        },
        fail: (err) => {
          console.error('=== switchTab 失败:', err);
        }
      });
    },

    // 更新消息红点数字（对外暴露的方法）
    updateMessageBadge(count) {
      console.log('=== TabBar 收到更新请求，红点设置为:', count);

      // ✅ 修复：确保 count 是数字类型
      count = parseInt(count) || 0;

      const list = this.data.list;
      list[2].badge = count; // 消息项在索引 2

      console.log('=== 更新后的 list[2]:', list[2]);
      console.log('=== 更新后的 badge 值:', list[2].badge);

      this.setData({
        list: list
      }, () => {
        console.log('=== TabBar 红点更新完成 ===');
      });
    },

    // 从全局数据更新红点（核心方法）
    updateBadgeFromGlobal() {
      const app = getApp();
      let count = 0;

      // 优先从全局数据获取（最新的）
      if (app.globalData && app.globalData.unreadMessageCount !== undefined) {
        count = app.globalData.unreadMessageCount;
        console.log('=== 从全局数据获取未读数:', count);
      } else {
        // 其次从本地存储获取
        count = wx.getStorageSync('unreadMessageCount') || 0;
        console.log('=== 从本地存储获取未读数:', count);
      }

      // ✅ 修复：确保 count 是数字
      count = parseInt(count) || 0;

      console.log('=== 最终确定的未读数:', count);

      // 更新红点显示
      this.updateMessageBadge(count);
    },

    // 停止监听
    stopObserving() {
      if (this.appObserver) {
        clearInterval(this.appObserver);
        this.appObserver = null;
        console.log('=== 已停止全局数据监听 ===');
      }
    }
  }
});