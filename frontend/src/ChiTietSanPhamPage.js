import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TextareaAutosize from 'react-textarea-autosize';

// Sửa lại hàm để nhận biến 'productCodeFromParent' và 'onBack' trực tiếp từ App.js
function ChiTietSanPhamPage({ productCodeFromParent, onBack, onViewOrderDetail, onViewPurchaseDetail }) {
  const product_code = productCodeFromParent; // Lấy mã sản phẩm từ App.js thay vì dùng useParams

  // Khởi tạo các State lưu trữ dữ liệu liên kết
  const [product, setProduct] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // 🌟 BỔ SUNG STATE QUẢN LÝ PHÂN TRANG CHO 2 BẢNG RIÊNG BIỆT
  const [currentImportPage, setCurrentImportPage] = useState(1);
  const [currentExportPage, setCurrentExportPage] = useState(1);
  const itemsPerPage = 10; // Định mức hiển thị cố định 10 dòng mỗi trang
  // Gọi API đồng bộ từ MySQL khi người dùng vừa truy cập vào trang
  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Tải thông tin cấu hình gốc của sản phẩm từ MySQL
      const prodRes = await axios.get(`/api/products/${product_code}`);
      if (prodRes.data) {
        if (Array.isArray(prodRes.data)) {
          setProduct(prodRes.data[0]); // Lấy phần tử đầu tiên nếu Backend trả về mảng
        } else {
          setProduct(prodRes.data); // Lấy trực tiếp nếu Backend trả về object
        }
      }
      // 2. Tải lịch sử xuất hàng (Chi tiết các hóa đơn chứa sản phẩm này)
      const exportRes = await axios.get(`/api/products/${product_code}/export-history`);
      setExportHistory(exportRes.data || []);

      // 3. Tải lịch sử nhập hàng (Từ các nhà phân phối)
      const importRes = await axios.get(`/api/products/${product_code}/import-history`);
      setImportHistory(importRes.data || []);
    } catch (error) {
      console.error("Lỗi hệ thống khi tải dữ liệu đối soát:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 🌟 Reset lại trang về 1 khi mã sản phẩm thay đổi
    setCurrentImportPage(1);
    setCurrentExportPage(1);
  }, [product_code]);

  // Hàm xử lý gửi yêu cầu cập nhật thông tin sản phẩm về Backend
  // ✅ CODE MỚI: LƯU XONG Ở LẠI CHÍNH TRANG ĐÓ
const handleUpdateProduct = async (e) => {
  e.preventDefault();
  try {
    await axios.put(`/api/products/${product_code}`, product);
    setShowToast(true); // Hiện thông báo "Cập nhật thành công"
    console.log("Cập nhật sản phẩm thành công!");
    
    setTimeout(() => {
      setShowToast(false); // 🌟 Sau 1 giây chỉ ẩn thông báo đi, hoàn toàn KHÔNG chuyển trang nữa
    }, 1000);

  } catch (error) {
    console.error("Lỗi ghi dữ liệu:", error);
    alert("Lỗi khi lưu dữ liệu lên hệ thống: " + error.message);
  }
};

  if (loading) {
    return <div style={{ padding: '30px', textAlign: 'center', fontWeight: 'bold' }}>🔄 Đang đối soát và tải dữ liệu lịch sử sản phẩm...</div>;
  }

  if (!product) {
    return <div style={{ padding: '30px', textAlign: 'center', color: 'red', fontWeight: 'bold' }}>❌ Không tìm thấy sản phẩm có mã "{product_code}" trong hệ thống!</div>;
  }
  return (
    <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
  {/* Thanh định hướng quay lại nhanh - Đã thêm flex để đưa 2 nút lên cùng một hàng */}
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '10px' 
  }}>
    
    {/* Nút Quay lại bên trái */}
    <button
      onClick={onBack}
      style={{
        backgroundColor: '#3b82f6', // Bạn có thể đổi lại màu #64748b nếu thích màu xám cũ
        color: '#fff', border: 'none', padding: '10px 18px',
        borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'
      }}
    >
      ⬅️ Quay lại trang truoc
    </button>

    {/* Nút Lưu bên phải (Đã bỏ div bọc ngoài không cần thiết) */}
    <button 
       type="button"
       onClick={handleUpdateProduct} 
      style={{ 
        backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '10px 24px', 
        borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem',
        display: 'flex', alignItems: 'center', gap: '5px'
      }}
    >
      💾 Lưu cập nhật thay đổi
    </button>
    
  </div>

      

      {/* KHỐI Form: THÔNG TIN CHI TIẾT & SỬA SẢN PHẨM */}
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>📋 Bảng thông tin chi tiết & Sửa sản phẩm</h3>
        <form onSubmit={handleUpdateProduct}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Mã SP:</label>
              <input type="text" value={product.product_code} readOnly style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 'bold' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Tên Sản phẩm:</label>
              <input type="text" value={product.product_name} onChange={(e) => setProduct({ ...product, product_name: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Slice SP:</label>
              <input type="text" value={product.product_slice || ''} onChange={(e) => setProduct({ ...product, product_slice: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Giá Gốc:</label>
              <input type="number" value={product.base_price} onChange={(e) => setProduct({ ...product, base_price: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Giá Sỉ:</label>
              <input type="number" value={product.wholesale_price} onChange={(e) => setProduct({ ...product, wholesale_price: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Giá Lẻ:</label>
              <input type="number" value={product.retail_price} onChange={(e) => setProduct({ ...product, retail_price: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Giá Lạng:</label>
              <input type="number" value={product.weight_price} onChange={(e) => setProduct({ ...product, weight_price: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Quy Cách:</label>
              <input type="number" value={product.specification} onChange={(e) => setProduct({ ...product, specification: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Tỷ Trọng (Density):</label>
              <input type="number" value={product.density || 0} onChange={(e) => setProduct({ ...product, density: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div>
  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Tổng Nhập:</label>
  <input 
    type="number" 
    value={product.total_imported || 0} 
    // 🌟 ĐÃ SỬA: Khóa ô nhập (disabled) để Trigger tự tính, ngăn chặn việc sửa tay
    disabled 
    style={{ 
      width: '100%', 
      padding: '8px', 
      border: '1px solid #cbd5e1', 
      borderRadius: '4px', 
      boxSizing: 'border-box',
      backgroundColor: '#f1f5f9', // Nền xám báo hiệu ô chỉ đọc
      color: '#475569',
      fontWeight: 'bold'
    }} 
  />
</div>

            <div>
  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Tổng Xuất:</label>
  <input 
    type="number" 
    value={product.total_exported || 0} 
    // 🌟 ĐÃ SỬA: Khóa ô nhập (disabled) vì số này do Trigger tự tính từ lịch sử đơn hàng
    disabled 
    style={{ 
      width: '100%', 
      padding: '8px', 
      border: '1px solid #cbd5e1', 
      borderRadius: '4px', 
      boxSizing: 'border-box',
      backgroundColor: '#f1f5f9', // Đổi nền xám cho người dùng biết là ô khóa
      color: '#475569' 
    }} 
  />
</div>

            <div>
  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Tồn Kho:</label>
  <input 
    type="text" 
    // 🌟 ĐÃ SỬA: Bốc trực tiếp giá trị từ cột TonKho trong Database, làm tròn lấy 2 chữ số thập phân
    value={Number(product.TonKho || 0).toFixed(2)} 
    disabled 
    style={{ 
      width: '100%', 
      padding: '8px', 
      border: '1px solid #cbd5e1', 
      borderRadius: '4px', 
      boxSizing: 'border-box', 
      backgroundColor: '#f1f5f9', 
      // 🌟 ĐÃ SỬA: Tự động đổi màu chữ dựa theo số TonKho thật (Dưới 0 hoặc dưới mức cảnh báo thì báo đỏ, ngược lại báo xanh)
      color: Number(product.TonKho || 0) < 0 ? '#ef4444' : '#16a34a', 
      fontWeight: 'bold' 
    }} 
  />
</div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Giá Mét (Tự động tính):</label>
              <input type="text" value={Number(product.specification) > 0 ? `${Math.round(Number(product.GiaMet || 0)).toLocaleString()} đ` : '0 đ'} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: '#f1f5f9', color: '#1e40af', fontWeight: 'bold' }} />
            </div>

{/* ✅ ĐOẠN CODE ĐÃ SỬA CHUẨN */}
<div>
  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>ĐV tính:</label>
  <input type="text" value={product.dv_tinh || ''}
    onChange={(e) => setProduct({ ...product, dv_tinh: e.target.value })} 
    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
</div>

<div style={{ gridColumn: 'span 3' }}> 
  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569' }}>Ghi chú:</label>
  <TextareaAutosize 
    value={product.ghi_chu || ''}
    onChange={(e) => setProduct({ ...product, ghi_chu: e.target.value })}
    minRows={3} // Số dòng tối thiểu khi ô trống
    spellCheck="false" 
    style={{ 
      width: '100%', 
      padding: '8px', 
      border: '1px solid #cbd5e1', 
      borderRadius: '4px',
      boxSizing: 'border-box',
      resize: 'none', // 🌟 Khóa chức năng kéo tay vì ô đã tự co dãn tự động
      fontFamily: 'Arial, sans-serif',
      fontSize: '0.95rem',
      lineHeight: '1.5'
    }} 
  />
</div>





          </div>
          <div style={{ marginTop: '10px', marginBottom: '20px', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
            <strong style={{ display: 'block', marginBottom: '12px', color: '#475569', fontSize: '0.85rem' }}>Hình ảnh sản phẩm (Có thể chọn nhiều ảnh):</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
              {product.product_image ? (
                product.product_image.split(',').filter(Boolean).map((imgUrl, index) => {
                  const fullSrc = imgUrl.startsWith('http') || imgUrl.startsWith('/') ? `http://localhost:5000${imgUrl}` : imgUrl;
                  return (
                    <div key={index} style={{ position: 'relative', width: '90px', height: '90px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', overflow: 'hidden' }}>
                      <img src={fullSrc} alt={`sp-${index}`} onClick={() => setPreviewImage(fullSrc)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} title="Bấm vào để xem ảnh phóng to" />
                      <button
                        type="button"
                        onClick={() => {
                          const currentImages = product.product_image.split(',').filter(Boolean);
                          const updatedImages = currentImages.filter((_, i) => i !== index);
                          setProduct({ ...product, product_image: updatedImages.join(',') });
                        }}
                        style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                        title="Xóa ảnh này"
                      >✕</button>
                    </div>
                  );
                })
              ) : (
                <div style={{ width: '90px', height: '90px', border: '1px solid #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', fontSize: '11px', color: '#94a3b8' }}>Chưa có ảnh</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="file" accept="image/*" multiple id="upload-multiple-images-input" style={{ display: 'none' }}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  const formData = new FormData();
                  for (let i = 0; i < files.length; i++) { formData.append('images', files[i]); }
                  try {
                    const response = await fetch('http://localhost:5000/api/upload-images', { method: 'POST', body: formData });
                    const result = await response.json();
                    if (response.ok && result.imageUrls) {
                      const oldImagesStr = product.product_image ? product.product_image + ',' : '';
                      const newImagesStr = oldImagesStr + result.imageUrls.join(',');
                      setProduct({ ...product, product_image: newImagesStr });
                    } else { alert('Lỗi tải ảnh: ' + (result.message || 'Không xác định')); }
                  } catch (err) { console.error('Lỗi kết nối upload chuỗi ảnh:', err); }
                }}
              />
              <label htmlFor="upload-multiple-images-input" style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'inline-block', userSelect: 'none' }}>📷 Chọn thêm nhiều ảnh</label>
              {product.product_image && (
                <button type="button" onClick={() => setProduct({ ...product, product_image: '' })} style={{ padding: '7px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Xóa sạch ảnh</button>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button type="submit" style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}>
              💾 Lưu cập nhật thay đổi</button>
          </div>
        </form>
      </div>
      {/* BỐ CỤC HAI CỘT: LIÊN KẾT NHẬP HÀNG & XUẤT HÀNG CHI TIẾT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
        
        {/* BẢNG 1: LỊCH SỬ NHẬP HÀNG (ĐÃ THÊM PHÂN TRANG) */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: '0 0 15px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📥 Lịch sử nhập hàng</h4>



            <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse', textAlign: 'center', borderColor: '#e2e8f0', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>
                  <th>Ngày</th>
                  <th>Nhà CC</th>
                  <th>Số Lượng</th>
                  <th>Giá Nhập</th>
                  <th>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const indexOfLastImport = currentImportPage * itemsPerPage;
                  const indexOfFirstImport = indexOfLastImport - itemsPerPage;
                  const currentImports = importHistory.slice(indexOfFirstImport, indexOfLastImport);

                  return currentImports.length > 0 ? (
                    currentImports.map((imp, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          if (typeof onViewPurchaseDetail === 'function') { onViewPurchaseDetail(imp.import_id); }
                          else { window.location.href = `/don-hang-nhap?id=${imp.import_id}`; }
                        }}
                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td>{new Date(imp.import_date).toLocaleDateString('vi-VN')}</td>
                        <td>{imp.supplier_name}</td>
                        <td>{Number(imp.quantity).toLocaleString()}</td>
                        <td>{Number(imp.price).toLocaleString()}đ</td>
                        <td style={{ fontWeight: 'bold' }}>{Number(imp.total_amount).toLocaleString()}đ</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" style={{ padding: '15px', color: '#94a3b8', fontStyle: 'italic' }}>Chưa có dữ liệu lịch sử nhập kho vật lý cho SP này.</td></tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
          {/* 🌟 ĐIỀU KHIỂN PHÂN TRANG BẢNG NHẬP HÀNG */}
          {importHistory.length > itemsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', paddingBottom: '5px' }}>
              <button type="button" disabled={currentImportPage === 1} onClick={() => setCurrentImportPage(currentImportPage - 1)} style={{ padding: '5px 12px', cursor: currentImportPage === 1 ? 'not-allowed' : 'pointer', backgroundColor: currentImportPage === 1 ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', color: currentImportPage === 1 ? '#94a3b8' : '#334155' }}>◀ Trước</button>
              <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.85rem' }}>Trang {currentImportPage} / {Math.ceil(importHistory.length / itemsPerPage)}</span>
              <button type="button" disabled={currentImportPage === Math.ceil(importHistory.length / itemsPerPage)} onClick={() => setCurrentImportPage(currentImportPage + 1)} style={{ padding: '5px 12px', cursor: currentImportPage === Math.ceil(importHistory.length / itemsPerPage) ? 'not-allowed' : 'pointer', backgroundColor: currentImportPage === Math.ceil(importHistory.length / itemsPerPage) ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', color: currentImportPage === Math.ceil(importHistory.length / itemsPerPage) ? '#94a3b8' : '#334155' }}>Sau ▶</button>
            </div>
          )}
        </div>

        {/* BẢNG 2: LỊCH SỬ XUẤT HÀNG / BÁN HÀNG */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: '0 0 15px 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>📤 Lịch sử bán hàng</h4>
            <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: 'collapse', textAlign: 'center', borderColor: '#e2e8f0', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}>
                  <th>Ngày</th>
                  <th>Khách Hàng</th>
                  <th>Kích Thước</th>
                  <th>SLqd</th>
                  <th>Giá</th>
                  <th>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const indexOfLastExport = currentExportPage * itemsPerPage;
                  const indexOfFirstExport = indexOfLastExport - itemsPerPage;
                  const currentExports = exportHistory.slice(indexOfFirstExport, indexOfLastExport);

                  return currentExports.length > 0 ? (
                    currentExports.map((exp, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          if (typeof onViewOrderDetail === 'function') { onViewOrderDetail(exp.order_id); }
                          else { window.location.href = `/don-hang?id=${exp.order_id}`; }
                        }}
                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td>{new Date(exp.order_date).toLocaleDateString('vi-VN')}</td>
                        <td>{exp.customer_name}</td>
                        <td>{exp.length_mm ? Number(exp.length_mm) : 0} x {exp.width_value ? Number(exp.width_value) : 0}</td>
<td>{exp.converted_quantity && !isNaN(exp.converted_quantity) ? Number(exp.converted_quantity).toLocaleString() : '-'}</td>

                        <td>{Number(exp.price).toLocaleString()}đ</td>
                        <td style={{ fontWeight: 'bold', color: '#010e09' }}>{Number(exp.total_amount).toLocaleString()}đ</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" style={{ padding: '15px', color: '#94a3b8', fontStyle: 'italic' }}>Sản phẩm này chưa được xuất bán cho đơn hàng nào.</td></tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
          {/* 🌟 ĐIỀU KHIỂN PHÂN TRANG BẢNG BÁN HÀNG */}
          {exportHistory.length > itemsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', paddingBottom: '5px' }}>
              <button type="button" disabled={currentExportPage === 1} onClick={() => setCurrentExportPage(currentExportPage - 1)} style={{ padding: '5px 12px', cursor: currentExportPage === 1 ? 'not-allowed' : 'pointer', backgroundColor: currentExportPage === 1 ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', color: currentExportPage === 1 ? '#94a3b8' : '#334155' }}>◀ Trước</button>
              <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.85rem' }}>Trang {currentExportPage} / {Math.ceil(exportHistory.length / itemsPerPage)}</span>
              <button type="button" disabled={currentExportPage === Math.ceil(exportHistory.length / itemsPerPage)} onClick={() => setCurrentExportPage(currentExportPage + 1)} style={{ padding: '5px 12px', cursor: currentExportPage === Math.ceil(exportHistory.length / itemsPerPage) ? 'not-allowed' : 'pointer', backgroundColor: currentExportPage === Math.ceil(exportHistory.length / itemsPerPage) ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 'bold', color: currentExportPage === Math.ceil(exportHistory.length / itemsPerPage) ? '#94a3b8' : '#334155' }}>Sau ▶</button>
            </div>
          )}
        </div>
      </div>
      {/* POP-UP PHÓNG TO XEM CHI TIẾT ẢNH SẢN PHẨM */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, cursor: 'zoom-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '85%', maxHeight: '85%', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <button type="button" onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '-40px', right: '-10px', backgroundColor: 'transparent', color: '#fff', border: 'none', fontSize: '28px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            <img src={previewImage} alt="Hình ảnh phóng to" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px', display: 'block' }} />
          </div>
        </div>
      )}

      {/* GIAO DIỆN THÔNG BÁO NỔI TOAST */}
      {showToast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#4CAF50', color: 'white', padding: '12px 25px', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', zIndex: 999999, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <span>🎉</span> Cập nhật thông tin thành công! Giao diện sẽ tự đóng...
        </div>
      )}
    </div>
  );
}

export default ChiTietSanPhamPage;
