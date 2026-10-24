FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production
COPY . .

# Thay đổi từ cổng 5000 thành cổng 3000 theo cấu hình server của bạn
EXPOSE 3000

CMD ["node", "server.js"]
