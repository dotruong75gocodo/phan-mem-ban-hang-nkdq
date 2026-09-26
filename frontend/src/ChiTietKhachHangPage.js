import React, { useState, useEffect, useRef  } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto'; 

// Component nhận biến tên khách hàng và hàm quay lại từ App.js tương tự trang sản phẩm
function ChiTietKhachHangPage({ customerNameFromParent, onBack,onViewOrderDetail }) {
  const customer_name = customerNameFromParent; // Lấy tên khách hàng làm khóa chính

  // Khởi tạo các State lưu trữ dữ liệu liên kết giống trang sản phẩm
  const [customer, setCustomer] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]); // Lịch sử mua hàng của khách
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const chartRef = useRef(null);
const chartInstance = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
 const ordersPerPage = 20; // Đặt cố định hiển thị 10 dòng mỗi trang giống DonHangPage
    // Gọi API đồng bộ từ MySQL khi người dùng vừa truy cập vào trang
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 🌟 ĐÃ SỬA: Thêm encodeURIComponent vào API lấy dữ liệu cấu hình gốc để mã hóa chuẩn tiếng Việt có dấu
      const custRes = await axios.get(`/api/customers/${encodeURIComponent(customer_name)}`);
      if (custRes.data) {
        if (Array.isArray(custRes.data)) {
          setCustomer(custRes.data[0]); // Lấy phần tử đầu tiên nếu Backend trả về mảng
        } else {
          setCustomer(custRes.data); // Lấy trực tiếp nếu Backend trả về object
        }
      }

      // 🌟 ĐÃ SỬA: Đảm bảo đồng bộ cho API lịch sử đơn hàng
      const orderRes = await axios.get(`/api/customers/${encodeURIComponent(customer_name)}/orders`);
      setOrderHistory(orderRes.data || []);

    } catch (error) {
      console.error("Lỗi hệ thống khi tải dữ liệu đối soát khách hàng:", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (customer_name) {
      fetchData();
    }
  }, [customer_name]);

  // Hàm xử lý gửi yêu cầu cập nhật thông tin khách hàng về Backend
    // Hàm xử lý gửi yêu cầu cập nhật thông tin khách hàng về Backend
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    try {
      // 1. Gửi lệnh PUT lưu dữ liệu sạch lên Backend Express
      await axios.put(`/api/customers/${encodeURIComponent(customer_name)}`, customer);
      
      // 2. 🌟 BẬT THÔNG BÁO NỔI (TOAST) THÀNH CÔNG
      setShowToast(true);
      console.log("Cập nhật thông tin khách hàng thành công!");
      
      // 3. 🌟 TỰ ĐỘNG TẢI LẠI DỮ LIỆU MỚI VÀ ẨN THÔNG BÁO (GIỮ NGUYÊN TRANG)
      setTimeout(async () => {
        setShowToast(false); // Ẩn thông báo đi sau 1.5 giây
        
        // Gọi lại hàm nạp dữ liệu để cập nhật thông tin mới nhất từ DB lên màn hình
        await fetchData(); 
      }, 1000);

    } catch (error) {
      console.error("Lỗi ghi dữ liệu khách hàng:", error);
      alert("Lỗi khi lưu dữ liệu lên hệ thống: " + error.message);
    }
  };

// 📊 LOGIC TÍNH TOÁN DOANH THU & LỢI NHUẬN CHUẨN (ĐÃ ĐỒNG BỘ BACKEND)
const yearlyStatistics = (() => {
  const statsMap = {};
  const processedOrders = new Set(); // Bộ lọc chống cộng trùng lặp mã đơn hàng

  orderHistory.forEach((order) => {
    if (!order.order_date || !order.order_id) return;

    // Cơ chế chống cộng lặp: Nếu mã đơn đã xử lý rồi thì bỏ qua dòng tiếp theo
    if (processedOrders.has(order.order_id)) return;
    processedOrders.add(order.order_id);

    const year = new Date(order.order_date).getFullYear();
    
    // Doanh thu = net_amount, Lợi nhuận = total_profit (Đã được Backend trả về)
    const revenue = Number(order.net_amount || 0); 
    const profit = Number(order.total_profit || 0); 

    if (!statsMap[year]) {
      statsMap[year] = { year: year, totalRevenue: 0, totalProfit: 0 };
    }
    statsMap[year].totalRevenue += revenue;
    statsMap[year].totalProfit += profit;
  });

  return Object.values(statsMap).sort((a, b) => a.year - b.year);
})();

const tableStatsData = [...yearlyStatistics].reverse();


// 📈 2. EFFECT VẼ BIỂU ĐỒ (Đã chuyển lên trên các lệnh if-return để hết lỗi)
useEffect(() => {
  if (!chartRef.current || yearlyStatistics.length === 0) return;
  if (chartInstance.current) chartInstance.current.destroy();

  const ctx = chartRef.current.getContext('2d');
  chartInstance.current = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: yearlyStatistics.map(item => `Năm ${item.year}`),
      datasets: [
        {
          label: 'Doanh Thu (đ)',
          data: yearlyStatistics.map(item => item.totalRevenue),
          backgroundColor: 'rgba(33, 150, 243, 0.7)',
          borderColor: '#2196F3',
          borderWidth: 1
        },
        {
          label: 'Lợi Nhuận (đ)',
          data: yearlyStatistics.map(item => item.totalProfit),
          backgroundColor: 'rgba(76, 175, 80, 0.7)',
          borderColor: '#4CAF50',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString() + 'đ' } } }
    }
  });

  return () => {
    if (chartInstance.current) chartInstance.current.destroy();
  };
}, [orderHistory, yearlyStatistics]); // Đảm bảo chạy mượt mà khi có dữ liệu đơn hàng


  // Trạng thái giao diện chờ và cảnh báo rỗng
  if (loading) {
    return <div style={{ padding: '30px', textAlign: 'center', fontWeight: 'bold' }}>🔄 Đang đối soát và tải dữ liệu lịch sử khách hàng...</div>;
  }
  if (!customer) {
    return <div style={{ padding: '30px', textAlign: 'center', color: 'red', fontWeight: 'bold' }}>❌ Không tìm thấy khách hàng có tên "{customer_name}" trong hệ thống!</div>;
  }


  
  return (
    <div style={{ padding: '25px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Thanh định hướng quay lại nhanh */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        backgroundColor: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Nút bên trái: Quay lại */}
        <button
          type="button"
          onClick={onBack}
          style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          ⬅️ Quay lại trang trước
        </button>

        <div>
              
              <input type="text" value={customer.customer_name} readOnly style={{ width: '100%',fontSize: '1.1rem' ,  textAlign: 'center',padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 'bold' }} />
            </div>


        {/* Nút bên phải: Lưu thay đổi (Đã chuyển lên trên) */}
        <button 
          type="button"
          onClick={handleUpdateCustomer} // Kích hoạt trực tiếp hàm lưu dữ liệu
          style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 2px 5px rgba(40,167,69,0.2)' }}
        >
          💾 Lưu cập nhật
        </button>
      </div>

{/* KHỐI HAI: BẢNG LỊCH SỬ BÁN HÀNG CHO KHÁCH CHI TIẾT */}
            {/* LỊCH SỬ GIAO DỊCH / DANH SÁCH ĐƠN HÀNG TỔNG CỦA KHÁCH HÀNG */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📤 Lịch sử đơn hàng</h4>
        <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse', textAlign: 'center', borderColor: '#e2e8f0', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}>
              <th>Ngày</th>
              <th>Mã Đơn Hàng</th>
              <th>Tiền Hàng</th>
              <th>Nợ Cũ</th>
              <th>Tổng Thanh Toán</th>
              <th>Khách Trả</th>
              <th>Còn Nợ Lại</th>
              <th>Slice DH</th>
              <th>Ghi Chú</th>
            </tr>
          </thead>
          <tbody>
 {(() => {
   // 1. Xác định vị trí phần tử cuối cùng của trang hiện tại (Ví dụ: Trang 1 là dòng thứ 10)
   const indexOfLastOrder = currentPage * ordersPerPage;
   
   // 2. Xác định vị trí phần tử đầu tiên của trang hiện tại (Ví dụ: Trang 1 là dòng thứ 0)
   const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
   
   // 3. ✂️ CẮT LÁT MẢNG: Chỉ lấy đúng 10 dòng thuộc phạm vi trang đang xem để render ra màn hình
// 2.5. 🌟 SẮP XẾP ĐA TẦNG: Ưu tiên slice = "no" trước, sau đó sắp xếp đơn hàng mới nhất lên đầu
const sortedOrders = [...orderHistory].sort((a, b) => {
  const sliceA = (a.order_slice || '').toLowerCase();
  const sliceB = (b.order_slice || '').toLowerCase();

  // TẦNG 1: So sánh ưu tiên slice = "no"
  if (sliceA === 'no' && sliceB !== 'no') return -1; // Đẩy a lên trước
  if (sliceA !== 'no' && sliceB === 'no') return 1;  // Đẩy b lên trước

  // TẦNG 2: Nếu trạng thái slice giống nhau, so sánh theo ngày (Mới nhất lên đầu)
  const dateA = new Date(a.order_date).getTime();
  const dateB = new Date(b.order_date).getTime();
  
  return dateB - dateA; // Sắp xếp giảm dần theo thời gian (Newest to Oldest)
});

// 3. ✂️ CẮT LÁT MẢNG: Lấy đúng 10 dòng từ mảng ĐÃ SẮP XẾP ĐA TẦNG thuộc phạm vi trang đang xem
const currentOrders = sortedOrders.slice(indexOfFirstOrder, indexOfLastOrder);

   // 4. Trả về giao diện các dòng sau khi đã cắt lát
   return currentOrders.length > 0 ? (
     currentOrders.map((order, idx) => (
       <tr 
         key={idx}
         onClick={() => {
           if (typeof onViewOrderDetail === 'function') onViewOrderDetail(order.order_id);
         }}
         style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
         onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
         onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
         title="Bấm vào bất kỳ đâu trên dòng này để xem chi tiết đơn hàng"
       >
         <td>{new Date(order.order_date).toLocaleDateString('vi-VN')}</td>
         <td style={{ fontWeight: 'bold', color: '#007bff' }}>{order.order_id}</td>
         <td>{Number(order.net_amount || 0).toLocaleString()}đ</td>
         <td>{Number(order.old_debt || 0).toLocaleString()}đ</td>
         <td style={{ fontWeight: 'bold', color: '#2196F3' }}>{Number(order.total_amount || 0).toLocaleString()}đ</td>
         <td style={{ color: '#28a745', fontWeight: 'bold' }}>{Number(order.customer_paid || 0).toLocaleString()}đ</td>
         <td style={{ color: '#f44336', fontWeight: 'bold' }}>{Number(order.current_debt || 0).toLocaleString()}đ</td>
<td style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.notes || 'Không có ghi chú'}>
           {order.order_slice || '-'}
         </td>

         <td style={{ textAlign: 'left', color: '#475569', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.notes || 'Không có ghi chú'}>
           {order.notes || '-'}
         </td>
       </tr>
     ))
   ) : (
     <tr>
       <td colSpan="8" style={{ padding: '15px', color: '#94a3b8', fontStyle: 'italic' }}>
         Khách hàng này chưa phát sinh hóa đơn mua hàng nào.
       </td>
     </tr>
   );
 })()}
</tbody>


        </table>

        {/* 🌟 THANH ĐIỀU KHIỂN PHÂN TRANG ĐỒNG BỘ GIỐNG TRANG DONHANGPAGE */}
 {orderHistory.length > ordersPerPage && (
   <div style={{ 
     display: 'flex', 
     justifyContent: 'center', 
     alignItems: 'center', 
     gap: '15px', 
     marginTop: '15px',
     paddingBottom: '10px'
   }}>
     <button 
       type="button" 
       disabled={currentPage === 1} 
       onClick={() => setCurrentPage(currentPage - 1)} 
       style={{ 
         padding: '6px 14px', 
         cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
         backgroundColor: currentPage === 1 ? '#e2e8f0' : '#fff',
         border: '1px solid #cbd5e1',
         borderRadius: '4px',
         fontWeight: 'bold',
         color: currentPage === 1 ? '#94a3b8' : '#334155',
         transition: 'all 0.2s'
       }}
     >
       ◀ Trước
     </button>
     
     <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>
       Trang {currentPage} / {Math.ceil(orderHistory.length / ordersPerPage)}
     </span>
     
     <button 
       type="button" 
       disabled={currentPage === Math.ceil(orderHistory.length / ordersPerPage)} 
       onClick={() => setCurrentPage(currentPage + 1)} 
       style={{ 
         padding: '6px 14px', 
         cursor: currentPage === Math.ceil(orderHistory.length / ordersPerPage) ? 'not-allowed' : 'pointer',
         backgroundColor: currentPage === Math.ceil(orderHistory.length / ordersPerPage) ? '#e2e8f0' : '#fff',
         border: '1px solid #cbd5e1',
         borderRadius: '4px',
         fontWeight: 'bold',
         color: currentPage === Math.ceil(orderHistory.length / ordersPerPage) ? '#94a3b8' : '#334155',
         transition: 'all 0.2s'
       }}
     >
       Sau ▶
     </button>
   </div>
 )}
      </div>


      {/* KHỐI Form: THÔNG TIN CHI TIẾT & SỬA KHÁCH HÀNG */}
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
          📋Chi tiết khách hàng</h3>
        
        <form onSubmit={handleUpdateCustomer}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            
            <div>
  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
    Tên khách hàng:
  </label>
  {/* 🚀 ĐÃ SỬA: Xóa readOnly, đổi nền sang trắng và thêm thuộc tính onChange */}
  <input 
    type="text" 
    value={customer.customer_name || ''} 
    onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })} 
    style={{
      width: '100%', 
      padding: '8px', 
      border: '1px solid #cbd5e1', 
      borderRadius: '4px',
      backgroundColor: '#fff', // Màu nền trắng để người dùng biết là sửa được
      fontWeight: 'bold' 
    }} 
  />
</div>


             <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
                Mã kh:</label>
              <input type="text" value={customer.customer_id} readOnly style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 'bold' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
                Slice khách hàng:</label>
              <input type="text" value={customer.customer_slice || ''} onChange={(e) => setCustomer({...customer, customer_slice: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>
                Số điện thoại:</label>
              <input type="text" value={customer.phone_number || ''} onChange={(e) => setCustomer({...customer, phone_number: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Địa chỉ:</label>
              <input type="text" value={customer.address || ''} onChange={(e) => setCustomer({...customer, address: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>

          </div>
          {/* 🌟 HỆ THỐNG QUẢN LÝ & CHỌN NHIỀU ẢNH KHÁCH HÀNG CÙNG LÚC */}
          <div style={{ marginTop: '10px', marginBottom: '20px', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
            <strong style={{ display: 'block', marginBottom: '12px', color: '#475569', fontSize: '0.85rem' }}>Hình ảnh khách hàng (Có thể chọn nhiều ảnh):</strong>
            
            {/* Khu vực hiển thị danh sách các ảnh đã chọn (Dạng lưới hàng ngang) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
              {customer.customer_image ? (
                customer.customer_image.split(',').filter(Boolean).map((imgUrl, index) => {
                  return (
                    <div key={index} style={{ position: 'relative', width: '90px', height: '90px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', overflow: 'hidden' }}>
                      <img
                        src={imgUrl}
                        alt={`cust-${index}`}
                        onClick={() => setPreviewImage(imgUrl)} // Ghim link ảnh vào State khi click để xem phóng to
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                        title="Bấm vào để xem ảnh phóng to"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const currentImages = customer.customer_image.split(',').filter(Boolean);
                          const updatedImages = currentImages.filter((_, i) => i !== index);
                          setCustomer({ ...customer, customer_image: updatedImages.join(',') });
                        }}
                        style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                        title="Xóa ảnh này"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              ) : (
                <div style={{ width: '90px', height: '90px', border: '1px solid #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', fontSize: '11px', color: '#94a3b8' }}>Chưa có ảnh</div>
              )}
            </div>

            {/* Khu vực nút chức năng điều khiển chọn tệp file */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="file"
                accept="image/*"
                multiple
                id="upload-multiple-customer-images"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  
                  const formData = new FormData();
                  for (let i = 0; i < files.length; i++) {
                    formData.append('images', files[i]); // Tên trường khớp với upload.array('images') ở server
                  }
                  
                  try {
                    const response = await fetch('/api/upload-images', { method: 'POST', body: formData });
                    const result = await response.json();
                    if (response.ok && result.imageUrls) {
                      const oldImagesStr = customer.customer_image ? customer.customer_image + ',' : '';
                      const newImagesStr = oldImagesStr + result.imageUrls.join(',');
                      setCustomer({ ...customer, customer_image: newImagesStr });
                    } else {
                      alert('Lỗi tải ảnh: ' + (result.message || 'Không xác định'));
                    }
                  } catch (err) {
                    console.error('Lỗi kết nối upload chuỗi ảnh:', err);
                  }
                }}
              />
              <label htmlFor="upload-multiple-customer-images" style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'inline-block', userSelect: 'none' }}>
                📷 Chọn thêm nhiều ảnh
              </label>
              
              {customer.customer_image && (
                <button type="button" onClick={() => setCustomer({ ...customer, customer_image: '' })} style={{ padding: '7px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                  Xóa sạch ảnh
                </button>
              )}
            </div>
          </div>

            </form>
      </div>
      

      {/* 🌟 HỘP THOẠI POP-UP PHÓNG TO XEM CHI TIẾT ẢNH KHÁCH HÀNG */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyYContent: 'center', zIndex: 99999, cursor: 'zoom-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '85%', maxHeight: '85%', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <button type="button" onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '-40px', right: '-10px', backgroundColor: 'transparent', color: '#fff', border: 'none', fontSize: '28px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            <img src={previewImage} alt="Hình ảnh phóng to" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px', display: 'block' }} />
          </div>
        </div>
      )}

      {/* 🌟 GIAO DIỆN THÔNG BÁO NỔI TỰ ĐỘNG BIẾN MẤT (TOAST) */}
      {showToast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#4CAF50', color: 'white', padding: '12px 25px', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', zIndex: 999999, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <span>🎉</span> Cập nhật thông tin thành công! Giao diện sẽ tự đóng...
        </div>
      )}

{/* 🚀 KHỐI THỐNG KÊ TÀI CHÍNH CUỐI TRANG - ĐÃ CẬP NHẬT BIẾN DOANH THU & LỢI NHUẬN CHUẨN */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', marginTop: '25px' }}>
  
  {/* Bên trái: Biểu đồ cột trực quan Chart.js */}
  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', height: '360px' }}>
    <h4 style={{ margin: '0 0 15px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
      📈 Doanh thu & Lợi nhuận qua các năm
    </h4>
    <div style={{ height: '280px', width: '100%' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  </div>

  {/* Bên phải: Bảng số liệu chi tiết qua từng năm */}
  <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
    <h4 style={{ margin: '0 0 15px 0', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
      📊 Chi tiết hiệu quả kinh doanh theo năm
    </h4>
    <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse', textAlign: 'center', borderColor: '#e2e8f0', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}>
          <th>Năm</th>
          <th>Doanh Thu</th>
          <th>Lợi Nhuận</th>
          <th>Tỷ Suất LN</th>
        </tr>
      </thead>
      <tbody>
        {tableStatsData.length > 0 ? (
          tableStatsData.map((stat, idx) => {
            // Tỷ suất lợi nhuận = (Lợi nhuận / Doanh thu) * 100
            const profitMargin = stat.totalRevenue > 0 
              ? ((stat.totalProfit / stat.totalRevenue) * 100).toFixed(1) 
              : 0;

            return (
              <tr key={idx} style={{ transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ fontWeight: 'bold', color: '#334155' }}>Năm {stat.year}</td>
                <td style={{ fontWeight: 'bold', color: '#2196F3' }}>{stat.totalRevenue.toLocaleString()}đ</td>
                <td style={{ fontWeight: 'bold', color: stat.totalProfit >= 0 ? '#4CAF50' : '#E91E63' }}>
                  {stat.totalProfit.toLocaleString()}đ
                </td>
                <td>
                  <span style={{ backgroundColor: profitMargin >= 20 ? '#dcfce7' : '#fee2e2', color: profitMargin >= 20 ? '#15803d' : '#991b1b', padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                    {profitMargin}%
                  </span>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan="4" style={{ padding: '15px', color: '#94a3b8', fontStyle: 'italic' }}>
              Khách hàng này chưa có hóa đơn giao dịch nào phát sinh.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>


    </div>
  );
}

export default ChiTietKhachHangPage;
