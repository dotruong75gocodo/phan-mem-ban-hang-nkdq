import React, { useState, useEffect } from 'react';

// Hàm hỗ trợ gỡ dấu nhanh để tạo mã tự động nếu người dùng lười gõ tay
const autoGenerateId = (str) => {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim();
};

function KhachHangPage(props) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Quản lý trạng thái phân trang thời gian thực
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [limit, setLimit] = useState(20); // Mặc định hiển thị 10 dòng
  
  // Giao diện hiển thị song song: Bảng tìm kiếm đứng yên
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState('add'); // 'add' hoặc 'edit'
  
  // Bổ sung trường customer_id vào cấu trúc Form dữ liệu
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    customer_slice: '',
    address: '',
    phone_number: '',
    customer_image: '' 
  });

  // Tải danh sách khách hàng từ database lên giao diện
  const fetchCustomers = async (page = 1, currentSearch = search, currentLimit = limit) => {
    try {
      const url = `/api/customers?page=${page}&limit=${currentLimit}&search=${encodeURIComponent(currentSearch)}`;
      const res = await fetch(url);
      if (!res.ok) return console.error(`Server báo lỗi: ${res.status}`);
      const resultData = await res.json();
      if (resultData && resultData.data) {
        setCustomers(resultData.data);
        setPagination({
          currentPage: resultData.pagination.currentPage,
          totalPages: resultData.pagination.totalPages,
          totalItems: resultData.pagination.totalRows || resultData.pagination.totalItems
        });
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error("Lỗi kết nối mạng:", err);
    }
  };

  // HOÃN THỜI GIAN ĐỂ CHỐNG LAG KHI GÕ CHỮ (DEBOUNCE):
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearch(searchTerm);
      fetchCustomers(1, searchTerm, limit); // Ép về trang 1 khi tìm từ khóa mới
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    fetchCustomers(1, search, limit);
  }, [limit]);

  // Nhấn ESC để đóng form nhanh / Nhấn Enter để xác nhận Lưu hoặc Cập nhật
  useEffect(() => {
    const handlePlatformKeys = (event) => {
      if (event.key === 'Escape') {
        setIsFormOpen(false);
      }
      if (event.key === 'Enter') {
        if (document.activeElement.tagName === 'TEXTAREA') return;
        event.preventDefault(); 
        const activeForm = document.querySelector('form');
        if (activeForm) {
          activeForm.requestSubmit();
        }
      }
    };
    if (isFormOpen) {
      window.addEventListener('keydown', handlePlatformKeys);
    }
    return () => {
      window.removeEventListener('keydown', handlePlatformKeys);
    };
  }, [isFormOpen, form]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleInputChange = (e) => {
  const { name, value } = e.target;

  setForm(prevForm => {
    // Trường hợp gõ tên khách hàng
    if (name === 'customer_name') {
      return {
        ...prevForm,
        customer_name: value,
        // Nếu là form thêm mới thì tự tạo ID, nếu là form edit thì giữ nguyên ID cũ
        customer_id: formType === 'add' ? autoGenerateId(value) : prevForm.customer_id
      };
    }
    
    // Các trường hợp còn lại (địa chỉ, SĐT, slice...)
    return {
      ...prevForm,
      [name]: value
    };
  });
};



  // Hàm xử lý tải tệp hình ảnh khách hàng
  const handleImageChange = async (e) => {
    const file = e.target.files;
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setForm(prev => ({ ...prev, customer_image: data.imageUrl })); 
      } else {
        alert(data.message || 'Lỗi upload ảnh!');
      }
    } catch (err) {
      console.error("Lỗi upload dữ liệu ảnh:", err);
    }
  };

  // Nút Thêm mới: Bật khung nhập liệu trống
  const handleOpenAddForm = () => {
    setForm({ customer_id: '', customer_name: '', customer_slice: '', address: '', phone_number: '', customer_image: '' });
    setFormType('add');
    setIsFormOpen(true);
  };

  // Click vào dòng: Hiện bảng thông tin chi tiết để chỉnh sửa
  const handleRowClick = (customer) => {
    if (props.onViewDetail) {
      props.onViewDetail(customer.customer_id); 
    } else {
      setForm(customer);
      setFormType('edit');
      setIsFormOpen(true);
    }
  };

  // API: Thêm khách hàng mới
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!form.customer_id.trim()) return 
    alert("Vui lòng nhập Mã khách hàng!");
    
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setIsFormOpen(false);
        fetchCustomers(pagination.currentPage, search, limit);
        //alert('Thêm khách hàng thành công!');
      } else {
        alert('Lỗi: ' + (data.error || data.message));
      }
    } catch (err) {
      alert('Lỗi kết nối: ' + err.message);
    }
  };

  // API: Cập nhật thông tin sửa đổi
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(form.customer_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchCustomers(pagination.currentPage, search, limit);
        alert('Cập nhật thành công!');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>DANH MỤC QUẢN LÝ KHÁCH HÀNG</h2>
      
      {/* KHỐI FORM NỔI GIỮA MÀN HÌNH (POPUP MODAL) */}
      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '8px', width: '700px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '2px solid #007bff' }}>
            
            {/* Thanh tiêu đề */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#007bff' }}>{formType === 'add' ?
               "➕ Thêm khách hàng mới" : "📝 Chi tiết & Chỉnh sửa thông tin khách hàng"}</h3>
              <button type="button" onClick={() => setIsFormOpen(false)} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>❌</button>
            </div>

            <form onSubmit={formType === 'add' ? handleCreateCustomer : handleUpdateCustomer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                
                {/* Trường Mã khách hàng gõ bằng tay */}
                <div>
                  Mã Khách Hàng (Gõ tay không dấu): 
                  <input 
                    name="customer_id" 
                    placeholder="Ví dụ: HOANGXN, KHDIEP..."
                    value={form.customer_id} 
                    onChange={handleInputChange} 
                    style={{ width: '95%', padding: '6px', marginTop: '5px', fontWeight: 'bold', color: '#007bff' }} 
                    disabled={formType === 'edit'} 
                    required 
                  />
                </div>

                <div>Tên khách hàng: <input name="customer_name" value={form.customer_name} onChange={handleInputChange} style={{ width: '95%', padding: '6px', marginTop: '5px' }} required /></div>
                <div>Phân đoạn khách hàng: <input name="customer_slice" value={form.customer_slice} onChange={handleInputChange} style={{ width: '95%', padding: '6px', marginTop: '5px' }} /></div>
                <div>Địa chỉ: <input name="address" value={form.address} onChange={handleInputChange} style={{ width: '95%', padding: '6px', marginTop: '5px' }} /></div>
                <div>Số điện thoại: <input name="phone_number" value={form.phone_number} onChange={handleInputChange} style={{ width: '95%', padding: '6px', marginTop: '5px' }} /></div>
                
                {/* Khu vực chụp/tải tệp hình ảnh khách hàng */}
                <div style={{ gridColumn: '1 / span 2', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '5px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Hình ảnh khách hàng (Hỗ trợ tải/chụp nhiều ảnh):</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <label style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        📁 Chọn từ thư viện
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
                      </label>
                      <label style={{ padding: '8px 12px', backgroundColor: '#e65100', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        📸 Bật Camera chụp
                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>

                  {/* Danh sách ảnh trượt ngang */}
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '5px 0' }}>
                    {form.customer_image ? (
                      form.customer_image.split(',').map((imgUrl, index) => (
                        <div key={index} style={{ position: 'relative', flexShrink: 0 }}>
                          <img src={imgUrl} alt={`preview-${index}`} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #007bff' }} />
                          <button
                            type="button"
                            onClick={() => {
                              const imgList = form.customer_image.split(',');
                              const filteredList = imgList.filter((_, i) => i !== index);
                              setForm(prev => ({ ...prev, customer_image: filteredList.join(',') }));
                            }}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', lineHeight: '18px', padding: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: '#777', fontSize: '12px', fontStyle: 'italic' }}>Chưa có hình ảnh khách hàng.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nút lưu / đóng dưới đáy Popup */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <button type="button" onClick={() => setIsFormOpen(false)} style={{ padding: '8px 18px', backgroundColor: '#757575', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Đóng lại</button>
                <button type="submit" style={{ padding: '8px 25px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>
                  {formType === 'add' ? 'Lưu khách hàng' : 'Cập nhật ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* THANH ĐIỀU KHIỂN HÀNG NGANG */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
          <button onClick={handleOpenAddForm} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>➕ Thêm khách hàng mới</button>
          
          <span style={{ backgroundColor: '#e7f5ff', color: '#007bff', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', border: '1px solid #007bff', fontSize: '14px', whiteSpace: 'nowrap' }}>
            📊 Tổng số: {pagination && pagination.totalItems ? pagination.totalItems : customers.length} Khách Hàng
          </span>

          <div style={{ position: 'relative', width: '35%', minWidth: '250px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng (Mã, Tên, SĐT, Địa chỉ)..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setSearchTerm('');
                  setSearch('');
                  fetchCustomers(1, '', limit);
                  e.target.blur();
                }
              }}
              style={{ width: '100%', padding: '8px 35px 8px 10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
            {searchTerm && (
              <button type="button" onClick={() => { setSearchTerm(''); setSearch(''); fetchCustomers(1, '', limit); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' }} title="Xóa nhanh từ khóa">✕</button>
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

      {/* BẢNG DỮ LIỆU KHÁCH HÀNG */}
      <div style={{ overflowX: 'auto' }}>
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ backgroundColor: '#007bff', color: 'white', userSelect: 'none' }}>
              <th>Khách Hàng</th>
              <th>Slice KH</th>
              <th>Địa Chỉ</th>
              <th>Điện Thoại</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {/* 🚀 ĐÃ SỬA: Dự phòng cả trường viết hoa/viết thường từ MySQL gửi lên */}
{customers && customers.length > 0 ? (
  customers.map(c => {
    const firstImg = c.customer_image ? c.customer_image.split(',')[0] : '';
    const currentId = c.customer_id || c.id || c.customer_name;
    const currentName = c.customer_name || c.name || '---';

    return (
      <tr key={currentId} onClick={() => handleRowClick(c)} style={{ cursor: 'pointer' }}>
        {/* Hiện Mã khách hàng */}
        
        <td style={{ textAlign: 'left', display: 'flex', alignItems: 'center' }}>
          {firstImg ? (
            <img src={firstImg} alt="avatar" style={{ width: '35px', height: '35px', objectFit: 'cover', borderRadius: '50%', marginRight: '10px' }} />
          ) : (
            <div style={{ width: '35px', height: '35px', backgroundColor: '#ddd', borderRadius: '50%', marginRight: '10px', textAlign: 'center', lineHeight: '35px', fontSize: '11px', color: '#666' }}>KH</div>
          )}
          <strong>{currentName}</strong>
        </td>
        <td>{c.customer_slice || '---'}</td>
        <td>{c.address || '---'}</td>
        <td>{c.phone_number || '---'}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              if (props.onViewDetail) {
                props.onViewDetail(currentId);
              } else {
                handleRowClick(c);
              }
            }}
            style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '3px', marginRight: '5px' }}
          >
            Sửa
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
                fetch(`/api/customers/${encodeURIComponent(currentId)}`, { method: 'DELETE' })
                  .then(() => fetchCustomers(pagination.currentPage, search, limit));
              }
            }} 
            style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '3px' }}
          >
            Xóa
          </button>
        </td>
      </tr>
    );
  })
) : (

              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#888', padding: '15px' }}>Không tìm thấy khách hàng nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* THANH PHÂN TRANG */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '5px', alignItems: 'center' }}>
        <button disabled={pagination.currentPage === 1} onClick={() => fetchCustomers(pagination.currentPage - 1, search, limit)} style={{ padding: '5px 10px', cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer' }}>◀ Trước</button>
        <span> Trang <strong>{pagination.currentPage}</strong> / {pagination.totalPages || 1} </span>
        <button disabled={pagination.currentPage === pagination.totalPages} onClick={() => fetchCustomers(pagination.currentPage + 1, search, limit)} style={{ padding: '5px 10px', cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer' }}>Sau ▶</button>
      </div>

    </div>
  );
}

export default KhachHangPage;
