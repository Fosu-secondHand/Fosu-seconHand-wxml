// message.js
// mock.js
const messages = Array.from({ length: 50 }, (_, i) => ({
  avatar: '/static/assets/icons/default-avatar.png',
  title: `用户${i + 1}`,
  receiver: `用户${i + 1}`, // 添加receiver字段，与title保持一致
  text: `这是第${i + 1}条消息内容，感谢您的关注。`,
  date: `2024-06-${i + 1}`
}));

module.exports = {
  messages
};