import React, { useState, useMemo } from 'react';

// Thành phần trang danh sách công nợ đã được tối ưu hóa tốc độ cực cao
const NoSliceOrdersPage = ({ orders = [], customers = [], onSelectOrder, onViewCustomerDetail }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 🌟 HÀM PHỤ TRỢ: Chuyển đổi chữ có dấu thành chữ không dấu tiếng Việt
  const removeVietnameseTones = (str) => {
    if (!str) return '';
    return str
      .normalize('NFD') // Tách các dấu ra khỏi chữ cái gốc
      .replace(/[\u0300-\u036f]/g, '') // Xóa các ký tự dấu thừa
      .replace(/đ/g, 'd') // Đổi chữ đ thường thành d
      .replace(/Đ/g, 'D') // Đổi chữ Đ hoa thành D
      .toLowerCase(); // Chuyển hết về chữ thường
  };

  // 🌟 1. TỐI ƯU HÓA BỘ LỌC VỚI MAP OBJECT (XÓA BỎ VÒNG LẶP LỒNG NHAU O(N*M))
  const { filteredOrders, customerLookup } = useMemo(() => {
    const cleanSearchText = removeVietnameseTones(searchTerm);

    // Bước 1.1: Lập một danh bạ mục lục tra cứu nhanh từ danh sách khách hàng tổng (Chỉ chạy 1 lần duy nhất)
    const lookup = {};
    if (Array.isArray(customers)) {
      customers.forEach(c => {
        if (c.customer_id) {
          const cleanId = String(c.customer_id).trim().toLowerCase();
          if (cleanId) {
            lookup[cleanId] = c.customer_name || '';
          }
        }
      });
    }

    // Bước 1.2: Duyệt mảng đơn hàng với tốc độ ánh sáng O(N)
    const filtered = orders.filter(order => {
      const isNoSlice = order.order_slice === 'no';
      if (!isNoSlice) return false;

      // Tra cứu trực tiếp tên khách hàng từ mục lục (Tốc độ tức thì)
      const cleanOrderCustId = order.customer_id ? String(order.customer_id).trim().toLowerCase() : '';
      const actualCustomerName = lookup[cleanOrderCustId] || order.customer_name || '';
      
      const cleanCustomerName = removeVietnameseTones(actualCustomerName);
      const orderIdStr = (order.order_id || '').toString();

      const matchesSearch =
        cleanCustomerName.includes(cleanSearchText) ||
        orderIdStr.includes(cleanSearchText);

      return matchesSearch;
    });

    return { filteredOrders: filtered, customerLookup: lookup };
  }, [orders, customers, searchTerm]);

  // 2. Tính tổng hợp dữ liệu của toàn bộ danh sách hiển thị
  const summary = useMemo(() => {
    return filteredOrders.reduce((acc, order) => {
      acc.totalAmount += Number(order.total_amount || 0);
      acc.totalDebt += Number(order.current_debt || 0);
      acc.totalProfit += Number(order.total_profit || 0);
      return acc;
    }, { totalAmount: 0, totalDebt: 0, totalProfit: 0 });
  }, [filteredOrders]);

  // Hàm phụ trợ định dạng hiển thị tiền tệ
  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#1e293b', margin: '0 0 5px 0' }}>Công Nợ</h2>
      </div>

      {/* Thanh công cụ tìm kiếm */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Tìm theo tên khách hàng hoặc mã ĐH..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchTerm(''); // Xóa trắng ô nhập liệu để đưa danh sách về mặc định
              e.currentTarget.blur(); // Bỏ tập trung (unfocus) khỏi ô nhập liệu
            }
          }}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.95rem',
            outline: 'none'
          }}
        />
        <div style={{ padding: '10px 15px', backgroundColor: '#e2e8f0', borderRadius: '6px', fontWeight: 'bold', color: '#334155' }}>
          Số lượng: {filteredOrders.length} ĐH
        </div>
      </div>

      {/* Bảng dữ liệu hiển thị */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '12px 16px', color: '#475569' }}>Mã ĐH</th>
              <th style={{ padding: '12px 16px', color: '#475569' }}>Ngày Tạo</th>
              <th style={{ padding: '12px 16px', color: '#475569' }}>Tên Khách Hàng</th>
              <th style={{ padding: '12px 16px', color: '#475569', textAlign: 'right' }}>Tiền Hàng</th>
              <th style={{ padding: '12px 16px', color: '#475569', textAlign: 'right' }}>Khách Trả</th>
              <th style={{ padding: '12px 16px', color: '#475569', textAlign: 'right' }}>Còn Nợ</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order, index) => {
                const cleanOrderCustId = order.customer_id ? String(order.customer_id).trim().toLowerCase() : '';
                // 🌟 TỐI ƯU HÓA: Bốc trực tiếp tên từ mục lục tra cứu nhanh, loại bỏ hoàn toàn hàm .find() lặp ở đây
                const finalCustomerName = customerLookup[cleanOrderCustId] || order.customer_name || order.customer_id || 'Khách lẻ';

                return (
                  <tr
                    key={order.order_id || index}
                    onClick={() => onSelectOrder && onSelectOrder(order.order_id)}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#2196F3' }}>
                      #{order.order_id}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {order.order_date ? new Date(order.order_date).toLocaleDateString('vi-VN') : '---'}
                    </td>
                    
<td style={{ padding: '12px 16px' }}>
{(() => {
  // 1. Dò mã thông minh: Dùng toán tử == (so sánh lỏng) và .trim() để xóa sạch khoảng trắng thừa dưới DB, chặn lệch kiểu dữ liệu Số vs Chữ
  const matchedCust = customers && customers.find(c => 
    String(c.customer_id).trim() == String(order.customer_id).trim()
  );

  // 2. Lấy đúng tên vừa sửa từ danh bạ hệ thống, nếu không thấy hiện mã dự phòng
  const finalName = matchedCust ? matchedCust.customer_name : `Mã KH: ${order.customer_id}`;
  
  // 3. Ép chuẩn mã ID sạch từ bảng customers để truyền đi xem chi tiết
  const targetCustomerId = matchedCust ? matchedCust.customer_id : order.customer_id;

  return (
    <span
      onClick={(e) => {
        e.stopPropagation(); // 🌟 CHẶN BỊ NUỐT SỰ KIỆN (Không cho nhảy sang chi tiết đơn hàng)
        
        const cleanId = String(targetCustomerId || '').trim();
        if (onViewCustomerDetail && cleanId) {
          onViewCustomerDetail(cleanId); // 🚀 MỞ TRANG CHI TIẾT KHÁCH HÀNG CHUẨN 100%
        } else {
          alert(`❌ Hệ thống không tìm thấy mã khách hàng cho [${finalName}]!`);
        }
      }}
      style={{ 
        fontWeight: 'bold', 
        color: '#00060c', // Đổi chữ sang màu xanh dương giống đường link
        cursor: 'pointer' 
      }}
      title="Bấm vào để xem chi tiết hồ sơ công nợ của khách hàng này"
    >
      {finalName}
    </span>
  );
})()}
</td>


                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>
                      {formatMoney(order.total_amount)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#16a34a' }}>
                      {formatMoney(order.customer_paid)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: Number(order.current_debt) > 0 ? '#dc2626' : '#64748b' }}>
                      {formatMoney(order.current_debt)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  Không tìm thấy đơn hàng nào thỏa mãn điều kiện.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Khối thống kê tổng quan nhanh */}
        <div style={{ padding: '15px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #e2e8f0', backgroundColor: '#fffbeb' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 'bold', textTransform: 'uppercase' }}>Tổng Còn Nợ</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#b91c1c', marginTop: '5px' }}>
              {formatMoney(summary.totalDebt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoSliceOrdersPage;
