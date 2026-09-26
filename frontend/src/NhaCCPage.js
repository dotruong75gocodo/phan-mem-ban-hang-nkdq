import React, { useState, useEffect } from 'react';

function NhaCCPage({ onViewDetail }) {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [limit, setLimit] = useState(20);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState('add');
  
  const [form, setForm] = useState({
    supplier_id: '', 
    supplier_name: '',
    supplier_slice: '',
    address: '',
    phone_number: '',
    supplier_image: '' 
  });

  const fetchSuppliers = async (page = 1, currentSearch = search, currentLimit = limit) => {
    try {
      const url = `/api/suppliers?page=${page}&limit=${currentLimit}&search=${encodeURIComponent(currentSearch)}`;
      const res = await fetch(url);
      if (!res.ok) return console.error(`Server báo lỗi: ${res.status}`);
      const resultData = await res.json();
      if (resultData && resultData.data) {
        setSuppliers(resultData.data);
        setPagination({
          currentPage: resultData.pagination.currentPage,
          totalPages: resultData.pagination.totalPages,
           totalItems: resultData.pagination.totalItems 
        });
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.error("Lỗi kết nối mạng Nhà CC:", err);
    }
  };
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearch(searchTerm);
      fetchSuppliers(1, searchTerm, limit);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    fetchSuppliers(1, search, limit);
  }, [limit]);

  useEffect(() => {
    const handlePlatformKeys = (event) => {
      if (event.key === 'Escape') setIsFormOpen(false);
      if (event.key === 'Enter') {
        if (document.activeElement.tagName === 'TEXTAREA') return;
        event.preventDefault();
        const activeForm = document.querySelector('form');
        if (activeForm) activeForm.requestSubmit();
      }
    };
    if (isFormOpen) window.addEventListener('keydown', handlePlatformKeys);
    return () => window.removeEventListener('keydown', handlePlatformKeys);
  }, [isFormOpen, form]);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };
  const handleImageChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    try {
      const res = await fetch('/api/upload-images', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        const currentImages = form.supplier_image ? form.supplier_image.split(',') : [];
        const updatedImages = [...currentImages, ...data.imageUrls].join(',');
        setForm(prev => ({ ...prev, supplier_image: updatedImages }));
      } else {
        alert(data.message || 'Lỗi upload ảnh!');
      }
    } catch (err) {
      console.error("Lỗi gửi file ảnh:", err);
    }
  };

  const handleOpenAddForm = () => {
    setForm({ supplier_id: '', supplier_name: '', supplier_slice: '', address: '', phone_number: '', supplier_image: '' });
    setFormType('add');
    setIsFormOpen(true);
  };

  const handleRowClick = (supplier) => {
    if (typeof onViewDetail === 'function') {
      onViewDetail(supplier.supplier_id);
    }
  };
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchSuppliers(pagination.currentPage, search, limit);
      } else {
        alert('Không thể thêm, Mã số hoặc Tên nhà cung cấp có thể đã tồn tại!');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/suppliers/${encodeURIComponent(form.supplier_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchSuppliers(pagination.currentPage, search, limit);
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>DANH MỤC QUẢN LÝ NHÀ CUNG CẤP</h2>
      
      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '8px', width: '700px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '2px solid #e65100' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#e65100' }}>{formType === 'add' ? "➕ Thêm nhà cung cấp mới" : "📝 Bảng thông tin chi tiết & Sửa Nhà CC"}</h3>
              <button type="button" onClick={() => setIsFormOpen(false)} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>❌</button>
            </div>
            
            <form onSubmit={formType === 'add' ? handleCreateSupplier : handleUpdateSupplier}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  Mã Nhà Cung Cấp: 
                  <input name="supplier_id" value={form.supplier_id} onChange={handleInputChange} style={{ width: '95%', padding: '6px', marginTop: '5px' }} disabled={formType === 'edit'} required placeholder="Ví dụ: NCC01" />
                </div>
                <div>
                  Tên Nhà Cung Cấp: 
                  <input name="supplier_name" value={form.supplier_name} onChange={handleInputChange} style={{ width: '95%', padding: '6px', marginTop: '5px' }} required />
                </div>
                <div>Phân đoạn hàng nhập: <input name="supplier_slice" value={form.supplier_slice} onChange={handleInputChange} style={{ width: '95%', padding: '6px', marginTop: '5px' }} /></div>
                <div>Số điện thoại liên hệ: <input name="phone_number" value={form.phone_number} onChange={handleInputChange} style={{ width: '95%', padding: '6px', marginTop: '5px' }} /></div>
                <div style={{ gridColumn: '1 / span 2' }}>Địa chỉ kho: <input name="address" value={form.address} onChange={handleInputChange} style={{ width: '97.5%', padding: '6px', marginTop: '5px' }} /></div>
                
                <div style={{ gridColumn: '1 / span 2', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '5px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Hình ảnh hóa đơn / Chứng từ nhập kho Nhà CC:</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <label style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        📁 Chọn ảnh có sẵn
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
                      </label>
                      <label style={{ padding: '8px 12px', backgroundColor: '#e65100', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        📸 Chụp Camera trực tiếp
                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '5px 0' }}>
                    {form.supplier_image ? (
                      form.supplier_image.split(',').map((imgUrl, index) => (
                        <div key={index} style={{ position: 'relative', flexShrink: 0 }}>
                          <img src={imgUrl} alt={`preview-${index}`} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #e65100' }} />
                          <button type="button" onClick={() => {
                            const imgList = form.supplier_image.split(',');
                            const filteredList = imgList.filter((_, i) => i !== index);
                            setForm(prev => ({ ...prev, supplier_image: filteredList.join(',') }));
                          }} style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', lineHeight: '18px', padding: 0 }}>✕</button>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: '#777', fontSize: '12px', fontStyle: 'italic' }}>Chưa có hình ảnh hóa đơn.</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <button type="button" onClick={() => setIsFormOpen(false)} style={{ padding: '8px 18px', backgroundColor: '#757575', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Đóng lại</button>
                <button type="submit" style={{ padding: '8px 25px', backgroundColor: '#e65100', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>
                  {formType === 'add' ? 'Lưu Nhà CC' : 'Cập nhật ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
          <button onClick={handleOpenAddForm} style={{ padding: '8px 16px', backgroundColor: '#e65100', color: 'white', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>➕ Thêm nhà cung cấp mới</button>
          <span style={{ backgroundColor: '#fff3e0', color: '#e65100', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid #e65100', fontSize: '14px', whiteSpace: 'nowrap' }}>
            📊 Tổng số: {pagination && pagination.totalItems ? pagination.totalItems : suppliers.length} Nhà CC
          </span>
          <div style={{ position: 'relative', width: '40%', minWidth: '250px' }}>
            <input type="text" placeholder="Tìm kiếm nhanh Nhà CC (Tên, SĐT, Kho)..." value={searchTerm} onChange={handleSearchChange} onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault(); setSearchTerm(''); setSearch(''); fetchSuppliers(1, '', limit); e.target.blur();
              }
            }} style={{ width: '100%', padding: '8px 35px 8px 10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
            {searchTerm && (
              <button type="button" onClick={() => { setSearchTerm(''); setSearch(''); fetchSuppliers(1, '', limit); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>✕</button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>Hiển thị </span>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#e65100', color: 'white', userSelect: 'none' }}>
              <th>Nhà Cung Cấp</th>
              <th>Slice NCC</th>
              <th>Địa Chỉ</th>
              <th>Điện Thoại</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {suppliers && suppliers.length > 0 ? (
              suppliers.map(s => {
                const firstCover = s.supplier_image ? s.supplier_image.split(',')[0] : '';
                return (
                  <tr key={s.supplier_id} onClick={() => handleRowClick(s)} style={{ cursor: 'pointer' }}>
                   
                    <td style={{ textAlign: 'left', display: 'flex', alignItems: 'center' }}>
                      {firstCover ? (
                        <img src={firstCover} alt="supplier" style={{ width: '35px', height: '35px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px' }} />
                      ) : (
                        <div style={{ width: '35px', height: '35px', backgroundColor: '#ddd', borderRadius: '4px', marginRight: '10px', textAlign: 'center', lineHeight: '35px', fontSize: '11px', color: '#666' }}>NCC</div>
                      )}
                      <strong>{s.supplier_name}</strong>
                    </td>
                    <td>{s.supplier_slice}</td>
                    <td>{s.address}</td>
                    <td>{s.phone_number}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleOpenAddForm(s) || setForm(s) || setFormType('edit') || setIsFormOpen(true)} style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '3px', marginRight: '5px' }}>Sửa</button>
                      <button onClick={() => {
                        if (window.confirm('Bạn có chắc chắn muốn xóa Nhà cung cấp này?')) {
                          fetch(`/api/suppliers/${encodeURIComponent(s.supplier_id)}`, { method: 'DELETE' })
                            .then(() => fetchSuppliers(pagination.currentPage, search, limit));
                        }
                      }} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '3px' }}>Xóa</button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: '#888', padding: '15px' }}>Không có dữ liệu nhà cung cấp hợp lệ.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '5px', alignItems: 'center' }}>
        <button disabled={pagination.currentPage === 1} onClick={() => fetchSuppliers(pagination.currentPage - 1, search, limit)} style={{ padding: '5px 10px', cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer' }}>◀ Trước</button>
        <span> Trang <strong>{pagination.currentPage}</strong> / {pagination.totalPages || 1} </span>
        <button disabled={pagination.currentPage === pagination.totalPages} onClick={() => fetchSuppliers(pagination.currentPage + 1, search, limit)} style={{ padding: '5px 10px', cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer' }}>Sau ▶</button>
      </div>
    </div>
  );
}

export default NhaCCPage;
