import React, { useState, useEffect } from 'react';

function SanPhamAlbumPage(props) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [filterSlice, setFilterSlice] = useState('');
  const [availableSlices, setAvailableSlices] = useState([]);
  const [availableSpecs, setAvailableSpecs] = useState([]);
  const [limit, setLimit] = useState(20); // Mặc định hiển thị lưới 20 ảnh/trang
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
const [previewImage, setPreviewImage] = useState(null); // Lưu url ảnh đang muốn phóng to

  // 1. Hàm tải danh sách sản phẩm khớp 100% cấu trúc dữ liệu Backend của bạn
  const fetchProducts = async (page = 1, currentSearch = search, currentLimit = limit) => {
    try {
      const url = `/api/products?page=${page}&limit=${currentLimit}` +
        `&search=${encodeURIComponent(currentSearch)}` +
        `&filterSlice=${encodeURIComponent(filterSlice)}` +
        `&filterSpec=${encodeURIComponent(filterSpec)}` +
        `&sortBy=product_code&sortOrder=ASC`;

      const res = await fetch(url);
      if (!res.ok) return;
      const resultData = await res.json();

      if (resultData && resultData.data && Array.isArray(resultData.data)) {
        setProducts(resultData.data);
        setPagination({
          currentPage: resultData.pagination.currentPage || 1,
          totalPages: resultData.pagination.totalPages || 1,
          totalItems: resultData.pagination.totalItems || 0
        });
      } else if (Array.isArray(resultData)) {
        setProducts(resultData);
        setPagination(prev => ({ ...prev, totalItems: resultData.length }));
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu album:", err);
    }
  };

  // 2. Tự động tải lại lưới ảnh khi đổi số lượng dòng hiển thị hoặc bộ lọc
  useEffect(() => {
    fetchProducts(1, searchTerm, limit);
  }, [limit, filterSlice, filterSpec]);

  // 3. Tải danh mục lọc Slice và Quy cách động từ phpMyAdmin
  useEffect(() => {
    fetch('/api/product-slices').then(res => res.json()).then(data => setAvailableSlices(data || []));
    fetch('/api/product-specifications').then(res => res.json()).then(data => setAvailableSpecs(data || []));
  }, []);

  // 4. Xử lý gõ chữ tìm kiếm nhanh tự động sau 400ms chống nghẽn mạng
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearch(searchTerm);
      fetchProducts(1, searchTerm);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleRowClick = (product) => {
    if (props.onViewDetail) {
      props.onViewDetail(product.product_code);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>🖼️ BỘ SƯU TẬP ALBUM ẢNH SẢN PHẨM</h2>

      {/* THANH CÔNG CỤ: TÌM KIẾM VÀ BỘ LỌC ĐỒNG BỘ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div>
          <strong>Tìm kiếm: </strong>
          <input
            type="text"
            placeholder="Tìm mã hoặc tên sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '250px' }}
          />
        </div>

        <div>
          <strong>Lọc Slice: </strong>
          <select value={filterSlice} onChange={(e) => setFilterSlice(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
            <option value="">-- Tất cả sỉ/lẻ --</option>
            {availableSlices.map((slice, idx) => (
              <option key={idx} value={slice}>{String(slice).toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div>
          <strong>Qui cách: </strong>
          <select value={filterSpec} onChange={(e) => setFilterSpec(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
            <option value="">-- Tất cả qui cách --</option>
            {availableSpecs.map((spec, idx) => (
              <option key={idx} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        <span style={{ backgroundColor: '#e7f5ff', color: '#007bff', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', marginLeft: 'auto' }}>
          📊 Tổng số: {pagination.totalItems} Sản Phẩm
        </span>
      </div>

      {/* LƯỚI ALBUM SMART CARD RESPONSIVE */}
{/* LƯỚI ALBUM SMART CARD RESPONSIVE */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '25px' }}>
        {products.map(p => {
          const tonKhoThucTe = p.total_imported - p.total_exported;
          const firstImageCover = p.product_image ? p.product_image.split(',')[0] : '';

          return (
            <div
              key={p.product_code}
              onClick={() => handleRowClick(p)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              {/* KHỐI HIỂN THỊ ẢNH GỐC */}
              <div style={{ width: '100%', height: '180px', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {firstImageCover ? (
  <img 
    src={firstImageCover} 
    alt={p.product_name} 
    onClick={(e) => {
      e.stopPropagation(); // Ngăn kích hoạt sự kiện handleRowClick của thẻ cha
      setPreviewImage(firstImageCover); // Mở ảnh phóng to
    }} 
    style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'zoom-in' }} 
  />
) : (
  <div style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>⚠️ Không có ảnh</div>
)}
              </div>

              {/* KHỐI THÔNG TIN SẢN PHẨM */}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#007bff' }}>{p.product_code}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.product_name}>
                  {p.product_name}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                  <span>Giá lẻ: <strong style={{ color: '#ef4444' }}>{Number(p.retail_price).toLocaleString()}đ</strong></span>
                  <span>Slice: <strong>{p.product_slice || '--'}</strong></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
  <span>Quy cách: <strong>{Number(p.specification || 0).toFixed(2)}</strong></span>
  {/* 🌟 BỔ SUNG .toFixed(2) CHO BIẾN tonKhoThucTe ĐỂ ĐỒNG BỘ 2 SỐ THẬP PHÂN */}
  <span>Tồn: <strong style={{ color: tonKhoThucTe < 5 ? '#ef4444' : '#10b981' }}>{Number(tonKhoThucTe || 0).toFixed(2)}</strong></span>
</div>

              </div>
            </div>
          );
        })}
      </div>

      {/* THANH PHÂN TRANG DƯỚI ĐÁY */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
        <button disabled={pagination.currentPage === 1} onClick={() => fetchProducts(pagination.currentPage - 1)} style={{ padding: '6px 12px', cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>◀ Trước</button>
        <span style={{ fontSize: '14px' }}> Trang <strong>{pagination.currentPage}</strong> / {pagination.totalPages} </span>
        <button disabled={pagination.currentPage === pagination.totalPages} onClick={() => fetchProducts(pagination.currentPage + 1)} style={{ padding: '6px 12px', cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>Sau ▶</button>
      </div>

{/* --- POPUP PHÓNG TO ẢNH TOÀN MÀN HÌNH --- */}
{previewImage && (
  <div 
    onClick={() => setPreviewImage(null)} // Bấm ra ngoài vùng tối để đóng
    style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99999,
      cursor: 'zoom-out'
    }}
  >
    {/* Nút X đóng góc trên bên phải */}
    <span 
      onClick={() => setPreviewImage(null)}
      style={{
        position: 'absolute',
        top: '20px', right: '30px',
        color: '#fff', fontSize: '40px',
        fontWeight: 'bold', cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      &times;
    </span>

    {/* Thẻ hiển thị ảnh lớn */}
    <img 
      src={previewImage} 
      alt="Preview" 
      onClick={(e) => e.stopPropagation()} // Bấm vào chính giữa ảnh không bị đóng
      style={{
        maxWidth: '90%',
        maxHeight: '90%',
        objectFit: 'contain',
        borderRadius: '4px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }} 
    />
  </div>
)}


    </div>
  );
}

export default SanPhamAlbumPage;

