#!/bin/bash

# 1. Kiểm tra xem có file nào thay đổi không
if [ -z "$(git status --porcelain)" ]; then
    echo "❌ Không có thay đổi nào để push!"
    exit 1
fi

# 2. Gom tất cả các tệp thay đổi (trừ các file trong .gitignore)
git add .

# 3. Yêu cầu bạn nhập nội dung commit (ghi chú)
echo "📝 Nhập nội dung commit (Ví dụ: fix bug, update api...):"
read commit_message

# Nếu bạn không nhập gì, máy sẽ tự lấy ghi chú mặc định kèm thời gian
if [ -z "$commit_message" ]; then
    commit_message="Update code vào lúc $(date +'%Y-%m-%d %H:%M:%S')"
fi

# 4. Thực hiện commit
git commit -m "$commit_message"

# 5. Đẩy code lên nhánh hiện tại (main)
echo "🚀 Đang đẩy code lên Git..."
git push origin main

echo "✅ Đã push code thành công!"
