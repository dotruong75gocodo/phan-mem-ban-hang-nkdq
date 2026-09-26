import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Hàm hỗ trợ tìm kiếm không dấu
const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
};

const DonHangPage = (props) => {
  const { onSelectOrder,onViewDetail } = props; 
  const [showDropdown, setShowDropdown] = useState(false); 
  const dropdownRef = useRef(null); 
  
 const generateOrderCode = () => {
  const now = new Date();
  
  // Ép buộc chuyển đổi sang múi giờ Việt Nam
  const vnString = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnTime = new Date(vnString);

  const DD = String(vnTime.getDate()).padStart(2, '0');
  const MM = String(vnTime.getMonth() + 1).padStart(2, '0');
  const YYYY = vnTime.getFullYear();
  const HH = String(vnTime.getHours()).padStart(2, '0');
  const mm = String(vnTime.getMinutes()).padStart(2, '0');
  const SS = String(vnTime.getSeconds()).padStart(2, '0');
  
  return `X${DD}${MM}${YYYY}${HH}${mm}${SS}`;
};

  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const [totalOrderPages, setTotalOrderPages] = useState(1);
  const [searchOrderTerm, setSearchOrderTerm] = useState(() => {
 return localStorage.getItem('last_order_search') || '';
});
  const [searchOrderInput, setSearchOrderInput] = useState(() => {
 return localStorage.getItem('last_order_search') || '';
});
  const [orderLimit, setOrderLimit] = useState(30);
  const [editingInputText, setEditingInputText] = useState({}); 
// Thêm State này để kiểm soát đóng/mở menu gợi ý trong Popup sửa
const [showEditCustomerDropdown, setShowEditCustomerDropdown] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null); 
  const [orderId, setOrderId] = useState(generateOrderCode());

const [orderDate, setOrderDate] = useState(() => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`; // Lấy chuẩn ngày trên máy tính của bạn
});
  // Đã sửa: Quản lý theo Mã khách hàng gõ tay
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  const [oldDebt, setOldDebt] = useState(0);
  const [customerPaid, setCustomerPaid] = useState(0);
  const [orderSlice, setOrderSlice] = useState('');
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState([]);
  // 🌟 STATE MỚI: Quản lý ẩn/hiện và lưu thông tin đơn hàng đang được chọn để sửa
const [isLocalEditModalOpen, setIsLocalEditModalOpen] = useState(false);
const [localEditingOrder, setLocalEditingOrder] = useState(null);

  const AVAILABLE_SLICES = [
    { value: 'bao gia', label: 'Báo giá' },
    { value: 'xuat', label: 'xuất' },
    { value: 'no', label: 'nợ' },
  ];

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerDropdownActive, setCustomerDropdownActive] = useState(false);
  const customerAreaRef = useRef(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

// THAY THẾ TOÀN BỘ HÀM fetchOrders CŨ Ở TRANG 3:
const fetchOrders = async (page = orderPage, search = searchOrderTerm) => {
  try {
    const res = await axios.get(
      `/api/orders?page=${page}&limit=${orderLimit}&search=${encodeURIComponent(search)}`
    );
    if (res.data && res.data.data) {
      setOrders(res.data.data);
      setTotalOrderPages(res.data.pagination?.totalPages || 1);
      setOrderPage(res.data.pagination?.currentPage || 1);
    }
  } catch (err) {
    console.error("Lỗi kết nối API danh sách đơn hàng:", err);
  }
}; // Không còn đuôi [orderLimit, orderPage, searchOrderTerm] nữa!


  // Tải danh sách khách hàng dropdown phục vụ tìm kiếm thông minh
  const fetchCustomers = async (searchTerm = '') => {
    try {
      const res = await axios.get(`http://localhost:5000/api/customers?search=${encodeURIComponent(searchTerm)}&limit=50`);
      if (res.data && Array.isArray(res.data.data)) {
        setCustomers(res.data.data); 
      }
    } catch (err) {
      console.error("Lỗi kết nối API danh sách khách hàng:", err);
    }
  };



  useEffect(() => {
    fetchCustomers('');
  }, []); 

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerAreaRef.current && !customerAreaRef.current.contains(event.target)) {
        setCustomerDropdownActive(false);
      }
      if (!event.target.classList.contains('product-search-input') && !event.target.closest('.product-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setCustomerDropdownActive(false);
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Thay thế đoạn useEffect [searchOrderInput] cũ ở Trang 5
useEffect(() => {
  const delayDebounceFn = setTimeout(() => {
    setSearchOrderTerm(searchOrderInput.trim());
    setOrderPage(1);
  }, 400);

  // BẮT BUỘC: Thêm hàm cleanup để xóa timeout cũ khi người dùng đang gõ tiếp
  return () => clearTimeout(delayDebounceFn); 
}, [searchOrderInput]);


  useEffect(() => {
    const delayDebounceCustomer = setTimeout(() => {
      fetchCustomers(customerSearchTerm);
    }, 400);
    return () => clearTimeout(delayDebounceCustomer);
  }, [customerSearchTerm]);

  // Sửa lại 2 useEffect ở đầu Trang 6 thành 1 hook duy nhất:
// THAY THẾ CÁC useEffect CALL API CŨ Ở TRANG 6 THÀNH 2 ĐOẠN GỌN GÀNG NÀY:

// 1. Chạy lần đầu khi load trang hoặc khi thay đổi số lượng hiển thị (limit)
useEffect(() => {
  fetchOrders(1, searchOrderTerm);
}, [orderLimit]);

// 2. Chạy khi người dùng bấm chuyển trang (orderPage) hoặc khi từ khóa tìm kiếm (searchOrderTerm) thay đổi từ debounce
useEffect(() => {
  fetchOrders(orderPage, searchOrderTerm);
}, [orderPage, searchOrderTerm]);


  // Xử lý chọn nhanh khách hàng, nạp customer_id gõ tay chuẩn vào bộ nhớ
  const selectCustomerItem = (cust) => {
    setSelectedCustomerId(cust.customer_id); 
    setSelectedCustomerName(cust.customer_name); 
    setCustomerSearchTerm(`[${cust.customer_id}] ${cust.customer_name}`);
    setOldDebt(0); 
    setCustomerDropdownActive(false);
  };

  
  const netAmount = cartItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  const totalAmount = netAmount + Number(oldDebt);
  const isDebt = orderSlice === 'no';
  const currentDebt = isDebt ? (totalAmount - Number(customerPaid || 0)) : 0;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) return alert('Vui lòng chọn hoặc điền Mã khách hàng chuẩn xác!');
    
    try {
      const safeCurrentDebt = orderSlice === 'no' ? currentDebt : 0;
      const currentCreatedOrderId = orderId;
      
      await axios.post('/api/orders', {
        order_id: currentCreatedOrderId,
        order_date: orderDate,
        customer_id: selectedCustomerId, 
        net_amount: netAmount,
        old_debt: oldDebt,
        total_amount: totalAmount,
        customer_paid: Number(customerPaid),
        current_debt: safeCurrentDebt,
        order_slice: orderSlice,
        notes: notes,
        details: cartItems
      });
      
      setCartItems([]); 
      setCustomerPaid(0); 
      setNotes(''); 
      setCustomerSearchTerm('');
      localStorage.removeItem('last_order_search');
      setSelectedCustomerId(''); 
      setSelectedCustomerName(''); 
      setShowCreateForm(false); 
      fetchOrders();
      
      if (typeof onSelectOrder === 'function') {
        onSelectOrder(currentCreatedOrderId);
      }
      //alert('Tạo đơn bán hàng thành công và đồng bộ kho thành công 🎉');
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleViewDetails = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setSelectedOrderDetails([]);
    } else {
      try {
        const res = await axios.get(`/api/orders/${orderId}/details`);
        if (res.data && Array.isArray(res.data.data)) {
          setSelectedOrderDetails(res.data.data);
        } else if (Array.isArray(res.data)) {
          setSelectedOrderDetails(res.data);
        } else {
          setSelectedOrderDetails([]);
        }
        setExpandedOrderId(orderId);
      } catch (err) {
        console.error(err);
        setSelectedOrderDetails([]);
      }
    }
  };

  
  const handleSaveModifiedDetails = async (ord) => {
    if (selectedOrderDetails.some(item => !item.product_code)) return alert('Vui lòng điền đủ Mã SP!');
    try {
      await axios.put(`/api/orders/${ord.order_id}/update-details`, {
        orderInfo: {
          order_id: ord.order_id,
          order_date: ord.order_date,
          customer_id: ord.customer_id, 
          customer_paid: ord.customer_paid,
          old_debt: ord.old_debt
        },
        updatedDetails: selectedOrderDetails
      });
      alert('Cập nhật thay đổi chi tiết vật tư thành công!');
      setExpandedOrderId(null); setSelectedOrderDetails([]); fetchOrders();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.error || error.message));
    }
  };
  return (
    <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif' }}>
      
      <div style={{ marginBottom: '10px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '10px 10px',
            backgroundColor: showCreateForm ? '#dc3545' : '#28a745', 
            color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 6px rgba(40, 167, 69, 0.2)'
          }}
        >
          {showCreateForm ? '✕ Đóng khung tạo đơn' : '✨ Tạo đơn mới'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleSubmitOrder} style={{ display: 'grid', gap: '15px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', flexWrap: 'wrap' }}>
            <div>
              <label>Mã Đơn Hàng:</label><br />
              <input type="text" value={orderId} readOnly style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed', padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label>Ngày Lập:</label><br />
              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            
            {/* Ô Tìm Kiếm Khách Hàng Thông Minh Theo Mã KH và Tên */}
            <div ref={customerAreaRef} style={{ position: 'relative', width: '280px' }}>
              <label>Tìm chọn Khách Hàng:</label><br />
              <input
                type="text"
                placeholder="🔍 Nhập Mã số hoặc Tên khách hàng..."
                value={customerSearchTerm}
                onFocus={(e) => { setCustomerDropdownActive(true); e.target.select(); }}
                onClick={(e) => e.target.select()}
                onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setCustomerDropdownActive(true);
                  if (!e.target.value) {
                    setSelectedCustomerId('');
                    setSelectedCustomerName('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const cleanSearch = removeVietnameseTones(customerSearchTerm);
                    const filteredCustomers = customers.filter(c => {
                      const cleanId = removeVietnameseTones(c.customer_id || '');
                      const cleanName = removeVietnameseTones(c.customer_name || '');
                      return cleanId.includes(cleanSearch) || cleanName.includes(cleanSearch) || (c.phone_number && c.phone_number.includes(customerSearchTerm));
                    });
                    if (filteredCustomers.length > 0) {
                      e.preventDefault(); 
                      selectCustomerItem(filteredCustomers[0]);
                      setCustomerDropdownActive(false); 
                    }
                  }
                }}
                style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #2196F3', outline: 'none' }}
                required
              />

              {/* DROPDOWN MENU GỢI Ý MÃ KH KHÔNG DẤU */}
              {customerDropdownActive && (
                <div style={{ position: 'absolute', zIndex: 110, top: '55px', left: 0, right: 0, backgroundColor: '#fff', border: '2px solid #2196F3', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ textAlign: 'right', backgroundColor: '#f1f1f1', padding: '3px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', color: '#dc3545' }} onClick={() => setCustomerDropdownActive(false)}>[✖ Đóng]</div>
                  {customers.length > 0 ? (
                    customers.map(c => (
                      <div
                        key={c.customer_id}
                        onClick={() => selectCustomerItem(c)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '0.9rem', textAlign: 'left' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#eef5ff'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                      >
                        🆔 <strong style={{ color: '#007bff' }}>{c.customer_id}</strong> — 👤 <span>{c.customer_name}</span> {c.phone_number ? ` (${c.phone_number})` : ''}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '10px', color: '#888', fontStyle: 'italic', fontSize: '0.85rem', textAlign: 'center' }}>❌ Không tìm thấy khách hàng này...</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label>Slice ĐH:</label><br />
              <input type="text" value={orderSlice} onChange={(e) => setOrderSlice(e.target.value)} placeholder="Chọn hoặc tự nhập..." list="order-slice-suggestions" style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '180px', outline: 'none' }} />
              <datalist id="order-slice-suggestions">
                {AVAILABLE_SLICES.map((slice) => <option key={slice.value} value={slice.value}>{slice.label}</option>)}
              </datalist>
            </div>
<button type="submit" style={{ backgroundColor: '#ffc107', color: '#212529', fontWeight: 'bold', border: 'none', padding: '10px 20px', borderRadius: '5px', fontSize: '1.1rem', cursor: 'pointer' }}>
            💾 LƯU ĐƠN HÀNG</button>

          </div>
                   
        </form>
      )}
 {/* KHỐI 2: BẢNG LỊCH SỬ ĐƠN HÀNG */}
 <div style={{ marginTop: '10px', borderTop: '2px dashed #bbb', paddingTop: '20px' }}>
   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', gap: '15px', flexWrap: 'wrap' }}>
     <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
       <h3 style={{ margin: 0, color: '#333', whiteSpace: 'nowrap' }}>📜 ĐƠN HÀNG</h3>
       <div style={{ position: 'relative', width: '40%', minWidth: '260px' }}>
         <input
           type="text"
           placeholder="Nhập tên khách hàng cần tìm kiếm..."
           value={searchOrderInput} 
           onChange={(e) => {
            const val = e.target.value;
            setSearchOrderInput(val);
            localStorage.setItem('last_order_search', val); 
          }}
           onKeyDown={(e) => {
             if (e.key === 'Escape') {
               e.preventDefault();
               setSearchOrderInput(''); 
               setSearchOrderTerm('');
               localStorage.removeItem('last_order_search');  
               setOrderPage(1); 
               e.target.blur(); 
             }
           }}
           style={{ width: '100%', padding: '8px 35px 8px 10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }}
         />
         {searchOrderInput && (
           <button type="button" onClick={() => { 
            setSearchOrderInput(''); 
            setSearchOrderTerm('');
            localStorage.removeItem('last_order_search');  
            setOrderPage(1);
           }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' }} 
           title="Xóa nhanh từ khóa">✕</button>
         )}
       </div>
     </div>

     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
       <span style={{ fontSize: '14px', color: '#475569' }}>Hiển thị </span>
       <select value={orderLimit} onChange={(e) => setOrderLimit(Number(e.target.value))} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}>
         <option value={10}>10 đơn hàng</option>
         <option value={20}>20 đơn hàng</option>
         <option value={50}>50 đơn hàng</option>
       </select>
     </div>
   </div>

   {/* BẢNG HIỂN THỊ DANH SÁCH TỔNG QUÁT */}
   <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse', marginTop: '10px', textAlign: 'center' }}>
     <thead>
       <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
         <th>Ngày</th>
         <th>Khách Hàng</th>
         <th>Tiền Hàng</th>
         <th>Nợ cũ</th>
         <th>Tổng Tiền</th>
         <th>Khách Trả</th>
         <th>Ghi nợ</th>
         <th>Slice</th>
         <th>Ghi chú</th>
         <th>action</th>
       </tr>
     </thead>
     <tbody>
  {Array.isArray(orders) && orders.map((ord, idx) => {
    
    // 🌟 TỐI ƯU 2: Định dạng ngày tháng an toàn, chặn đứng việc ép new Date() lặp đi lặp lại
    let displayDate = '---';
    if (ord.order_date) {
      const dateStr = String(ord.order_date);
      if (dateStr.includes('T')) {
        const [yyyy, mm, dd] = dateStr.split('T')[0].split('-');
        displayDate = `${dd}/${mm}/${yyyy}`;
      } else if (dateStr.includes('-')) {
        const [yyyy, mm, dd] = dateStr.split('-');
        displayDate = `${dd}/${mm}/${yyyy}`;
      } else {
        displayDate = new Date(ord.order_date).toLocaleDateString('vi-VN');
      }
    }

    return (
      <React.Fragment key={ord.order_id || idx}>
        <tr
          onClick={() => {
            if (typeof onSelectOrder === 'function') {
              onSelectOrder(ord.order_id);
            }
          }}
          // 🌟 TỐI ƯU 3: Chuyển hiệu ứng hover đổi màu sang style chuẩn để trình duyệt tự xử lý (không dùng JS inline)
          className="order-row-hover"
          style={{ 
            cursor: 'pointer', 
            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', // Tạo sọc xen kẽ cho bảng dễ nhìn
            transition: 'background-color 0.15s ease' 
          }}
        >
          {/* Ngày tạo đơn đã tối ưu định dạng */}
          <td>{displayDate}</td>

          {/* 👥 Ô KHÁCH HÀNG: Tra cứu siêu tốc O(1) đã qua chuẩn hóa sạch sẽ */}
          <td
            style={{ fontWeight: 'bold', color: '#010306', cursor: 'pointer', textAlign: 'left', paddingLeft: '8px' }}
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onViewDetail === 'function') {
                onViewDetail(ord.customer_id);
              }
            }}
          >
            {ord.customer_name || ord.customer_id || 'Khách'}
          </td>

          {/* Định dạng tiền tệ nhanh gọn */}
          <td style={{ color: '#28a745', fontWeight: 'bold', textAlign: 'right' }}>{(Number(ord.net_amount) || 0).toLocaleString('vi-VN')}đ</td>
          <td style={{ color: '#6c757d', textAlign: 'right' }}>{(Number(ord.old_debt) || 0).toLocaleString('vi-VN')}đ</td>
          <td style={{ color: '#007bff', fontWeight: 'bold', textAlign: 'right' }}>{(Number(ord.total_amount) || 0).toLocaleString('vi-VN')}đ</td>
          <td style={{ color: '#28a745', textAlign: 'right' }}>{(Number(ord.customer_paid) || 0).toLocaleString('vi-VN')}đ</td>
          <td style={{ color: '#dc3545', fontWeight: 'bold', textAlign: 'right' }}>{(Number(ord.current_debt) || 0).toLocaleString('vi-VN')}đ</td>
          <td>{ord.order_slice || '---'}</td>
          
          {/* Ô ghi chú cắt chuỗi thông minh */}
          <td style={{ textAlign: 'left', maxWidth: '150px' }} title={ord.notes || ''}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ord.notes || '---'}
            </div>
          </td>

          {/* 🌟 NÚT SỬA ĐƠN HÀNG */}
          <td style={{ textAlign: 'center' }}>
            <button
              title="Chỉnh sửa chi tiết đơn hàng"
              onClick={(e) => {
  e.stopPropagation();

  // Tìm khách hàng khớp mã
  const matchedCust = customers.find(c => 
    String(c.customer_id).trim() === String(ord.customer_id).trim()
  );

  const cleanedOrder = {
    ...ord,
    customer_id: matchedCust ? matchedCust.customer_id : ord.customer_id,
    customer_name: matchedCust ? matchedCust.customer_name : (ord.customer_name || 'Khách lẻ')
  };

  setLocalEditingOrder(cleanedOrder);
  setShowEditCustomerDropdown(false); // 🌟 BẮT BUỘC: Đóng dropdown khi vừa mở màn hình
  setIsLocalEditModalOpen(true);
}}

              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              ✏️
            </button>
          </td>
        </tr>
      </React.Fragment>
    );
  })}
</tbody>

   </table>

   {/* ĐIỀU KHIỂN PHÂN TRANG DƯỚI ĐÁY */}
   <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
     <button type="button" disabled={orderPage === 1} onClick={() => setOrderPage(orderPage - 1)} style={{ padding: '6px 12px', cursor: orderPage === 1 ? 'not-allowed' : 'pointer' }}>◀ Trước</button>
     <span style={{ fontWeight: 'bold' }}>Trang {orderPage} / {totalOrderPages}</span>
     <button type="button" disabled={orderPage === totalOrderPages} onClick={() => setOrderPage(orderPage + 1)} style={{ padding: '6px 12px', cursor: orderPage === totalOrderPages ? 'not-allowed' : 'pointer' }}>Sau ▶</button>
   </div>
 </div>

{/* ========================================================================= */}
{/* 🌟 FORM POPUP CHỈNH SỬA ĐƠN HÀNG ĐẦY ĐỦ CÁC Ô THÔNG TIN (2 CỘT GỌN GÀNG) */}
{/* ========================================================================= */}
{isLocalEditModalOpen && localEditingOrder && (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 9999
  }}>
    <div style={{
      backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px',
      width: '650px', maxWidth: '90%', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', position: 'relative'
    }}>
      {/* Tiêu đề Popup */}
      <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', fontWeight: 'bold' }}>
        ✏️ Chỉnh Sửa Đơn Hàng: <span style={{ color: '#2563eb' }}>{localEditingOrder.order_id}</span>
      </h3>
      
      {/* Khối bố cục 2 cột bằng CSS Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        
        {/* 1. Ô NGÀY THÁNG */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#475569' }}>Ngày lập đơn:</label>
          <input 
            type="date" 
            value={localEditingOrder.order_date ? localEditingOrder.order_date.split('T')[0] : ''}
            onChange={(e) => setLocalEditingOrder({...localEditingOrder, order_date: e.target.value})}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}
          />
        </div>

        {/* 2. Ô KHÁCH HÀNG */}
       {/* 2. Ô KHÁCH HÀNG (ĐÃ CẬP NHẬT CHỌN THÔNG MINH) */}
{/* 2. Ô KHÁCH HÀNG (BẢN CẬP NHẬT CHỐNG LỖI GIAO DIỆN) */}
{/* 2. Ô KHÁCH HÀNG (ĐÃ SỬA TRIỆT ĐỂ LỖI KÝ TỰ LẠ) */}
<div style={{ position: 'relative' }}>
  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#475569' }}>
    Khách Hàng (Hiện tại: <span style={{ color: '#2563eb' }}>{localEditingOrder.customer_id || 'Chưa chọn'}</span>):
  </label>
  <div style={{ display: 'flex', gap: '5px' }}>
    <input
      type="text"
      // 🌟 QUAN TRỌNG: Chỉ binding duy nhất trường text tên để người dùng gõ xóa mượt mà, không nhét [ID] vào đây nữa
      value={localEditingOrder.customer_name || ''}
      onFocus={(e) => {
        e.target.select();
        setShowEditCustomerDropdown(true);
      }}
      onChange={(e) => {
        const val = e.target.value;
        // Khi gõ chữ, cập nhật trực tiếp tên vào state để hiển thị, tạm thời giữ nguyên ID cũ cho đến khi chọn dòng mới
        setLocalEditingOrder({ 
          ...localEditingOrder, 
          customer_name: val 
        });
        setShowEditCustomerDropdown(true);
        fetchCustomers(val); // Gọi API tìm kiếm theo tên bạn đang gõ
      }}
      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none' }}
      placeholder="🔍 Gõ từ khóa tên để tìm khách hàng..."
    />
    {showEditCustomerDropdown && (
      <button 
        type="button" 
        onClick={() => setShowEditCustomerDropdown(false)}
        style={{ padding: '0 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
      >
        Đóng
      </button>
    )}
  </div>

  {/* DROPDOWN MENU LƠ LỬNG */}
  {showEditCustomerDropdown && (
    <div style={{ 
      position: 'absolute', 
      zIndex: 99999, 
      top: '62px', 
      left: 0, 
      right: 0, 
      backgroundColor: '#ffffff', 
      border: '1px solid #3b82f6', 
      borderRadius: '4px', 
      maxHeight: '180px', 
      overflowY: 'auto', 
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
    }}>
      {customers.length > 0 ? (
        customers.map(c => (
          <div
            key={c.customer_id}
            onClick={() => {
              // 🌟 CHỌN KHÁCH HÀNG: Cập nhật chuẩn xác cả Mã và Tên xịn vào đơn hàng
              setLocalEditingOrder({
                ...localEditingOrder,
                customer_id: c.customer_id,
                customer_name: c.customer_name
              });
              setShowEditCustomerDropdown(false); // Chọn xong tự đóng menu
            }}
            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', textAlign: 'left', color: '#334155' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
          >
            🆔 <strong style={{ color: '#2563eb' }}>{c.customer_id}</strong> — 👤 {c.customer_name}
          </div>
        ))
      ) : (
        <div style={{ padding: '12px', color: '#64748b', fontStyle: 'italic', fontSize: '13px', textAlign: 'center' }}>
          ❌ Không tìm thấy khách hàng nào...
        </div>
      )}
    </div>
  )}
</div>



        {/* 3. Ô TIỀN HÀNG */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#28a745' }}>Tiền Hàng (đ):</label>
          <input 
            type="number" 
            value={localEditingOrder.net_amount || 0}
            onChange={(e) => {
              const net = Number(e.target.value);
              const oldD = Number(localEditingOrder.old_debt || 0);
              const paid = Number(localEditingOrder.customer_paid || 0);
              const total = net + oldD;
              // Tự động tính toán lại Tổng Tiền và Ghi Nợ thời gian thực khi gõ
              setLocalEditingOrder({
                ...localEditingOrder, 
                net_amount: net,
                total_amount: total,
                current_debt: total - paid
              });
            }}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#28a745' }}
          />
        </div>

        {/* 4. Ô NỢ CŨ */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#6c757d' }}>Nợ cũ (đ):</label>
          <input 
            type="number" 
            value={localEditingOrder.old_debt || 0}
            onChange={(e) => {
              const oldD = Number(e.target.value);
              const net = Number(localEditingOrder.net_amount || 0);
              const paid = Number(localEditingOrder.customer_paid || 0);
              const total = net + oldD;
              setLocalEditingOrder({
                ...localEditingOrder, 
                old_debt: oldD,
                total_amount: total,
                current_debt: total - paid
              });
            }}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#6c757d' }}
          />
        </div>

        {/* 5. Ô TỔNG TIỀN (Khóa nhập - tự động tính theo công thức để tránh sai sót) */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#007bff' }}>Tổng Tiền (đ) [Tự tính]:</label>
          <input 
            type="number" 
            value={localEditingOrder.total_amount || 0}
            disabled
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#eff6ff', fontWeight: 'bold', color: '#007bff', cursor: 'not-allowed' }}
          />
        </div>

        {/* 6. Ô KHÁCH TRẢ */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#16a34a' }}>Khách Trả (đ):</label>
          <input 
            type="number" 
            value={localEditingOrder.customer_paid || 0}
            onChange={(e) => {
              const paid = Number(e.target.value);
              const total = Number(localEditingOrder.total_amount || 0);
              setLocalEditingOrder({
                ...localEditingOrder, 
                customer_paid: paid,
                current_debt: total - paid
              });
            }}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#16a34a' }}
          />
        </div>

        {/* 7. Ô GHI NỢ (Khóa nhập - tự động tính từ Tổng Tiền - Khách Trả) */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#dc3545' }}>Ghi nợ (đ) [Tự tính]:</label>
          <input 
            type="number" 
            value={localEditingOrder.current_debt || 0}
            disabled
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fef2f2', fontWeight: 'bold', color: '#dc3545', cursor: 'not-allowed' }}
          />
        </div>

        {/* 8. Ô SLICE SP */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#475569' }}>Slice SP:</label>
          <input 
            type="text" 
            value={localEditingOrder.order_slice || ''}
            onChange={(e) => setLocalEditingOrder({...localEditingOrder, order_slice: e.target.value})}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            placeholder="Ví dụ: no..."
          />
        </div>

      </div>

      {/* 9. Ô GHI CHÚ (Nằm full chiều ngang bên dưới rộng rãi) */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#475569' }}>Ghi Chú:</label>
        <textarea 
          rows="2"
          value={localEditingOrder.notes || ''}
          onChange={(e) => setLocalEditingOrder({...localEditingOrder, notes: e.target.value})}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'none' }}
          placeholder="Nhập ghi chú đơn hàng..."
        />
      </div>

      {/* Thanh nút bấm chức năng ở dưới cùng */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <button 
          onClick={() => setIsLocalEditModalOpen(false)}
          style={{ padding: '8px 18px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
        >
          Hủy bỏ
        </button>
        <button 
          onClick={async () => {
            try {
              const cleanId = String(localEditingOrder.order_id).trim();
              const res = await fetch(`/api/orders/${cleanId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localEditingOrder)
              });

              if (res.ok) {
                //alert("🎉 Cập nhật đơn hàng thành công!");
                setIsLocalEditModalOpen(false);
                // Kích hoạt làm mới lại bảng dữ liệu 50 dòng ngoài màn hình chính
                if (props && typeof props.fetchOrders === 'function') {
                  props.fetchOrders();
                } else if (typeof fetchOrders === 'function') {
                  fetchOrders();
                }
              } else {
                alert("❌ Lưu thất bại, vui lòng kiểm tra cổng API Backend!");
              }
            } catch (err) {
              console.error("Lỗi gửi dữ liệu PUT:", err);
            }
          }}
          style={{ padding: '8px 20px', borderRadius: '4px', border: 'none', backgroundColor: '#22c55e', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(34,197,94,0.2)', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
        >
          Lưu Thay Đổi
        </button>
      </div>

    </div>
  </div>
)}

 </div>
 );
};




export default DonHangPage;


