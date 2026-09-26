import React, { useState, useMemo } from 'react';

const ProductSearchInput = ({ products = [], onSelectProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  // 🌟 KHẮC PHỤC LỖI: Tự động đồng bộ từ khóa hiển thị dựa trên sản phẩm thực tế của dòng
  useEffect(() => {
    // Nếu dòng sản phẩm truyền từ popup cha xuống trống trơn (mở popup mới tinh)
    if (!item || !item.product_code) {
      setSearchTerm(''); // Ép ô chữ tìm kiếm phải trống trơn theo
    } else {
      // Nếu có sản phẩm cũ truyền vào (ví dụ trường hợp bấm nút Sửa dòng), hiển thị đúng tên của nó
      const currentProd = products.find(p => p.product_code === item.product_code);
      setSearchTerm(currentProd ? currentProd.product_name : '');
    }
  }, [item?.product_code, products]); // Theo dõi chặt chẽ mã sản phẩm truyền từ cha xuống


  // 1. Logic lọc sản phẩm thông minh dựa trên từ khóa người dùng gõ
  const filteredProducts = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return [];
    // 🌟 THAY ĐỔI: Chỉ hiện danh sách gợi ý nếu chữ người dùng gõ KHÔNG phải tên sản phẩm có sẵn
    const currentProd = item?.product_code ? products.find(p => p.product_code === item.product_code) : null;
    if (currentProd && currentProd.product_name.toLowerCase() === term) return [];

    
    return products.filter(p =>
      (p.product_code && p.product_code.toLowerCase().includes(term)) ||
      (p.product_name && p.product_name.toLowerCase().includes(term))
    );
  }, [searchTerm, products]);

  // 2. Logic xử lý khi click chuột chọn một dòng sản phẩm trong dropdown
  const handleSelect = (prod) => {
    onSelectProduct(prod); // Đẩy dữ liệu sản phẩm được chọn ngược lên popup cha
    setSearchTerm(prod.product_name);   // Xóa từ khóa tìm kiếm để tự động đóng dropdown giống Đơn hàng
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b' }}>
        🔍 Tìm sản phẩm nhanh (Mã hoặc Tên):
      </label>
      <input
        type="text"
        placeholder="Gõ mã hoặc tên để tìm..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ 
          width: '100%', 
          padding: '8px', 
          marginTop: '4px', 
          border: '2px solid #2563eb', 
          borderRadius: '6px', 
          boxSizing: 'border-box' 
        }}
      />

      {/* DROPDOWN HIỂN THỊ DANH SÁCH GỢI Ý XỔ XUỐNG */}
      {filteredProducts.length > 0 && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          width: '100%', 
          backgroundColor: '#fff', 
          border: '1px solid #cbd5e1', 
          borderRadius: '6px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
          zIndex: 10000, 
          maxHeight: '200px', 
          overflowY: 'auto', 
          marginTop: '4px' 
        }}>
          {filteredProducts.map((prod) => (
            <div
              key={prod.product_code}
              onClick={() => handleSelect(prod)}
              style={{ 
                padding: '8px 12px', 
                cursor: 'pointer', 
                borderBottom: '1px solid #f1f5f9', 
                transition: 'background 0.2s', 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.9rem' 
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            >
              <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{prod.product_code}</span>
              <span style={{ color: '#334155', flex: 1, marginLeft: '10px' }}>{prod.product_name}</span>
              <span style={{ color: '#10b981', fontWeight: '500' }}>
                {Number(prod.import_price || prod.price || prod.base_price || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSearchInput;
