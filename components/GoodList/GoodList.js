Component({
  properties: {
    goodsList: {
      type: Array,
      value: [],
      observer: function (newVal) {
        if (newVal && newVal.length > 0) {
          this.reflowWaterfall(newVal);
        }
      }
    },
    columnNum: {
      type: Number,
      value: 2 // 列数，左侧为第0列
    },
    loading: {
      type: Boolean,
      value: false
    },
    noMore: {
      type: Boolean,
      value: false
    }
  },
  data: {
    columns: [], // 存储每列的商品数据（左侧为columns[0]）
    columnHeights: [] // 若需要固定高度，可移除或设为固定值
  },
  methods: {
    /**
     * 瀑布流布局算法：左侧列优先，按行填充
     */
    reflowWaterfall(goodsList) {
      const columnNum = Math.max(this.data.columnNum, 1); // 至少1列
      const columns = Array(columnNum).fill().map(() => []);

      goodsList.forEach((goods, index) => {
        // 计算当前商品应放入的列（左侧列优先，按顺序填充）
        const columnIndex = index % columnNum;
        columns[columnIndex].push(goods);
      });

      this.setData({
        columns: columns,
        columnHeights: Array(columnNum).fill(0) // 固定高度时设为统一值
      });
    },

    // 触底加载更多（保持不变）
    onScrollToLower() {
      console.log('GoodList onScrollToLower 被触发');
      console.log('loading:', this.data.loading, 'noMore:', this.data.noMore);
      if (!this.data.loading && !this.data.noMore) {
        console.log('触发 loadmore 事件');
        this.triggerEvent('loadmore');
      } else {
        console.log('不触发 loadmore 事件');
      }
    }
  }
});