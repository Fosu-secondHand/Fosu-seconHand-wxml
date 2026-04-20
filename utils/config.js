// utils/config.js
const config = {
    development: {
        baseUrl: 'http://139.199.87.181:8080/api',
        wsUrl: 'ws://139.199.87.181:8080/api'
    },
    production: {
        baseUrl: 'https://your-domain.com', // 部署时替换为实际域名
        wsUrl: 'wss://your-domain.com'      // HTTPS环境使用WSS
    }
};

module.exports = {
    getEnvConfig: () => {
        // 在实际项目中可通过环境变量控制
        return config.development; // 开发环境
        // return config.production; // 生产环境
    }
};
