import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PurchaseOrderDetailList = ({ onViewProductDetail }) => {
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Trạng thái tìm kiếm Debounce đồng bộ
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Quản lý phân trang đồng bộ với Backend
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [rowsPerPage] = useState(40);

  // --- Hàm gọi API nạp dữ liệu từ bảng purchase_order_details ---
  // =========================================================
// ✅ ĐOẠN CODE THAY THẾ CHUẨN XÁC GIÚP KÍCH HOẠT TÌM KIẾM:
// =========================================================
const fetchPurchaseOrderDetails = useCallback(async (page, search) => {
  try {
    setLoading(true);
    
    // 🌟 ĐÃ SỬA: Ép hệ thống dùng giá trị được truyền trực tiếp từ useEffect sang,
    // nếu không truyền (lúc tải trang đầu) thì mới chủ động bốc từ State hiện tại.
    const activePage = page !== undefined ? page : currentPage;
    const activeSearch = search !== undefined ? search : searchTerm;

    const res = await axios.get(`http://localhost:5000/api/all-purchase-order-details`, {
      params: {
        page: activePage,
        limit: rowsPerPage,
        search: activeSearch // 🚀 Từ khóa thực tế lúc gõ phím đã được gửi đi thành công!
      }
    });
    
    setDetails(res.data?.data || []);
    setTotalPages(res.data?.pagination?.totalPages || 1);
    setTotalItems(res.data?.pagination?.totalItems || 0);
  } catch (error) {
    console.error("❌ Lỗi kết nối dữ liệu dòng đơn nhập con:", error);
  } finally {
    setLoading(false);
  }
}, [currentPage, rowsPerPage, searchTerm]); // Giữ nguyên mảng theo dõi chuẩn của bác

  // Hook Debounce trì hoãn gọi API chống lag khi gõ phím liên tục
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  useEffect(() => {
    fetchPurchaseOrderDetails(currentPage, searchTerm);
  }, [currentPage, searchTerm]);
  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontFamily: 'Arial, sans-serif' }}>
      
      {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG: TIÊU ĐỀ + THANH TÌM KIẾM CÓ NÚT X */}
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: 'bold' }}>
          📊 Lịch sử Nhập Hàng
        </h3>
        <div style={{ position: 'relative', width: '380px' }}>
          <input
            type="text"
            placeholder="🔍 Tìm theo mã đơn nhập, mã hàng, hoặc ghi chú..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setSearchInput('');
                setSearchTerm('');
                setCurrentPage(1);
                e.target.blur();
              }
            }}
            style={{ width: '100%', padding: '8px 35px 8px 12px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.88rem' }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearchTerm(''); setCurrentPage(1); }}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* BẢNG HIỂN THỊ DỮ LIỆU ĐÃ TỐI ƯU BỐC ẢNH THEO ALBUM SAN_PHAM_PAGE */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
              <th style={thStyle}>Ngày Nhập</th>
              <th style={thStyle}>Mã Đơn Nhập</th>
              <th style={{ ...thStyle, width: '250px' }}>Sản phẩm</th>
              <th style={thStyle}>Ghi Chú</th>
              <th style={thStyleRight}>Số Lượng</th>
              <th style={thStyleRight}>Chiều Dài</th>
              <th style={thStyleRight}>Chiều Rộng</th>
              <th style={thStyleRight}>Diện Tích</th>
              <th style={thStyleRight}>Giá Nhập</th>
              <th style={thStyleRight}>Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold', color: '#64748b' }}>
                  ⏳ Đang tải dữ liệu dòng nhập kho từ máy xưởng...
                </td>
              </tr>
            ) : details.length > 0 ? (
              details.map((item, index) => {
                const actualProductCode = String(item.product_Code || item.product_code || '').trim();
                
                // 🌟 ĐỒNG BỘ THEO SAN_PHAM_PAGE: Lấy tấm ảnh đầu tiên trong chuỗi Album làm ảnh bìa nhỏ đại diện
                const firstImageCover = item.product_image ? item.product_image.split(',')[0] : '';

                return (
                  <tr
                    key={item.id || index}
                    style={{ borderBottom: '1px solid #e2e8f0', transition: 'all 0.2s ease', height: '55px' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
<td style={tdStyle}>{(() => {
  if (!item.purchase_date) return '(Trống)';
  const [yyyy, mm, dd] = String(item.purchase_date).split(/[T ]/)[0].split('-');
  return `${dd}/${mm}/${yyyy}`;
})()}</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#2563eb' }}>{item.purchase_id}</td>
                    <td style={{ ...tdStyle, minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        
                        {/* 🌟 ĐỒNG BỘ THEO SAN_PHAM_PAGE: Nếu có ảnh album thì hiện, không thì hiện khung "No ảnh" */}
                        {firstImageCover ? (
                          <img 
                            src={firstImageCover} 
                            alt="sp" 
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} 
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', backgroundColor: '#eee', borderRadius: '4px', flexShrink: 0, textAlign: 'center', lineHeight: '40px', fontSize: '11px', color: '#999', fontWeight: 'bold', border: '1px solid #cbd5e1' }}>
                            No ảnh
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
  <span 
    onClick={() => {
      // Sử dụng biến actualProductCode đã được xử lý chuẩn hóa ở Page 3 của bạn
      if (onViewProductDetail && actualProductCode) {
        onViewProductDetail(actualProductCode);
      } else {
        alert("Không tìm thấy mã sản phẩm (product_code) cho dòng hàng này!");
      }
    }}
    style={{ 
      fontWeight: '600', 
      color: '#00040b', // Đổi sang màu xanh link để nhận biết bấm được
      fontSize: '1rem', 
      lineHeight: '1.2',
      cursor: 'pointer' // Tạo hiệu ứng bàn tay khi di chuột vào
    }}
    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} // Di chuột vào sẽ gạch chân
    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
  >
    {item.product_name || 'Sản phẩm chưa đặt tên'}
  </span>
</div>

                      </div>
                    </td>
                    <td style={tdStyle}>{item.notes || '---'}</td>
                    <td style={{ ...tdStyleRight, fontWeight: 'bold', color: '#1e293b' }}>{Number(item.quantity || 0).toLocaleString()}</td>
                    <td style={tdStyleRight}>{item.length_value ? `${Number(item.length_value).toLocaleString()}` : '0'}</td>
                    <td style={tdStyleRight}>{item.width_value ? `${Number(item.width_value).toLocaleString()}` : '0'}</td>
                    <td style={{ ...tdStyleRight, color: '#16a34a', fontWeight: 'bold' }}>{Number(item.dien_tich || 0).toFixed(2)} m²</td>
                    <td style={{ ...tdStyleRight, color: '#64748b' }}>{Number(item.import_price || 0).toLocaleString()}đ</td>
                    <td style={{ ...tdStyleRight, color: '#ef4444', fontWeight: 'bold' }}>{Number(item.total_amount || 0).toLocaleString()}đ</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontWeight: 'bold' }}>
                  ❌ Không tìm thấy dữ liệu dòng đơn nhập nào trùng khớp!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* BỘ NÚT PHÂN TRANG THU GỌN THÔNG MINH */}
      {!loading && totalPages > 1 && (
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '5px', alignItems: 'center' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} style={pageBtnStyle}>« Đầu</button>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} style={pageBtnStyle}>Trước</button>
          {(() => {
            const pageNumbers = [];
            const halfBlock = 2;
            let startPage = Math.max(1, currentPage - halfBlock);
            let endPage = Math.min(totalPages, currentPage + halfBlock);
            if (currentPage <= halfBlock) endPage = Math.min(totalPages, startPage + 4);
            if (currentPage > totalPages - halfBlock) startPage = Math.max(1, endPage - 4);

            if (startPage > 1) {
              pageNumbers.push(<button key={1} onClick={() => setCurrentPage(1)} style={pageBtnStyle}>1</button>);
              if (startPage > 2) pageNumbers.push(<span key="dots-start" style={{ padding: '0 5px', color: '#64748b' }}>...</span>);
            }
            for (let i = startPage; i <= endPage; i++) {
              pageNumbers.push(
                <button key={i} onClick={() => setCurrentPage(i)} style={{ ...pageBtnStyle, backgroundColor: currentPage === i ? '#2563eb' : '#fff', color: currentPage === i ? '#fff' : '#334155', fontWeight: currentPage === i ? 'bold' : 'normal' }}>
                  {i}
                </button>
              );
            }
            if (endPage < totalPages) {
              if (endPage < totalPages - 1) pageNumbers.push(<span key="dots-end" style={{ padding: '0 5px', color: '#64748b' }}>...</span>);
              pageNumbers.push(<button key={totalPages} onClick={() => setCurrentPage(totalPages)} style={pageBtnStyle}>{totalPages}</button>);
            }
            return pageNumbers;
          })()}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} style={pageBtnStyle}>Sau</button>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} style={pageBtnStyle}>Cuối »</button>
          <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            Trang {currentPage} / {totalPages} (Tổng số {totalItems} dòng nhập)
          </span>
        </div>
      )}
    </div>
  );
};

// --- HỆ THỐNG STYLE STYLE HẠ TẦNG KHÓA CỨNG KHUNG XƯƠNG BẢNG ---
const thStyle = { padding: '5px 5px', fontWeight: 'bold', fontSize: '0.85rem' };
const thStyleRight = { ...thStyle, textAlign: 'right' };
const tdStyle = { padding: '2px 2px', color: '#334155', height: '55px', verticalAlign: 'middle' };
const tdStyleRight = { ...tdStyle, textAlign: 'right' };
const pageBtnStyle = { padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.85rem' };

export default PurchaseOrderDetailList;
