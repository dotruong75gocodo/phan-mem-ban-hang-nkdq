import React, { useState, useEffect, useRef } from 'react'; // 🚀 Thêm useRef vào đây
import axios from 'axios';
import Chart from 'chart.js/auto'; // 🚀 Nhập thư viện Chart.js đã có sẵn trong dự án


function ChiTietNhaCCPage({ supplierIdFromParent, onBack, onViewOrderDetail }) {
  const supplier_id = supplierIdFromParent;
  
  const [supplier, setSupplier] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const chartRef = useRef(null);
const chartInstance = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      const supRes = await axios.get(`/api/suppliers/${encodeURIComponent(supplier_id)}`);
      if (supRes.data) {
        setSupplier(supRes.data);
      }
      const orderRes = await axios.get(`/api/suppliers/${encodeURIComponent(supplier_id)}/orders`);
      setOrderHistory(orderRes.data || []);
    } catch (error) {
      console.error("Lỗi hệ thống khi tải dữ liệu đối soát nhà cung cấp:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supplier_id) {
      fetchData();
    }
  }, [supplier_id]);
  const handleUpdateSupplier = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      await axios.put(`/api/suppliers/${encodeURIComponent(supplier_id)}`, supplier);
      setShowToast(true);
      setTimeout(async () => {
        setShowToast(false);
        await fetchData();
      }, 1000);
    } catch (error) {
      console.error("Lỗi ghi dữ liệu nhà cung cấp:", error);
      alert("Lỗi khi lưu dữ liệu lên hệ thống: " + error.message);
    }
  };

// 📊 1. LOGIC XỬ LÝ GỘP TỔNG GIÁ TRỊ NHẬP HÀNG THEO TỪNG NĂM
const yearlyImportStatistics = (() => {
  const statsMap = {};
  
  // Duyệt qua lịch sử đơn nhập hàng (orderHistory) của nhà cung cấp này
  orderHistory.forEach((order) => {
    if (!order.purchase_date) return;
    
    // Trích xuất năm tài chính từ ngày lập hóa đơn nhập
    const year = new Date(order.purchase_date).getFullYear();
    
    // Tổng tiền nhập hàng của hóa đơn đó
    const amount = Number(order.total_amount || 0);

    if (!statsMap[year]) {
      statsMap[year] = { year: year, totalImportValue: 0 };
    }
    statsMap[year].totalImportValue += amount;
  });

  // Sắp xếp năm tăng dần (Từ cũ đến mới) để vẽ biểu đồ theo dòng thời gian chuẩn
  return Object.values(statsMap).sort((a, b) => a.year - b.year);
})();

// Mảng đảo ngược để hiển thị bảng số liệu (Năm mới nhất nhảy lên đầu bảng)
const tableStatsData = [...yearlyImportStatistics].reverse();

// 📈 2. EFFECT TỰ ĐỘNG KHỞI TẠO VÀ CẬP NHẬT BIỂU ĐỒ CHART.JS
useEffect(() => {
  // Nếu chưa có thẻ canvas hoặc không có dữ liệu nhập hàng thì bỏ qua
  if (!chartRef.current || yearlyImportStatistics.length === 0) return;
  
  // Hủy biểu đồ cũ nếu đã tồn tại để chống lỗi trùng lặp đè bộ nhớ
  if (chartInstance.current) chartInstance.current.destroy();

  const ctx = chartRef.current.getContext('2d');
  chartInstance.current = new Chart(ctx, {
    type: 'bar', // Sử dụng biểu đồ cột để hiển thị giá trị nhập theo năm trực quan nhất
    data: {
      labels: yearlyImportStatistics.map(item => `Năm ${item.year}`),
      datasets: [
        {
          label: 'Tổng Giá Trị Nhập Hàng (đ)',
          data: yearlyImportStatistics.map(item => item.totalImportValue),
          backgroundColor: 'rgba(230, 81, 0, 0.7)', // Màu cam đồng bộ với tone màu Nhà CC của bạn (#e65100)
          borderColor: '#e65100',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { weight: 'bold' } } }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { callback: (value) => value.toLocaleString() + 'đ' } // Định dạng dấu phẩy tiền tệ
        }
      }
    }
  });

  // Dọn dẹp khi đóng trang hoặc chuyển nhà cung cấp khác
  return () => {
    if (chartInstance.current) chartInstance.current.destroy();
  };
}, [orderHistory, yearlyImportStatistics]); // Tự động cập nhật mượt mà khi dữ liệu đơn nhập thay đổi


  if (loading) {
  return (
    <div style={{ padding: '30px', textAlign: 'center', fontWeight: 'bold' }}>
      🔄 Đang đối soát và tải dữ liệu lịch sử nhà cung cấp...
    </div>
  );
}

// ✨ SỬA CHÍ MẠNG: Nếu chưa có ID hoặc API chưa trả về kết quả, hiển thị khung chờ thay vì sập trang
if (!supplier || !supplier_id) {
  return (
    <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'Arial' }}>
      <p style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>
        ⚠️ Hệ thống chưa nhận diện được Mã số Nhà cung cấp (supplier_id)!
      </p>
      <p style={{ color: '#64748b', fontSize: '13px' }}>
        Vui lòng kiểm tra lại liên kết dữ liệu hoặc bấm nút quay lại bên dưới.
      </p>
      <button type="button" onClick={onBack} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
        ⬅️ Quay lại trang lịch sử
      </button>
    </div>
  );
}
  return (
    <div style={{ padding: '25px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button type="button" onClick={onBack} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ⬅️ Quay lại trang trước
        </button>
        <button type="button" onClick={handleUpdateSupplier} style={{ backgroundColor: '#e65100', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 2px 5px rgba(230,81,0,0.2)' }}>
          💾 Lưu cập nhật thay đổi
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>📋 Bảng thông tin chi tiết & Sửa nhà cung cấp</h3>
        <form onSubmit={handleUpdateSupplier}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Mã nhà cung cấp:</label>
              <input type="text" value={supplier.supplier_id} readOnly style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 'bold' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Tên nhà cung cấp:</label>
              <input type="text" value={supplier.supplier_name || ''} onChange={(e) => setSupplier({...supplier, supplier_name: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Phân đoạn hàng nhập:</label>
              <input type="text" value={supplier.supplier_slice || ''} onChange={(e) => setSupplier({...supplier, supplier_slice: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Số điện thoại liên hệ:</label>
              <input type="text" value={supplier.phone_number || ''} onChange={(e) => setSupplier({...supplier, phone_number: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div style={{ gridColumn: '1 / span 2' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Địa chỉ kho:</label>
              <input type="text" value={supplier.address || ''} onChange={(e) => setSupplier({...supplier, address: e.target.value})} style={{ width: '99%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ marginTop: '10px', marginBottom: '20px', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
            <strong style={{ display: 'block', marginBottom: '12px', color: '#475569', fontSize: '0.85rem' }}>Hình ảnh hóa đơn / Chứng từ nhập kho Nhà CC:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
              {supplier.supplier_image ? (
                supplier.supplier_image.split(',').filter(Boolean).map((imgUrl, index) => (
                  <div key={index} style={{ position: 'relative', width: '90px', height: '90px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', overflow: 'hidden' }}>
                    <img src={imgUrl} alt={`sup-${index}`} onClick={() => setPreviewImage(imgUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} title="Bấm vào để xem ảnh phóng to" />
                    <button type="button" onClick={() => {
                      const currentImages = supplier.supplier_image.split(',').filter(Boolean);
                      const updatedImages = currentImages.filter((_, i) => i !== index);
                      setSupplier({ ...supplier, supplier_image: updatedImages.join(',') });
                    }} style={{ position: 'absolute', top: '-2px', right: '2px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
                  </div>
                ))
              ) : (
                <div style={{ width: '90px', height: '90px', border: '1px solid #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', fontSize: '11px', color: '#94a3b8' }}>Chưa có ảnh</div>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="file" accept="image/*" multiple id="upload-multiple-supplier-images" style={{ display: 'none' }} onChange={async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) { formData.append('images', files[i]); }
                try {
                  const response = await fetch('/api/upload-images', { method: 'POST', body: formData });
                  const result = await response.json();
                  if (response.ok && result.imageUrls) {
                    const oldImagesStr = supplier.supplier_image ? supplier.supplier_image + ',' : '';
                    setSupplier({ ...supplier, supplier_image: oldImagesStr + result.imageUrls.join(',') });
                  } else { alert('Lỗi tải ảnh: ' + (result.message || 'Không xác định')); }
                } catch (err) { console.error('Lỗi kết nối upload ảnh:', err); }
              }} />
              <label htmlFor="upload-multiple-supplier-images" style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'inline-block', userSelect: 'none' }}>
                📷 Chọn thêm nhiều ảnh
              </label>
              {supplier.supplier_image && (
                <button type="button" onClick={() => setSupplier({ ...supplier, supplier_image: '' })} style={{ padding: '7px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Xóa sạch ảnh</button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#e65100', display: 'flex', alignItems: 'center', gap: '6px' }}>📤 Lịch sử giao dịch (Danh sách đơn nhập hàng tổng)</h4>
        <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse', textAlign: 'center', borderColor: '#e2e8f0', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#fff3e0', color: '#e65100' }}>
              <th>Ngày Lập Đơn</th>
              <th>Mã Đơn Nhập</th>
              <th>Nhà Cung Cấp</th>
              <th>Tổng Tiền Nhập</th>
              <th>Ghi Chú Đơn</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const indexOfLastOrder = currentPage * ordersPerPage;
              const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
              const currentOrders = orderHistory.slice(indexOfFirstOrder, indexOfLastOrder);
              return currentOrders.length > 0 ? (
                currentOrders.map((order, idx) => (
                  <tr key={idx} onClick={() => { if (typeof onViewOrderDetail === 'function') onViewOrderDetail(order.purchase_id); }} style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff3e0'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td>{order.purchase_date ? new Date(order.purchase_date).toLocaleDateString('vi-VN') : '---'}</td>
                    <td style={{ fontWeight: 'bold', color: '#e65100' }}>{order.purchase_id}</td>
                    <td>{order.supplier_name || supplier.supplier_name}</td>
                    <td style={{ fontWeight: 'bold', color: '#dc2626' }}>{Number(order.total_amount || 0).toLocaleString()}đ</td>
                    <td style={{ textAlign: 'left', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.notes || 'Không có ghi chú'}>{order.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" style={{ padding: '15px', color: '#94a3b8', fontStyle: 'italic' }}>Nhà cung cấp này chưa phát sinh đơn nhập hàng nào.</td></tr>
              );
            })()}
          </tbody>
        </table>
        {orderHistory.length > ordersPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px', paddingBottom: '10px' }}>
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} style={{ padding: '6px 14px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', backgroundColor: currentPage === 1 ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', color: currentPage === 1 ? '#94a3b8' : '#334155' }}>◀ Trước</button>
            <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.9rem' }}>Trang {currentPage} / {Math.ceil(orderHistory.length / ordersPerPage)}</span>
            <button type="button" disabled={currentPage === Math.ceil(orderHistory.length / ordersPerPage)} onClick={() => setCurrentPage(currentPage + 1)} style={{ padding: '6px 14px', cursor: currentPage === Math.ceil(orderHistory.length / ordersPerPage) ? 'not-allowed' : 'pointer', backgroundColor: currentPage === Math.ceil(orderHistory.length / ordersPerPage) ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', color: currentPage === Math.ceil(orderHistory.length / ordersPerPage) ? '#94a3b8' : '#334155' }}>Sau ▶</button>
          </div>
        )}
      </div>

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, cursor: 'zoom-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '85%', maxHeight: '85%', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <button type="button" onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '-40px', right: '-10px', backgroundColor: 'transparent', color: '#fff', border: 'none', fontSize: '28px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            <img src={previewImage} alt="Phóng to" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px', display: 'block' }} />
          </div>
        </div>
      )}

      {showToast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#e65100', color: 'white', padding: '12px 25px', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', zIndex: 999999, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <span>🎉</span> Cập nhật thông tin thành công! Giao diện sẽ tự đóng...
        </div>
      )}

  {/* 🚀 KHỐI MỚI: BIỂU ĐỒ & BẢNG THỐNG KÊ GIÁ TRỊ NHẬP HÀNG CUỐN CHIẾU THEO NĂM (ĐẶT CUỐI TRANG) */}
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', marginTop: '25px' }}>
    
    {/* Cột trái: Đồ thị trực quan cột đứng */}
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', height: '360px' }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#e65100', display: 'flex', alignItems: 'center', gap: '6px' }}>
        📈 Biểu đồ xu hướng giá trị nhập hàng qua các năm
      </h4>
      <div style={{ height: '280px', width: '100%' }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>

    {/* Cột phải: Bảng liệt kê chi tiết số liệu */}
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#b23c00', display: 'flex', alignItems: 'center', gap: '6px' }}>
        📊 Bảng tổng hợp giá trị nhập kho theo năm
      </h4>
      <table width="100%" border="1" cellPadding="10" style={{ borderCollapse: 'collapse', textAlign: 'center', borderColor: '#e2e8f0', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#fff3e0', color: '#e65100' }}>
            <th>Năm Tài Chính</th>
            <th>Tổng Giá Trị Nhập Kho</th>
            <th>Trạng Thái Giao Dịch</th>
          </tr>
        </thead>
        <tbody>
          {tableStatsData.length > 0 ? (
            tableStatsData.map((stat, idx) => (
              <tr key={idx} style={{ transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff3e0'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ fontWeight: 'bold', color: '#334155' }}>Năm {stat.year}</td>
                <td style={{ fontWeight: 'bold', color: '#dc2626' }}>
                  {stat.totalImportValue.toLocaleString()}đ
                </td>
                <td>
                  <span style={{ backgroundColor: '#fff3e0', color: '#e65100', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                    Đã đối soát ✔
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" style={{ padding: '15px', color: '#94a3b8', fontStyle: 'italic' }}>
                Nhà cung cấp này chưa phát sinh hóa đơn nhập kho nào để lập thống kê.
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

export default ChiTietNhaCCPage;
