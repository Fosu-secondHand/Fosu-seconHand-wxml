const generateMockChatRecords = (sender, receiver) => {
  const baseTime = Date.now() - 50 * 60 * 1000; // 50分钟前
  return Array.from({ length: 50 }, (_, i) => ({
    id: `msg-${baseTime + i}`,
    sender: i % 2 === 0 ? sender : receiver,
    content: `消息内容${i + 1}`,
    timestamp: new Date(baseTime + i * 60 * 1000).toISOString()
  }));
};

module.exports = {
  getChatRecords: (sender, receiver) => {
    return new Promise((resolve, reject) => {
      const records = generateMockChatRecords(sender, receiver);
      resolve(records);
    });
  },
  sendMessage: (data) => {
    return new Promise((resolve, reject) => {
      const { message } = data;
      const records = generateMockChatRecords(message.sender, message.receiver);
      records.push({
        ...message,
        id: message.id || `msg-${Date.now()}`,
        timestamp: new Date().toISOString()
      });
      resolve({ success: true, message });
    });
  },
  getMockLinks: () => {
    return Promise.resolve([
      {
        title: '淘宝热卖商品',
        url: 'https://www.taobao.com',
        desc: '淘宝热卖商品推荐，超值优惠'
      },
      {
        title: '京东秒杀',
        url: 'https://www.jd.com',
        desc: '京东限时秒杀，低价抢购'
      },
      {
        title: '拼多多百亿补贴',
        url: 'https://mobile.yangkeduo.com',
        desc: '拼多多百亿补贴，天天低价'
      }
    ]);
  }
};