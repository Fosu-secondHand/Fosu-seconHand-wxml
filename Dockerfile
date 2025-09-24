# 第一阶段：构建静态文件
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 运行构建命令，生成 dist 或 build 文件夹
RUN npm run build

# 第二阶段：使用 Nginx 服务构建好的静态文件
FROM nginx:stable-alpine

# 将第一阶段构建好的 dist 文件夹复制到 Nginx 的默认静态文件目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 如果需要自定义 Nginx 配置（例如处理 History 路由模式），取消注释下一行
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 Nginx 的端口（80）
EXPOSE 80

# 容器启动时运行 Nginx，并以非守护进程模式运行（这样 Docker 才能跟踪进程）
CMD ["nginx", "-g", "daemon off;"]