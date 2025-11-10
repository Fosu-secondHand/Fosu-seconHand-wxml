Page({
  data: {
    description: '',
    images: [],
    shippingMethod: 'seller',
    loading: false
  },

  // 处理描述输入
  onDescriptionChange(e) {
    this.setData({ description: e.detail.value });
  },

  // 选择图片
  chooseImage() {
    const maxCount = 9 - this.data.images.length;
    if (maxCount <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ images: [...this.data.images, ...res.tempFilePaths] });
      }
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  // 切换交易方式
  onShippingChange(e) {
    this.setData({ shippingMethod: e.detail.value });
  },

  // 修改 submitPublish 方法
  submitPublish() {
    if (!this.data.description.trim()) {
      return wx.showToast({ title: '请填写商品描述', icon: 'none' });
    }
    if (this.data.images.length === 0) {
      return wx.showToast({ title: '请上传图片', icon: 'none' });
    }

    // 检查用户登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    // 如果未登录，显示登录提示弹窗
    if (!token || !userInfo || !userInfo.id) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再发布商品',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    // 检查用户地址信息
    this.checkUserAddress(userInfo, token);
  },

// 新增检查用户地址信息的方法
  checkUserAddress(userInfo, token) {
    this.setData({ loading: true });

    // 获取用户详细信息
    this.getUserDetail(userInfo.id, token).then(userDetail => {
      // 检查用户是否有地址信息
      if (!userDetail.address || userDetail.address.trim() === '') {
        this.setData({ loading: false });
        // 如果没有地址信息，提示用户先填写地址
        wx.showModal({
          title: '提示',
          content: '请先完善您的收货地址信息',
          confirmText: '去填写',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/address/address'
              });
            }
          }
        });
        return;
      }

      // 如果有地址信息，继续执行发布操作
      this.publishWantItem(userInfo, token);
    }).catch(err => {
      console.error('获取用户信息失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    });
  },


  // 发布求购商品
  publishWantItem(userInfo, token) {
    const app = getApp();

    // 首先获取用户详细信息
    this.getUserDetail(userInfo.id, token).then(userDetail => {
      // 首先上传图片
      this.uploadImages(token).then(imageUrls => {
        // 解析用户地址信息
        let campus = "佛山大学";
        let address = "";

        if (userDetail.address) {
          const addressParts = userDetail.address.split('-');
          if (addressParts.length >= 3) {
            campus = addressParts[0];  // 校区
            address = `${addressParts[1]}-${addressParts[2]}`;  // 宿舍楼栋-宿舍号
          } else if (addressParts.length === 2) {
            campus = addressParts[0];
            address = addressParts[1];
          } else {
            address = userDetail.address;
          }
        }

        // 构建求购商品数据
        const wantGoods = {
          sellerId: userInfo.id,
          title: this.data.description,
          description: this.data.description,
          transactionMethod: this.data.shippingMethod === 'buyer' ? 'Pickup' : 'Delivery',
          categoryId: 7, // 默认使用"其他闲置"分类
          price: 0, // 求购商品暂时设为0
          condition: 'NEW', // 默认成色
          image: imageUrls,
          status: "ON_SALE",
          postTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          viewCount: 0,
          campus: campus, // 解析后的校区
          address: address, // 解析后的宿舍信息
          favoriteCount: 0,
          wantToBuy: 0,
          productType: "WANT" // 标识为求购商品
        };

        // 调用商品发布接口
        wx.request({
          url: app.globalData.baseUrl + '/products/publish',
          method: 'POST',
          header: {
            'content-type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          data: wantGoods,
          success: (res) => {
            if (res.statusCode === 200 || res.statusCode === 201) {
              if (res.data && (res.data.code === 200 || res.data.code === 201 || !res.data.code)) {
                wx.showToast({
                  title: '发布成功',
                  icon: 'success',
                  duration: 2000,
                  success: () => {
                    this.setData({
                      description: '',
                      images: [],
                      shippingMethod: 'seller',
                      loading: false
                    });
                    setTimeout(() => {
                      wx.navigateBack();
                    }, 2000);
                  }
                });
              } else {
                this.setData({ loading: false });
                let errorMsg = '发布失败';
                if (res.data && res.data.message) {
                  errorMsg = res.data.message;
                }
                wx.showToast({
                  title: errorMsg,
                  icon: 'none'
                });
              }
            } else {
              this.setData({ loading: false });
              wx.showToast({
                title: `发布失败: ${res.statusCode}`,
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            console.error('发布请求失败:', err);
            this.setData({ loading: false });
            wx.showToast({
              title: '发布失败，请重试',
              icon: 'none'
            });
          }
        });
      }).catch(err => {
        console.error('图片上传失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '图片上传失败: ' + (err.message || ''),
          icon: 'none'
        });
      });
    }).catch(err => {
      console.error('获取用户信息失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    });
  },

// 获取用户详细信息
  getUserDetail(userId, token) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      wx.request({
        url: `${app.globalData.baseUrl}/users/${userId}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.code === 200) {
            resolve(res.data.data);
          } else {
            reject(new Error(res.data.message || '获取用户信息失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // 上传图片方法（参考idle.js实现）
  uploadImages(token) {
    return new Promise((resolve, reject) => {
      if (this.data.images.length === 0) {
        resolve([]);
        return;
      }

      const app = getApp();
      if (!app.globalData.baseUrl) {
        reject(new Error('API地址未配置'));
        return;
      }

      const uploadPromises = this.data.images.map((imagePath, index) => {
        return new Promise((resolve, reject) => {
          wx.uploadFile({
            url: app.globalData.baseUrl + '/products/upload/image',
            filePath: imagePath,
            name: 'file',
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: (res) => {
              if (res.statusCode === 200) {
                try {
                  const data = JSON.parse(res.data);
                  const imageUrl = data.data || data.url || null;
                  if (imageUrl) {
                    resolve(imageUrl);
                  } else {
                    reject(new Error(`第${index+1}张图片上传返回数据格式不正确`));
                  }
                } catch (parseError) {
                  reject(new Error(`第${index+1}张图片上传数据解析失败`));
                }
              } else {
                reject(new Error(`第${index+1}张图片上传失败，状态码: ${res.statusCode}`));
              }
            },
            fail: (err) => {
              console.error(`第${index+1}张图片上传失败:`, err);
              reject(new Error(`第${index+1}张图片上传失败: ${err.errMsg || '网络错误'}`));
            }
          });
        });
      });

      Promise.all(uploadPromises)
          .then(resolve)
          .catch(reject);
    });
  }
});
