import React, { useState } from 'react';
import KhachHangPage from './KhachHangPage'; 
import SanPhamPage from './SanPhamPage'; 
import DonHangPage from './DonHangPage'; 
import NhaCCPage from './NhaCCPage'; // 🌟 Đã sửa đổi code bên trong thành Quản lý Nhà CC
import ChiTietSanPhamPage from './ChiTietSanPhamPage'; 
import ChiTietDonHangPage from './ChiTietDonHangPage'; 
import ChiTietKhachHangPage from './ChiTietKhachHangPage'; 
import NoSliceOrdersPage from './NoSliceOrdersPage'; 
import NhapHangPage from './NhapHangPage';
import ChiTietNhapHangPage from './ChiTietNhapHangPage';
import ChiTietNhaCCPage from './ChiTietNhaCCPage'; // 🌟 Đã sửa đổi code bên trong thành Chi tiết Nhà CC
import SanPhamAlbumPage from './SanPhamAlbumPage';
import OrderDetailList from './OrderDetailList'; // 🌟 ĐÃ THÊM: Import trang xem danh sách đơn con phân trang
import PurchaseOrderDetailList from './PurchaseOrderDetailList'; // ✅ ĐÃ THÊM: Import trang chi tiết dòng đơn nhập
import ThongKePage from './ThongKePage'; // 🌟 ĐÃ THÊM: Import trang thống kê mới

function App() {
  const [currentTab, setCurrentTab] = useState('sanpham');
  const [selectedProductCode, setSelectedProductCode] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [previousTab, setPreviousTab] = useState('sanpham');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  
  // 🌟 ĐỒNG BỘ MỚI: Chuyển đổi trạng thái quản lý sang ID Nhà Cung Cấp
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState(''); // Thay thế cho selectedDistributorName
  // Tự động tải sản phẩm từ MySQL làm kho dữ liệu dùng chung
  React.useEffect(() => {
    fetch('http://localhost:5000/api/products?limit=9999') 
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.data) {
          setProducts(resData.data);
        } else if (Array.isArray(resData)) {
          setProducts(resData);
        }
      })
      .catch(err => console.error("Lỗi nạp sản phẩm dùng chung:", err));
  }, []);

  // Tự động nạp danh sách đơn hàng phục vụ công nợ
  React.useEffect(() => {
    fetch('http://localhost:5000/api/orders?limit=9999') 
      .then(res => res.json())
      .then(resData => {
        if (resData && resData.data) {
          setOrders(resData.data);
        } else if (Array.isArray(resData)) {
          setOrders(resData);
        }
      })
      .catch(err => console.error("Lỗi nạp đơn hàng dùng chung:", err));
  }, [currentTab]);

  // 🌟 CHÈN THÊM ĐOẠN CODE NÀY ĐỂ TỰ ĐỘNG TẢI DANH SÁCH KHÁCH HÀNG TỪ MYSQL
React.useEffect(() => {
  fetch('http://localhost:5000/api/customers?limit=9999') // Đường dẫn API lấy khách hàng của bạn
    .then(res => res.json())
    .then(resData => {
      if (resData && resData.data) {
        setCustomers(resData.data);
      } else if (Array.isArray(resData)) {
        setCustomers(resData);
      }
    })
    .catch(err => console.error("Lỗi nạp khách hàng dùng chung:", err));
}, []); // Chạy 1 lần duy nhất khi ứng dụng khởi chạy

  // Các hàm hỗ trợ chuyển đổi màn hình xem chi tiết
  const viewProductDetail = (productCode) => {
    setPreviousTab(currentTab); 
    setSelectedProductCode(productCode);
    setCurrentTab('chitiet_sanpham');
  };

  const viewOrderDetail = (orderId) => {
    setPreviousTab(currentTab);
    setSelectedOrderId(orderId);
    setCurrentTab('chitiet_donhang'); 
  };

  const viewCustomerDetail = (customerName) => {
    setPreviousTab(currentTab); 
    setSelectedCustomerName(customerName);
    setCurrentTab('chitiet_khachhang'); 
  };


  // Thiết kế giao diện thanh Menu Tab
  const buttonStyle = (tabName) => ({
    padding: '5px 5px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: 'none',
    borderBottom: currentTab === tabName ? '4px solid #2196F3' : '4px solid transparent',
    backgroundColor: currentTab === tabName ? '#eef5ff' : 'transparent',
    color: currentTab === tabName ? '#2196F3' : '#555',
    transition: 'all 0.3s ease',
    marginRight: '5px'
  });
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
     {/* 1. THANH MENU ĐIỀU HƯỚNG CỦA PHẦN MỀM */}
<div style={{ 
  display: 'flex', 
  backgroundColor: '#f8f9fa', 
  borderBottom: '1px solid #ddd', 
  padding: '5px 5px',
  // 🔥 KHỐI LỆNH GIÚP MENU ĐỘNG DÍNH TRÊN ĐỈNH KHI CUỘN CHUỘT:
  position: 'sticky',
  top: 0,
  zIndex: 9999, // Đảm bảo thanh menu luôn nằm đè lên nội dung và bảng dữ liệu bên dưới
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' // Đổ bóng nhẹ phía dưới nhìn cho chuyên nghiệp
}}>
  <button style={buttonStyle('sanpham')} onClick={() => setCurrentTab('sanpham')}>📦 Sản Phẩm</button>
  <button style={buttonStyle('album_sanpham')} onClick={() => setCurrentTab('album_sanpham')}>🖼️ Album Ảnh</button>

  <button style={buttonStyle('khachhang')} onClick={() => setCurrentTab('khachhang')}>👥 Khách Hàng</button>
  <button style={buttonStyle('nhacc')} onClick={() => setCurrentTab('nhacc')}>🚚 Nhà Cung Cấp</button>
  <button style={buttonStyle('donhang')} onClick={() => setCurrentTab('donhang')}>📝 Đơn Hàng</button>
  <button style={buttonStyle('donhang_nocat')} onClick={() => setCurrentTab('donhang_nocat')}>🚫 Công nợ</button>
  <button style={buttonStyle('nhaphang')} onClick={() => setCurrentTab('nhaphang')}>🚚 Nhập Hàng</button>
<button style={buttonStyle('danhsach_doncon')} onClick={() => setCurrentTab('danhsach_doncon')}>📊 ĐHCT</button>
<button style={buttonStyle('danhsach_nhapcon')} onClick={() => setCurrentTab('danhsach_nhapcon')}>📥NHCT</button>
<button style={buttonStyle('thongke')} onClick={() => setCurrentTab('thongke')}>📈 Thống Kê</button>

        {/* Các thanh Tab phụ hiển thị tạm thời khi xem chi tiết */}
        {currentTab === 'chitiet_nhaphang' && (
          <button style={buttonStyle('chitiet_nhaphang')}>{selectedPurchaseId}</button>
        )}
        {currentTab === 'chitiet_nhacc' && (
          <button style={buttonStyle('chitiet_nhacc')}> {selectedSupplierId}</button>
        )}
        {currentTab === 'chitiet_sanpham' && (
          <button style={buttonStyle('chitiet_sanpham')}>ℹ{selectedProductCode}</button>
        )}
        {currentTab === 'chitiet_donhang' && (
          <button style={buttonStyle('chitiet_donhang')}> {selectedOrderId}</button>
        )}
        {currentTab === 'chitiet_khachhang' && (
          <button style={buttonStyle('chitiet_khachhang')}>{selectedCustomerName}</button>
        )}



      </div>
      {/* 2. KHU VỰC HIỂN THỊ NỘI DUNG CỦA TAB ĐƯỢC CHỌN */}
      <div style={{ marginTop: '10px' }}>
        {currentTab === 'sanpham' && <SanPhamPage onViewDetail={viewProductDetail} />}
       {currentTab === 'album_sanpham' && <SanPhamAlbumPage onViewDetail={viewProductDetail} />}
  
        {currentTab === 'khachhang' && <KhachHangPage onViewDetail={viewCustomerDetail} />}
        
        {/* 🌟 ĐÃ SỬA ĐỔI: Nhận khóa chính supplier_id gửi từ trang danh mục NhaCCPage */}
        {currentTab === 'nhacc' && (
          <NhaCCPage
            onViewDetail={(supplierId) => {
              setPreviousTab('nhacc'); 
              setSelectedSupplierId(supplierId); // Ghim mã số nhà cung cấp dạng chuỗi/số vào State
              setCurrentTab('chitiet_nhacc'); 
            }}
          />
        )}

        {currentTab === 'donhang' && (
          <DonHangPage 
          onViewDetail={viewCustomerDetail} 
      onSelectOrder={viewOrderDetail}
           />
        )}
        
        {currentTab === 'donhang_nocat' && (
          <NoSliceOrdersPage 
          orders={orders} 
          customers={customers}
          onSelectOrder={viewOrderDetail}
          onViewCustomerDetail={viewCustomerDetail} />
        )}

        {/* TÌM ĐOẠN HIỂN THỊ nhaphang TẠI TRANG 4 FILE APP.JS VÀ THAY BẰNG KHỐI NÀY: */}
{currentTab === 'nhaphang' && (
  <NhapHangPage 
    onSelectOrder={(purchaseId) => {
      setPreviousTab('nhaphang');
      setSelectedPurchaseId(purchaseId);
      setCurrentTab('chitiet_nhaphang');
    }}
    onViewSupplierDetail={(supplierId) => {
      // ✨ CẬP NHẬT: Bảo vệ dữ liệu, nếu click bị lỗi dòng trống thì lấy giá trị dự phòng hoặc cảnh báo
      if (!supplierId) {
        alert("Dòng đơn hàng này chưa được đồng bộ mã số nhà cung cấp (supplier_id) dưới cơ sở dữ liệu!");
        return;
      }
      setPreviousTab('nhaphang');
      setSelectedSupplierId(String(supplierId).trim()); // Ép sang chuỗi sạch để API đón nhận chuẩn 100%
      setCurrentTab('chitiet_nhacc');
    }}    
  />

)}

{currentTab === 'danhsach_doncon'  && (
          <OrderDetailList
          onViewDetail={viewCustomerDetail} 
      onSelectOrder={viewOrderDetail}
      onViewProductDetail={viewProductDetail}
           />
        )}
{/* ✅ ĐÃ THÊM: Khối hiển thị dữ liệu trang chi tiết vật tư nhập kho */}
{currentTab === 'danhsach_nhapcon' && (
  <PurchaseOrderDetailList
  onViewProductDetail={viewProductDetail}
   />
)}


        {currentTab === 'chitiet_nhaphang' && (
          <ChiTietNhapHangPage
            purchaseId={selectedPurchaseId}
            products={products} 
            onBack={() => setCurrentTab(previousTab || 'nhaphang')} 
            onViewDetail={(productCode) => {
              setSelectedProductCode(productCode); 
              setPreviousTab('chitiet_nhaphang'); 
              setCurrentTab('chitiet_sanpham'); 
            }}
          />
        )}

{/* Chèn thêm khối điều kiện này: */}
{currentTab === 'thongke' && <ThongKePage />}

        {currentTab === 'chitiet_sanpham' && (
          <ChiTietSanPhamPage productCodeFromParent={selectedProductCode} 
          onBack={() => setCurrentTab(previousTab)}
          onViewOrderDetail={(orderId) => viewOrderDetail(orderId)}
    onViewPurchaseDetail={(purchaseId) => {
      setPreviousTab('chitiet_sanpham'); // Lưu lại trang cũ để khi bấm nút "Quay lại" sẽ nhảy về đúng trang sản phẩm này
      setSelectedPurchaseId(purchaseId);
      setCurrentTab('chitiet_nhaphang');
    }}
          />
        )}

        {currentTab === 'chitiet_donhang' && (
          <ChiTietDonHangPage orderId={selectedOrderId} 
          onBack={() => setCurrentTab(previousTab || 'donhang')} 
          onViewDetail={viewProductDetail} 
          onViewCustomerDetail={viewCustomerDetail} products={products} customers={customers} />
        )}

        {currentTab === 'chitiet_khachhang' && (
          <ChiTietKhachHangPage customerNameFromParent={selectedCustomerName} onBack={() => setCurrentTab(previousTab)} onViewOrderDetail={viewOrderDetail} />
        )}

        {/* 🌟 ĐÃ SỬA ĐỔI: Đồng bộ truyền dữ liệu mã ID sang trang đối soát ChiTietNhaCCPage */}
        {currentTab === 'chitiet_nhacc' && (
          <ChiTietNhaCCPage
            supplierIdFromParent={selectedSupplierId} // Truyền mã định danh khóa chính mới
            onBack={() => setCurrentTab(previousTab || 'nhacc')} 
            onViewOrderDetail={(purchaseId) => {
              setPreviousTab('chitiet_nhacc'); 
              setSelectedPurchaseId(purchaseId); 
              setCurrentTab('chitiet_nhaphang'); 
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
