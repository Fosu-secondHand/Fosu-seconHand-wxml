Component({
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false }
  },
  data: {
    statusBarHeight: 10,
    bgImageStyle: ''
  },
  lifetimes: {
    attached() {
      const info = wx.getSystemInfoSync();
      this.setData({ 
        statusBarHeight: info.statusBarHeight || 20,
        // 动态设置背景图片样式 - 使用contain确保图片完全显示
        bgImageStyle: 'background: url("/static/上目录栏.png") no-repeat center/contain;'
      });
    }
  },
  methods: {
    onBack() {
      wx.navigateBack({ delta: 1 });
    }
  }
});

