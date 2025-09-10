const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const isDev = (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'develop');

function request({ url, method = 'GET', data = {}, timeout = 8000 }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      timeout,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          wx.showToast({ title: '请求失败', icon: 'none' });
          console.error('接口错误:', res);
          if (isDev) {
            wx.showModal({
              title: '接口错误',
              content: JSON.stringify(res, null, 2),
              showCancel: false
            });
          }
          reject(res);
        }
      },
      fail(err) {
        if (err.errMsg && err.errMsg.indexOf('timeout') !== -1) {
          wx.showToast({ title: '请求超时，请检查网络', icon: 'none' });
        } else {
          wx.showToast({ title: '网络异常', icon: 'none' });
        }
        console.error('网络错误:', err);
        if (isDev) {
          wx.showModal({
            title: '网络错误',
            content: JSON.stringify(err, null, 2),
            showCancel: false
          });
        }
        reject(err);
      }
    });
  });
}

module.exports = {
  formatTime,
  request
}
