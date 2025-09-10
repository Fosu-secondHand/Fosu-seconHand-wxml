Component({
    properties: {
        visible: {
            type: Boolean,
            value: false
        },
        price: {
            type: String,
            value: ''
        }
    },
    data: {
        serviceFee: '0.00',
        finalAmount: '0.00'
    },
    observers: {
        price(val) {
            this.updatePriceDetail(val);
        }
    },
    methods: {
        onInput(e) {
            let value = e.detail.value.replace(/[^\d.]/g, '');
            value = value.replace(/^(\d+)(\.\d{0,2})?.*$/, (match, int, dec) => int + (dec || ''));
            this.triggerEvent('input', value);
            this.updatePriceDetail(value);
        },
        updatePriceDetail(val) {
            const price = parseFloat(val) || 0;
            const serviceRate = 0.006;
            const serviceFee = +(price * serviceRate).toFixed(2);
            const finalAmount = +(price - serviceFee).toFixed(2);
            this.setData({
                serviceFee: serviceFee.toFixed(2),
                finalAmount: finalAmount.toFixed(2)
            });
        },
        onConfirm() {
            this.triggerEvent('confirm');
        },
        onClose() {
            this.triggerEvent('close');
        }
    }
}); 