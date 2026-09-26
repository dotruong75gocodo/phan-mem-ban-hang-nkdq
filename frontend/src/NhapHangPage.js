import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Hàm gỡ dấu chuẩn hóa chữ đ/Đ và chữ hoa chữ thường
const cleanText = (str) => {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
};

const NhapHangPage = ({ onSelectOrder, onViewSupplierDetail }) => {
  // --- CÁC TRẠNG THÁI (STATES) QUẢN LÝ ĐƠN HÀNG ---
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchasePage, setPurchasePage] = useState(1);
  const [totalPurchasePages, setTotalPurchasePages] = useState(1);
  const [searchPurchaseTerm, setSearchPurchaseTerm] = useState('');
  const [searchPurchaseInput, setSearchPurchaseInput] = useState('');
  const [purchaseLimit, setPurchaseLimit] = useState(20);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // --- CÁC TRƯỜNG NHẬP LIỆU TẠO ĐƠN NHẬP MỚI ---
  const [supplierName, setSupplierName] = useState('');
const [purchaseDate, setPurchaseDate] = useState(() => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`; // Lấy chuẩn ngày hôm nay của Việt Nam
});
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // --- CÁC TRẠNG THÁI GỢI Ý NHÀ CUNG CẤP (SUPPLIER) ---
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSupplierIdForCreate, setSelectedSupplierIdForCreate] = useState('');

  // 1. Hàm gọi API lấy danh sách đơn nhập hàng từ Server
  const fetchPurchaseOrders = useCallback(async (page = purchasePage, search = searchPurchaseTerm) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/purchase-orders?page=${page}&limit=${purchaseLimit}&search=${encodeURIComponent(search)}`
      );
      if (res.data && res.data.data) {
        setPurchaseOrders(res.data.data);
        setTotalPurchasePages(res.data.pagination?.totalPages || 1);
        setPurchasePage(res.data.pagination?.currentPage || 1);
      }
    } catch (err) {
      console.error("Lỗi kết nối API danh sách đơn nhập hàng:", err);
    }
  }, [purchaseLimit, purchasePage, searchPurchaseTerm]);

  // 2. Hook Debounce chống lag và đồng bộ từ khóa tìm kiếm xuống API (Đã sửa lỗi)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchPurchaseTerm(searchPurchaseInput); 
      setPurchasePage(1); // Reset về trang 1 khi gõ tìm kiếm mới
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchPurchaseInput]);

  // 3. Tự động gọi lại dữ liệu khi thay đổi Trang, Số dòng hiển thị hoặc Từ khóa
  useEffect(() => {
    fetchPurchaseOrders(purchasePage, searchPurchaseTerm);
  }, [purchasePage, purchaseLimit, searchPurchaseTerm, fetchPurchaseOrders]);

  // 4. Tải trước danh sách nhà cung cấp về máy phục vụ menu gợi ý thả xuống
  useEffect(() => {
    const loadAllSuppliers = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/suppliers?page=1&limit=100&search=`);
        if (res.data && res.data.data) {
          setSupplierSuggestions(res.data.data);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách nhà cung cấp gợi ý:", err);
      }
    };
    loadAllSuppliers();
  }, []);

  // 5. Hàm xử lý bấm nút Lưu đơn nhập tổng mới tạo
  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    
    if (!supplierName.trim()) {
      return alert('Vui lòng chọn hoặc nhập tên nhà cung cấp!');
    }
    
    // Kiểm tra chặn bắt buộc phải chọn nhà cung cấp từ danh sách thả xuống
    if (!selectedSupplierIdForCreate) {
      return alert('Vui lòng click chọn một Nhà cung cấp từ danh sách gợi ý!');
    }

    try {
      await axios.post('http://localhost:5000/api/purchase-orders', {
        purchase_date: purchaseDate,
        supplier_id: selectedSupplierIdForCreate,
        total_amount: Number(totalAmount),
        notes: notes
      });

      // Reset toàn bộ form về trạng thái trống
      setSupplierName('');
      setSelectedSupplierIdForCreate('');
      setTotalAmount(0);
      setNotes('');
      setShowCreateForm(false);
      
      // Tải lại bảng danh sách đơn hàng mới nhất
      fetchPurchaseOrders(1, '');
      //alert('Lưu đơn nhập hàng thành công 🎉');
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.error || error.message));
    }
  };
  return (
    <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginTop: '5px',color: '#010b15' }}> NHẬP HÀNG</h2>
      
      {/* Nút Đóng / Mở Khung Tạo Đơn Tốc Hành */}
      <div style={{ marginBottom: '10px', textAlign: 'CENTER' }}>
        <button 
          type="button" 
          onClick={() => setShowCreateForm(!showCreateForm)} 
          style={{
            padding: '10px 20px', 
            backgroundColor: showCreateForm ? '#dc3545' : '#28a745', 
            color: '#fff', border: 'none', borderRadius: '5px', 
            cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
            boxShadow: '0 4px 6px rgba(40, 167, 69, 0.2)' 
          }}
        >
          {showCreateForm ? '✕ Đóng khung tạo đơn nhập' : '✨ Tạo đơn mới'}
        </button>
      </div>

      {/* FORM NHẬP LIỆU TẠO ĐƠN MỚI */}
      {showCreateForm && (
        <form onSubmit={handleSubmitPurchase} style={{ display: 'grid', gap: '15px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', flexWrap: 'wrap' }}>
            
            {/* Trường Ngày Tháng */}
            <div>
              <label style={{ fontWeight: 'bold' }}>Ngày Nhập:</label><br />
              <input 
                type="date" 
                value={purchaseDate} 
                onChange={(e) => setPurchaseDate(e.target.value)} 
                required 
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '5px' }} 
              />
            </div>

            {/* Trường Ô Nhập Nhà Cung Cấp + Menu Gợi Ý ĐÃ SỬA LỖI */}
<div style={{ position: 'relative' }}>
  <label style={{ fontWeight: 'bold' }}>Nhà Cung Cấp:</label><br />
  <input
    type="text"
    placeholder="Gõ từ khóa để tìm kiếm nhà cung cấp..."
    value={supplierName}
    onChange={async (e) => {
      const val = e.target.value;
      setSupplierName(val);
      setSelectedSupplierIdForCreate(''); // Xóa ID cũ khi gõ chữ mới nhằm ép chọn lại danh sách
      setShowSuggestions(true);

      // Gọi API lấy dữ liệu động trực tiếp từ Database theo từ khóa vừa gõ
      try {
        const res = await axios.get(
          `http://localhost:5000/api/suppliers?page=1&limit=30&search=${encodeURIComponent(val)}`
        );
        if (res.data && res.data.data) {
          setSupplierSuggestions(res.data.data);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm động nhà cung cấp:", err);
      }
    }}
    onFocus={async () => {
      setShowSuggestions(true);
      // Tải nhanh danh sách gợi ý ban đầu khi click vào ô trống
      try {
        const res = await axios.get(`http://localhost:5000/api/suppliers?page=1&limit=30&search=`);
        if (res.data && res.data.data) {
          setSupplierSuggestions(res.data.data);
        }
      } catch (err) {
        console.error("Lỗi tải nhanh danh sách NCC:", err);
      }
    }}
    onBlur={() => {
      // Tăng thời gian trì hoãn lên 300ms để đảm bảo chuột kịp nhận sự kiện click chọn dòng
      setTimeout(() => setShowSuggestions(false), 300);
    }}
    required
    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '250px', marginTop: '5px' }}
  />

  {/* Ô thả xuống (Dropdown) hiển thị danh sách gợi ý từ API */}
  {showSuggestions && supplierSuggestions.length > 0 && (
    <ul
      className="custom-scrollbar"
      style={{
        position: 'absolute', top: '100%', left: 0, width: '250px',
        backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
        padding: 0, margin: '4px 0 0 0', listStyle: 'none', maxHeight: '180px',
        overflowY: 'auto', overflowX: 'hidden', zIndex: 2000,
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)', scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 #fff'
      }}
    >
      {supplierSuggestions.map((item) => (
        <li
          key={item.supplier_id}
          onMouseDown={(e) => {
            e.preventDefault(); // Chặn sự kiện làm mất focus ô input
            setSupplierName(item.supplier_name);
            setSelectedSupplierIdForCreate(item.supplier_id); // Lưu mã định danh chuẩn vào state
            setShowSuggestions(false);
          }}
          style={{
            padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
            fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={item.supplier_name}
        >
          🏢 <strong>{item.supplier_name}</strong> {item.phone_number ? ` - ${item.phone_number}` : ''}
        </li>
      ))}
    </ul>
  )}
</div>


            {/* Trường Tổng Số Tiền */}
            <div>
              <label style={{ fontWeight: 'bold' }}>Tổng Tiền Nhập (đ):</label><br />
              <input 
                type="number" 
                placeholder="0" 
                value={totalAmount || ''} 
                onChange={(e) => setTotalAmount(e.target.value)} 
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '150px', marginTop: '5px' }} 
              />
            </div>

            {/* Trường Ghi Chú Đơn Hàng */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontWeight: 'bold' }}>Ghi chú:</label><br />
              <input 
                type="text" 
                placeholder="Nhập ghi chú hoặc nội dung hàng nhập..."
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', marginTop: '5px' }} 
              />
            </div>
          </div>

          {/* Nút bấm Gửi Form */}
          <div style={{ textAlign: 'center' }}>
            <button 
              type="submit" 
              style={{ 
                backgroundColor: '#ffc107', color: '#212529', fontWeight: 'bold', 
                border: 'none', padding: '10px 25px', borderRadius: '5px', fontSize: '1rem', cursor: 'pointer' 
              }}
            >
              💾 LƯU ĐƠN NHẬP TỔNG
            </button>
          </div>
        </form>
      )}
      {/* KHU VỰC THÀNH PHẦN HÀNG NGANG & TÌM KIẾM ĐƠN HÀNG */}
      <div style={{ marginTop: '20px', borderTop: '2px dashed #bbb', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', gap: '15px', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
            <h3 style={{ margin: 0, color: '#333', whiteSpace: 'nowrap' }}>
              📜 LỊCH SỬ NHẬP HÀNG</h3>
            
            <div style={{ position: 'relative', width: '40%', minWidth: '260px' }}>
              <input 
                type="text" 
                placeholder="Nhập tên nhà cung cấp cần tìm kiếm..."
                value={searchPurchaseInput} 
                onChange={(e) => setSearchPurchaseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault(); 
                    setSearchPurchaseInput(''); 
                    setSearchPurchaseTerm('');
                    setPurchasePage(1); 
                    e.target.blur();
                  }
                }} 
                style={{ width: '100%', padding: '8px 35px 8px 10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }} 
              />
              {searchPurchaseInput && (
                <button 
                  type="button" 
                  onClick={() => { setSearchPurchaseInput(''); setSearchPurchaseTerm(''); setPurchasePage(1); }} 
                  style={{ 
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                    backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', 
                    cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' 
                  }} 
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Bộ Chọn Giới Hạn Dòng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '14px', color: '#475569' }}>Hiển thị </span>
            <select 
              value={purchaseLimit} 
              onChange={(e) => setPurchaseLimit(Number(e.target.value))} 
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <option value={10}>10 đơn nhập</option>
              <option value={20}>20 đơn nhập</option>
              <option value={50}>50 đơn nhập</option>
            </select>
          </div>
        </div>

        {/* BẢNG LỊCH SỬ ĐƠN NHẬP TỔNG */}
        <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse', marginTop: '10px', textAlign: 'center', borderColor: '#cbd5e1' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
              <th>Mã Đơn Nhập</th>
              <th>Ngày Nhập</th>
              <th>Nhà Cung Cấp</th>
              <th>Tổng Tiền Nhập</th>
              <th>Ghi Chú</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.length > 0 ? (
              purchaseOrders.map((ord) => (
                <tr 
                  key={ord.purchase_id} 
                  onClick={() => onSelectOrder && onSelectOrder(ord.purchase_id)} 
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ fontWeight: 'bold', color: '#007bff' }}>{ord.purchase_id}</td>
<td>{(() => {
  if (!ord.purchase_date) return '---';
  // Bóc tách chuỗi chữ YYYY-MM-DD trực tiếp, không cho đi qua hàm new Date()
  const cleanDate = String(ord.purchase_date).split(/[T ]/)[0];
  const [yyyy, mm, dd] = cleanDate.split('-');
  return `${dd}/${mm}/${yyyy}`; // Đổi định dạng hiển thị sang kiểu Việt Nam ngày/tháng/năm
})()}</td>

                  <td
                    style={{ fontWeight: 'bold', textAlign: 'left', color: '#010c17',  cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation(); 
                      const targetId = ord.supplier_id || ord.id || ord.supplier_name;
                      if (onViewSupplierDetail && targetId) onViewSupplierDetail(targetId);
                    }}
                  >
                    {ord.supplier_name}
                  </td>
                  <td style={{ color: '#dc3545', fontWeight: 'bold', textAlign: 'right' }}>
                    {Number(ord.total_amount || 0).toLocaleString()}đ
                  </td>
                  <td style={{ textAlign: 'left', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ord.notes}>
                    {ord.notes || '---'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: '20px', color: '#64748b', fontStyle: 'italic' }}>
                  Không tìm thấy đơn nhập hàng nào phù hợp...
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PHÂN TRANG */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
          <button 
            type="button" 
            disabled={purchasePage === 1} 
            onClick={() => setPurchasePage(purchasePage - 1)} 
            style={{ padding: '6px 12px', cursor: purchasePage === 1 ? 'not-allowed' : 'pointer' }}
          >
            ◀ Trước
          </button>
          <span style={{ fontWeight: 'bold' }}>Trang {purchasePage} / {totalPurchasePages}</span>
          <button 
            type="button" 
            disabled={purchasePage === totalPurchasePages} 
            onClick={() => setPurchasePage(purchasePage + 1)} 
            style={{ padding: '6px 12px', cursor: purchasePage === totalPurchasePages ? 'not-allowed' : 'pointer' }}
          >
            Sau ▶
          </button>
        </div>
      </div>
    </div>
  );
};

export default NhapHangPage;
