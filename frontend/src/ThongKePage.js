import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

function ThongKePage() {
  const currentYear = new Date().getFullYear();
  
  // 1. Khai báo các State quản lý bộ lọc và dữ liệu
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  
  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [customerData, setCustomerData] = useState([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [customerLoading, setCustomerLoading] = useState(true);

  // Đảm bảo 4 dòng này có mặt ở nửa trên file, ngay trong hàm ThongKePage()
const [supplierData, setSupplierData] = useState([]);
const [supplierPage, setSupplierPage] = useState(1);
const [totalSupplierPages, setTotalSupplierPages] = useState(1);
const [supplierLoading, setSupplierLoading] = useState(true);
const [overallCost, setOverallCost] = useState(0);

// 🚀 KHAI BÁO ĐỘC LẬP: Quản lý bảng thống kê sản phẩm
const [productStatsData, setProductStatsData] = useState([]);
const [productPage, setProductPage] = useState(1);
const [totalProductPages, setTotalProductPages] = useState(1);
const [productLoading, setProductLoading] = useState(true);
const [productSearch, setProductSearch] = useState(''); // Ô tìm kiếm sản phẩm nếu cần

const [totalInventoryValue, setTotalInventoryValue] = useState(0);

  
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // 2. Tự động gọi API lấy dữ liệu đồ thị mỗi khi đổi Tháng/Năm
  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/stats/revenue-profit?month=${selectedMonth}&year=${selectedYear}`)
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.data) setStatsData(resData.data);
        else setStatsData([]);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải dữ liệu thống kê:", err);
        setStatsData([]);
        setLoading(false);
      });
      
    // Reset về trang 1 cho bảng đối tác khi đổi bộ lọc thời gian
    setCustomerPage(1);
  }, [selectedMonth, selectedYear]);

  // 3. Tự động gọi API lấy danh sách khách hàng khi đổi bộ lọc hoặc chuyển trang
  // 3. Tự động gọi API lấy danh sách khách hàng (Đã đồng bộ chạy theo mốc thời gian dropdown)
// 🌟 TÌM VÀ SỬA LẠI ĐƯỜNG DẪN FETCH TRONG USEEFFECT SỐ 3:
useEffect(() => {
  setCustomerLoading(true);
  
  // Hãy chắc chắn đường dẫn viết chuẩn xác là 'customers' chứ không viết tắt
  fetch(`http://localhost:5000/api/stats/customers?month=${selectedMonth}&year=${selectedYear}&page=${customerPage}&limit=15`)
    .then(res => res.json())
    .then(resData => {
      if (resData && resData.data) {
        setCustomerData(resData.data);
        setTotalPages(resData.pagination.totalPages || 1);
      } else if (Array.isArray(resData)) {
        setCustomerData(resData);
      } else {
        setCustomerData([]);
      }
      setCustomerLoading(false);
    })
    .catch(err => {
      console.error("Lỗi tải thống kê khách hàng:", err);
      setCustomerData([]);
      setCustomerLoading(false);
    });
}, [selectedMonth, selectedYear, customerPage]);

// 🌟 TÌM VÀ THAY THẾ TOÀN BỘ HÀM GỌI API NHÀ CUNG CẤP CŨ BẰNG ĐOẠN NÀY:
useEffect(() => {
  setSupplierLoading(true);
  
  fetch(`http://localhost:5000/api/stats/suppliers?month=${selectedMonth}&year=${selectedYear}&page=${supplierPage}&limit=15`)
    .then(res => res.json())
    .then(resData => {
      // Bóc tách thuộc tính .data từ cấu trúc { success: true, data: [...] } của Backend
      if (resData && resData.data) {
        setSupplierData(resData.data);
        setTotalSupplierPages(resData.pagination.totalPages || 1);
        // 🌟 THÊM DÒNG NÀY ĐỂ LƯU TỔNG CHI PHÍ TỪ BACKEND
        setOverallCost(Number(resData.overallCost) || 0); 
      } else if (Array.isArray(resData)) {
        setSupplierData(resData);
        setOverallCost(0); // Reset nếu dữ liệu lỗi
      } else {
        setSupplierData([]);
        setOverallCost(0);
      }
      setSupplierLoading(false); // 🌟 QUAN TRỌNG: Tắt trạng thái Loading để hiển thị bảng
    })
    .catch(err => {
      console.error("Lỗi tải thống kê nhà cung cấp:", err);
      setSupplierData([]);
      setOverallCost(0);
      setSupplierLoading(false); // Tắt loading kể cả khi gặp lỗi để không bị treo giao diện
    });
}, [selectedMonth, selectedYear, supplierPage]);


// 🚀 GỌI API ĐỘC LẬP: Lấy danh sách sản phẩm bán chạy/nhập nhiều trọn đời
useEffect(() => {
  setProductLoading(true);
  fetch(`http://localhost:5000/api/stats/products-summary?page=${productPage}&limit=15&search=${encodeURIComponent(productSearch)}`)
    .then(res => res.json())
    .then(resData => {
      if (resData && resData.data) {
        setProductStatsData(resData.data);
        setTotalProductPages(resData.pagination.totalPages || 1);
        // 🚀 THÊM DÒNG NÀY: Cập nhật tổng giá trị kho hàng
        setTotalInventoryValue(resData.totalInventoryValue || 0);
      } else {
        setProductStatsData([]);
        setTotalInventoryValue(0);
      }
      setProductLoading(false);
    })
    .catch(err => {
      console.error("Lỗi tải thống kê sản phẩm:", err);
      setProductStatsData([]);
      setProductLoading(false);
    });
}, [productPage, productSearch]);

  // 4. Khởi tạo và vẽ đồ thị đường Chart.js
  useEffect(() => {
    if (loading || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: statsData.map(item => item.date),
        datasets: [
          {
            label: 'Doanh thu (đ)',
            data: statsData.map(item => Number(item.revenue) || 0),
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.05)',
            tension: 0.15,
            fill: true
          },
          {
            label: 'Lợi nhuận (đ)',
            data: statsData.map(item => Number(item.profit) || 0),
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.05)',
            tension: 0.15,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [statsData, loading]);

  // 5. Cộng tổng số tiền để đưa lên thẻ KPI lớn
  const totalRevenue = statsData.reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
  const totalProfit = statsData.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
const totalCost = supplierData.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);
  // Tạo mảng tạo danh sách năm tự động lùi về 2024
  const yearsList = [];
  for (let y = currentYear; y >= 2024; y--) { yearsList.push(y.toString()); }
  return (
    <div style={{ padding: '25px', backgroundColor: '#fdfdfd', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* THANH ĐIỀU HƯỚNG BỘ LỌC THỜI GIAN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          📊 Báo Cáo Doanh Thu & Lợi Nhuận
        </h2>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginRight: '5px' }}>Tháng:</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}>
              <option value="">Cả Năm</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginRight: '5px' }}>Năm:</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}>
              {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>
      
      {/* THẺ TỔNG HỢP KPI */}
      <div style={{ display: 'flex', gap: '25px', marginBottom: '25px' }}>
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.04)', borderLeft: '6px solid #2196F3' }}>
          <div style={{ color: '#7f8c8d', fontSize: '13px', fontWeight: 'bold' }}>
            TỔNG DOANH THU</div>

          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2196F3', marginTop: '6px' }}>
            {totalRevenue.toLocaleString('vi-VN')} đ</div>
        </div>

        {/* 🌟 Ô TỔNG CHI PHÍ (MỚI THÊM) */}
  <div style={{ flex: 1, padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.04)', borderLeft: '6px solid #E91E63' }}>
    <div style={{ color: '#7f8c8d', fontSize: '13px', fontWeight: 'bold' }}>
        TỔNG CHI PHÍ NHẬP
        </div>
    <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#E91E63', marginTop: '6px' }}>
      {overallCost.toLocaleString('vi-VN')} đ
    </div>
  </div>

        <div style={{ flex: 1, padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.04)', borderLeft: '6px solid #4CAF50' }}>
          <div style={{ color: '#7f8c8d', fontSize: '13px', fontWeight: 'bold' }}>
            TỔNG LỢI NHUẬN</div>

          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#4CAF50', marginTop: '6px' }}>{totalProfit.toLocaleString('vi-VN')} đ</div>
        </div>
      </div>

      {/* KHUNG BIỂU ĐỒ TRỰC QUAN */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.04)', height: '350px', position: 'relative', marginBottom: '30px' }}>
        {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#666' }}>Đang tính toán dữ liệu...</div>}
        <canvas ref={chartRef}></canvas>
      </div>

      {/* KHUNG LIỆT KÊ THỐNG KÊ KHÁCH HÀNG */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '18px' }}>🏆 Bảng Xếp Hạng Doanh Thu Khách Hàng</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', color: '#495057' }}>Khách hàng</th>
              <th style={{ padding: '12px', color: '#495057' }}>Số đơn con</th>
              <th style={{ padding: '12px', color: '#495057', textAlign: 'right' }}>Tổng Doanh Thu</th>
              <th style={{ padding: '12px', color: '#495057', textAlign: 'right' }}>Tổng Lợi Nhuận</th>
            </tr>
          </thead>
          <tbody>
            {customerLoading ? (
              <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Đang nạp danh sách đối tác...</td></tr>
            ) : customerData.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Không có dữ liệu mua hàng.</td></tr>
            ) : (
              customerData.map((cust, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fdfdfd' }}>
                  <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{cust.customer || 'Khách vãng lai'}</td>
                  <td style={{ padding: '12px', color: '#666' }}>{cust.total_orders} đơn</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#2196F3' }}>{(Number(cust.total_revenue) || 0).toLocaleString('vi-VN')} đ</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: cust.total_profit >= 0 ? '#4CAF50' : '#E91E63' }}>
                    {(Number(cust.total_profit) || 0).toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* DIỀU HƯỚNG PHÂN TRANG BUTTONS */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px', alignItems: 'center' }}>
            <button 
              disabled={customerPage === 1} 
              onClick={() => setCustomerPage(prev => prev - 1)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: customerPage === 1 ? '#f5f5f5' : '#fff', cursor: customerPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              ◀ Trang trước
            </button>
            <span style={{ fontSize: '14px', color: '#555' }}>Trang {customerPage} / {totalPages}</span>
            <button 
              disabled={customerPage === totalPages} 
              onClick={() => setCustomerPage(prev => prev + 1)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: customerPage === totalPages ? '#f5f5f5' : '#fff', cursor: customerPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Trang sau ▶
            </button>
          </div>
        )}
      </div>

      {/* 🏭 KHUNG LIỆT KÊ THỐNG KÊ NHÀ CUNG CẤP (XẾP THEO TIỀN NHẬP) */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.04)', marginTop: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '18px' }}>🏆 Bảng Xếp Hạng Nhà Cung Cấp Theo Tiền Nhập</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', color: '#495057' }}>Nhà cung cấp</th>
              <th style={{ padding: '12px', color: '#495057' }}>Số đơn con</th>
              <th style={{ padding: '12px', color: '#495057', textAlign: 'right' }}>Tổng Tiền Nhập (Giá vốn)</th>
            </tr>
          </thead>
          <tbody>
            {supplierLoading ? (
              <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Đang nạp danh sách nhà cung cấp...</td></tr>
            ) : supplierData.length === 0 ? (
              <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Không có dữ liệu giao dịch nhà cung cấp.</td></tr>
            ) : (
              supplierData.map((sup, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fdfdfd' }}>
                  <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{sup.supplier}</td>
                  <td style={{ padding: '12px', color: '#666' }}>{sup.total_orders} đơn</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#E91E63' }}>
                    {(Number(sup.total_cost) || 0).toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

                {/* DIỀU HƯỚNG PHÂN TRANG NHÀ CUNG CẤP - ĐÃ SỬA BIẾN */}
        {totalSupplierPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px', alignItems: 'center' }}>
            <button 
              disabled={supplierPage === 1} 
              onClick={() => setSupplierPage(prev => prev - 1)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: supplierPage === 1 ? '#f5f5f5' : '#fff', cursor: supplierPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              ◀ Trước
            </button>
            <span style={{ fontSize: '14px', color: '#555' }}>Trang {supplierPage} / {totalSupplierPages}</span>
            <button 
              disabled={supplierPage === totalSupplierPages} 
              onClick={() => setSupplierPage(prev => prev + 1)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: supplierPage === totalSupplierPages ? '#f5f5f5' : '#fff', cursor: supplierPage === totalSupplierPages ? 'not-allowed' : 'pointer' }}
            >
              Sau ▶
            </button>
          </div>
        )}

      </div>

  {/* 🚀 KHỐI MỚI ĐỘC LẬP: BẢNG THỐNG KÊ SẢN PHẨM TRỌN ĐỜI */}
  <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.04)', marginTop: '30px' }}>
   
    {/* 🚀 ĐÃ SỬA: Bọc chống lỗi định dạng số cho ô tổng giá trị kho hàng */}
    <div style={{ padding: '15px 20px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '6px solid #6366f1', marginBottom: '20px', maxWidth: '350px' }}>
      <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
        TỔNG GIÁ TRỊ KHO HÀNG HIỆN TẠI</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1', marginTop: '4px' }}>
        {productLoading ? '---' : (Number(totalInventoryValue) || 0).toLocaleString('vi-VN')} đ
      </div>
    </div>


    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>
        📦 Bảng Thống Kê Sản Phẩm</h3>
      
      {/* Thanh tìm kiếm sản phẩm nhanh */}
      <input 
        type="text" 
        placeholder="Tìm tên sản phẩm..." 
        value={productSearch}
        onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', width: '220px' }}
      />
    </div>

    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          <th style={{ padding: '12px', color: '#495057' }}>Tên Sản Phẩm</th>
          <th style={{ padding: '12px', color: '#495057', textAlign: 'center' }}>Nhập hàng</th>
          <th style={{ padding: '12px', color: '#495057', textAlign: 'right' }}>Doanh Thu </th>
          <th style={{ padding: '12px', color: '#495057', textAlign: 'right' }}>Lợi Nhuận</th>
        </tr>
      </thead>
      <tbody>
        {productLoading ? (
          <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Đang tổng hợp dữ liệu sản phẩm...</td></tr>
        ) : productStatsData.length === 0 ? (
          <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Không có dữ liệu sản phẩm nào.</td></tr>
        ) : (
          productStatsData.map((prod, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fff' : '#fdfdfd' }}>
              <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{prod.product_name}</td>
{/* 🚀 ĐÃ SỬA: Hiển thị tiền tệ đ định dạng vi-VN cho cột Chi Phí Nhập Hàng thay cho số lượng */}
          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#E91E63' }}>
            {(Number(prod.total_cost) || 0).toLocaleString('vi-VN')} đ
          </td>              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#2196F3' }}>
                {(Number(prod.total_revenue) || 0).toLocaleString('vi-VN')} đ
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: prod.total_profit >= 0 ? '#4CAF50' : '#E91E63' }}>
                {(Number(prod.total_profit) || 0).toLocaleString('vi-VN')} đ
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>

    {/* Phân trang độc lập cho bảng sản phẩm */}
    {totalProductPages > 1 && (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px', alignItems: 'center' }}>
        <button disabled={productPage === 1} onClick={() => setProductPage(prev => prev - 1)} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: productPage === 1 ? '#f5f5f5' : '#fff', cursor: productPage === 1 ? 'not-allowed' : 'pointer' }}>◀ Trước</button>
        <span style={{ fontSize: '14px', color: '#555' }}>Trang {productPage} / {totalProductPages}</span>
        <button disabled={productPage === totalProductPages} onClick={() => setProductPage(prev => prev + 1)} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: productPage === totalProductPages ? '#f5f5f5' : '#fff', cursor: productPage === totalProductPages ? 'not-allowed' : 'pointer' }}>Sau ▶</button>
      </div>
    )}
  </div>



    </div>
  );
}

export default ThongKePage;
