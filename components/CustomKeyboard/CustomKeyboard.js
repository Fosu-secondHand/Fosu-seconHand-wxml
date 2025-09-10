Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },
  data: {
    inputValue: ''
  },
  methods: {
    onKeyTap(e) {
      const key = e.currentTarget.dataset.key;
      let value = this.data.inputValue;
      // 只允许一个小数点，且最多两位小数
      if (key === '.') {
        if (value.indexOf('.') !== -1) return;
        if (!value) value = '0';
      }
      value += key;
      value = value.replace(/^(\d+)(\.\d{0,2})?.*$/, (match, int, dec) => int + (dec || ''));
      this.setData({ inputValue: value });
      this.triggerEvent('input', { value });
    },
    onDelete() {
      let value = this.data.inputValue;
      value = value.slice(0, -1);
      this.setData({ inputValue: value });
      this.triggerEvent('input', { value });
    },
    onHide() {
      this.triggerEvent('hide');
    },
    onConfirm() {
      this.triggerEvent('confirm', { value: this.data.inputValue });
    },
    setValue(val) {
      this.setData({ inputValue: val });
    }
  }
}); 