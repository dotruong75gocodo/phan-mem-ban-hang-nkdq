# Sử dụng Node.js để build ứng dụng frontend trước
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# Chạy lệnh build ra file tĩnh (thư mục dist hoặc build)
RUN npm run build

# Sử dụng Nginx để phục vụ giao diện web tĩnh giúp tăng tốc độ tải trang
FROM nginx:alpine

# Sao chép các file đã build từ bước trước vào thư mục chạy mặc định của Nginx
# Lưu ý: Thay "dist" thành "build" nếu dự án của bạn dùng Create React App cũ tạo ra thư mục build
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
