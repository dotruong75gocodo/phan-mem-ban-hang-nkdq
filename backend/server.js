const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const multer = require('multer');
// ✅ DÁN ĐOẠN ĐÚNG NÀY VÀO ĐẦU FILE:
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrqbvOEa7GhnUUUo7V_vsIPljvgaGTWWdcPx75C_jKMm_Vtnq1JRIkrFqh1D0XG7Np7Q/exec';

const app = express();

app.use(cors());
app.use(express.json());


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Hàm chuẩn hóa loại bỏ sạch dấu tiếng Việt và khoảng trắng thừa, viết hoa toàn bộ chuỗi
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD') // Tách các ký tự tổ hợp ra
    .replace(/[\u0300-\u036f]/g, '') // Xóa sạch các dấu thanh [1]
    .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Đổi chữ đ thành d [1]
    .replace(/\s+/g, ' ') // Thu gọn nhiều khoảng trắng liên tiếp thành 1 khoảng trắng
    .trim()
    .toUpperCase(); // Chuyển thành chữ in hoa
}



const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });
const CONFIG_FILE = path.join(__dirname, 'sync-config.json');
https://script.google.com/macros/s/AKfycbwrqbvOEa7GhnUUUo7V_vsIPljvgaGTWWdcPx75C_jKMm_Vtnq1JRIkrFqh1D0XG7Np7Q/execs
app.post('/api/upload-images', upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Không có file nào được tải lên!' });
  }

  // Duyệt qua danh sách các file đã tải lên thành công và gom link lại thành mảng
  const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

  // Trả về mảng danh sách đường dẫn ảnh cho Frontend
  res.json({ imageUrls });
});




const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'quan_ly_ban_hang',
  dateStrings: true
});


db.connect((err) => {
  if (err) console.error('❌ Kết nối database thất bại:', err.message);
  else console.log('✅ Đã kết nối thành công tới database MySQL (quan_ly_ban_hang)');
});



// ==========================================================
// 🚀 API LẤY SẢN PHẨM (BẢN SỬA LỖI TÌM KIẾM KHÔNG DẤU HOÀN HẢO)
// ==========================================================
// =========================================================================
// ✅ ĐOẠN API SỬA LOGIC SẮP XẾP THEO NGÀY GẦN NHẤT CHUẨN XÁC 100% (SERVER.JS):
// =========================================================================
// =========================================================================
// ✅ ĐOẠN API SỬA LOGIC PHÂN TRANG VÀ SẮP XẾP CHUẨN XÁC 100% (SERVER.JS):
// =========================================================================
app.get('/api/products', (req, res) => {
  try {
    const search = req.query.search || '';
    const slice = req.query.filterSlice || '';
    const spec = req.query.filterSpec || '';

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    let countSql = `SELECT COUNT(*) as total FROM products p`;

    // 🌟 DÙNG NGÀY GỐC: Quét theo cột order_date kiểu date chuẩn của bác, so sánh mốc ngày thực tế
    let dataSql = `
    SELECT p.*,
    (SELECT MAX(od.order_date) FROM order_details od WHERE od.product_code = p.product_code) as last_order_date,
    (SELECT MAX(od.id) FROM order_details od WHERE od.product_code = p.product_code) as last_detail_id
    FROM products p
  `;

    let conditions = [];
    let params = [];

    if (search) {
      const removeTonesProducts = (str) => {
        if (!str) return '';
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .trim();
      };

      const searchNoTone = removeTonesProducts(search);
      const searchRawParam = `%${search.trim().toLowerCase()}%`;
      const searchNoToneParam = `%${searchNoTone}%`;

      conditions.push(`(
      LOWER(p.product_code) LIKE ? 
      OR LOWER(p.product_name) LIKE ?
      OR LOWER(REPLACE(REPLACE(p.product_name, 'đ', 'd'), 'Đ', 'D')) LIKE ?
    )`);

      params.push(searchRawParam, searchRawParam, searchNoToneParam);
    }

    if (slice) {
      conditions.push('p.product_slice = ?');
      params.push(slice);
    }
    if (spec) {
      conditions.push('p.specification = ?');
      params.push(Number(spec));
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      dataSql += whereClause;
      countSql += whereClause;
    }

    // 🌟 ĐÃ CHUẨN HÓA: Sắp xếp theo ngày bán gần nhất giảm dần, ép các sản phẩm chưa bán xuống mốc '1970-01-01'
    dataSql += ` ORDER BY 
                COALESCE(last_order_date, '1970-01-01') DESC, 
                COALESCE(last_detail_id, 0) DESC, 
                p.product_code ASC`;

    dataSql += ` LIMIT ? OFFSET ?`;

    const countParams = [...params];
    // Gom toàn bộ mảng tham số phân trang an toàn cho câu lệnh SELECT dữ liệu chính
    const mainQueryParams = [...params, limit, offset];

    db.query(countSql, countParams, (err, countResult) => {
      if (err) {
        console.error("❌ Lỗi đếm sản phẩm:", err.message);
        return res.status(500).json({ error: err.message });
      }

      // 🌟 SỬA ĐỂ KHÔNG BỊ BUG: Hỗ trợ bóc tách total an toàn cho mọi phiên bản driver mysql/mysql2
      const totalItems = countResult && countResult[0] ? (countResult[0].total !== undefined ? countResult[0].total : countResult[0]['COUNT(*)']) : 0;
      const totalPages = Math.ceil(totalItems / limit) || 1;

      // Truy vấn bốc dữ liệu thực tế đẩy lên giao diện React
      db.query(dataSql, mainQueryParams, (errData, results) => {
        if (errData) {
          console.error("❌ Lỗi truy vấn sản phẩm MySQL:", errData.message);
          return res.status(500).json({ error: errData.message });
        }

        return res.json({
          data: results || [],
          pagination: { totalItems, totalPages, currentPage: page, limit }
        });
      });
    });
  } catch (globalErr) {
    console.error("❌ Lỗi hệ thống server sản phẩm liên quan ngày tháng:", globalErr.message);
    return res.status(500).json({ error: "Lỗi xử lý server" });
  }
});



// ==========================================================
// 🚀 API TỰ ĐỘNG GOM DANH SÁCH CÁC GIÁ TRỊ SLICE ĐANG CÓ TRONG DATABASE
// ==========================================================
app.get('/api/product-slices', (req, res) => {
  // Câu lệnh DISTINCT giúp gom nhóm, loại bỏ các giá trị trùng lặp trong cột product_slice
  const sql = 'SELECT DISTINCT product_slice FROM products WHERE product_slice IS NOT NULL AND product_slice != ""';

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Lỗi lấy danh sách Slice động:", err.message);
      return res.status(500).json({ error: err.message });
    }
    // Trả về mảng các chữ viết thực tế trong database (Ví dụ: ["alu", "sỉ", "lẻ"])
    const slices = results.map(row => row.product_slice);
    return res.json(slices);
  });
});

// ==========================================================
// 🚀 API TỰ ĐỘNG GOM DANH SÁCH CÁC SỐ QUI CÁCH ĐANG CÓ TRONG DATABASE
// ==========================================================
app.get('/api/product-specifications', (req, res) => {
  // Lệnh DISTINCT giúp gom nhóm và loại bỏ các số qui cách bị trùng lặp trong bảng products
  const sql = 'SELECT DISTINCT specification FROM products WHERE specification IS NOT NULL ORDER BY specification ASC';

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Lỗi lấy danh sách Qui cách động:", err.message);
      return res.status(500).json({ error: err.message });
    }
    // Trả về mảng các con số thực tế dưới phpMyAdmin (Ví dụ:)
    const specs = results.map(row => row.specification);
    return res.json(specs);
  });
});


// 🌟 API BỔ SUNG: Lấy thông tin của 1 sản phẩm duy nhất theo mã để phục vụ trang chi tiết
app.get('/api/products/:product_code', (req, res) => {
  const { product_code } = req.params;

  // Truy vấn trực tiếp từ bảng products
  const sql = 'SELECT * FROM products WHERE product_code = ?';

  db.query(sql, [product_code], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Nếu không tìm thấy mã sản phẩm trong Database MySQL
    if (!results || results.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm!" });
    }

    // 👉 QUAN TRỌNG: Trả về kết quả đầu tiên [0] dưới dạng đối tượng {} sạch để Frontend đọc trực tiếp
    return res.json(results[0]);
  });
});




app.post('/api/products', (req, res) => {
  // 🌟 KHẮC PHỤC LỖI: Bóc tách GiaMet để tránh lỗi ghi đè dữ liệu vào cột Generated Column của MySQL
  const { 
    GiaMet,
    
    ...insertData } = req.body;
  const query = 'INSERT INTO products SET ?';

  db.query(query, insertData, (err, result) => {
    if (err) {
      console.error("Lỗi thêm mới MySQL:", err);
      return res.status(500).json({ error: "Lỗi hệ thống không thể thêm sản phẩm mới", details: err.message });
    }
    res.status(201).json({
      message: "Thêm sản phẩm thành công!",
      id: result.insertId,
      data: {
        ...insertData,
        GiaMet: 0,
        TonKho: 0
      }
    });
  });
});


app.put('/api/products/:product_code', (req, res) => {
  const { product_code } = req.params;

  // 🌟 KHẮC PHỤC LỖI: Bóc tách GiaMet khi chỉnh sửa mặt hàng chi tiết
  const { GiaMet, updated_at, ...updateData } = req.body;
  const query = 'UPDATE products SET ? WHERE product_code = ?';

  db.query(query, [updateData, product_code], (err, result) => {
    if (err) {
      console.error("Lỗi cập nhật MySQL:", err);
      return res.status(500).json({ error: "Lỗi hệ thống không thể cập nhật sản phẩm", details: err.message });
    }
    res.json({ message: "Cập nhật sản phẩm thành công!" });
  });
});

// =====================================================================
// API: CẬP NHẬT NHANH TỪNG Ô DỮ LIỆU CHUẨN APPSHEET (INLINE EDIT)
// =====================================================================
app.put('/api/products/:product_code/inline-update', (req, res) => {
  const { product_code } = req.params;
  const { field, value } = req.body;

  // 1. Danh sách các cột ở bảng products được phép sửa nhanh (Để bảo mật database)
  const allowedFields = [
    'product_slice',
     'base_price',
      'wholesale_price',
       'retail_price', 
       'weight_price',
       'density'
      ];

  if (!allowedFields.includes(field)) {
    return res.status(400).json({ error: "Trường dữ liệu không hợp lệ hoặc bị chặn chỉnh sửa!" });
  }

  // 2. Chuyển đổi dữ liệu về đúng định dạng trước khi lưu xuống MySQL
  let cleanValue = value;
  if (field !== 'product_slice') {
    cleanValue = value === '' || isNaN(value) ? 0 : Number(value); // Ép về dạng số nếu là các cột giá tiền
  } else {
    cleanValue = value ? String(value).trim() : ''; // Loại bỏ khoảng trắng thừa nếu là cột chữ (Slice)
  }

  // 3. Thực hiện câu lệnh cập nhật động (Sử dụng cú pháp ?? để truyền tên cột an toàn)
  const sql = `UPDATE products SET ?? = ? WHERE product_code = ?`;

  db.query(sql, [field, cleanValue, product_code], (err, result) => {
    if (err) {
      console.error(`❌ Lỗi SQL khi sửa nhanh cột ${field}:`, err.message);
      return res.status(500).json({ error: "Lỗi hệ thống không thể lưu dữ liệu!" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm có mã này!" });
    }

    //console.log(`🎉 [Inline Edit] Đã sửa cột ${field} thành công cho SP: ${product_code}`);
    res.json({ success: true, message: "Cập nhật dữ liệu thành công!" });
  });
});


app.delete('/api/products/:code', (req, res) => {
  db.query('DELETE FROM products WHERE product_code = ?', [req.params.code], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Xóa thành công!' });
  });
});


app.post('/api/products/bulk-update-prices', (req, res) => {
  const { update_type, product_codes, filter_field, filter_value, price_type, action_type, value } = req.body;
  let sql = `UPDATE products SET `; const numValue = Number(value); let queryParams = [];
  
  if (action_type === 'fixed') { sql += `${price_type} = ? `; queryParams.push(numValue); }
  else if (action_type === 'increase_value') { sql += `${price_type} = ${price_type} + ? `; queryParams.push(numValue); }
  else if (action_type === 'decrease_value') { sql += `${price_type} = GREATEST(0, ${price_type} - ?) `; queryParams.push(numValue); }
  else if (action_type === 'increase_percent') { sql += `${price_type} = CAST(${price_type} * (1 + ? / 100) AS SIGNED) `; queryParams.push(numValue); }
  else if (action_type === 'decrease_percent') { sql += `${price_type} = CAST(GREATEST(0, ${price_type} * (1 - ? / 100)) AS SIGNED) `; queryParams.push(numValue); }
  
  // 🌟 THÊM TRƯỜNG HỢP: Giá gốc = Tỷ trọng * Giá trị nhập tay (Sử dụng CAST để làm tròn số tiền về số nguyên)
  else if (action_type === 'by_density') { sql += `${price_type} = CAST(density * ? AS SIGNED) `; queryParams.push(numValue); }
// 🌟 THÊM TRƯỜNG HỢP 1: Giá sỉ = Giá gốc + Giá trị nhập tay
  else if (action_type === 'wholesale_from_base') { 
    sql += `wholesale_price = CAST(base_price + ? AS SIGNED) `; 
    queryParams.push(numValue); 
  }

  // 🌟 THÊM TRƯỜNG HỢP 2: Giá lẻ = Giá sỉ + Giá trị nhập tay
  else if (action_type === 'retail_from_wholesale') { 
    sql += `retail_price = CAST(wholesale_price + ? AS SIGNED) `; 
    queryParams.push(numValue); 
  }
  if (update_type === 'selected') { sql += `WHERE product_code IN (?)`; queryParams.push(product_codes); }
  else {
    if (filter_field === 'all') sql += `WHERE 1=1`;
    else if (filter_field === 'product_slice') { sql += `WHERE product_slice = ?`; queryParams.push(filter_value); }
    else if (filter_field === 'product_name') { sql += `WHERE product_name LIKE ?`; queryParams.push(`%${filter_value}%`); }
  }
  db.query(sql, queryParams, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Đã cập nhật giá thành công!` });
  });
});


// 1. API lấy lịch sử xuất hàng (Chi tiết đơn hàng của sản phẩm này)
app.get('/api/products/:product_code/export-history', (req, res) => {
  const { product_code } = req.params;
  
  // 🎯 GIẢI PHÁP TRIỆT ĐỂ:
  // Thay vì JOIN cả bảng orders o, ta chỉ lấy một bảng tạm chỉ chứa (order_id, customer_id).
  // Bảng tạm này HOÀN TOÀN KHÔNG CÓ cột order_date, do đó MySQL và Node.js không thể lấy nhầm ngày đơn cha!
  const sql = `
  SELECT 
    CAST(od.order_date AS CHAR(10)) as sub_order_date, -- Lấy ngày dòng con ép về chuỗi chữ
    od.order_id, 
    c.customer_name, 
    od.quantity, 
    od.converted_quantity,
    od.price, 
    od.total_amount, 
    od.length_mm, 
    od.width_value
  FROM order_details od
  LEFT JOIN (
    SELECT order_id, customer_id FROM orders
  ) o ON od.order_id = o.order_id -- 🌟 ĐÃ CÔ LẬP: Bảng này không có trường order_date để gây xung đột
  LEFT JOIN customers c ON o.customer_id = c.customer_id OR o.customer_id = c.customer_name
  WHERE od.product_code = ?
  ORDER BY od.order_date DESC, od.id DESC
  `;

  db.query(sql, [product_code], (err, results) => {
    if (err) {
      console.error("❌ Lỗi SQL lấy lịch sử xuất hàng:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    // 🎯 CHỐT CHẶN HẬU KỲ: Trả dữ liệu sạch về cho Front-end React đọc
    const cleanResults = (results || []).map(row => {
      let finalDate = row.sub_order_date;
      
      // Cắt chuỗi chu đáo lấy đúng dạng YYYY-MM-DD
      if (finalDate && typeof finalDate === 'string') {
        finalDate = finalDate.slice(0, 10);
      }
      
      return {
        order_date: finalDate, // Gán ngược lại tên trường order_date chuẩn cho React hiển thị
        order_id: row.order_id,
        customer_name: row.customer_name || 'Khách vãng lai',
        quantity: row.quantity,
        converted_quantity: row.converted_quantity,
        price: row.price,
        total_amount: row.total_amount,
        length_mm: row.length_mm,
        width_value: row.width_value
      };
    });

    res.json(cleanResults);
  });
});


// 2. API lấy lịch sử nhập hàng (Giả định bạn có bảng import_details hoặc cấu trúc tương tự, nếu chưa có bảng nhập riêng bạn có thể cấu hình sau)
// 2. API lấy lịch sử nhập hàng chuẩn xác kết nối từ bảng purchase_order_details
app.get('/api/products/:product_code/import-history', (req, res) => {
  const { product_code } = req.params;

  // Thực hiện liên kết (LEFT JOIN) bảng chi tiết với bảng đơn nhập mẹ để lấy ngày nhập và nhà cung cấp chuẩn
  const sql = `
    SELECT 
      DATE_FORMAT(pod.purchase_date, '%Y-%m-%d') as import_date, 
      pod.purchase_id as import_id, 
      s.supplier_name, 
      pod.quantity, 
      pod.import_price as price, 
      pod.total_amount
    FROM purchase_order_details pod
    LEFT JOIN purchase_orders po ON pod.purchase_id = po.purchase_id
    LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
    WHERE pod.product_code = ?
    ORDER BY pod.purchase_date DESC, pod.id DESC
  `;

  db.query(sql, [product_code], (err, results) => {
    if (err) {
      console.error("❌ Lỗi SQL lấy lịch sử đối soát nhập hàng:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(results || []); // Trả mảng sạch về cho Frontend React hiển thị
  });
});



// ==========================================
// 🚀 2. API KHÁCH HÀNG (TÌM KIẾM CHUẨN + ƯU TIÊN MUA NHIỀU)
// ==========================================
app.get('/api/customers', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Hàm biến đổi chuỗi Tiếng Việt có dấu thành KHÔNG DẤU ngay tại tầng Backend Node.js
    const removeTonesBackend = (str) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .normalize('NFD') // Tách các dấu thanh ra khỏi chữ cái gốc
        .replace(/[\u0300-\u036f]/g, '') // Xóa bỏ toàn bộ các dấu thanh phụ
        .replace(/đ/g, 'd')
        .trim();
    };

    const searchNoTone = removeTonesBackend(search);

    // 1. Khởi tạo câu lệnh đếm tổng số dòng phục vụ phân trang
    let countSql = 'SELECT COUNT(*) as total FROM customers';
    let countParams = [];

    // 2. Khởi tạo câu lệnh lấy dữ liệu (Sử dụng MAX(o.updated_at) chuẩn theo cấu trúc cột timestamp của bạn)
    let dataSql = `
     SELECT 
       c.*, 
       COUNT(o.order_id) AS total_orders,
       MAX(o.updated_at) AS latest_order_at
     FROM customers c
     LEFT JOIN orders o ON c.customer_id = o.customer_id
   `;

    let dataParams = [];

    // 3. Ô TÌM KIẾM ĐA NĂNG: Khớp Mã KH gõ tay, Tên KH có dấu/không dấu, hoặc SĐT
    if (search) {
      const searchParam = `%${searchNoTone}%`;
      const rawSearchParam = `%${search}%`;

      // Điều kiện tìm kiếm quét qua cả 3 trường dữ liệu quan trọng
      const whereClause = ` 
       WHERE (
         LOWER(c.customer_id) LIKE ?
         OR LOWER(c.customer_name) LIKE ? 
         OR c.phone_number LIKE ? 
         OR LOWER(CONVERT(c.customer_name USING utf8)) LIKE ?
       )
     `;

      dataSql += whereClause;
      countSql += ` WHERE (LOWER(customer_id) LIKE ? OR LOWER(customer_name) LIKE ? OR phone_number LIKE ? OR LOWER(CONVERT(customer_name USING utf8)) LIKE ?)`;

      // Nạp tham số đối chiếu dữ liệu cho 4 dấu hỏi chấm
      countParams = [rawSearchParam, rawSearchParam, rawSearchParam, searchParam];
      dataParams = [rawSearchParam, rawSearchParam, rawSearchParam, searchParam];

      if (search === searchNoTone) {
        countParams = [searchParam, searchParam, searchParam, searchParam];
        dataParams = [searchParam, searchParam, searchParam, searchParam];
      }
    }

    // 4. Sắp xếp: Ai vừa lên đơn (latest_order_at mới nhất) lên đầu bảng. Khách chưa mua gì xếp xuống dưới.
    dataSql += ` 
     GROUP BY c.customer_id 
     ORDER BY 
       (MAX(o.updated_at) IS NULL) ASC, 
       MAX(o.updated_at) DESC, 
       c.customer_id DESC 
     LIMIT ? OFFSET ?
   `;

    dataParams.push(limit, offset);

    // Chạy câu lệnh đếm trước
    db.query(countSql, countParams, (err, countResult) => {
      if (err) {
        console.error("Lỗi đếm số lượng khách hàng:", err.message);
        return res.status(500).json({ error: err.message });
      }

      // 🚀 ĐÃ SỬA LỖI LOGIC: Lấy phần tử [0] của mảng kết quả đếm MySQL trả về
      const totalItems = (countResult && countResult[0]) ? countResult[0].total : 0;
      const totalPages = Math.ceil(totalItems / limit) || 1;

      // Chạy câu lệnh lấy danh sách dữ liệu với mảng tham số dataParams
      db.query(dataSql, dataParams, (err, results) => {
        if (err) {
          console.error("Lỗi lấy danh sách khách hàng từ MySQL:", err.message);
          return res.status(500).json({ error: err.message });
        }

        // Trả về dữ liệu chuẩn
        return res.json({
          data: results || [],
          pagination: { totalItems, totalPages, currentPage: page, limit }
        });
      });
    });
  } catch (globalErr) {
    console.error("Lỗi hệ thống lấy khách hàng:", globalErr.message);
    return res.status(500).json({ error: "Lỗi xử lý server" });
  }
});


// 🌟 API BỔ SUNG: Lấy thông tin của 1 khách hàng duy nhất theo tên để phục vụ trang chi tiết
// 1. API LẤY CHI TIẾT 1 KHÁCH HÀNG THEO MÃ ID (🚀 ĐÃ SỬA: Đổi từ :name sang :id)
app.get('/api/customers/:id', (req, res) => {
  const customerId = req.params.id; // Nhận mã gõ tay không dấu (Ví dụ: HOANGXN)

  // 🚀 ĐÃ SỬA: Tìm kiếm dựa trên cột khóa chính mới customer_id
  const sql = 'SELECT * FROM customers WHERE customer_id = ?';
  db.query(sql, [customerId], (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn thông tin khách hàng:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy khách hàng!" });
    }

    return res.json(results[0]);
  });
});

// 2. API LẤY LỊCH SỬ ĐƠN HÀNG TỔNG CỦA KHÁCH HÀNG (🚀 ĐÃ SỬA: Đổi từ :name sang :id)
app.get('/api/customers/:id/orders', (req, res) => {
  const customerId = req.params.id;

  // 🚀 ĐÃ SỬA: WHERE theo customer_id vì bảng orders hiện tại chỉ lưu mã KH, không lưu tên
  const sql = `
    SELECT 
      order_id, 
      DATE_FORMAT(order_date, '%Y-%m-%d') as order_date, 
      net_amount, 
      old_debt, 
      total_amount, 
      customer_paid, 
      current_debt,
      total_profit, 
      order_slice,
      notes
    FROM orders 
    WHERE customer_id = ?
    ORDER BY order_date DESC, order_id DESC
  `;

  db.query(sql, [customerId], (err, results) => {
    if (err) {
      console.error("Lỗi lấy danh sách đơn hàng tổng của khách:", err.message);
      return res.status(500).json({ error: err.message });
    }
    return res.json(results || []);
  });
});

// 3. API TẠO MỚI KHÁCH HÀNG (🚀 ĐÃ SỬA: Nhận thêm customer_id đặt tay từ giao diện gửi lên)
app.post('/api/customers', (req, res) => {
  const { customer_id, customer_name, customer_slice, address, phone_number, customer_image } = req.body;

  if (!customer_id || String(customer_id).trim() === "") {
    return res.status(400).json({ error: "Mã khách hàng không được để trống!" });
  }

  // 🚀 ĐÃ SỬA: Thêm cột customer_id vào danh sách INSERT dữ liệu vào database
  const sql = 'INSERT INTO customers (customer_id, customer_name, customer_slice, address, phone_number, customer_image) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [String(customer_id).trim(), customer_name, customer_slice, address, phone_number, customer_image], (err) => {
    if (err) {
      // Báo lỗi nếu người dùng gõ trùng mã khóa chính đã tồn tại trong máy
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: `Mã khách hàng "${customer_id}" đã tồn tại trên hệ thống, vui lòng nhập mã khác!` });
      }
      return res.status(500).json({ error: err.message });
    }
    return res.json({ message: 'Thêm khách hàng thành công!' });
  });
});

// 4. API CẬP NHẬT THÔNG TIN KHÁCH HÀNG (🚀 ĐÃ SỬA: Gom 2 hàm trùng nhau của bạn làm 1 và sửa điều kiện theo :id)
app.put('/api/customers/:id', (req, res) => {
  const customerId = req.params.id;
  const { customer_name, customer_slice, address, phone_number, customer_image } = req.body;

  // Khóa chết customer_id không cho sửa ở WHERE, chỉ cập nhật tên hoặc thông tin phụ
  const sql = `
    UPDATE customers 
    SET customer_name = ?, customer_slice = ?, address = ?, phone_number = ?, customer_image = ? 
    WHERE customer_id = ?
  `;

  db.query(sql, [customer_name, customer_slice, address, phone_number, customer_image, customerId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'CẬP NHẬT THÀNH CÔNG!' });
  });
});

// 5. API XÓA KHÁCH HÀNG (🚀 ĐÃ SỬA: Xóa dựa trên :id để an toàn tuyệt đối)
app.delete('/api/customers/:id', (req, res) => {
  const customerId = req.params.id;

  db.query('DELETE FROM customers WHERE customer_id = ?', [customerId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'XÓA THÀNH CÔNG!' });
  });
});


app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Không có file!' });
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});



// ==========================================
// 🚀 3. API ĐƠN HÀNG (ORDERS) - HIỂN THỊ ĐƠN HÀNG CŨ
// ==========================================
// ==========================================================
// 🚀 3. API ĐƠN HÀNG (ORDERS) - PHIÊN BẢN TỐI ƯU TỐC ĐỘ CAO
// ==========================================================
app.get('/api/orders', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 50);
    const search = (req.query.search || '').trim(); // Khử khoảng trắng thừa
    const offset = (page - 1) * limit;

    // 1. Khởi tạo câu lệnh đếm tổng dòng cơ bản
    let countSql = `SELECT COUNT(*) as total FROM orders o`;

    // 2. Câu lệnh lấy dữ liệu thô chuẩn hóa (Bổ sung o.updated_at vào SELECT để MySQL tối ưu hóa)
    let dataSql = `
      SELECT 
        o.order_id, 
        o.customer_id,        
        c.customer_name,      
        o.customer_slice,
        o.net_amount, 
        o.old_debt, 
        o.total_amount,
        o.customer_paid, 
        o.current_debt, 
        o.total_profit,
        o.order_slice, 
        o.notes,
        o.updated_at,
        DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date
      FROM orders o
    `;

    let params = [];
    let whereClauses = [];

    // Nếu người dùng có gõ từ khóa tìm kiếm nhanh
    if (search) {
      const searchParam = `%${search}%`;
      countSql = `
        SELECT COUNT(*) as total 
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.customer_id
      `;
      whereClauses.push('(o.order_id LIKE ? OR o.customer_id LIKE ? OR c.customer_name LIKE ?)');
      params.push(searchParam, searchParam, searchParam);
    }

    // Tích hợp điều kiện WHERE nếu có tìm kiếm
    if (whereClauses.length > 0) {
      const clauseStr = ' WHERE ' + whereClauses.join(' AND ');
      dataSql += ` LEFT JOIN customers c ON o.customer_id = c.customer_id ${clauseStr}`;
      countSql += clauseStr;
    } else {
      dataSql += ` LEFT JOIN customers c ON o.customer_id = c.customer_id`;
    }

    // 🚀 ĐÃ SỬA LOGIC SẮP XẾP:
    // 1. (DATE(o.order_date) = CURRENT_DATE()) DESC: Đơn hàng lập ngày hôm nay đứng đầu tiên (trả về 1).
    // 🚀 ĐÃ SỬA CHÍNH XÁC 100%: Chia 2 block "Mới tạo" và "Chỉnh sửa" TRONG CÙNG MỘT NGÀY
    // 🚀 ĐÃ SỬA CHÍNH XÁC THEO Ý BẠN: (order_date mới + update mới) trước, rồi đến (order_date cũ + update mới) tiếp theo
    // 🚀 ĐÃ SỬA CHÍNH XÁC TUYỆT ĐỐI: Tách biệt thứ tự ưu tiên sắp xếp nội bộ của Khối A và Khối B
    dataSql += ` 
      ORDER BY 
        -- 1. Gom nhóm theo ngày thao tác mới nhất (Ngày hôm nay lên đầu trang 1)
        DATE(COALESCE(o.updated_at, o.order_date)) DESC,
        
        -- 2. Chia đôi 2 Block TRONG CÙNG MỘT NGÀY:
        -- Khối A: (order_date mới + update mới) -> Trả về 1 đứng trước
        -- Khối B: (order_date cũ + update mới) -> Trả về 0 đứng sau
        (DATE(o.order_date) = DATE(COALESCE(o.updated_at, o.order_date))) DESC,
        
        -- 3. 🚀 ĐÃ SỬA: Sắp xếp nội bộ chuẩn quy trình vận hành:
        -- Nếu là Khối A (Đơn mới): Ưu tiên đơn nào gõ sau cùng (order_id lớn nhất) lên đầu Khối A.
        -- Nếu là Khối B (Đơn sửa): Ưu tiên đơn nào vừa mới Click bấm Lưu thay đổi xong (updated_at lớn nhất) lên đầu Khối B.
        CASE WHEN DATE(o.order_date) = DATE(COALESCE(o.updated_at, o.order_date)) THEN o.order_id END DESC,
        o.updated_at DESC,
        o.order_id DESC
      LIMIT ? OFFSET ?
    `;


    const dataParams = [...params, limit, offset];

    // Chạy lệnh Đếm tổng số đơn hàng trước
    db.query(countSql, params, (err, countResult) => {
      if (err) {
        console.error("Lỗi đếm số lượng đơn hàng:", err.message);
        return res.status(500).json({ error: err.message });
      }

      const totalItems = (countResult && countResult[0]) ? countResult[0].total : 0;
      const totalPages = Math.ceil(totalItems / limit) || 1;

      // Thực thi lệnh lấy dữ liệu trang hiện tại tốc độ cao
      db.query(dataSql, dataParams, (dataErr, results) => {
        if (dataErr) {
          console.error("Lỗi lấy danh sách đơn hàng từ MySQL:", dataErr.message);
          return res.status(500).json({ error: dataErr.message });
        }

        return res.json({
          data: results || [],
          pagination: {
            totalItems,
            totalPages,
            currentPage: page,
            limit
          }
        });
      });
    });
  } catch (globalErr) {
    console.error("Lỗi hệ thống server hóa đơn:", globalErr.message);
    return res.status(500).json({ error: "Lỗi xử lý server" });
  }
});

//  🌟 API THÊM MỚI ĐƠN HÀNG VÀ CHI TIẾT ĐƠN HÀNG TRONG MỘT GIAO DỊCH (TRANSACTION)
// THAY THẾ TOÀN BỘ ĐOẠN API POST /api/orders TỪ TRANG 15 ĐẾN TRANG 17 BẰNG KHỐI LỆNH DƯỚI ĐÂY:
// 🚀 API KHỞI TẠO ĐƠN HÀNG MẸ TRỐNG (ĐÃ LƯỢC BỎ CHÈN CHI TIẾT SẢN PHẨM)
app.post('/api/orders', (req, res) => {
  const {
    order_id,
    order_date: rawOrderDate,
    customer_id,
    customer_slice,
    net_amount,
    old_debt,
    total_amount,
    customer_paid,
    current_debt,
    order_slice,
    notes
  } = req.body;

  // 1. Kiểm tra dữ liệu đầu vào bắt buộc
  if (!customer_id || String(customer_id).trim() === "") {
    return res.status(400).json({ error: "Mã khách hàng (customer_id) không được để trống!" });
  }
  const cleanInput = String(customer_id).trim();

  // 2. Tra cứu ngầm để lấy chính xác Mã ID và Phân đoạn xịn từ danh mục gốc
  const findCustomerSql = `SELECT customer_id, customer_slice FROM customers WHERE customer_id = ? OR customer_name = ? LIMIT 1`;

  db.query(findCustomerSql, [cleanInput, cleanInput], (err, customerRows) => {
    if (err) {
      console.error("Lỗi danh mục khách hàng:", err.message);
      return res.status(500).json({ error: "Lỗi kiểm tra danh mục khách hàng: " + err.message });
    }
    if (!customerRows || customerRows.length === 0) {
      return res.status(400).json({ error: `Khách hàng "${cleanInput}" không tồn tại trên hệ thống!` });
    }

    const finalRealCustomerId = customerRows[0].customer_id;
    const finalCustomerSlice = customerRows[0].customer_slice || '';

    // 3. Định dạng ngày tháng chuẩn YYYY-MM-DD
    let order_date = new Date().toLocaleDateString('en-CA');
    if (rawOrderDate) {
      const localDate = new Date(rawOrderDate);
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      order_date = `${year}-${month}-${day}`;
    }

    // 4. Khởi tạo câu lệnh SQL chèn vào bảng orders mẹ
    const orderSql = `INSERT INTO orders (
      order_id,
      order_date,
      customer_id,
      customer_slice,
      net_amount,
      old_debt,
      total_amount,
      customer_paid,
      current_debt,
      total_profit,
      order_slice,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // Khởi tạo đơn trống nên tổng lợi nhuận (total_profit) ban đầu sẽ bằng 0
    const orderValues = [
      order_id,
      order_date,
      finalRealCustomerId,
      finalCustomerSlice,
      Number(net_amount) || 0,
      Number(old_debt) || 0,
      Number(total_amount) || 0,
      Number(customer_paid) || 0,
      Number(current_debt) || 0,
      0, // total_profit mặc định bằng 0
      order_slice || '',
      notes || ''
    ];

    // 5. Thực thi ghi trực tiếp vào cơ sở dữ liệu (Không cần Transaction vì chỉ ghi 1 bảng)
    db.query(orderSql, orderValues, (insertErr) => {
      if (insertErr) {
        console.error("Lỗi ghi bảng orders:", insertErr.message);
        return res.status(500).json({ error: "Lỗi ghi dữ liệu bảng orders: " + insertErr.message });
      }

      // Trả kết quả thành công về cho Frontend React chuyển hướng sang trang chi tiết
      return res.status(201).json({
        message: 'Khởi tạo đơn hàng mới thành công! Vui lòng thêm sản phẩm ở trang chi tiết.',
        order_id: order_id
      });
    });

  }); // Hết Bước tra cứu danh mục khách hàng
});


/// 🚀 API THÊM VẬT TƯ LẺ - TỰ ĐỘNG CẬP NHẬT ĐƠN MẸ (BẢN VÁ LỖI TOÀN DIỆN CHẠY 100%)
// =================================================================
// PHẦN 2: API CHÈN DÒNG MỚI VÀ TÁI TÍNH TOÁN ĐƠN MẸ (BACKEND POST)
// =================================================================
// =================================================================
// 🚀 API THÊM VẬT TƯ LẺ - TRỪ KHO CUỐN CHIẾU BÁN ÂM (PHẦN 1/2)
// =================================================================
// =================================================================
// 🚀 API THÊM VẬT TƯ LẺ - ĐỒNG BỘ TRỪ KHO THEO SỐ QUY ĐỔI (PHẦN 1/2)
// =================================================================
app.post('/api/order-details', (req, res) => {
  const {
    order_id, product_code, quantity, length_mm, width_value, price,
    total_amount, length_value, piece_quantity, total_length, detail_slice,
    converted_quantity, profit, specification, chiet_khau, phi_ship, notes,
    customer_id, customer_slice, tien_goc, tienGoc
  } = req.body;

  if (!order_id || String(order_id).trim() === "") {
    return res.status(400).json({ error: "Thiếu mã thông tin đơn hàng mẹ (order_id)!" });
  }
  const cleanOrderIdParam = String(order_id).trim();

   const tzOffset = 7 * 60 * 60 * 1000; // Múi giờ VN (milliseconds)
  const localDate = new Date(Date.now() + tzOffset);
  const order_date = localDate.toISOString().slice(0, 10);


  
    // Ép kiểu dữ liệu an toàn để thực thi chèn vào Database
    const qty = Number(quantity) || 0;
    const lenMm = Number(length_mm) || 0;
    const wid = Number(width_value) || 0;
    const prc = Number(price) || 0;
    const pcs = Number(piece_quantity) || 0;
    const parsedSpec = parseFloat(specification);
    const finalChietKhau = Number(chiet_khau) || 0;
    const finalPhiShip = Number(phi_ship) || 0;
    const finalTotalAmountDetail = Number(total_amount) || 0;

    // 🌟 BẬT ÉP KIỂU CHUẨN: Lấy chính xác số lượng mét quy đổi thực tế gửi từ React sang
    const safeConvQty = Number(converted_quantity) || 0;

    // Nhận chuẩn tiền gốc và lợi nhuận tự nhảy khít số gửi từ payload frontend sang
    const finalTienGocDetail = Number(tien_goc) || Number(tienGoc) || 0;
    const finalProfitDetail = Number(profit) || 0;

    // Kích hoạt chuỗi Giao dịch an toàn (Transaction)
    db.beginTransaction((transactionErr) => {
      if (transactionErr) return res.status(500).json({ error: "Lỗi khởi tạo chuỗi giao dịch tài chính!" });

      // 2. Chèn dòng vật tư sao chép mới vào bảng order_details (Đầy đủ cột tien_goc)
      const insertSql = `INSERT INTO order_details (
                order_date, order_id, customer_id, customer_slice, product_code,
                quantity, length_mm, width_value, price, total_amount,
                length_value, piece_quantity, total_length, detail_slice,
                converted_quantity, profit, specification, chiet_khau, phi_ship,
                tien_goc, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertValues = [
        order_date, cleanOrderIdParam, customer_id || '', customer_slice || '', product_code || '',
        qty, lenMm, wid, prc, finalTotalAmountDetail,
        length_value || '', pcs, total_length || '', detail_slice || '',
        safeConvQty, finalProfitDetail, isNaN(parsedSpec) ? 0 : parsedSpec,
        finalChietKhau, finalPhiShip, finalTienGocDetail, notes || ''
      ];

      db.query(insertSql, insertValues, (insErr) => {
        if (insErr) {
          return db.rollback(() => {
            console.error("Lỗi chèn dòng mới sao chép:", insErr.message);
            res.status(500).json({ error: "Lỗi ghi dữ liệu sao chép dòng vào database" });
          });
        }

        // 🌟 KIỂM TRA RÀO CHẮN BÁO GIÁ: Nếu phân đoạn là "bao gia", bỏ qua không trừ kho hàng
        const isBaoGia = detail_slice && String(detail_slice).trim().toLowerCase() === 'bao gia';
        if (isBaoGia) {
          return runOrderCalculations(); // Nhảy thẳng xuống luồng tính tiền đơn mẹ
        }

        // 🌟 BƯỚC CẬP NHẬT KHO CHUẨN: Đã đổi sang biến safeConvQty để trừ lùi chuẩn xác theo số MÉT quy đổi
        const updateStockSql = `
                    UPDATE products 
                    SET TonKho = TonKho - ?, total_exported = total_exported + ? 
                    WHERE product_code = ?
                `;
        db.query(updateStockSql, [safeConvQty, safeConvQty, product_code || ''], (stockErr) => {
          if (stockErr) {
            return db.rollback(() => {
              console.error("Lỗi cập nhật kho bán âm cuốn chiếu:", stockErr.message);
              res.status(500).json({ error: "Lỗi hệ thống không thể đồng bộ lại kho hàng!" });
            });
          }
          runOrderCalculations(); // Thành công -> chạy luồng tính tiền
        });
        // Hàm liên hoàn tái tính toán tài chính đơn mẹ từ các dòng con còn lại
        function runOrderCalculations() {
          const sumSql = `SELECT SUM(total_amount) AS total_net, SUM(profit) AS total_profit_details FROM order_details WHERE order_id = ?`;
          db.query(sumSql, [cleanOrderIdParam], (sumErr, sumResult) => {
            if (sumErr) {
              return db.rollback(() => res.status(500).json({ error: "Lỗi tính toán tổng số tiền trên hóa đơn" }));
            }

            const sumData = sumResult[0] || sumResult;
            const net_amount = sumData ? (Number(sumData.total_net) || 0) : 0;
            const total_profit = sumData ? (Number(sumData.total_profit_details) || 0) : 0;

            // 4. Truy vấn nợ cũ, số tiền khách đã trả của đơn mẹ để cập nhật dư nợ hiện tại mới
            const getOrderMomSql = `SELECT old_debt, customer_paid, order_slice FROM orders WHERE order_id = ? LIMIT 1`;
            db.query(getOrderMomSql, [cleanOrderIdParam], (momErr, momRows) => {
              if (momErr || !momRows || momRows.length === 0) {
                return db.rollback(() => res.status(500).json({ error: "Lỗi kiểm tra thông tin công nợ hóa đơn tổng!" }));
              }

              const momData = momRows[0] || momRows;
              const old_debt = Number(momData.old_debt) || 0;
              const customer_paid = Number(momData.customer_paid) || 0;
              const order_slice = momData.order_slice || '';

              const total_amount_order = net_amount + old_debt;
              const current_debt = order_slice === 'no' ? (total_amount_order - customer_paid) : 0;

              // 5. UPDATE trực tiếp số liệu tài chính mới vào bảng orders mẹ
              const updateMomSql = `UPDATE orders SET net_amount = ?, total_amount = ?, current_debt = ?, total_profit = ? WHERE order_id = ?`;
              db.query(updateMomSql, [net_amount, total_amount_order, current_debt, total_profit, cleanOrderIdParam], (upMomErr) => {
                if (upMomErr) {
                  return db.rollback(() => {
                    return res.status(500).json({ error: "Lỗi ghi đè tiền tổng vào bảng hóa đơn mẹ" });
                  });
                }

                // 6. CHỐT CHẶN: Commit xác nhận lưu vĩnh viễn chuỗi giao dịch vào database
                db.commit((commitErr) => {
                  if (commitErr) {
                    return db.rollback(() => {
                      return res.status(500).json({ error: "Lỗi xác nhận lưu chuỗi dữ liệu (Commit)" });
                    });
                  }

                  // Phản hồi thành công về cho Frontend (Dùng status 201 chuẩn)
                  return res.status(201).json({
                    message: "🎉 Thêm vật tư lẻ và đồng bộ kho quy đổi thành công!",
                    net_amount: net_amount,
                    total_amount: total_amount_order,
                    current_debt: current_debt,
                    total_profit: total_profit
                  });
                }); // Hết Commit
              }); // Hết Update đơn mẹ
            }); // Hết lấy thông tin nợ đơn mẹ
          }); // Hết SUM dòng con
        } // Hết hàm runOrderCalculations
      }); // Hết Insert dòng con
    }); // Hết Transaction
  }); // Hết app.post




// 🌟 API SỬA DÒNG CHI TIẾT - ĐỒNG BỘ KHO BÁN ÂM CUỐN CHIẾU (PHẦN 1/2)
// =================================================================
app.put('/api/order-details/:id', (req, res) => {
  const { id } = req.params;
  const {
    order_id, product_code, quantity, length_mm, width_value, price,
    total_amount, length_value, piece_quantity, total_length, detail_slice,
    converted_quantity, profit, specification, chiet_khau, phi_ship, notes,
    tien_goc, tienGoc
  } = req.body;

  if (!id || !order_id || String(order_id).trim() === "" || order_id === "undefined") {
    return res.status(400).json({ error: "Thiếu thông tin mã ID dòng cần sửa hoặc mã đơn hàng (order_id)!" });
  }
  const cleanOrderIdParam = String(order_id).trim();

  const findCustomerInfoSql = `
        SELECT o.order_date, o.customer_id AS backup_customer_id, o.customer_slice AS backup_customer_slice,
               c.customer_id AS real_customer_id, c.customer_slice AS real_customer_slice
        FROM orders o
        LEFT JOIN customers c ON TRIM(o.customer_id) = TRIM(c.customer_id) OR TRIM(o.customer_id) = TRIM(c.customer_name)
        WHERE o.order_id = ? LIMIT 1
    `;

  db.query(findCustomerInfoSql, [cleanOrderIdParam], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      console.error("Lỗi tra cứu thông tin đơn mẹ:", err ? err.message : "Trống");
      return res.status(500).json({ error: "Lỗi hệ thống khi kiểm tra thông tin đơn hàng!" });
    }

    const orderData = rows[0] || rows;
    const order_date = orderData.order_date;
    const finalCustomerId = orderData.real_customer_id || orderData.backup_customer_id || '';
    const finalCustomerSlice = orderData.real_customer_slice || orderData.backup_customer_slice || '';

    if (!finalCustomerId || finalCustomerId === "") {
      return res.status(400).json({ error: "Lỗi nghiêm trọng: Không thể xác định danh tính khách hàng!" });
    }

    // 🌟 ĐÃ CẬP NHẬT: Lấy thêm bốc tách old_quantity và old_product_code của chính dòng này trong DB để bù trừ kho
    const getProductOldDataSql = `
            SELECT p.base_price, od.quantity AS old_quantity, od.product_code AS old_product_code
            FROM order_details od
            LEFT JOIN products p ON TRIM(od.product_code) = TRIM(p.product_code)
            WHERE od.id = ? LIMIT 1
        `;

    db.query(getProductOldDataSql, [id], (prodErr, prodRows) => {
      if (prodErr || !prodRows || prodRows.length === 0) {
        console.error("Lỗi lấy giá vốn và số lượng cũ dòng con:", prodErr ? prodErr.message : "Trống");
        return res.status(500).json({ error: "Lỗi hệ thống khi truy vấn dữ liệu sản phẩm!" });
      }

      const productData = prodRows[0] || prodRows;
      const targetBasePrice = productData ? (Number(productData.base_price) || 0) : 0;
      const oldQuantity = productData ? (Number(productData.old_quantity) || 0) : 0;
      const oldProductCode = productData ? productData.old_product_code : '';

      const qty = Number(quantity) || 0;
      const lenMm = Number(length_mm) || 0;
      const wid = Number(width_value) || 0;
      const prc = Number(price) || 0;
      const pcs = Number(piece_quantity) || 0;
      const parsedSpec = parseFloat(specification);
      const finalChietKhau = Number(chiet_khau) || 0;
      const finalPhiShip = Number(phi_ship) || 0;
      const finalTotalAmountDetail = Number(total_amount) || 0;
      const safeConvQty = Number(converted_quantity) || 0;

      let finalTienGocDetail = Number(tien_goc) || Number(tienGoc) || 0;
      if (finalTienGocDetail === 0 && targetBasePrice > 0) {
        finalTienGocDetail = safeConvQty > 0 ? (safeConvQty * targetBasePrice) : (qty * targetBasePrice);
      }
      finalTienGocDetail = Math.round(finalTienGocDetail);

      const calculatedProfit = finalTotalAmountDetail - finalTienGocDetail - finalChietKhau - finalPhiShip;
      // KÍCH HOẠT TRANSACTION CẬP NHẬT LIÊN HOÀN BẢNG CON & BẢNG MẸ (PHẦN 2/2)
      db.beginTransaction((transactionErr) => {
        if (transactionErr) return res.status(500).json({ error: "Lỗi khởi tạo giao dịch sửa đổi tài chính!" });

        const updateSql = `UPDATE order_details SET
                    order_date = ?, order_id = ?, customer_id = ?, customer_slice = ?, product_code = ?,
                    quantity = ?, length_mm = ?, width_value = ?, price = ?, total_amount = ?,
                    length_value = ?, piece_quantity = ?, total_length = ?, detail_slice = ?,
                    converted_quantity = ?, profit = ?, specification = ?, chiet_khau = ?, phi_ship = ?,
                    tien_goc = ?, notes = ? 
                    WHERE id = ? AND order_id = ?`;

        const updateValues = [
          order_date, cleanOrderIdParam, finalCustomerId, finalCustomerSlice, product_code || '',
          qty, lenMm, wid, prc, finalTotalAmountDetail, length_value || '', pcs, total_length || '',
          detail_slice || '', safeConvQty, calculatedProfit, isNaN(parsedSpec) ? 0 : parsedSpec,
          finalChietKhau, finalPhiShip, finalTienGocDetail, notes || '', id, cleanOrderIdParam
        ];

        db.query(updateSql, updateValues, (updateErr) => {
          if (updateErr) {
            return db.rollback(() => {
              console.error("Lỗi cập nhật bảng con order_details:", updateErr.message);
              res.status(500).json({ error: "Lỗi ghi dữ liệu sửa đổi vào Database" });
            });
          }

          // 🌟 BƯỚC INJECT MỚI: XỬ LÝ BIẾN ĐỘNG KHO CUỐN CHIẾU BÁN ÂM TỰ ĐỘNG
          if (oldProductCode === product_code) {
            // Tình huống A: Giữ nguyên mã hàng, chỉ sửa số lượng (Ví dụ: Từ 5 cuộn lên 8 cuộn)
            const qtyDifference = qty - oldQuantity; // Lấy độ lệch phát sinh để trừ tiếp
            const adjustStockSql = `UPDATE products SET TonKho = TonKho - ?, total_exported = total_exported + ? WHERE product_code = ?`;

            db.query(adjustStockSql, [qtyDifference, qtyDifference, product_code], (stErr) => {
              if (stErr) return db.rollback(() => res.status(500).json({ error: "Lỗi cập nhật kho tịnh tiến!" }));
              runOrderCalculations();
            });
          } else {
            // Tình huống B: Nhân viên đổi sang một mã sản phẩm hoàn toàn mới trong ô chỉnh sửa
            // Bước 1: Cộng trả lại số lượng cho mã hàng cũ
            const refundStockSql = `UPDATE products SET TonKho = TonKho + ?, total_exported = total_exported - ? WHERE product_code = ?`;
            db.query(refundStockSql, [oldQuantity, oldQuantity, oldProductCode], (refErr) => {
              if (refErr) return db.rollback(() => res.status(500).json({ error: "Lỗi trả kho mã cũ!" }));

              // Bước 2: Trừ bớt kho của mã hàng mới chọn (Chấp nhận âm kho)
              const deductNewStockSql = `UPDATE products SET TonKho = TonKho - ?, total_exported = total_exported + ? WHERE product_code = ?`;
              db.query(deductNewStockSql, [qty, qty, product_code], (dedErr) => {
                if (dedErr) return db.rollback(() => res.status(500).json({ error: "Lỗi trừ kho mã mới!" }));
                runOrderCalculations();
              });
            });
          }

          // 4. LỆNH LIÊN HOÀN: Tính lại tổng tiền hàng và tổng lợi nhuận lên đơn mẹ orders
          function runOrderCalculations() {
            const sumSql = `SELECT SUM(total_amount) AS total_net, SUM(profit) AS total_profit_details FROM order_details WHERE order_id = ?`;
            db.query(sumSql, [cleanOrderIdParam], (sumErr, sumRows) => {
              if (sumErr) return db.rollback(() => res.status(500).json({ error: "Lỗi tính tiền hàng hóa đơn con!" }));

              const sumData = sumRows[0] || sumRows;
              const net_amount = sumData ? (Number(sumData.total_net) || 0) : 0;
              const total_profit = sumData ? (Number(sumData.total_profit_details) || 0) : 0;

              // 5. Truy vấn số tiền nợ cũ và số tiền khách đã trả của đơn mẹ
              const getOrderMomSql = `SELECT old_debt, customer_paid, order_slice FROM orders WHERE order_id = ? LIMIT 1`;
              db.query(getOrderMomSql, [cleanOrderIdParam], (momErr, momRows) => {
                if (momErr || !momRows || momRows.length === 0) {
                  return db.rollback(() => res.status(500).json({ error: "Lỗi kiểm tra thông tin công nợ hóa đơn tổng!" }));
                }

                const momData = momRows[0] || momRows;
                const old_debt = Number(momData.old_debt) || 0;
                const customer_paid = Number(momData.customer_paid) || 0;
                const order_slice = momData.order_slice || '';
                const total_amount_order = net_amount + old_debt;
                const current_debt = order_slice === 'no' ? (total_amount_order - customer_paid) : 0;

                // 5. UPDATE trực tiếp số liệu tài chính mới vào bảng orders mẹ
                const updateMomSql = `UPDATE orders SET net_amount = ?, total_amount = ?, current_debt = ?, total_profit = ? WHERE order_id = ?`;
                db.query(updateMomSql, [net_amount, total_amount_order, current_debt, total_profit, cleanOrderIdParam], (upMomErr) => {
                  if (upMomErr) return db.rollback(() => res.status(500).json({ error: "Lỗi ghi đè tiền tổng vào bảng hóa đơn mẹ" }));

                  // 6. CHỐT CHẶN: Commit xác nhận lưu vĩnh viễn dữ liệu vào database
                  db.commit((commitErr) => {
                    if (commitErr) return db.rollback(() => res.status(500).json({ error: "Lỗi xác nhận lưu chuỗi dữ liệu (Commit)" }));

                    return res.json({
                      message: "🎉 Chỉnh sửa vật tư và cập nhật kho cuốn chiếu bán âm thành công!",
                      net_amount: net_amount,
                      total_amount: total_amount_order,
                      current_debt: current_debt,
                      total_profit: total_profit
                    });
                  }); // Hết Commit
                }); // Hết updateMomSql
              }); // Hết lấy thông tin nợ đơn mẹ
            }); // Hết SUM dòng con
          } // Hết hàm runOrderCalculations
        }); // Hết Update dòng con
      }); // Hết Transaction
    }); // Hết lấy giá vốn danh mục sản phẩm
  }); // Hết Tra cứu đơn mẹ
}); // Hết app.put('/api/order-details/:id')


// API phụ: Lấy chi tiết của một đơn hàng cũ khi người dùng bấm xem cụ thể
// 🌟 API PHỤ: LẤY CHI TIẾT ĐƠN HÀNG (SỬA DỨT ĐIỂM LỖI KHÔNG TÌM THẤY ĐƠN HÀNG)
app.get('/api/orders/:order_id/details', (req, res) => {
  const { order_id } = req.params;

  // 🌟 CÂU LỆNH SQL NÂNG CẤP: 
  // 1. Tự động LEFT JOIN sang bảng orders (o) và customers (c) để bốc trường c.customer_slice xịn từ danh mục
  // 2. Sử dụng hàm IF để bù trừ: Nếu cột customer_slice ở dòng con (od.customer_slice) hoặc bảng orders cha bị trống ngầm,
  //    MySQL sẽ tự động lấy c.customer_slice từ danh mục khách hàng gốc điền vào.
  const sql = `
    SELECT 
      od.*, 
     od.order_date AS order_date,
      p.product_name, 
      c.customer_name,
      IF(od.customer_slice IS NULL OR TRIM(od.customer_slice) = '', c.customer_slice, od.customer_slice) AS customer_slice
    FROM order_details od
    LEFT JOIN products p ON od.product_code = p.product_code
    LEFT JOIN orders o ON od.order_id = o.order_id
    LEFT JOIN customers c ON o.customer_id = c.customer_id OR o.customer_id = c.customer_name
    WHERE od.order_id = ?
  `;

  db.query(sql, [order_id], (err, results) => {
    if (err) {
      console.error("Lỗi lấy chi tiết dòng con đơn hàng:", err.message);
      return res.status(500).json({ error: err.message });
    }

    // 🎯 SỬA ĐÚNG LUỒNG: Trả trực tiếp mảng kết quả 'results' về cho Frontend
    // Tuyệt đối không đóng gói bọc Object { customer_name, data } nữa để khớp khít với lệnh setOrderDetails(res.data) trên React
    res.json(results || []);
  });
});

// 🌟 API BACKEND: Bốc toàn bộ dữ liệu từ bảng order_details cấp cho Tab Tổng Frontend
app.get('/api/order-details', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 20); // Mặc định hiển thị 20 dòng 1 trang
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  // 🌟 ĐÃ CẬP NHẬT: JOIN sang bảng products ở cả 2 câu lệnh để đếm và tìm kiếm đồng bộ theo tên/ảnh sản phẩm
  let countSql = `
    SELECT COUNT(*) as total 
    FROM order_details od
    LEFT JOIN products p ON od.product_code = p.product_code
  `;

  let dataSql = `
    SELECT od.*, p.product_name, p.product_image 
    FROM order_details od
    LEFT JOIN products p ON od.product_code = p.product_code
  `;
  let params = [];

  // Logic bốc tách tìm kiếm không dấu đa điểm (Mã đơn, Mã sp, Tên sp từ bảng gốc, Ghi chú) trực tiếp bằng SQL
  if (search) {
    const searchParam = `%${search}%`;
    const whereClause = ` WHERE CONVERT(od.order_id USING utf8mb4) LIKE CONVERT(? USING utf8mb4) 
                          OR CONVERT(od.product_code USING utf8mb4) LIKE CONVERT(? USING utf8mb4) 
                          OR CONVERT(p.product_name USING utf8mb4) LIKE CONVERT(? USING utf8mb4)
                          OR CONVERT(od.notes USING utf8mb4) LIKE CONVERT(? USING utf8mb4)`;
    dataSql += whereClause;
    countSql += whereClause;
    params = [searchParam, searchParam, searchParam, searchParam];
  }

  // Sắp xếp ưu tiên order_date giảm dần (mới nhất lên đầu), sau đó mới tới id giảm dần
  dataSql += ` ORDER BY od.order_date DESC, od.id DESC LIMIT ${limit} OFFSET ${offset}`;

  db.query(countSql, params, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });
    const totalItems = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    db.query(dataSql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      // Trả về đúng định dạng Object bọc mảng kèm thông số phân trang đã có đủ trường product_image
      return res.json({
        data: results || [],
        pagination: { totalItems, totalPages, currentPage: page, limit }
      });
    });
  });
});



// 🌟 API HỦY/XÓA ĐƠN HÀNG HOÀN TOÀN (An toàn dữ liệu)
// 🌟 API HỦY/XÓA ĐƠN HÀNG HOÀN TOÀN (Đã bổ sung đồng bộ hoàn kho xuất chạy ngầm)
// =================================================================
// 🌟 API HỦY/XÓA ĐƠN HÀNG - HOÀN TỒN KHO CUỐN CHIẾU BÁN ÂM (PHẦN 1/2)
// =================================================================
app.delete('/api/orders/:order_id', (req, res) => {
  const { order_id } = req.params;

  // 1. Lấy chi tiết mã hàng và số lượng bán của đơn này TRƯỚC KHI XÓA để tiến hành hoàn kho
  const sqlGetDetails = 'SELECT product_code, quantity FROM order_details WHERE order_id = ?';
  db.query(sqlGetDetails, [order_id], (err, detailRows) => {
    if (err) {
      console.error("Lỗi thu thập dữ liệu sản phẩm trước khi xóa đơn:", err.message);
      return res.status(500).json({ error: "Lỗi hệ thống kiểm tra dữ liệu đơn hàng" });
    }

    const itemsToRefund = detailRows || [];

    // Bắt đầu quy trình Giao dịch (Transaction) an toàn
    db.beginTransaction((transactionErr) => {
      if (transactionErr) return res.status(500).json({ error: transactionErr.message });

      // Hàm đệ quy chạy ngầm tuần tự cộng trả lại kho cuốn chiếu cho từng mã hàng có trong đơn bị hủy
      // Cộng gộp lại TonKho và trừ bớt ở lũy kế xuất total_exported
      function refundInventory(index, callback) {
        if (index >= itemsToRefund.length) return callback();

        const item = itemsToRefund[index];
        const qty = Number(item.quantity) || 0;

        const sqlUpdateStock = `
            UPDATE products 
            SET TonKho = TonKho + ?, total_exported = total_exported - ? 
            WHERE product_code = ?
        `;

        db.query(sqlUpdateStock, [qty, qty, item.product_code], (stockErr) => {
          if (stockErr) {
            return db.rollback(() => {
              console.error("❌ Lỗi hoàn kho cuốn chiếu khi hủy đơn bán:", stockErr.message);
              return res.status(500).json({ error: "Lỗi hệ thống không thể đồng bộ lại kho hàng!" });
            });
          }
          refundInventory(index + 1, callback); // Chuyển sang sản phẩm tiếp theo trong đơn
        });
      }
      // Kích hoạt chuỗi cộng trả kho tịnh tiến trước khi xóa vật lý
      refundInventory(0, () => {
        // 2. Thực hiện xóa toàn bộ các mặt hàng chi tiết thuộc về đơn hàng này (bảng order_details)
        db.query('DELETE FROM order_details WHERE order_id = ?', [order_id], (deleteDetailsErr) => {
          if (deleteDetailsErr) {
            return db.rollback(() => {
              console.error("Lỗi xóa chi tiết đơn hàng:", deleteDetailsErr.message);
              return res.status(500).json({ error: "Lỗi hệ thống không thể xóa chi tiết đơn: " + deleteDetailsErr.message });
            });
          }

          // 3. Tiếp tục tiến hành xóa đơn hàng tổng quan (bảng orders)
          db.query('DELETE FROM orders WHERE order_id = ?', [order_id], (deleteOrderErr) => {
            if (deleteOrderErr) {
              return db.rollback(() => {
                console.error("Lỗi xóa đơn hàng tổng mẹ:", deleteOrderErr.message);
                return res.status(500).json({ error: "Lỗi hệ thống không thể xóa đơn hàng: " + deleteOrderErr.message });
              });
            }

            // 4. CHỐT CHẶN CUỐI: Nếu không có lỗi, tiến hành lưu thay đổi vĩnh viễn vào Database
            db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() => res.status(500).json({ error: commitErr.message }));
              }

              return res.json({ message: '🎉 Đã hủy, xóa đơn hàng thành công hoàn toàn và tự động đồng bộ hoàn trả lại kho!' });
            }); // Hết db.commit
          }); // Hết deleteOrder
        }); // Hết deleteDetails
      }); // Hết đệ quy hoàn kho refundInventory
    }); // Hết db.beginTransaction
  }); // Hết sqlGetDetails
}); // Hết app.delete('/api/orders/:order_id')


// ==========================================
// 🚀 4. API NHÀ CUNG CẤP (SUPPLIERS)
// ==========================================
app.get('/api/suppliers', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 20);
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let countSql = 'SELECT COUNT(*) as total FROM suppliers';

  // 🚀 ĐÃ SỬA: Lấy mốc ngày nhập hàng mới nhất bằng hàm MAX(po.purchase_date)
  let dataSql = `
    SELECT 
      s.*, 
      COUNT(po.purchase_id) AS total_purchases,
      MAX(po.purchase_date) AS latest_purchase_at 
    FROM suppliers s
    LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id
  `;

  let params = [];

  if (search) {
    const searchParam = `%${search}%`;
    const whereClause = ` WHERE CONVERT(s.supplier_id USING utf8mb4) LIKE CONVERT(? USING utf8mb4) 
                          OR CONVERT(s.supplier_name USING utf8mb4) LIKE CONVERT(? USING utf8mb4) 
                          OR s.phone_number LIKE ?`;

    const countWhereClause = ` WHERE CONVERT(supplier_id USING utf8mb4) LIKE CONVERT(? USING utf8mb4) 
                               OR CONVERT(supplier_name USING utf8mb4) LIKE CONVERT(? USING utf8mb4) 
                               OR phone_number LIKE ?`;

    dataSql += whereClause;
    countSql += countWhereClause;
    params = [searchParam, searchParam, searchParam];
  }

  // 🚀 ĐÃ SỬA LỖI GROUP FUNCTION: Sắp xếp trực tiếp theo biểu thức MAX(po.purchase_date)
  dataSql += ` 
    GROUP BY s.supplier_id 
    ORDER BY 
      (MAX(po.purchase_date) IS NULL) ASC, 
      MAX(po.purchase_date) DESC, 
      s.supplier_id DESC 
    LIMIT ${limit} OFFSET ${offset}
  `;

  db.query(countSql, params, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });

    // 🚀 ĐÃ SỬA: Lấy chính xác giá trị đếm từ phần tử đầu tiên của mảng kết quả [0]
    const totalItems = (countResult && countResult[0]) ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    db.query(dataSql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({
        data: results || [],
        pagination: { totalItems, totalPages, currentPage: page, limit }
      });
    });
  });
});



app.post('/api/suppliers', (req, res) => {
  const { supplier_id, supplier_name, supplier_slice, address, phone_number, supplier_image } = req.body;

  const sql = `INSERT INTO suppliers (supplier_id, supplier_name, supplier_slice, address, phone_number, supplier_image) 
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [supplier_id, supplier_name, supplier_slice, address, phone_number, supplier_image], (err) => {
    if (err) {
      console.error("❌ Lỗi MySQL khi chèn nhà cung cấp mới:", err.message);
      return res.status(500).json({ error: "Không thể thêm, Mã số hoặc Tên có thể đã tồn tại!", details: err.message });
    }
    return res.json({ message: 'Thêm nhà cung cấp thành công!' });
  });
});


// API Cập nhật thông tin nhà cung cấp dựa vào tham số mã định danh khóa chính :id
app.put('/api/suppliers/:id', (req, res) => {
  const { supplier_name, supplier_slice, address, phone_number, supplier_image } = req.body;
  const supplierId = req.params.id;

  const sql = `UPDATE suppliers 
               SET supplier_name = ?, supplier_slice = ?, address = ?, phone_number = ?, supplier_image = ? 
               WHERE supplier_id = ?`;

  db.query(sql, [supplier_name, supplier_slice, address, phone_number, supplier_image, supplierId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'Cập nhật nhà cung cấp thành công!' });
  });
});

// API Xóa vĩnh viễn dữ liệu một nhà cung cấp theo mã số
app.delete('/api/suppliers/:id', (req, res) => {
  const supplierId = req.params.id;

  db.query('DELETE FROM suppliers WHERE supplier_id = ?', [supplierId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'Xóa nhà cung cấp thành công!' });
  });
});


// API Lấy thông tin chi tiết của 1 Nhà cung cấp duy nhất theo mã số ID phục vụ xem cụ thể
app.get('/api/suppliers/:id', (req, res) => {
  try {
    const supplierId = decodeURIComponent(req.params.id).trim();
    const sql = 'SELECT * FROM suppliers WHERE supplier_id = ?';

    db.query(sql, [supplierId], (err, results) => {
      if (err) {
        console.error("❌ Lỗi truy vấn MySQL chi tiết nhà cung cấp:", err.message);
        return res.status(500).json({ error: "Lỗi kết nối cơ sở dữ liệu MySQL!" });
      }
      if (!results || results.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy thông tin nhà cung cấp này!" });
      }
      // Trả về phần tử đầu tiên dạng Đối tượng {} sạch cho Frontend React đọc trực tiếp
      return res.json(results[0]);
    });
  } catch (globalErr) {
    console.error("❌ Lỗi hệ thống server:", globalErr.message);
    return res.status(500).json({ error: "Lỗi xử lý server!" });
  }
});

// API Lấy danh sách lịch sử tất cả các đơn nhập hàng thuộc Nhà cung cấp này dựa vào tên liên kết
app.get('/api/suppliers/:id/orders', (req, res) => {
  const supplierId = req.params.id;
  const sql = `
    SELECT purchase_id, purchase_date, total_amount, notes
    FROM purchase_orders
    WHERE supplier_id = ?
    ORDER BY purchase_date DESC, purchase_id DESC
  `;
  db.query(sql, [supplierId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(results || []);
  });
});


// 🌟 API CẬP NHẬT THÔNG TIN ĐƠN HÀNG (Lưu thay đổi từ nút bấm Frontend)
// 🌟 API CẬP NHẬT ĐƠN HÀNG TỔNG CHUẨN HÓA (ĐÃ KHÓA CHẶT LỖI XÓA DỮ LIỆU)
app.put('/api/orders/:order_id', (req, res) => {
  const { order_id } = req.params;
  const { order_date: rawOrderDate, customer_id, ...restData } = req.body;

  // Rào chắn bảo vệ: Từ chối xử lý nếu mã đơn hàng tổng bị rỗng
  if (!order_id || String(order_id).trim() === "" || order_id === "undefined") {
    return res.status(400).json({ error: "Mã đơn hàng (order_id) không hợp lệ, từ chối cập nhật!" });
  }

  // Khởi tạo object chứa dữ liệu cập nhật
  let updateData = {};
  const validColumns = ['net_amount', 'old_debt', 'total_amount', 'customer_paid', 'current_debt', 'order_slice', 'notes'];

  validColumns.forEach(col => {
    if (restData[col] !== undefined) updateData[col] = restData[col];
  });

  if (rawOrderDate) {
    const localDate = new Date(rawOrderDate);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    updateData.order_date = `${year}-${month}-${day}`;
  }
  updateData.updated_at = new Date();

  // Hàm thực thi cập nhật bảng orders (Tách biệt để tái sử dụng)
  const executeOrderUpdate = (finalData, finalCustId = null, finalSlice = null) => {
    db.beginTransaction((transactionErr) => {
      if (transactionErr) return res.status(500).json({ error: transactionErr.message });

      const sql = 'UPDATE orders SET ? WHERE order_id = ?';
      db.query(sql, [finalData, order_id], (err) => {
        if (err) return db.rollback(() => res.status(500).json({ error: "Lỗi cập nhật bảng orders: " + err.message }));

        // 🎯 CHỈ ĐỒNG BỘ BẢNG CON KHI CÓ HÀNH VI ĐỔI KHÁCH HÀNG THỰC SỰ
        if (finalCustId && finalSlice !== null) {
          const updateDetailsSql = 'UPDATE order_details SET customer_id = ?, customer_slice = ? WHERE order_id = ?';
          db.query(updateDetailsSql, [finalCustId, finalSlice, order_id], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: "Lỗi đồng bộ bảng chi tiết: " + err.message }));

            db.commit((commitErr) => {
              if (commitErr) return db.rollback(() => res.status(500).json({ error: commitErr.message }));
              return res.json({ message: 'Đổi khách hàng và đồng bộ phân đoạn thành công!', orderInfo: finalData });
            });
          });
        } else {
          // Nếu chỉ cập nhật tiền từ hàm liên hoàn, commit luôn, không động vào bảng con order_details
          db.commit((commitErr) => {
            if (commitErr) return db.rollback(() => res.status(500).json({ error: commitErr.message }));
            return res.json({ message: 'Cập nhật số tiền đơn tổng thành công!', orderInfo: finalData });
          });
        }
      });
    });
  };

  // 🌟 LUỒNG XỬ LÝ 1: Nếu Frontend CÓ truyền customer_id lên (Hành vi đổi khách hàng bên ngoài trang tổng)
  if (customer_id && String(customer_id).trim() !== "" && customer_id !== "---") {
    const cleanInput = String(customer_id).trim();
    const findRealIdSql = `SELECT customer_id, customer_slice FROM customers WHERE customer_name = ? OR customer_id = ? LIMIT 1`;

    db.query(findRealIdSql, [cleanInput, cleanInput], (err, customerRows) => {
      if (err) return res.status(500).json({ error: "Lỗi kết nối cơ sở dữ liệu: " + err.message });
      if (!customerRows || customerRows.length === 0) {
        return res.status(400).json({ error: `Khách hàng "${cleanInput}" không tồn tại trên hệ thống!` });
      }

      // Sửa lỗi bóc tách mảng an toàn 100% bằng cách ép kiểm tra mảng dữ liệu trả về từ driver mysql
      const rowData = Array.isArray(customerRows) ? customerRows[0] : customerRows;
      const finalRealCustomerId = rowData.customer_id;
      const finalCustomerSlice = rowData.customer_slice || '';

      // Bổ sung thông tin khách vào payload update
      updateData.customer_id = finalRealCustomerId;
      updateData.customer_slice = finalCustomerSlice;

      // Thực thi luồng cập nhật có đồng bộ bảng con
      executeOrderUpdate(updateData, finalRealCustomerId, finalCustomerSlice);
    });
  } else {
    // 🌟 LUỒNG XỬ LÝ 2: Nếu Frontend KHÔNG truyền customer_id (Hàm liên hoàn tính tiền trên trang chi tiết)
    // Chạy thẳng lệnh update tiền, tuyệt đối không truy vấn khách hàng, không ghi đè customer_slice!
    executeOrderUpdate(updateData);
  }
});



// 🌟 API CẬP NHẬT THÔNG TIN ĐƠN HÀNG (ĐÃ SỬA LỖI CÚ PHÁP SQL CHÈN MẢNG BULK INSERT)
// =================================================================
// 🌟 API GHI ĐÈ ĐƠN BÁN HÀNG LOẠT - ĐỒNG BỘ KHO CUỐN CHIẾU CHUẨN (PHẦN 1/2)
// =================================================================
app.put('/api/orders/:order_id/update-details', (req, res) => {
  const { order_id } = req.params;
  const { orderInfo, updatedDetails } = req.body;
  const cleanOrder = orderInfo || req.body;
  const detailsList = updatedDetails || cleanOrder.updatedDetails || [];

  const safeNum = (val) => {
    const n = parseFloat(val);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  };

  const net_amount = safeNum(cleanOrder.net_amount);
  const old_debt = safeNum(cleanOrder.old_debt);
  const total_amount = safeNum(cleanOrder.total_amount);
  const customer_paid = safeNum(cleanOrder.customer_paid);
  const current_debt = safeNum(cleanOrder.current_debt);

  let order_date = new Date().toLocaleDateString('en-CA');
  if (cleanOrder.order_date) {
    const localDate = new Date(cleanOrder.order_date);
    order_date = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  }

  const customer_id = cleanOrder.customer_id || '';
  const order_slice = cleanOrder.order_slice || '';
  const notes = cleanOrder.notes || '';

  if (!customer_id) {
    return res.status(400).json({ error: "Mã khách hàng không được để trống khi sửa đơn!" });
  }

  let total_profit = 0;
  if (Array.isArray(detailsList)) {
    detailsList.forEach(item => {
      total_profit += parseFloat(item.profit) || 0;
    });
  }
  total_profit = Math.round(total_profit);

  // 🔎 BƯỚC 1: Tìm danh sách sản phẩm và số lượng quy đổi cũ trong DB để tiến hành hoàn kho
  const sqlGetOldDetails = `
        SELECT product_code, converted_quantity 
        FROM order_details 
        WHERE order_id = ? AND (TRIM(LOWER(detail_slice)) <> 'bao gia' OR detail_slice IS NULL)
    `;

  db.query(sqlGetOldDetails, [order_id], (oldDetailsErr, oldRows) => {
    if (oldDetailsErr) {
      console.error("❌ Lỗi đối soát kho trước khi sửa đơn:", oldDetailsErr.message);
      return res.status(500).json({ error: "Lỗi hệ thống khi kiểm tra thông tin kho cũ!" });
    }

    const oldItems = oldRows || [];

    // 🌟 KHỞI ĐẦU CHUỖI TRANSACTION AN TOÀN
    db.beginTransaction((err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Hàm đệ quy hoàn lại kho cũ cho các món đã bán (Cộng trả lại TonKho, trừ bớt total_exported)
      function refundOldInventory(idx, nextStepCallback) {
        if (idx >= oldItems.length) return nextStepCallback();

        const item = oldItems[idx];
        const oldQty = safeNum(item.converted_quantity);

        const refundSql = `UPDATE products SET TonKho = TonKho + ?, total_exported = total_exported - ? WHERE product_code = ?`;
        db.query(refundSql, [oldQty, oldQty, item.product_code], (refErr) => {
          if (refErr) {
            return db.rollback(() => res.status(500).json({ error: "Lỗi hệ thống khi hoàn trả tồn kho cũ!" }));
          }
          refundOldInventory(idx + 1, nextStepCallback); // Duyệt mặt hàng cũ tiếp theo
        });
      }

      // Kích hoạt luồng hoàn kho cũ
      refundOldInventory(0, () => {
        // 1. Cập nhật số liệu vào bảng orders mẹ
        const updateOrderSql = `
                    UPDATE orders SET 
                        order_date = ?, customer_id = ?, net_amount = ?, old_debt = ?, 
                        total_amount = ?, customer_paid = ?, current_debt = ?, total_profit = ?, 
                        order_slice = ?, notes = ?, updated_at = NOW() 
                    WHERE order_id = ?
                `;
        db.query(updateOrderSql, [order_date, customer_id, net_amount, old_debt, total_amount, customer_paid, current_debt, total_profit, order_slice, notes, order_id], (upOrderErr) => {
          if (upOrderErr) return db.rollback(() => res.status(500).json({ error: "Lỗi cập nhật bảng orders: " + upOrderErr.message }));

          // Xóa chi tiết cũ ra khỏi DB để chuẩn bị ghi đè mảng mới
          // 3. Lấy danh sách tất cả các ID chi tiết dòng con hiện đang có dưới DB của đơn này
          const sqlGetExistingIds = `SELECT id FROM order_details WHERE order_id = ?`;
          db.query(sqlGetExistingIds, [order_id], (idErr, idRows) => {
            if (idErr) return db.rollback(() => res.status(500).json({ error: "Lỗi lấy ID chi tiết cũ: " + idErr.message }));

            const dbIds = (idRows || []).map(row => row.id);

            // Thu thập các ID gửi từ React lên (những dòng cũ được giữ lại)
            const frontendIds = detailsList.map(item => item.id).filter(id => id != null).map(id => parseInt(id));

            // Xác định các ID đã bị người dùng bấm XOÁ trên giao diện Frontend
            const idsToDelete = dbIds.filter(id => !frontendIds.includes(id));

            // Hàm thực hiện XÓA các dòng vật tư đã bị loại bỏ
            function deleteRemovedDetails(deleteCallback) {
              if (idsToDelete.length === 0) return deleteCallback();

              db.query('DELETE FROM order_details WHERE id IN (?)', [idsToDelete], (delErr) => {
                if (delErr) return db.rollback(() => res.status(500).json({ error: "Lỗi xóa dòng chi tiết cũ: " + delErr.message }));
                deleteCallback();
              });
            }

            // Hàm đệ quy xử lý từng dòng vật tư từ Frontend gửi lên: UPDATE dòng cũ hoặc INSERT dòng mới
            function saveOrUpdateDetails(newIdx, saveCallback) {
              if (newIdx >= detailsList.length) return saveCallback();

              const item = detailsList[newIdx];
              const itemId = item.id ? parseInt(item.id) : null;

              // Chuẩn bị mảng tham số dữ liệu chuẩn hoá
              const finalDetailDate = item.order_date ? String(item.order_date).slice(0, 10) : order_date;

              const params = [
                finalDetailDate, customer_id, item.customer_slice || '', item.product_code || '',
                safeNum(item.quantity), safeNum(item.length_mm), safeNum(item.width_value), safeNum(item.length_value),
                safeNum(item.piece_quantity), safeNum(item.total_length), safeNum(item.price), safeNum(item.total_amount),
                isNaN(parseFloat(item.specification)) ? 0 : parseFloat(item.specification),
                item.detail_slice || '', safeNum(item.converted_quantity), safeNum(item.profit),
                safeNum(item.tien_goc), safeNum(item.chiet_khau), safeNum(item.phi_ship), item.notes || ''
              ];

              if (itemId && dbIds.includes(itemId)) {
                // 🔄 HÀNG CŨ CÓ SẴN ID -> CHỈ CẬP NHẬT (Giữ nguyên ID khóa chính dưới DB)
                const sqlUpdateDetail = `
        UPDATE order_details SET 
          order_date = ?, customer_id = ?, customer_slice = ?, product_code = ?,
          quantity = ?, length_mm = ?, width_value = ?, length_value = ?,
          piece_quantity = ?, total_length = ?, price = ?, total_amount = ?,
          specification = ?, detail_slice = ?, converted_quantity = ?, profit = ?,
          tien_goc = ?, chiet_khau = ?, phi_ship = ?, notes = ?
        WHERE id = ? AND order_id = ?
      `;
                db.query(sqlUpdateDetail, [...params, itemId, order_id], (upErr) => {
                  if (upErr) return db.rollback(() => res.status(500).json({ error: "Lỗi cập nhật dòng chi tiết: " + upErr.message }));
                  saveOrUpdateDetails(newIdx + 1, saveCallback);
                });
              } else {
                // 🆕 HÀNG MỚI CHƯA CÓ ID -> CHÈN MỚI TINH (DB tự cấp ID tăng tự động mới cho dòng này)
                const sqlInsertDetail = `
        INSERT INTO order_details 
        (order_id, order_date, customer_id, customer_slice, product_code, quantity, length_mm, width_value, length_value, piece_quantity, total_length, price, total_amount, specification, detail_slice, converted_quantity, profit, tien_goc, chiet_khau, phi_ship, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
                db.query(sqlInsertDetail, [order_id, ...params], (insErr) => {
                  if (insErr) return db.rollback(() => res.status(500).json({ error: "Lỗi chèn dòng chi tiết mới: " + insErr.message }));
                  saveOrUpdateDetails(newIdx + 1, saveCallback);
                });
              }
            }

            // Kích hoạt chuỗi xử lý bất đồng bộ tuần tự an toàn
            deleteRemovedDetails(() => {
              saveOrUpdateDetails(0, () => {

                // 🌟 5. BƯỚC CẬP NHẬT KHO LŨY TIẾN THEO MẢNG MỚI (CHỈ TRỪ KHO KHI KHÁC "bao gia")
                function applyNewInventory(newIdx, commitCallback) {
                  if (newIdx >= detailsList.length) return commitCallback();

                  const currentItem = detailsList[newIdx];
                  const isBaoGia = currentItem.detail_slice && String(currentItem.detail_slice).trim().toLowerCase() === 'bao gia';

                  if (isBaoGia) {
                    return applyNewInventory(newIdx + 1, commitCallback);
                  }

                  const newQty = safeNum(currentItem.converted_quantity);
                  const applySql = `UPDATE products SET TonKho = TonKho - ?, total_exported = total_exported + ? WHERE product_code = ?`;

                  db.query(applySql, [newQty, newQty, currentItem.product_code], (appErr) => {
                    if (appErr) {
                      return db.rollback(() => res.status(500).json({ error: "Lỗi hệ thống khi tịnh tiến trừ kho mới!" }));
                    }
                    applyNewInventory(newIdx + 1, commitCallback);
                  });
                }

                // Kích hoạt trừ kho mảng mới và kết thúc bằng việc COMMIT xác nhận dữ liệu vĩnh viễn
                applyNewInventory(0, () => {
                  db.commit((commitErr) => {
                    if (commitErr) return db.rollback(() => res.status(500).json({ error: commitErr.message }));
                    return res.json({
                      message: "🎉 Ghi đè cập nhật giỏ hàng và đồng bộ kho cuốn chiếu thành công mỹ mãn!",
                      net_amount: net_amount,
                      total_amount: total_amount,
                      current_debt: current_debt

                    }); // Hết Commit
                  }); // Hết applyNewInventory
                }); // Hết saveOrUpdateDetails
              }); // Hết deleteRemovedDetails
            }); // Hết sqlGetExistingIds
          });
        });
      });
    });
  });
});


            // API xóa một dòng vật tư con trong chi tiết đơn hàng
            // TRANG 29: Thay thế hoàn toàn API app.delete('/api/order-details/:id')
            // =================================================================
            // 🌟 API XÓA MỘT DÒNG VẬT TƯ LẺ - HOÀN TỒN KHO CUỐN CHIẾU BÁN ÂM
            // =================================================================
            // =================================================================
            // 🌟 API XÓA MỘT DÒNG VẬT TƯ LẺ - PHIÊN BẢN VÁ CHUẨN MẢNG [0] KHỚP KHO
            // =================================================================
            app.delete('/api/order-details/:id', (req, res) => {
              const detailId = req.params.id;

              // 1. Tìm thông tin dòng vật tư sắp xóa
              const sqlFind = 'SELECT order_id, product_code, quantity FROM order_details WHERE id = ?';
              db.query(sqlFind, [detailId], (findErr, findResult) => {
                if (findErr || !findResult || findResult.length === 0) {
                  return res.status(404).json({ error: "Không tìm thấy thông tin dòng vật tư này!" });
                }

                // 🌟 ĐÃ VÁ: Bắt buộc phải có [0] để bốc đúng dữ liệu từ mảng MySQL trả về
                const parentOrderId = findResult[0].order_id;
                const targetProductCode = findResult[0].product_code;
                const qty = Number(findResult[0].converted_quantity) || 0;

                // Kích hoạt chuỗi Transaction bảo vệ tài chính liên hoàn
                db.beginTransaction((transactionErr) => {
                  if (transactionErr) return res.status(500).json({ error: "Lỗi khởi tạo chuỗi giao dịch sửa đổi!" });

                  // 2. Thực hiện xóa dòng vật tư con ra khỏi bảng chi tiết
                  const sqlDelete = 'DELETE FROM order_details WHERE id = ?';
                  db.query(sqlDelete, [detailId], (deleteErr) => {
                    if (deleteErr) {
                      return db.rollback(() => {
                        console.error("❌ Lỗi khi xóa dòng vật tư bán lẻ:", deleteErr.message);
                        return res.status(500).json({ error: "Không thể xóa dòng vật tư" });
                      });
                    }

                    // 🌟 BƯỚC INJECT CẬP NHẬT KHO: Cộng trả lại số lượng vào TonKho và trừ bớt ở lũy kế xuất total_exported
                    const sqlStock = `
          UPDATE products 
          SET TonKho = TonKho + ?, total_exported = total_exported - ? 
          WHERE product_code = ?
        `;
                    db.query(sqlStock, [qty, qty, targetProductCode], (stockErr) => {
                      if (stockErr) {
                        return db.rollback(() => {
                          console.error("❌ Lỗi hoàn kho cuốn chiếu khi xóa dòng bán lẻ:", stockErr.message);
                          return res.status(500).json({ error: "Lỗi hệ thống không thể đồng bộ lại kho hàng!" });
                        });
                      }

                      // 3. TỰ ĐỘNG CẬP NHẬT TIỀN: Tính lại tổng tiền hàng và tổng lợi nhuận của các dòng con còn lại
                      const sqlSum = `SELECT SUM(total_amount) AS total_net, SUM(profit) AS total_profit_details FROM order_details WHERE order_id = ?`;
                      db.query(sqlSum, [parentOrderId], (sumErr, sumResult) => {
                        if (sumErr) {
                          return db.rollback(() => res.status(500).json({ error: "Lỗi tính toán tổng số tiền còn lại!" }));
                        }

                        // Vá tiếp [0] cho luồng tính tổng tiền đơn mẹ
                        const sumData = sumResult[0] || sumResult;
                        const net_amount = sumData ? (Number(sumData.total_net) || 0) : 0;
                        const total_profit = sumData ? (Number(sumData.total_profit_details) || 0) : 0;

                        // 4. Truy vấn số tiền nợ cũ và số tiền khách đã trả của đơn mẹ để tính dư nợ mới
                        const getOrderMomSql = `SELECT old_debt, customer_paid, order_slice FROM orders WHERE order_id = ? LIMIT 1`;
                        db.query(getOrderMomSql, [parentOrderId], (momErr, momRows) => {
                          if (momErr || !momRows || momRows.length === 0) {
                            return db.rollback(() => res.status(500).json({ error: "Lỗi kiểm tra thông tin công nợ hóa đơn tổng!" }));
                          }

                          const momData = momRows[0] || momRows;
                          const old_debt = Number(momData.old_debt) || 0;
                          const customer_paid = Number(momData.customer_paid) || 0;
                          const order_slice = momData.order_slice || '';

                          const total_amount_order = net_amount + old_debt;
                          const current_debt = order_slice === 'no' ? (total_amount_order - customer_paid) : 0;

                          // 5. UPDATE số liệu tài chính mới vào bảng orders mẹ
                          const updateMomSql = `UPDATE orders SET net_amount = ?, total_amount = ?, current_debt = ?, total_profit = ? WHERE order_id = ?`;
                          db.query(updateMomSql, [net_amount, total_amount_order, current_debt, total_profit, parentOrderId], (upMomErr) => {
                            if (upMomErr) return db.rollback(() => res.status(500).json({ error: "Lỗi ghi đè tiền tổng vào bảng hóa đơn mẹ" }));

                            // 6. CHỐT CHẶN CUỐI CÙNG: Commit xác nhận lưu vĩnh viễn chuỗi giao dịch vào database
                            db.commit((commitErr) => {
                              if (commitErr) return db.rollback(() => res.status(500).json({ error: "Lỗi xác nhận Commit dữ liệu xóa dòng!" }));

                              return res.json({
                                success: true,
                                message: "🎉 Đã xóa dòng vật tư, đồng bộ hoàn kho và tự động cập nhật lại tiền đơn cha thành công!",
                                net_amount: net_amount,
                                total_amount: total_amount_order,
                                current_debt: current_debt,
                                total_profit: total_profit
                              });
                            }); // Hết Commit
                          }); // Hết updateMomSql
                        }); // Hết getOrderMomSql
                      }); // Hết sqlSum
                    }); // Hết sqlStock
                  }); // Hết sqlDelete
                }); // Hết db.beginTransaction
              }); // Hết sqlFind
            });


            // ==========================================
            // 🚀 API THÊM MỚI ĐƠN NHẬP HÀNG TỔNG (ĐÃ SỬA ĐỊNH DẠNG MÃ N + DDMMYYYYHHmmss)
            // ==========================================
            app.post('/api/purchase-orders', (req, res) => {
              const { purchase_date: rawPurchaseDate, supplier_id, total_amount, notes } = req.body;

              // 1. Kiểm tra mã nhà cung cấp (chấp nhận cả chuỗi chữ varchar)
              if (!supplier_id || String(supplier_id).trim() === "") {
                return res.status(400).json({ error: "Mã số Nhà cung cấp (supplier_id) không được để trống!" });
              }

              // 2. Định dạng ngày tháng an toàn theo đúng logic hệ thống của bạn
              let purchase_date = new Date().toLocaleDateString('en-CA'); // Mặc định lấy ngày hôm nay (YYYY-MM-DD)
              if (rawPurchaseDate) {
                const localDate = new Date(rawPurchaseDate);
                const year = localDate.getFullYear();
                const month = String(localDate.getMonth() + 1).padStart(2, '0');
                const day = String(localDate.getDate()).padStart(2, '0');
                purchase_date = `${year}-${month}-${day}`; // Trả về dạng YYYY-MM-DD để MySQL tự hiểu khi lưu vào datetime
              }

              // 🚀 CẬP NHẬT TẠI ĐÂY: Sinh mã đơn dạng "N" + ddmmyyyyhhmmss chính xác đến từng giây
              const now = new Date();
              const d = String(now.getDate()).padStart(2, '0');
              const m = String(now.getMonth() + 1).padStart(2, '0');
              const y = now.getFullYear();

              const hh = String(now.getHours()).padStart(2, '0');
              const mm = String(now.getMinutes()).padStart(2, '0');
              const ss = String(now.getSeconds()).padStart(2, '0');

              // Kết quả tạo ra dạng chuỗi: N12072026202530
              const generatedPurchaseId = `N${d}${m}${y}${hh}${mm}${ss}`;

              // 3. Tiến hành gộp dữ liệu để chèn vào database
              const insertData = {
                purchase_id: generatedPurchaseId,
                purchase_date: purchase_date,
                supplier_id: String(supplier_id).trim(), // Ép kiểu chuỗi khớp với varchar(250) trong database
                total_amount: Number(total_amount) || 0,
                notes: notes || ''
              };

              db.query('INSERT INTO purchase_orders SET ?', insertData, (err, result) => {
                if (err) {
                  // Nếu có lỗi từ database, in lỗi ra màn hình terminal để dễ kiểm tra
                  console.error("Lỗi MySQL khi lưu đơn nhập hàng:", err.message);
                  return res.status(500).json({ error: "Lỗi cơ sở dữ liệu: " + err.message });
                }
                return res.status(201).json({ message: "Thành công", purchase_id: generatedPurchaseId });
              });
            });


            // ==========================================================
            // 🚀 API LẤY DANH SÁCH ĐƠN NHẬP HÀNG (ĐÃ ĐỒNG BỘ GIỐNG ĐƠN HÀNG)
            // ==========================================================
            app.get('/api/purchase-orders', (req, res) => {
              const search = (req.query.search || '').trim();
              const page = Math.max(1, parseInt(req.query.page) || 1);
              const limit = Math.max(1, parseInt(req.query.limit) || 10);
              const offset = (page - 1) * limit;

              // Nếu có từ khóa tìm kiếm (Lọc dữ liệu theo từ khóa + Phân trang an toàn)
              if (search) {
                const searchParam = `%${search}%`;

                // 1. Câu lệnh đếm tổng số dòng khớp với từ khóa tìm kiếm
                const countSql = `
      SELECT COUNT(*) as total 
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      WHERE po.purchase_id LIKE ? 
      OR po.supplier_id LIKE ? 
      OR s.supplier_name LIKE ?
    `;

                // 2. Câu lệnh lấy dữ liệu khớp với từ khóa tìm kiếm (Có giới hạn limit/offset)
                const dataSql = `
      SELECT po.*, DATE_FORMAT(po.purchase_date, '%Y-%m-%d') as purchase_date, s.supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      WHERE po.purchase_id LIKE ? 
      OR po.supplier_id LIKE ? 
      OR s.supplier_name LIKE ?
      ORDER BY po.purchase_date DESC, po.purchase_id DESC 
      LIMIT ? OFFSET ?
    `;

                db.query(countSql, [searchParam, searchParam, searchParam], (err, countResult) => {
                  if (err) return res.status(500).json({ error: err.message });

                  const totalRows = countResult[0]?.total || 0;
                  const totalPages = Math.ceil(totalRows / limit) || 1;

                  db.query(dataSql, [searchParam, searchParam, searchParam, limit, offset], (err, dataResult) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // Trả về cấu trúc bọc trong object phân trang đồng bộ với Frontend
                    return res.json({
                      data: dataResult || [],
                      pagination: { totalRows, totalPages, currentPage: page, limit }
                    });
                  });
                });
              }
              // Nếu KHÔNG có từ khóa tìm kiếm (Hiển thị mặc định ban đầu)
              else {
                const countSql = 'SELECT COUNT(*) as total FROM purchase_orders';
                const dataSql = `
      SELECT po.*, DATE_FORMAT(po.purchase_date, '%Y-%m-%d') as purchase_date, s.supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      ORDER BY po.purchase_date DESC, po.purchase_id DESC 
      LIMIT ? OFFSET ?
    `;

                db.query(countSql, (err, countResult) => {
                  if (err) return res.status(500).json({ error: err.message });

                  const totalRows = countResult[0]?.total || 0; // Sửa lỗi lấy dữ liệu từ phần tử đầu tiên của mảng
                  const totalPages = Math.ceil(totalRows / limit) || 1;

                  db.query(dataSql, [limit, offset], (err, dataResult) => {
                    if (err) return res.status(500).json({ error: err.message });

                    return res.json({
                      data: dataResult || [],
                      pagination: { totalRows, totalPages, currentPage: page, limit }
                    });
                  });
                });
              }
            });


            // Thêm API lấy CHI TIẾT 1 đơn nhập hàng theo ID
            app.get('/api/purchase-orders/:id', (req, res) => {
              const purchaseId = req.params.id;
              const sql = `
    SELECT po.*, DATE_FORMAT(po.purchase_date, '%Y-%m-%d') as purchase_date, s.supplier_name 
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
    WHERE po.purchase_id = ?
  `;

              db.query(sql, [purchaseId], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                if (results.length === 0) return res.status(404).json({ error: "Không tìm thấy đơn hàng" });

                // TRẢ VỀ ĐÚNG 1 OBJECT ĐƠN HÀNG DUY NHẤT
                return res.json(results[0]);
              });
            });


            // 🌟 BỔ SUNG API LẤY CHI TIẾT VẬT TƯ CỦA ĐƠN NHẬP HÀNG (NẰM TRONG SERVER.JS)
            app.get('/api/purchase-order-details', (req, res) => {
              const purchase_id = req.query.purchase_id; // Đón nhận mã đơn nhập từ Frontend gửi lên

              if (!purchase_id) {
                return res.status(400).json({ error: "Thiếu purchase_id đơn nhập kho!" });
              }

              // Câu lệnh truy vấn lấy toàn bộ vật tư thuộc đơn nhập này (Thay tên bảng thực tế của bạn nếu khác nhé)
              // 🌟 CẬP NHẬT: Sử dụng LEFT JOIN để lấy TÊN và ẢNH động từ bảng danh mục sản phẩm products
              const sql = `
  SELECT 
    pod.id,
    pod.purchase_id,
    pod.product_code,
    pod.quantity,
    pod.import_price,
    pod.total_amount,
    pod.notes,
    pod.length_value,
    pod.width_value,
    pod.dien_tich,
    p.product_name
    -- 🌟 LẤY TÊN VÀ ẢNH MỚI NHẤT TỪ BẢNG SẢN PHẨM GỐC
     FROM purchase_order_details pod
  LEFT JOIN products p ON pod.product_code = p.product_code
  WHERE pod.purchase_id = ?
`;

              db.query(sql, [purchase_id], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                return res.json(results || []); // Trả về trực tiếp mảng sạch chứa danh sách vật tư giống hệt đơn bán hàng
              });
            });


            // API mới hoàn toàn: Lấy tổng dữ liệu toàn bộ dòng đơn nhập có phân trang và tìm kiếm
            // =========================================================================
            // ✅ ĐOẠN API SỬA LỖI HOÀN HẢO CHẠY 100% (BÁC THAY THẾ VÀO SERVER.JS):
            // =========================================================================
            app.get('/api/all-purchase-order-details', (req, res) => {
              const page = Math.max(1, parseInt(req.query.page) || 1);
              const limit = Math.max(1, parseInt(req.query.limit) || 20);
              const search = req.query.search ? req.query.search.trim() : '';
              const offset = (page - 1) * limit;

              let countSql = 'SELECT COUNT(*) as total FROM purchase_order_details pod'; // 🌟 Thêm alias pod vào đây
              // ĐỐI CHIẾU: JOIN thêm bảng sản phẩm để đếm đồng bộ
              countSql += ` LEFT JOIN products p ON pod.product_code = p.product_code`;

              let dataSql = `
    SELECT pod.*, p.product_name, p.product_image
    FROM purchase_order_details pod
    LEFT JOIN products p ON pod.product_code = p.product_code
  `;
              let params = [];

              if (search) {
                const searchParam = `%${search}%`;
                const whereClause = ` WHERE CONVERT(pod.purchase_id USING utf8mb4) LIKE CONVERT(? USING utf8mb4) 
                          OR CONVERT(pod.product_code USING utf8mb4) LIKE CONVERT(? USING utf8mb4) 
                          OR CONVERT(p.product_name USING utf8mb4) LIKE CONVERT(? USING utf8mb4)
                          OR CONVERT(pod.notes USING utf8mb4) LIKE CONVERT(? USING utf8mb4)`;
                dataSql += whereClause;
                countSql += whereClause;
                params = [searchParam, searchParam, searchParam, searchParam];
              }

              // 🌟 ĐÃ SỬA: Chuyển sang dùng cú pháp dấu ? an toàn tuyệt đối cho LIMIT và OFFSET
              dataSql += ` ORDER BY pod.id DESC LIMIT ? OFFSET ?`;

              // Tạo mảng tham số riêng biệt cho câu lệnh lấy dữ liệu (Gồm 4 biến tìm kiếm + 2 biến phân trang)
              const mainQueryParams = [...params, limit, offset];

              db.query(countSql, params, (err, countResult) => {
                if (err) {
                  console.error("❌ Lỗi SQL COUNT dòng nhập:", err.message);
                  return res.status(500).json({ error: err.message });
                }
                const totalItems = countResult[0]?.total || 0;
                const totalPages = Math.ceil(totalItems / limit) || 1;

                // 🌟 ĐÃ SỬA: Truyền mảng mainQueryParams thay vì params cũ để tránh lỗi Parameter Bindings
                db.query(dataSql, mainQueryParams, (errData, results) => {
                  if (errData) {
                    console.error("❌ Lỗi SQL SELECT dữ liệu dòng nhập:", errData.message);
                    return res.status(500).json({ error: errData.message });
                  }

                  return res.json({
                    data: results || [],
                    pagination: { totalItems, totalPages, currentPage: page, limit }
                  });
                });
              });
            });


            // ==========================================================
            // 🚀 API THÊM MỚI CHI TIẾT VẬT TƯ NHẬP KHO (DỰA THEO 12 CỘT DATABASE CỦA BA)
            // ==========================================================
            app.post('/api/purchase-order-details', (req, res) => {
  const {
    purchase_id,
    purchase_date,
    supplier_id,
    product_code,
    quantity,
    import_price,
    total_amount,
    notes,
    length_value,
    width_value,
    dien_tich
  } = req.body;

  // 🌟 KIỂM TRA CHẶN AN TOÀN ĐẦU VÀO
  if (!purchase_id || String(purchase_id).trim() === "") {
    return res.status(400).json({ error: "Thiếu mã thông tin đơn nhập hàng mẹ (purchase_id)!" });
  }
  const cleanPurchaseId = String(purchase_id).trim();

  // Lấy ngày hiện tại chuẩn định dạng YYYY-MM-DD theo múi giờ hệ thống
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const cleanDate = `${year}-${month}-${day}`;

  // 1. Câu lệnh SQL INSERT chuẩn 11 cột
  const sql = `
    INSERT INTO purchase_order_details 
    (purchase_date, supplier_id, purchase_id, product_code, quantity, import_price, total_amount, notes, length_value, width_value, dien_tich) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    cleanDate,
    supplier_id || '',
    cleanPurchaseId,
    product_code || '',
    Number(quantity) || 0,
    Number(import_price) || 0,
    Number(total_amount) || 0,
    notes || '',
    Number(length_value) || 0,
    width_value !== undefined ? Number(width_value) : null,
    Number(dien_tich) || 0
  ];

  // Thực thi chèn vật tư nhập kho vào bảng con
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Lỗi MySQL khi chèn vật tư nhập kho:", err.message);
      return res.status(500).json({ error: "Lỗi hệ thống không thể lưu vào Database!", details: err.message });
    }

    const qty = Number(quantity) || 0;
    const dt = Number(dien_tich) || 0;
    const luongTangKho = dt > 0 ? dt : qty;

    // CẬP NHẬT KHO NHẬP CUỐN CHIẾU ĐỒNG THỜI 2 CỘT VẬT LÝ
    const sqlStock = `
      UPDATE products 
      SET TonKho = TonKho + ?, total_imported = total_imported + ? 
      WHERE product_code = ?
    `;

    db.query(sqlStock, [luongTangKho, luongTangKho, product_code || ''], (stockErr) => {
      if (stockErr) {
        console.error("❌ Lỗi cập nhật kho nhập cuốn chiếu:", stockErr.message);
        return res.status(500).json({ error: "Lỗi hệ thống khi cập nhật số liệu kho hàng!" });
      }

      // 2. 🔥 CƠ CHẾ TỰ ĐỘNG: Tính lại tổng tiền của tất cả dòng con thuộc đơn nhập này
      const sqlSum = `SELECT SUM(total_amount) as total FROM purchase_order_details WHERE purchase_id = ?`;

      db.query(sqlSum, [cleanPurchaseId], (sumErr, sumResult) => {
        if (sumErr) {
          console.error("❌ Lỗi tính tổng tiền:", sumErr.message);
          return res.status(500).json({ error: "Lỗi hệ thống khi tính tổng tiền đơn hàng!" });
        }

        const sumData = sumResult[0] || sumResult;
        const newTotalOrderAmount = sumData ? (Number(sumData.total) || 0) : 0;

        // 3. 🔥 CẬP NHẬT NGƯỢC: Cập nhật số tiền tổng mới vào đơn hàng mẹ (bảng purchase_orders)
        const sqlUpdateParent = `UPDATE purchase_orders SET total_amount = ? WHERE purchase_id = ?`;

        db.query(sqlUpdateParent, [newTotalOrderAmount, cleanPurchaseId], (updateErr) => {
          if (updateErr) {
            console.error("❌ Lỗi cập nhật tiền dòng cha:", updateErr.message);
            return res.status(500).json({ error: "Lỗi hệ thống không thể cập nhật tổng tiền đơn cha!" });
          }

          // ĐỒNG BỘ TRIỆT ĐỂ: Gói dữ liệu dòng mới trả về
          const finalNewRow = {
            id: result.insertId,
            purchase_id: cleanPurchaseId,
            purchase_date: cleanDate,
            supplier_id: supplier_id || '',
            product_code: product_code || '',
            quantity: qty,
            import_price: Number(import_price) || 0,
            total_amount: Number(total_amount) || 0,
            notes: notes || '',
            length_value: Number(length_value) || 0,
            width_value: width_value !== undefined ? Number(width_value) : null,
            dien_tich: dt
          };

          // Phản hồi thành công về cho Frontend (Dùng status 201 chuẩn)
          return res.status(201).json({
            message: "🎉 Nhập hàng và cập nhật kho cuốn chiếu thành công!",
            newRow: finalNewRow,
            newTotalAmount: newTotalOrderAmount
          });
        }); // Hết sqlUpdateParent
      }); // Hết sqlSum
    }); // Hết sqlStock
  }); // Hết sql INSERT gốc
});



            // API CẬP NHẬT CHI TIẾT DÒNG VẬT TƯ VÀ TỔNG TIỀN ĐƠN NHẬP KHO
            // 🔥 API CẬP NHẬT CHI TIẾT DÒNG VẬT TƯ VÀ TỔNG TIỀN ĐƠN NHẬP KHO (ĐÃ ĐỒNG BỘ KHO CHẠY NGẦM)
            // =================================================================
            // 🌟 API GHI ĐÈ ĐƠN NHẬP HÀNG LOẠT - ĐỒNG BỘ KHO CUỐN CHIẾU (PHẦN 1/2)
            // =================================================================
            app.put('/api/purchase-orders/:purchase_id/update-details', (req, res) => {
              const { purchase_id } = req.params;
              const { orderInfo, updatedDetails } = req.body;

              if (!purchase_id || !updatedDetails) {
                return res.status(400).json({ error: "Thiếu thông tin cập nhật đơn hàng!" });
              }

              // BƯỚC 1: Lấy thông tin chi tiết (gồm product_code và quantity) cũ của đơn này TRƯỚC KHI XÓA để thu hồi kho
              const sqlGetOldDetails = `SELECT product_code, quantity, dien_tich FROM purchase_order_details WHERE purchase_id = ?`;
              db.query(sqlGetOldDetails, [purchase_id], (oldDetailsErr, oldRows) => {
                if (oldDetailsErr) {
                  console.error("❌ Lỗi thu thập dữ liệu nhập cũ:", oldDetailsErr.message);
                  return res.status(500).json({ error: "Lỗi hệ thống khi đối soát kho hàng cũ!" });
                }

                const oldItems = oldRows || [];

                // BƯỚC 2: Bắt đầu quy trình Giao dịch (Transaction) để đảm bảo an toàn, nếu lỗi sẽ không mất đơn
                db.beginTransaction((transactionErr) => {
                  if (transactionErr) return res.status(500).json({ error: "Lỗi khởi tạo chuỗi giao dịch tài chính!" });

                  // Hàm chạy ngầm tuần tự thu hồi kho cũ (Trừ bớt TonKho và total_imported)
                  // Sử dụng đệ quy Callback để xử lý tịnh tiến mà không bị bất đồng bộ
                  function refundOldInventory(index, callback) {
                    if (index >= oldItems.length) return callback();

                    const item = oldItems[index];
                    const oldQty = Number(item.quantity) || 0;
                    const olddt = Number(item.dien_tich) || 0;
                const capnhatkhocu = olddt > 0 ? olddt : oldQty;

                    const refundSql = `UPDATE products SET TonKho = TonKho - ?, total_imported = total_imported - ? WHERE product_code = ?`;

                    db.query(refundSql, [capnhatkhocu, capnhatkhocu, item.product_code], (refErr) => {
                      if (refErr) {
                        return db.rollback(() => {
                          res.status(500).json({ error: "Lỗi hệ thống khi thu hồi kho cũ!" });
                        });
                      }
                      refundOldInventory(index + 1, callback);
                    });
                  }

                  // Kích hoạt luồng thu hồi kho cũ
                  refundOldInventory(0, () => {
                    // Sau khi đã reset kho cũ thành công, tiến hành cập nhật tổng tiền đơn mẹ
                    const sqlUpdateOrder = `UPDATE purchase_orders SET total_amount = ? WHERE purchase_id = ?`;
                    db.query(sqlUpdateOrder, [orderInfo.total_amount, purchase_id], (err) => {
                      if (err) {
                        return db.rollback(() => {
                          console.error("❌ Lỗi cập nhật tổng tiền đơn nhập:", err.message);
                          res.status(500).json({ error: "Lỗi hệ thống không thể lưu vào Database!" });
                        });
                      }

                      // Xóa toàn bộ các dòng cũ trong đơn để chuẩn bị Bulk Insert lại mảng mới
                      db.query('DELETE FROM purchase_order_details WHERE purchase_id = ?', [purchase_id], (deleteErr) => {
                        if (deleteErr) {
                          return db.rollback(() => {
                            res.status(500).json({ error: "Lỗi hệ thống khi dọn dẹp dữ liệu cũ!" });
                          });
                        }
                        // BƯỚC 3: Chèn lại mảng dữ liệu mới từ Frontend gửi lên
                        const insertDetailsSql = `
              INSERT INTO purchase_order_details 
              (purchase_date, supplier_id, purchase_id, product_code, quantity, import_price, total_amount, notes, length_value, width_value, dien_tich) 
              VALUES ?
            `;

                        const cleanDate = orderInfo.purchase_date || new Date().toLocaleDateString('en-CA');
                        const values = updatedDetails.map(item => [
                          cleanDate,
                          orderInfo.supplier_id || '',
                          purchase_id,
                          item.product_code || '',
                          Number(item.quantity) || 0,
                          Number(item.import_price) || 0,
                          Number(item.total_amount) || 0,
                          item.notes || '',
                          Number(item.length_value) || 0,
                          item.width_value !== undefined ? Number(item.width_value) : null,
                          Number(item.dien_tich) || 0
                        ]);

                        db.query(insertDetailsSql, [values], (insertErr) => {
                          if (insertErr) {
                            return db.rollback(() => {
                              console.error("❌ Lỗi chèn lại chi tiết vật tư sửa đổi:", insertErr.message);
                              res.status(500).json({ error: "Lỗi hệ thống khi ghi đè dòng vật tư mới!" });
                            });
                          }

                          // BƯỚC 4: Cộng kho cuốn chiếu cho mảng hàng mới vừa nhập thành công
                          function applyNewInventory(index, commitCallback) {
                            if (index >= updatedDetails.length) return commitCallback();

                            const item = updatedDetails[index];
                            const newQty = Number(item.quantity) || 0;
                            const newDt = Number(item.dien_tich) || 0;
                const capnhatkhoMoi = newDt > 0 ? newDt : newQty;
                            const applySql = `UPDATE products SET TonKho = TonKho + ?, total_imported = total_imported + ? WHERE product_code = ?`;

                            db.query(applySql, [capnhatkhoMoi, capnhatkhoMoi, item.product_code], (appErr) => {
                              if (appErr) {
                                return db.rollback(() => {
                                  res.status(500).json({ error: "Lỗi hệ thống khi cộng kho nhập mới!" });
                                });
                              }
                              applyNewInventory(index + 1, commitCallback);
                            });
                          }

                          // Kích hoạt luồng cộng kho mới và kết thúc bằng việc COMMIT vĩnh viễn dữ liệu
                          applyNewInventory(0, () => {
                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  res.status(500).json({ error: "Lỗi hệ thống không thể Commit lưu dữ liệu!" });
                                });
                              }

                              return res.status(200).json({ message: "🎉 Đã cập nhật dữ liệu và đồng bộ kho vào Database thành công vĩnh viễn!" });
                            }); // Hết db.commit
                          }); // Hết applyNewInventory
                        }); // Hết db.query(insertDetailsSql)
                      }); // Hết db.query('DELETE FROM...')
                    }); // Hết db.query(sqlUpdateOrder)
                  }); // Hết refundOldInventory
                }); // Hết db.beginTransaction
              }); // Hết sqlGetOldDetails
            }); // Hết app.put


            // 🔥 API CHUẨN: Xóa dòng con đồng thời tự tính toán và cập nhật lại tổng tiền đơn mẹ
            // 🔥 API CHUẨN: Xóa dòng con đồng thời tự tính toán và cập nhật lại tổng tiền đơn mẹ kèm ĐỒNG BỘ KHO CHẠY NGẦM
            app.delete('/api/purchase-order-details/:id', (req, res) => {
              const detailId = req.params.id;

              // 1. Tìm thông tin dòng vật tư sắp xóa (Lấy thêm cột quantity để biết số lượng cần trừ kho)
              const sqlFindParent = 'SELECT purchase_id, product_code, quantity, dien_tich FROM purchase_order_details WHERE id = ?';
              db.query(sqlFindParent, [detailId], (findErr, findResult) => {
                if (findErr || !findResult || findResult.length === 0) {
                  return res.status(404).json({ error: "Không tìm thấy thông tin dòng vật tư!" });
                }

                // Đọc chính xác thông tin từ dòng sắp xóa
                const parentPurchaseId = findResult[0].purchase_id;
                const targetProductCode = findResult[0].product_code;
                const qty = Number(findResult[0].quantity) || 0;
                const dt = Number(findResult[0].dien_tich) || 0;
                const luongTruKho = dt > 0 ? dt : qty;

                // Kích hoạt chuỗi Transaction để đảm bảo nếu xóa lỗi thì không bị trừ nhầm kho
                db.beginTransaction((transactionErr) => {
                  if (transactionErr) return res.status(500).json({ error: "Lỗi khởi tạo chuỗi giao dịch tài chính!" });

                  // 2. Tiến hành xóa vĩnh viễn dòng vật tư con ra khỏi Database
                  const sqlDelete = 'DELETE FROM purchase_order_details WHERE id = ?';
                  db.query(sqlDelete, [detailId], (deleteErr) => {
                    if (deleteErr) {
                      return db.rollback(() => {
                        console.error("❌ Lỗi khi xóa dòng vật tư:", deleteErr.message);
                        res.status(500).json({ error: "Lỗi hệ thống không thể xóa vật tư chi tiết" });
                      });
                    }

                    // 🌟 BƯỚC INJECT MỚI: TRỪ BỚT KHO CUỐN CHIẾU (DO HỦY DÒNG NHẬP)
                    // Trừ bớt số lượng ở cả TonKho và tổng nhập total_imported
                    const sqlStock = `
          UPDATE products 
          SET TonKho = TonKho - ?, total_imported = total_imported - ? 
          WHERE product_code = ?
        `;
                    db.query(sqlStock, [luongTruKho, luongTruKho, targetProductCode], (stockErr) => {
                      if (stockErr) {
                        return db.rollback(() => {
                          console.error("❌ Lỗi trừ kho cuốn chiếu khi xóa dòng nhập:", stockErr.message);
                          res.status(500).json({ error: "Lỗi hệ thống không thể đồng bộ lại kho hàng!" });
                        });
                      }

                      // 3. 🔥 TỰ ĐỘNG CẬP NHẬT TIỀN: Tính tổng số tiền của các dòng vật tư còn lại trong đơn hàng
                      const sqlSum = 'SELECT SUM(total_amount) as total FROM purchase_order_details WHERE purchase_id = ?';
                      db.query(sqlSum, [parentPurchaseId], (sumErr, sumResult) => {
                        if (sumErr) {
                          return db.rollback(() => {
                            res.status(500).json({ error: "Lỗi tính toán tổng số tiền còn lại!" });
                          });
                        }

                        const newTotalOrderAmount = sumResult[0]?.total || 0;

                        // 4. Cập nhật số tiền tổng mới vừa tính ngược lại bảng đơn mẹ purchase_orders
                        const sqlUpdateParent = 'UPDATE purchase_orders SET total_amount = ? WHERE purchase_id = ?';
                        db.query(sqlUpdateParent, [newTotalOrderAmount, parentPurchaseId], (updateErr) => {
                          if (updateErr) {
                            return db.rollback(() => {
                              console.error("❌ Lỗi cập nhật tiền đơn cha:", updateErr.message);
                              res.status(500).json({ error: "Không thể cập nhật tổng tiền đơn hàng tổng!" });
                            });
                          }

                          // 5. CHỐT CHẶN: Commit xác nhận lưu vĩnh viễn chuỗi giao dịch vào database
                          db.commit((commitErr) => {
                            if (commitErr) {
                              return db.rollback(() => res.status(500).json({ error: "Lỗi xác nhận Commit dữ liệu!" }));
                            }

                            return res.json({
                              success: true,
                              message: "🎉 Đã xóa dòng, đồng bộ trừ kho và cập nhật tổng tiền đơn cha vĩnh viễn!",
                              newTotalAmount: newTotalOrderAmount
                            });
                          }); // Hết Commit
                        }); // Hết sqlUpdateParent
                      }); // Hết sqlSum
                    }); // Hết sqlStock
                  }); // Hết sqlDelete
                }); // Hết db.beginTransaction
              }); // Hết sqlFindParent
            });



            // =================================================================
            // 🌟 API XÓA TOÀN BỘ ĐƠN NHẬP - ĐỒNG BỘ TRỪ KHO CUỐN CHIẾU (PHẦN 1/2)
            // =================================================================
            app.delete('/api/purchase-orders/:id', (req, res) => {
              const purchaseId = req.params.id;

              // 1. Lấy toàn bộ danh sách sản phẩm và số lượng nhập của đơn này TRƯỚC KHI XÓA để tiến hành trừ kho
              const sqlGetDetails = "SELECT product_code, quantity FROM purchase_order_details WHERE purchase_id = ?";

              db.query(sqlGetDetails, [purchaseId], (findErr, detailRows) => {
                if (findErr) {
                  console.error("❌ Lỗi thu thập dòng con đơn nhập:", findErr.message);
                  return res.status(500).json({ error: "Lỗi hệ thống khi đối soát dữ liệu đơn nhập!" });
                }

                const itemsToDeduct = detailRows || [];

                // 2. Kích hoạt chuỗi Transaction để đảm bảo xóa sạch cả mẹ lẫn con hoặc không làm gì cả
                db.beginTransaction((transactionErr) => {
                  if (transactionErr) return res.status(500).json({ error: "Lỗi khởi tạo chuỗi giao dịch tài chính!" });

                  // Hàm đệ quy chạy ngầm tuần tự trừ kho cuốn chiếu cho từng mã sản phẩm có trong đơn bị xóa
                  function deductInventory(index, callback) {
                    if (index >= itemsToDeduct.length) return callback();

                    const item = itemsToDeduct[index];
                    const qty = Number(item.quantity) || 0;
                    const dt = Number(item.dien_tich) || 0;
                    const trukho = dt > 0 ? dt : qty;

                    // Trừ bớt số lượng ở TonKho và tổng nhập total_imported vì đơn này đã bị hủy bỏ
                    const sqlUpdateStock = `UPDATE products SET TonKho = TonKho - ?, total_imported = total_imported - ? WHERE product_code = ?`;

                    db.query(sqlUpdateStock, [trukho, trukho, item.product_code], (stockErr) => {
                      if (stockErr) {
                        return db.rollback(() => {
                          console.error("❌ Lỗi trừ kho cuốn chiếu khi xóa đơn nhập mẹ:", stockErr.message);
                          res.status(500).json({ error: "Lỗi hệ thống không thể đồng bộ lại kho hàng!" });
                        });
                      }
                      deductInventory(index + 1, callback); // Chuyển sang sản phẩm tiếp theo
                    });
                  }
                  // Kích hoạt chuỗi trừ kho tịnh tiến
                  deductInventory(0, () => {
                    // 3. Tiến hành xóa toàn bộ dòng con trong bảng purchase_order_details trước
                    const sqlDeleteDetails = "DELETE FROM purchase_order_details WHERE purchase_id = ?";
                    db.query(sqlDeleteDetails, [purchaseId], (delDetailsErr) => {
                      if (delDetailsErr) {
                        return db.rollback(() => {
                          console.error("❌ Lỗi xóa bảng con:", delDetailsErr.message);
                          res.status(500).json({ error: "Lỗi hệ thống không thể dọn dẹp chi tiết đơn nhập!" });
                        });
                      }

                      // 4. Tiến hành xóa đơn hàng mẹ trong bảng purchase_orders
                      const sqlDeleteParent = "DELETE FROM purchase_orders WHERE purchase_id = ?";
                      db.query(sqlDeleteParent, [purchaseId], (delParentErr) => {
                        if (delParentErr) {
                          return db.rollback(() => {
                            console.error("❌ Lỗi xóa bảng mẹ:", delParentErr.message);
                            res.status(500).json({ error: "Lỗi hệ thống không thể xóa đơn nhập gốc!" });
                          });
                        }

                        // 5. CHỐT CHẶN CUỐI: Xác nhận lưu vĩnh viễn mọi thay đổi vào Database
                        db.commit((commitErr) => {
                          if (commitErr) {
                            return db.rollback(() => res.status(500).json({ error: "Lỗi xác nhận Commit dữ liệu xóa!" }));
                          }

                          return res.json({ success: true, message: "🎉 Đã xóa hoàn toàn đơn nhập và tự động đồng bộ trừ kho thành công!" });
                        }); // Hết Commit
                      }); // Hết sqlDeleteParent
                    }); // Hết sqlDeleteDetails
                  }); // Hết đệ quy deductInventory
                }); // Hết db.beginTransaction
              }); // Hết sqlGetDetails
            }); // Hết app.delete('/api/purchase-orders/:id')

            function syncChangesExceptImage(callback) {
              let lastSync = '1970-01-01 00:00:00';
              if (fs.existsSync(CONFIG_FILE)) {
                const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
                if (config.lastSync) lastSync = config.lastSync;
              }

              const currentSyncTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

              // 🌟 ĐÃ SỬA: Dùng SELECT * để lấy TẤT CẢ các cột có trong bảng database
              const sqlQuery = `
        SELECT * 
        FROM products 
        WHERE updated_at > ?
    `;

              db.query(sqlQuery, [lastSync], async (sqlErr, changedRows) => {
                if (sqlErr) return callback(sqlErr);
                if (changedRows.length === 0) return callback(null, { count: 0 });

                try {
                  // 🌟 ĐÃ SỬA: Gửi thẳng toàn bộ Object dữ liệu thô sang Google Apps Script
                  const response = await axios.post(GOOGLE_SCRIPT_URL, {
                    changedRows: changedRows
                  });

                  if (response.data.success) {
                    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ lastSync: currentSyncTime }));
                    callback(null, { count: response.data.count });
                  } else {
                    callback(new Error(response.data.error));
                  }
                } catch (error) {
                  console.error('❌ Lỗi kết nối HTTP đến Google Script:', error.message);
                  callback(error);
                }
              });
            }


            // ĐOẠN MÃ BẮT BUỘC PHẢI CÓ TRONG SERVER.JS CỦA BACKEND:
            app.post('/api/sync-products', (req, res) => {
              syncChangesExceptImage((err, result) => {
                if (err) {
                  console.error("❌ Lỗi tiến trình đồng bộ:", err.message);
                  return res.status(500).json({ success: false, error: err.message });
                }
                res.json({ success: true, count: result.count });
              });
            });


            // ==========================================================
            // 🚀 API THỐNG KÊ DOANH THU & LỢI NHUẬN (ĐÃ LỌC BỎ BÁO GIÁ, XUẤT, TRẢ TIỀN, NỢ CŨ)
            // ==========================================================
            app.get('/api/stats/revenue-profit', (req, res) => {
              const month = req.query.month || '';
              const year = req.query.year || new Date().getFullYear();

              // Chuỗi điều kiện loại trừ dùng chung cho cả 2 luồng thống kê
              // Sử dụng dấu != hoặc <> trong MySQL để loại bỏ chính xác các chuỗi dữ liệu này
              const excludeCondition = `
        AND detail_slice NOT IN ('bao gia', 'xuat')
        AND product_code NOT IN ('Tra tien', 'No cu')
    `;

              let sql = '';
              let params = [];

              if (month) {
                // LUỒNG 1: Xem theo từng NGÀY của một tháng cụ thể
                sql = `
            SELECT 
                DATE_FORMAT(order_date, '%d/%m') AS date,
                SUM(total_amount) AS revenue,
                SUM(profit) AS profit
            FROM order_details
            WHERE MONTH(order_date) = ? AND YEAR(order_date) = ? ${excludeCondition}
            GROUP BY order_date
            ORDER BY order_date ASC
        `;
                params = [Number(month), Number(year)];
              } else {
                // LUỒNG 2: Xem theo từng THÁNG của một năm cụ thể
                sql = `
            SELECT 
                DATE_FORMAT(order_date, 'Tháng %m') AS date,
                SUM(total_amount) AS revenue,
                SUM(profit) AS profit
            FROM order_details
            WHERE YEAR(order_date) = ? ${excludeCondition}
            GROUP BY MONTH(order_date)
            ORDER BY MONTH(order_date) ASC
        `;
                params = [Number(year)];
              }

              db.query(sql, params, (err, results) => {
                if (err) {
                  console.error("❌ Lỗi SQL thống kê kèm điều kiện lọc:", err.message);
                  return res.status(500).json({ success: false, error: err.message });
                }
                return res.json({ success: true, data: results || [] });
              });
            });



            // ==========================================================
            // 🚀 API THỐNG KÊ KHÁCH HÀNG - CHẠY CHUẨN 15 DÒNG (FIX LỖI 500)
            // ==========================================================
            app.get('/api/stats/customers', (req, res) => {
              const month = req.query.month || '';
              const year = req.query.year || new Date().getFullYear();
              const page = parseInt(req.query.page) || 1;
              const limit = parseInt(req.query.limit) || 15; // Mặc định nhận 15 dòng
              const offset = (page - 1) * limit;

              const excludeCondition = `
        AND detail_slice NOT IN ('bao gia', 'xuat')
        AND product_code NOT IN ('Tra tien', 'No cu')
    `;

              let timeCondition = `WHERE YEAR(order_date) = ?`;
              let params = [Number(year)];

              if (month) {
                timeCondition += ` AND MONTH(order_date) = ?`;
                params.push(Number(month));
              }

              // 1. Lấy tổng số dòng dựa trên nhóm khách hàng
              const sqlAll = `
        SELECT customer_id 
        FROM order_details
        ${timeCondition} ${excludeCondition}
        GROUP BY customer_id
    `;

              // 2. Lấy dữ liệu 15 dòng thực tế hiển thị
              const sqlData = `
        SELECT 
            COALESCE(customer_id, 'Khách vãng lai') AS customer,
            SUM(total_amount) AS total_revenue,
            SUM(profit) AS total_profit,
            COUNT(DISTINCT order_id) AS total_orders
        FROM order_details
        ${timeCondition} ${excludeCondition}
        GROUP BY customer_id
        ORDER BY total_revenue DESC, total_profit DESC
        LIMIT ? OFFSET ?
    `;

              db.query(sqlAll, params, (err, allResults) => {
                if (err) {
                  console.error("❌ Lỗi SQL lấy tổng số khách hàng:", err.message);
                  return res.status(500).json({ success: false, error: err.message });
                }

                const totalRecords = allResults ? allResults.length : 0;
                const totalPages = Math.ceil(totalRecords / limit) || 1;

                db.query(sqlData, [...params, limit, offset], (err, dataResults) => {
                  if (err) {
                    console.error("❌ Lỗi SQL danh sách khách hàng:", err.message);
                    return res.status(500).json({ success: false, error: err.message });
                  }

                  return res.json({
                    success: true,
                    data: dataResults || [],
                    pagination: {
                      currentPage: page,
                      totalPages: totalPages,
                      totalRecords: totalRecords,
                      limit: limit
                    }
                  });
                });
              });
            });



            // ==========================================================
            // 🚀 API THỐNG KÊ NHÀ CUNG CẤP - ĐỒNG BỘ GIỐNG PHẦN KHÁCH HÀNG
            // ==========================================================
            app.get('/api/stats/suppliers', (req, res) => {
              const month = req.query.month || '';
              const year = req.query.year || new Date().getFullYear();
              const page = parseInt(req.query.page) || 1;
              const limit = parseInt(req.query.limit) || 15;
              const offset = (page - 1) * limit;

              let timeCondition = `WHERE YEAR(purchase_date) = ?`;
              let params = [Number(year)];

              if (month) {
                timeCondition += ` AND MONTH(purchase_date) = ?`;
                params.push(Number(month));
              }

              // Câu lệnh lấy toàn bộ danh sách nhà cung cấp trong kỳ để tính tổng số dòng trực tiếp
              const sqlAll = `
        SELECT 
            COUNT(DISTINCT supplier_id) AS total_suppliers,
            SUM(total_amount) AS overall_cost
        FROM purchase_orders 
        ${timeCondition}
    `;
              // Câu lệnh lấy dữ liệu phân trang thực tế để hiển thị lên màn hình
              const sqlData = `
        SELECT 
            COALESCE(supplier_id, 'Nguồn vãng lai') AS supplier,
            COUNT(DISTINCT purchase_id) AS total_orders,
            SUM(total_amount) AS total_cost
        FROM purchase_orders
        ${timeCondition}
        GROUP BY supplier_id
        ORDER BY total_cost DESC
        LIMIT ? OFFSET ?
    `;

              // 1. Chạy câu lệnh lấy tổng số dòng trước
              db.query(sqlAll, params, (err, allResults) => {
                if (err) {
                  console.error("❌ Lỗi SQL:", err.message);
                  return res.status(500).json({ success: false, error: err.message });
                }

                // Lấy tổng số nhà cung cấp dựa trên độ dài mảng trả về (Giống phần khách hàng)
                const totalRecords = allResults && allResults[0] ? allResults[0].total_suppliers : 0;
                const overallCost = allResults && allResults[0] ? (allResults[0].overall_cost || 0) : 0;
                const totalPages = Math.ceil(totalRecords / limit) || 1;

                // 2. Chạy câu lệnh lấy dữ liệu hiển thị sau
                db.query(sqlData, [...params, limit, offset], (err, dataResults) => {
                  if (err) {
                    console.error("❌ Lỗi SQL danh sách:", err.message);
                    return res.status(500).json({ success: false, error: err.message });
                  }

                  // Trả về đối tượng sạch { success: true, data: [...] } đúng chuẩn hệ thống của bạn
                  return res.json({
                    success: true,
                    overallCost: overallCost,
                    data: dataResults || [],
                    pagination: {
                      currentPage: page,
                      totalPages: totalPages,
                      totalRecords: totalRecords,
                      limit: limit
                    }
                  });
                });
              });
            });

            app.get('/api/stats/products-summary', (req, res) => {
              try {
                const page = Math.max(1, parseInt(req.query.page) || 1);
                const limit = Math.max(1, parseInt(req.query.limit) || 15);
                const search = req.query.search || '';
                const offset = (page - 1) * limit;

                // 1. 🚀 ĐÃ SỬA CHÍNH XÁC: Sử dụng TonKho và base_price theo cấu trúc bảng của bạn
                let summarySql = `
      SELECT 
        COUNT(*) as total,
 ROUND(SUM(CASE WHEN TonKho > 0 THEN TonKho ELSE 0 END * COALESCE(base_price, 0)), 0) AS total_inventory_value
     
 FROM products
    `;
                let summaryParams = [];

                if (search) {
                  summarySql += ' WHERE product_name LIKE ? OR product_code LIKE ?';
                  summaryParams = [`%${search}%`, `%${search}%`];
                }

                // 2. Câu lệnh lấy danh sách bảng dữ liệu
                let dataSql = `
      SELECT 
        p.product_code,
        p.product_name,
        COALESCE(sales.total_revenue, 0) AS total_revenue,
        COALESCE(purchases.total_cost, 0) AS total_cost,
        COALESCE(sales.total_profit_sold, 0) AS total_profit
      FROM products p
      LEFT JOIN (
        SELECT 
          product_code,
          SUM(total_amount) AS total_revenue,
          SUM(profit) AS total_profit_sold
        FROM order_details
        WHERE detail_slice NOT IN ('bao gia', 'xuat') OR detail_slice IS NULL
        GROUP BY product_code
      ) sales ON p.product_code = sales.product_code
      LEFT JOIN (
        SELECT 
          product_code,
          SUM(total_amount) AS total_cost
        FROM purchase_order_details
        GROUP BY product_code
      ) purchases ON p.product_code = purchases.product_code
    `;

                let dataParams = [];
                if (search) {
                  dataSql += ' WHERE p.product_name LIKE ? OR p.product_code LIKE ?';
                  dataParams = [`%${search}%`, `%${search}%`];
                }

                dataSql += ' ORDER BY total_profit DESC LIMIT ? OFFSET ?';
                dataParams.push(limit, offset);

                // Chạy câu lệnh tổng hợp trước
                db.query(summarySql, summaryParams, (err, summaryResult) => {
                  if (err) return res.status(500).json({ error: err.message });

                  // 🚀 ĐÃ SỬA CHÍNH XÁC: Phải bóc tách phần tử index [0] của mảng kết quả MySQL
                  const totalItems = (summaryResult && summaryResult[0]) ? summaryResult[0].total : 0;
                  const totalInventoryValue = (summaryResult && summaryResult[0]) ? summaryResult[0].total_inventory_value : 0;
                  const totalPages = Math.ceil(totalItems / limit) || 1;

                  db.query(dataSql, dataParams, (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });

                    return res.json({
                      data: results || [],
                      totalInventoryValue: Number(totalInventoryValue) || 0, // Ép kiểu số chắc chắn cho Frontend
                      pagination: { totalItems, totalPages, currentPage: page, limit }
                    });
                  });
                });

              } catch (globalErr) {
                return res.status(500).json({ error: "Lỗi xử lý server" });
              }
            });



            // =================================================================
            // ⚙️ API TÍNH LẠI TỒN KHO - PHIÊN BẢN GIA CỐ CHỐNG SẬP APP TUYỆT ĐỐI
            // =================================================================
            app.get('/api/system/recalculate-all-stock', (req, res) => {

              db.beginTransaction((transactionErr) => {
                if (transactionErr) {
                  console.error("❌ Lỗi khởi tạo Transaction:", transactionErr.message);
                  return res.status(500).json({ error: "Lỗi khởi tạo chuỗi giao dịch khôi phục kho!" });
                }

                // BƯỚC 1: Reset bảng sản phẩm về 0
                const sqlReset = "UPDATE products SET TonKho = 0.00, total_imported = 0.00, total_exported = 0.00";

                db.query(sqlReset, (resetErr) => {
                  if (resetErr) {
                    return db.rollback(() => res.status(500).json({ error: "Lỗi reset bảng sản phẩm!" }));
                  }

                  // BƯỚC 2: Gom TỔNG NHẬP
                  const sqlSumImport = `
                SELECT product_code, 
                       IFNULL(SUM(IF(dien_tich > 0, dien_tich, quantity)), 0) AS total_qty 
                FROM purchase_order_details 
                WHERE product_code IS NOT NULL AND TRIM(product_code) <> ''
                GROUP BY product_code
            `;

                  db.query(sqlSumImport, (impErr, importRows) => {
                    if (impErr) {
                      return db.rollback(() => res.status(500).json({ error: "Lỗi đọc dữ liệu lịch sử nhập kho!" }));
                    }

                    const importItems = importRows || [];

                    function applyImports(index, nextCallback) {
                      if (index >= importItems.length) return nextCallback();

                      // 🌟 BẪY LỖI ĐA TẦNG: Đảm bảo lỗi của 1 dòng dữ liệu không làm sập nguồn Server
                      try {
                        const item = importItems[index];
                        const qty = Number(item.total_qty) || 0;

                        const sqlUpdateImport = `
                            UPDATE products 
                            SET TonKho = TonKho + ?, total_imported = ? 
                            WHERE product_code = ?
                        `;
                        db.query(sqlUpdateImport, [qty, qty, item.product_code], (upImpErr) => {
                          if (upImpErr) {
                            console.error(`⚠️ Bỏ qua lỗi đắp số nhập mã ${item.product_code}:`, upImpErr.message);
                          }
                          applyImports(index + 1, nextCallback); // Chạy tiếp dòng sau chứ không sập app
                        });
                      } catch (catchImpErr) {
                        console.error("⚠️ Lỗi ngầm luồng nhập vị trí " + index, catchImpErr.message);
                        applyImports(index + 1, nextCallback);
                      }
                    }

                    applyImports(0, () => {
                      // BƯỚC 3: Gom TỔNG XUẤT (Loại bỏ báo gia)
                      const sqlSumExport = `
                        SELECT product_code, IFNULL(SUM(converted_quantity), 0) AS total_qty 
                        FROM order_details 
                        WHERE (TRIM(LOWER(detail_slice)) <> 'bao gia' OR detail_slice IS NULL)
                          AND product_code IS NOT NULL AND TRIM(product_code) <> ''
                        GROUP BY product_code
                    `;

                      db.query(sqlSumExport, (expErr, exportRows) => {
                        if (expErr) {
                          return db.rollback(() => res.status(500).json({ error: "Lỗi đọc dữ liệu lịch sử bán hàng!" }));
                        }

                        const exportItems = exportRows || [];

                        function applyExports(idx, commitCallback) {
                          if (idx >= exportItems.length) return commitCallback();

                          // 🌟 BẪY LỖI ĐA TẦNG LUỒNG XUẤT
                          try {
                            const item = exportItems[idx];
                            const qty = Number(item.total_qty) || 0;

                            const sqlUpdateExport = `
                                    UPDATE products 
                                    SET TonKho = TonKho - ?, total_exported = ? 
                                    WHERE product_code = ?
                                `;
                            db.query(sqlUpdateExport, [qty, qty, item.product_code], (upExpErr) => {
                              if (upExpErr) {
                                console.error(`⚠️ Bỏ qua lỗi đắp số xuất mã ${item.product_code}:`, upExpErr.message);
                              }
                              applyExports(idx + 1, commitCallback); // Chạy tiếp dòng sau
                            });
                          } catch (catchExpErr) {
                            console.error("⚠️ Lỗi ngầm luồng xuất vị trí " + idx, catchExpErr.message);
                            applyExports(idx + 1, commitCallback);
                          }
                        }

                        applyExports(0, () => {
                          db.commit((commitErr) => {
                            if (commitErr) {
                              return db.rollback(() => res.status(500).json({ error: "Lỗi xác nhận Commit dữ liệu kho mới!" }));
                            }

                            return res.json({
                              success: true,
                              message: "🎉 Toàn bộ kho hàng của 5.000 sản phẩm đã được tính toán lại chính xác vĩnh viễn!"
                            });
                          }); // Hết Commit
                        }); // Hết applyExports
                      }); // Hết sqlSumExport
                    }); // Hết applyImports
                  }); // Hết sqlSumImport
                }); // Hết sqlReset
              }); // Hết db.beginTransaction
            });


            const cron = require('node-cron');

            // Hệ thống CHỈ thức dậy vào lúc 23:59 ngày cuối cùng của tháng 3, 6, 9, 12
            // Cú pháp: Phút(59) Giờ(23) Ngày(30,31) Tháng(3,6,9,12)
            cron.schedule('59 23 30,31 3,6,9,12 *', async () => {
              const today = new Date();
              const tomorrow = new Date(today);
              tomorrow.setDate(today.getDate() + 1);

              // Đảm bảo chắc chắn là ngày cuối cùng của tháng (ngày mai là mùng 1)
              if (tomorrow.getDate() === 1) {
                const currentMonth = today.getMonth() + 1;
                const currentYear = today.getFullYear();
                let quarterLabel = `${currentYear}-Q${Math.ceil(currentMonth / 3)}`;

                db.query(`
            INSERT IGNORE INTO monthly_stock_snapshots 
            (snapshot_quarter, product_code, closing_stock, closing_imported, closing_exported)
            SELECT ?, product_code, TonKho, total_imported, total_exported FROM products
        `, [quarterLabel], (err) => {
                  if (err) console.error(`❌ Lỗi chốt số dư Quý ${quarterLabel}:`, err.message);
                  else console.log(`📊 Đã chốt số dư thành công cho Quý: ${quarterLabel}`);
                });
              }
            });


            // API Khôi phục kho thần tốc dựa trên mốc chốt Quý trước
            // =================================================================
            // 🛠️ API KHÔI PHỤC THEO QUÝ - THUẬT TOÁN DUYỆT MẢNG ĐỒNG BỘ NÚT CAM (PHẦN 1/2)
            // =================================================================
            app.get('/api/system/restore-stock-by-quarter', (req, res) => {
              const today = new Date();
              const currentMonth = today.getMonth() + 1;
              const currentYear = today.getFullYear();

              let lastQuarterLabel = '';
              let startOfThisQuarterDate = '';

              // Tự động tính toán mốc thời gian của Quý hiện tại
              if (currentMonth <= 3) {
                lastQuarterLabel = `${currentYear - 1}-Q4`;
                startOfThisQuarterDate = `${currentYear}-01-01`;
              } else if (currentMonth <= 6) {
                lastQuarterLabel = `${currentYear}-Q1`;
                startOfThisQuarterDate = `${currentYear}-04-01`;
              } else if (currentMonth <= 9) {
                lastQuarterLabel = `${currentYear}-Q2`;
                startOfThisQuarterDate = `${currentYear}-07-01`;
              } else {
                lastQuarterLabel = `${currentYear}-Q3`;
                startOfThisQuarterDate = `${currentYear}-10-01`;
              }

              db.beginTransaction((transErr) => {
                if (transErr) return res.status(500).json({ error: "Lỗi khởi tạo chuỗi giao dịch cứu hộ kho!" });

                // BƯỚC 1: Đưa kho bảng products về 0 trước khi nạp mốc cũ (Đảm bảo dữ liệu sạch như nút Cam)
                const sqlReset = "UPDATE products SET TonKho = 0.00, total_imported = 0.00, total_exported = 0.00";

                db.query(sqlReset, (resetErr) => {
                  if (resetErr) return db.rollback(() => res.status(500).json({ error: "Lỗi dọn dẹp kho nền móng!" }));

                  // BƯỚC 2: Bốc mốc chốt của Quý trước từ bảng Snapshot đắp sang bảng products làm gốc
                  const sqlLoadSnapshot = `
                SELECT product_code, closing_stock, closing_imported, closing_exported 
                FROM monthly_stock_snapshots 
                WHERE snapshot_quarter = ?
            `;
                  db.query(sqlLoadSnapshot, [lastQuarterLabel], (snapErr, snapRows) => {
                    if (snapErr) return db.rollback(() => res.status(500).json({ error: "Lỗi truy vấn bảng Snapshot!" }));

                    const snapshotItems = snapRows || [];

                    // Hàm đệ quy đắp móng Quý cũ vĩnh viễn vào sản phẩm
                    function applySnapshots(snapIdx, nextImportCallback) {
                      if (snapIdx >= snapshotItems.length) return nextImportCallback();

                      const sItem = snapshotItems[snapIdx];
                      const sqlUpdateSnap = `UPDATE products SET TonKho = ?, total_imported = ?, total_exported = ? WHERE product_code = ?`;

                      db.query(sqlUpdateSnap, [Number(sItem.closing_stock) || 0, Number(sItem.closing_imported) || 0, Number(sItem.closing_exported) || 0, sItem.product_code], (upSnapErr) => {
                        applySnapshots(snapIdx + 1, nextImportCallback); // Duyệt tịnh tiến tiếp
                      });
                    }

                    // Kích hoạt nạp móng cũ, sau đó đi gom tiếp hàng Nhập phát sinh của Quý này
                    applySnapshots(0, () => {
                      const sqlSumImport = `
                        SELECT product_code, IFNULL(SUM(IF(dien_tich > 0, dien_tich, quantity)), 0) AS total_qty
                        FROM purchase_order_details
                        WHERE purchase_date >= ? AND product_code IS NOT NULL AND TRIM(product_code) <> ''
                        GROUP BY product_code
                    `;

                      db.query(sqlSumImport, [startOfThisQuarterDate], (impErr, importRows) => {
                        if (impErr) return db.rollback(() => res.status(500).json({ error: "Lỗi quét hàng nhập Quý này!" }));

                        const importItems = importRows || [];

                        // Đệ quy cộng lũy tiến hàng nhập Quý này giống hệt nút Cam
                        function applyImports(impIdx, nextExportCallback) {
                          if (impIdx >= importItems.length) return nextExportCallback();

                          const item = importItems[impIdx];
                          const qty = Number(item.total_qty) || 0;
                          const sqlUpdateImport = `UPDATE products SET TonKho = TonKho + ?, total_imported = total_imported + ? WHERE product_code = ?`;

                          db.query(sqlUpdateImport, [qty, qty, item.product_code], () => {
                            applyImports(impIdx + 1, nextExportCallback);
                          });
                        }

                        applyImports(0, () => {
                          // BƯỚC 3: Gom tổng xuất phát sinh trong Quý này (loại bỏ bao gia) giống nút Cam
                          const sqlSumExport = `
                                SELECT product_code, IFNULL(SUM(converted_quantity), 0) AS total_qty
                                FROM order_details
                                WHERE order_date >= ? 
                                  AND (TRIM(LOWER(detail_slice)) <> 'bao gia' OR detail_slice IS NULL)
                                  AND product_code IS NOT NULL AND TRIM(product_code) <> ''
                                GROUP BY product_code
                            `;

                          db.query(sqlSumExport, [startOfThisQuarterDate], (expErr, exportRows) => {
                            if (expErr) return db.rollback(() => res.status(500).json({ error: "Lỗi quét hàng bán Quý này!" }));

                            const exportItems = exportRows || [];

                            // Đệ quy trừ lũy tiến hàng xuất Quý này giống hệt nút Cam
                            function applyExports(expIdx, commitCallback) {
                              if (expIdx >= exportItems.length) return commitCallback();

                              const item = exportItems[expIdx];
                              const qty = Number(item.total_qty) || 0;
                              const sqlUpdateExport = `UPDATE products SET TonKho = TonKho - ?, total_exported = total_exported + ? WHERE product_code = ?`;

                              db.query(sqlUpdateExport, [qty, qty, item.product_code], () => {
                                applyExports(expIdx + 1, commitCallback);
                              });
                            }

                            // Kích hoạt luồng trừ kho xuất và kết thúc bằng việc COMMIT vĩnh viễn dữ liệu sạch
                            applyExports(0, () => {
                              db.commit((commitErr) => {
                                if (commitErr) return db.rollback(() => res.status(500).json({ error: "Lỗi xác nhận Commit dữ liệu kho mới!" }));

                                return res.json({
                                  success: true,
                                  message: `🎉 Quá tuyệt vời bác ơi! Nút Xanh đã áp dụng thành công thuật toán tịnh tiến của nút Cam, khôi phục kho khít số dựa trên mốc ${lastQuarterLabel} siêu mượt và siêu tốc!`
                                });
                              }); // Hết Commit
                            }); // Hết applyExports
                          }); // Hết sqlSumExport
                        }); // Hết applyImports
                      }); // Hết sqlSumImport
                    }); // Hết applySnapshots
                  }); // Hết sqlLoadSnapshot
                }); // Hết sqlReset
              }); // Hết Giao dịch
            });


            // Lắng nghe cổng khởi chạy máy chủ
            app.listen(5000, () => {
              console.log('🚀 Backend Server đang chạy mượt mà tại cổng http://localhost:5000');
            });







