// mixins/authMixin.js
module.exports = {
  methods: {
    /**
     * 检查用户登录状态（增强版）
     * @returns {boolean} 是否已登录
     */
    checkLogin() {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        const token = wx.getStorageSync('token');

        console.log('🔍 检查登录状态:', {
          userInfoExists: !!userInfo,
          isLoginField: userInfo?.isLogin,
          userId: userInfo?.id,
          tokenExists: !!token,
          tokenLength: token ? token.length : 0
        });

        // ✅ 修复：更宽松的验证逻辑
        // 只要有 token 且 userInfo 存在，就认为已登录
        const hasToken = token && token.length > 0;
        const hasUserInfo = userInfo && typeof userInfo === 'object';

        // 如果缺少关键字段，尝试修复
        if (hasToken && hasUserInfo) {
          let needUpdate = false;

          // 确保 isLogin 字段存在
          if (userInfo.isLogin !== true) {
            console.warn('⚠️ userInfo.isLogin 字段缺失，自动修复');
            userInfo.isLogin = true;
            needUpdate = true;
          }

          // ✅ 关键修复：确保 id 字段存在且有效
          if (!userInfo.id || userInfo.id === 'undefined' || userInfo.id === undefined) {
            // 尝试从 userId 字段恢复
            if (userInfo.userId && userInfo.userId !== 'undefined') {
              console.warn('⚠️ userInfo.id 缺失，使用 userId 替代');
              userInfo.id = userInfo.userId;
              needUpdate = true;
            } else {
              console.error('❌ userInfo.id 和 userId 都无效，登录状态异常');
              // 清除无效的登录状态
              wx.removeStorageSync('userInfo');
              wx.removeStorageSync('token');
              return false;
            }
          }

          // 确保 id 是数字类型
          if (typeof userInfo.id === 'string') {
            const numericId = parseInt(userInfo.id);
            if (!isNaN(numericId) && numericId > 0) {
              console.warn('⚠️ userInfo.id 是字符串，转换为数字');
              userInfo.id = numericId;
              needUpdate = true;
            } else {
              console.error('❌ userInfo.id 无法转换为有效数字:', userInfo.id);
              wx.removeStorageSync('userInfo');
              wx.removeStorageSync('token');
              return false;
            }
          }

          // 如果有更新，保存到本地存储
          if (needUpdate) {
            wx.setStorageSync('userInfo', userInfo);
            console.log('✅ 用户信息已修复并保存');
          }

          console.log('✅ 用户已登录（自动修复后）', {
            id: userInfo.id,
            isLogin: userInfo.isLogin
          });
          return true;
        }

        console.warn('⚠️ 用户未登录或登录状态无效');
        return false;

      } catch (error) {
        console.error('❌ 检查登录状态失败:', error);
        return false;
      }
    },

    /**
     * 统一的登录验证方法（全局使用）
     * @param {string} operationName - 操作名称，用于提示用户
     * @param {object} options - 可选配置
     * @param {boolean} options.autoRedirect - 是否自动跳转到登录页（默认 false，显示弹窗）
     * @param {function} options.onConfirm - 确认后的回调函数
     * @returns {boolean} 是否已登录
     */
    requireLogin(operationName = '此操作', options = {}) {
      const { autoRedirect = false, onConfirm = null } = options;

      if (!this.checkLogin()) {
        console.log(`🔒 需要登录才能${operationName}`);

        if (autoRedirect) {
          // ✅ 直接跳转到登录页
          wx.showToast({
            title: '请先登录',
            icon: 'none',
            duration: 1500
          });

          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }, 1500);
        } else {
          // ✅ 显示确认弹窗
          wx.showModal({
            title: '提示',
            content: `请先登录后再进行${operationName}`,
            confirmText: '去登录',
            cancelText: '取消',
            confirmColor: '#07c160',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({
                  url: '/pages/login/login'
                });

                // ✅ 执行回调（如果需要）
                if (onConfirm && typeof onConfirm === 'function') {
                  onConfirm();
                }
              }
            }
          });
        }

        return false;
      }

      console.log('✅ 用户已登录');
      return true;
    },

    /**
     * 获取当前用户信息（增强版）
     * @returns {object|null} 用户信息对象
     */
    getCurrentUser() {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        const token = wx.getStorageSync('token');

        if (!userInfo || !token) {
          console.warn('⚠️ 用户信息或 Token 不存在');
          return null;
        }

        // ✅ 确保返回的对象包含必要字段
        const user = { ...userInfo, token };

        // 确保 id 字段存在且有效
        if (!user.id || user.id === 'undefined' || user.id === undefined) {
          if (user.userId && user.userId !== 'undefined') {
            user.id = user.userId;
          } else {
            console.error('❌ 用户 ID 无效');
            return null;
          }
        }

        // 确保 id 是数字类型
        if (typeof user.id === 'string') {
          const numericId = parseInt(user.id);
          if (!isNaN(numericId) && numericId > 0) {
            user.id = numericId;
          } else {
            console.error('❌ 用户 ID 无法转换为数字');
            return null;
          }
        }

        // 确保 isLogin 字段存在
        if (user.isLogin !== true) {
          user.isLogin = true;
        }

        return user;
      } catch (error) {
        console.error('❌ 获取用户信息失败:', error);
        return null;
      }
    },

    /**
     * 同步用户登录状态到所有页面（增强版）
     */
    syncLoginState() {
      try {
        const userInfo = wx.getStorageSync('userInfo');
        const token = wx.getStorageSync('token');

        if (userInfo && token) {
          let needUpdate = false;

          // 确保关键字段存在
          if (!userInfo.isLogin) {
            userInfo.isLogin = true;
            needUpdate = true;
          }

          // ✅ 关键修复：确保 id 字段存在且有效
          if (!userInfo.id || userInfo.id === 'undefined' || userInfo.id === undefined) {
            if (userInfo.userId && userInfo.userId !== 'undefined') {
              console.warn('⚠️ syncLoginState: 使用 userId 替代 id');
              userInfo.id = userInfo.userId;
              needUpdate = true;
            } else {
              console.error('❌ syncLoginState: 用户 ID 无效，清除登录状态');
              wx.removeStorageSync('userInfo');
              wx.removeStorageSync('token');
              return false;
            }
          }

          // 确保 id 是数字类型
          if (typeof userInfo.id === 'string') {
            const numericId = parseInt(userInfo.id);
            if (!isNaN(numericId) && numericId > 0) {
              console.warn('⚠️ syncLoginState: 将字符串 ID 转换为数字');
              userInfo.id = numericId;
              needUpdate = true;
            }
          }

          // 如果有更新，保存
          if (needUpdate) {
            wx.setStorageSync('userInfo', userInfo);
            console.log('✅ syncLoginState: 登录状态已修复并同步');
          }

          return true;
        }

        console.warn('⚠️ 无法同步登录状态：缺少必要数据');
        return false;
      } catch (error) {
        console.error('❌ 同步登录状态失败:', error);
        return false;
      }
    },

    /**
     * 退出登录（清除所有用户数据）
     */
    logout() {
      try {
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('token');

        console.log('✅ 已退出登录');

        wx.showToast({
          title: '已退出登录',
          icon: 'success',
          duration: 1500
        });

        // 延迟跳转到登录页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }, 1500);
      } catch (error) {
        console.error('❌ 退出登录失败:', error);
      }
    },

    /**
     * ✅ 新增：安全地更新 userInfo（保留关键字段）
     * @param {object} updates - 需要更新的字段
     */
    safeUpdateUserInfo(updates) {
      try {
        const existingUserInfo = wx.getStorageSync('userInfo') || {};

        // 验证关键字段是否存在
        if (!existingUserInfo.id && !existingUserInfo.userId) {
          console.error('❌ safeUpdateUserInfo: 现有 userInfo 缺少 ID 字段');
          return false;
        }

        // 合并更新
        const updatedUserInfo = {
          ...existingUserInfo,
          ...updates
        };

        // 确保关键字段不被覆盖
        if (!updatedUserInfo.id) {
          updatedUserInfo.id = existingUserInfo.id || existingUserInfo.userId;
        }
        if (!updatedUserInfo.token) {
          const token = wx.getStorageSync('token');
          if (token) {
            updatedUserInfo.token = token;
          }
        }
        if (updatedUserInfo.isLogin !== true) {
          updatedUserInfo.isLogin = true;
        }

        // 保存
        wx.setStorageSync('userInfo', updatedUserInfo);
        console.log('✅ safeUpdateUserInfo: 用户信息已安全更新', updates);

        return true;
      } catch (error) {
        console.error('❌ safeUpdateUserInfo: 更新失败', error);
        return false;
      }
    }
  }
};