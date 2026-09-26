import React, { useState, useEffect } from 'react';
import axios from 'axios'; 

function SanPhamPage(props) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [products, setProducts] = useState([]);
const [search, setSearch] = useState(() => {
  return localStorage.getItem('last_product_search') || '';
});
  const [selectedCodes, setSelectedCodes] = useState([]);
  // Thêm dòng này vào ngay dưới các khai báo useState có sẵn của bạn
const [searchTerm, setSearchTerm] = useState(() => {
  return localStorage.getItem('last_product_search') || '';
});

const [filterSpec, setFilterSpec] = useState(() => {
  return localStorage.getItem('last_product_filter_spec') || '';
});
const [filterSlice, setFilterSlice] = useState(() => {
  return localStorage.getItem('last_product_filter_slice') || '';
});

const [availableSlices, setAvailableSlices] = useState([]);
const [availableSpecs, setAvailableSpecs] = useState([]);
const [limit, setLimit] = useState(50); 
// Lưu vị trí ô đang sửa: { id: 'MÃ_SP', field: 'TÊN_CỘT' }
const [editingCell, setEditingCell] = useState(null); 
// Lưu giá trị tạm thời người dùng đang gõ trong ô
const [tempValue, setTempValue] = useState(''); 
// Thêm state này để theo dõi trạng thái hiển thị giá (false = hiện đầy đủ, true = chỉ hiện giá sỉ)
// Khi vào trang, React tự động kiểm tra xem trước đó máy đang lưu trạng thái nào
const [isCompactPrice, setIsCompactPrice] = useState(() => {
  const savedState = localStorage.getItem('product_price_view_mode');
  return savedState === 'compact'; // Nếu trước đó lưu 'compact' thì kết quả là true (ẩn giá), ngược lại là false
});

 
  // Quản lý trạng thái phân trang và sắp xếp gốc từ API của bạn
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [sortConfig, setSortConfig] = useState({ field: 'product_code', order: 'ASC' });
  const [bulkConfig, setBulkConfig] = useState({
    update_type: 'selected', filter_field: 'all', filter_value: '',
    price_type: 'retail_price', action_type: 'fixed', value: 0
  });


  // Giao diện hiển thị song song giúp bảng tìm kiếm cố định không bao giờ bị hủy DOM
  const [isFormOpen, setIsFormOpen] = useState(false);
const [isRecalculatingStock, setIsRecalculatingStock] = useState(false);


  const [formType, setFormType] = useState('add'); // 'add' hoặc 'edit'
  const [form, setForm] = useState({
    product_code: '',
    product_name: '',
    base_price: 0,
    wholesale_price: 0,
    retail_price: 0,
    weight_price: 0,
    product_slice: '',
    specification: 0,
    density: 0,
    product_image: '' // Chuỗi TEXT chứa danh sách link ảnh ngăn cách bằng dấu phẩy
  });



// 🌟 STATE MỚI: Quản lý trạng thái loading khi đang đồng bộ Sheets
const [isSyncingSheets, setIsSyncingSheets] = useState(false);

// 🌟 HÀM MỚI: Gọi xuống Node.js kích hoạt đồng bộ lên Google Sheets
const handleSyncSheets = async () => {
  setIsSyncingSheets(true); // Bật hiệu ứng xoay / khóa nút bấm
  
  try {
    // Gọi API tới cổng Node.js mà bạn đã viết ở Bước 2
    const response = await fetch('http://localhost:5000/api/sync-products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

    const data = await response.json();

    if (response.ok && data.success) {
      alert(`🎉 Đồng bộ thành công: ${data.message}`);
      // Tải lại danh sách bảng nếu cần cập nhật số liệu mới nhất
      fetchProducts(pagination.currentPage, search, sortConfig, limit);
    } else {
      alert(`❌ Lỗi hệ thống: ${data.error || 'Không thể đồng bộ dữ liệu'}`);
    }
  } catch (error) {
    console.error("Lỗi kết nối API đồng bộ Sheets:", error);
    alert("❌ Không thể kết nối tới Server Localhost. Hãy chắc chắn Server Node.js đang chạy!");
  } finally {
    setIsSyncingSheets(false); // Tắt trạng thái chờ
  }
};


// 🌟 HÀM MỚI: Gọi xuống Node.js kích hoạt luồng đặt lại kho hệ thống
const handleRecalculateStock = async () => {
  const isConfirm = window.confirm(
    "⚠️ CẢNH BÁO HỆ THỐNG:\n\nHành động này sẽ reset toàn bộ kho của 5.000 sản phẩm về 0 và tự động tính toán lại từ đầu dựa trên lịch sử hóa đơn.\n\nBạn có chắc chắn muốn thực hiện không?"
  );
  if (!isConfirm) return;

  setIsRecalculatingStock(true); // Bật hiệu ứng khóa nút bấm bảo vệ dữ liệu
  try {
    // Gọi API lệnh GET sang cổng Node.js localhost
    const response = await axios.get('http://localhost:5000/api/system/recalculate-all-stock');
    
    if (response.data && response.data.success) {
      alert(response.data.message || "🎉 Đã tính toán lại toàn bộ tồn kho thành công!");
      
      // Tải lại danh sách bảng để màn hình cập nhật ngay con số tồn kho mới nhất
      fetchProducts(pagination.currentPage, search, sortConfig, limit);
    } else {
      alert("❌ Lỗi hệ thống: Cổng Backend không phản hồi dữ liệu thành công!");
    }
  } catch (error) {
    console.error("Lỗi kết nối API khôi phục kho:", error);
    const serverErr = error.response?.data?.error || error.message || "Không thể kết nối Server";
    alert(`❌ Không thể kết nối tới Server Localhost. Chi tiết lỗi: ${serverErr}`);
  } finally {
    setIsRecalculatingStock(false); // Mở khóa nút bấm, trả về trạng thái bình thường
  }
};

  // Hàm tải danh sách sản phẩm đồng bộ chính xác với API Backend của bạn
  // 🌟 ĐÃ ĐỒNG BỘ: Nhận tham số currentLimit để tránh bị trễ State khi render
const fetchProducts = async (page = 1, currentSearch = search, sort = sortConfig, currentLimit = limit) => {
  try {
    const url = `/api/products?page=${page}&limit=${currentLimit}` +
      `&search=${encodeURIComponent(currentSearch)}` +
      `&filterSlice=${encodeURIComponent(filterSlice)}` +
      `&filterSpec=${encodeURIComponent(filterSpec)}` +
      `&sortBy=${sort.field}&sortOrder=${sort.order}`;
    
    const res = await fetch(url);
    if (!res.ok) return;
    const resultData = await res.json();
    
    // 🌟 ĐOẠN CẦN SỬA CHÍNH XÁC:
    if (resultData && resultData.data && Array.isArray(resultData.data)) {
      // Nếu Backend trả về dạng Object chứa phân trang { data: [...], pagination: {...} }
      setProducts(resultData.data);
      setPagination({
        currentPage: resultData.pagination.currentPage || 1,
        totalPages: resultData.pagination.totalPages || 1,
        totalItems: resultData.pagination.totalItems || 0
      });
    } else if (Array.isArray(resultData)) {
      // Dự phòng nếu Backend trả về mảng thuần túy
      setProducts(resultData);
      setPagination(prev => ({ ...prev, totalItems: resultData.length }));
    } else {
      setProducts([]);
    }
  } catch (err) {
    console.error("Lỗi tải sản phẩm:", err);
    setProducts([]);
  }
};


// 🌟 Lắng nghe thay đổi của cả Slice và Quy cách để tự động render lại bảng
// 🌟 1. Tự động tải lại bảng ngay lập tức khi thay đổi số lượng dòng hiển thị (Giống trang Khách Hàng)
useEffect(() => {
  fetchProducts(1, searchTerm, sortConfig, limit);
}, [limit]);

// 🌟 2. Tự động tải lại bảng khi người dùng thay đổi bộ lọc Slice, Quy cách hoặc Trục sắp xếp
useEffect(() => {
  fetchProducts(1, searchTerm, sortConfig, limit);
}, [filterSlice, filterSpec, sortConfig]);



useEffect(() => {
  const fetchAvailableSlices = async () => {
    try {
      const res = await fetch('/api/product-slices');
      if (res.ok) {
        const data = await res.json();
        setAvailableSlices(data || []); // Nạp mảng ["alu", "sỉ", "lẻ"] vào State
      }
    } catch (err) {
      console.error("Lỗi tải danh mục Slice động:", err);
    }
  };
  fetchAvailableSlices();
}, []);

useEffect(() => {
  // Hàm tải danh sách Quy cách động từ Backend
  const fetchAvailableSpecs = async () => {
    try {
      const res = await fetch('/api/product-specifications');
      if (res.ok) {
        const data = await res.json();
        setAvailableSpecs(data || []); // Nạp mảng số vật lý vào State
      }
    } catch (err) {
      console.error("Lỗi tải danh sách Qui cách động:", err);
    }
  };
  
  fetchAvailableSpecs();
}, []);


// 🌟 Thêm khối này vào để xử lý gõ chữ tự động kích hoạt tìm kiếm sau 400ms
useEffect(() => {
  const delayDebounceFn = setTimeout(() => {
    setSearch(searchTerm);
    fetchProducts(1, searchTerm, sortConfig);
  }, 400);

  return () => clearTimeout(delayDebounceFn);
}, [searchTerm]);

    
    // 🌟 TÍNH NĂNG MỚI: Nhấn ESC để đóng form nhanh / Nhấn Enter để xác nhận Lưu hoặc Cập nhật
  useEffect(() => {
    const handlePlatformKeys = (event) => {
      // 1. Nếu nhấn phím Escape: Đóng nhanh cửa sổ form popup
      if (event.key === 'Escape') {
        setIsFormOpen(false);
      }
     
      // 2. Nếu nhấn phím Enter: Tự động kích hoạt nút submit để gửi dữ liệu lên Database
      if (event.key === 'Enter') {
        // Kiểm tra xem người dùng có đang gõ trong thẻ ghi chú dài (textarea) không, nếu có thì cho xuống dòng bình thường
        if (document.activeElement.tagName === 'TEXTAREA') return;
       
        event.preventDefault(); // Chặn hành vi tải lại trang mặc định của trình duyệt
       
        // Tìm và tự động kích hoạt sự kiện submit của Form đang mở trên màn hình
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
  }, [isFormOpen, form]); // Theo dõi form để đảm bảo lấy đúng dữ liệu mới nhất khi bấm Enter


  // Ô tìm kiếm đẩy thẳng giá trị value thời gian thực vào API, chống trễ State
  // Thay thế hàm handleSearchChange cũ bằng đoạn này:
// Sửa lại hàm handleSearchChange cũ thành như thế này
const handleSearchChange = (e) => {
  const value = e.target.value;
  setSearchTerm(value);
  // Thêm dòng này để máy lưu lại từ khóa thời gian thực
  localStorage.setItem('last_product_search', value); 
};

  const requestSort = (field) => {
    let order = 'ASC';
    if (sortConfig.field === field && sortConfig.order === 'ASC') order = 'DESC';
    setSortConfig({ field, order });
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };


  // 🌟 HÀM XỬ LÝ ĐỒNG BỘ: Chụp liên tiếp hoặc chọn nhiều file không bị đè mất ảnh cũ
  const handleImageChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;


    const formData = new FormData();
    // Đưa tất cả các file người dùng chọn vào FormData
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }


    try {
      // Gọi lên cổng xử lý danh sách mảng ảnh của Backend
      const res = await fetch('/api/upload-images', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        const currentImages = form.product_image ? form.product_image.split(',') : [];
        const updatedImages = [...currentImages, ...data.imageUrls].join(',');
       
        setForm(prev => ({ ...prev, product_image: updatedImages })); // Cập nhật chuỗi ngăn cách bằng dấu phẩy
      } else {
        alert(data.message || 'Lỗi upload ảnh!');
      }
    } catch (err) {
      console.error("Lỗi mạng khi tải ảnh sản phẩm lên:", err);
    }
  };


  const handleOpenAddForm = () => {
    setForm({
      product_code: '', product_name: '', base_price: 0, wholesale_price: 0,
      retail_price: 0, weight_price: 0, product_slice: '', specification: 0, density: 0, product_image: ''
    });
    setFormType('add');
    setIsFormOpen(true);
  };


    // Nhớ thêm "props" hoặc giải nén { onViewDetail } ở đầu hàm Component SanPhamPage nhé!
const handleRowClick = (product) => {
  if (props.onViewDetail) {
    props.onViewDetail(product.product_code);
  }
};


    // API: Thêm sản phẩm mới và giữ nguyên form ở chế độ xem chi tiết sản phẩm đó
  // API: Thêm sản phẩm mới và giữ nguyên form ở chế độ xem chi tiết sản phẩm đó
const handleCreateProduct = async (e) => {
  e.preventDefault();
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const resultData = await res.json();

    if (res.ok) {
      // 1. Tải lại danh sách bảng ẩn phía dưới để cập nhật số liệu database
      fetchProducts(1, search, sortConfig);
      
      // 2. 🌟 LOGIC MỚI: Không gọi lệnh setIsFormOpen(false); nữa để giữ nguyên Form mở.
      
      // 3. Chuyển trạng thái từ 'add' sang 'edit' để các nút bấm chuyển sang chế độ Sửa Đổi
      setFormType('edit');
      
      // 4. Đồng bộ chính xác dữ liệu sạch từ Backend trả về vào Form State
      if (resultData && resultData.data) {
        setForm(resultData.data);
      } else {
        // Dự phòng nếu lỗi object trả về, giữ nguyên thông tin vừa nhập
        setForm(prev => ({ ...prev }));
      }
      
      console.log("🎉 Đã khởi tạo và chuyển sang chế độ chi tiết sản phẩm!");
    } else {
      alert(resultData.error || 'Không thể lưu sản phẩm, mã SP có thể đã tồn tại!');
    }
  } catch (err) {
    alert('Lỗi hệ thống khi tạo sản phẩm: ' + err.message);
  }
};




  // API: Cập nhật sửa đổi sản phẩm (Đã loại bỏ cột ảo tính toán tự động của MySQL)
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const { GiaMet, TonKho, total_imported, total_exported, so_lan_len_don, ...cleanData } = form;


      const res = await fetch(`/api/products/${form.product_code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData)
      });
      if (res.ok) {
        //alert('Cập nhật thông tin sản phẩm thành công!');
        setIsFormOpen(false);
        fetchProducts(pagination.currentPage, search, sortConfig);
      } else {
        alert('Cập nhật thất bại, vui lòng kiểm tra console Backend!');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };


  // 🚀 HÀM MỚI: Xử lý lưu dữ liệu ngay khi kết thúc sửa ô tại chỗ (Inline Edit)
// 🚀 HÀM MỚI ĐÃ SỬA: Xử lý lưu dữ liệu Inline Edit chống lặp vô hạn
const handleInlineSave = async (productCode, field, finalValue) => {
  try {
    const currentProduct = products.find(p => p.product_code === productCode);
    if (!currentProduct) return;

    // Khử sạch khoảng trắng, nếu là cột giá thì ép về kiểu số chuẩn
    const updatedValue = field === 'product_slice' ? String(finalValue).trim() : Number(finalValue);

    // Bẫy lỗi nếu người dùng nhập chữ vào ô giá tiền làm số bị biến thành NaN
    if (field !== 'product_slice' && isNaN(updatedValue)) {
      alert("Vui lòng chỉ nhập số vào ô giá tiền!");
      return;
    }

    // Nếu giá trị không có gì thay đổi so với database cũ thì thoát luôn, không gọi API
    if (currentProduct[field] === updatedValue) {
       setEditingCell(null);
       return;
    }

    // Gọi chính xác API inline-update chuyên dụng của Backend
    const res = await fetch(`/api/products/${encodeURIComponent(productCode)}/inline-update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: field,
        value: updatedValue
      })
    });

    if (res.ok) {
      // 🌟 ĐOẠN QUAN TRỌNG: Chỉ cập nhật duy nhất ô vừa sửa trên State cục bộ
      // Tuyệt đối KHÔNG gọi lại hàm fetchProducts() ở đây để tránh kích hoạt useEffect lặp vô hạn
      setProducts(prev => prev.map(p => p.product_code === productCode ? { ...p, [field]: updatedValue } : p));
    } else {
      alert('Cập nhật thất bại, vui lòng kiểm tra Backend!');
    }
  } catch (err) {
    console.error("Lỗi lưu trực tiếp:", err);
  } finally {
    // Tắt trạng thái ô đang sửa để quay về dạng text hiển thị thường
    setEditingCell(null); 
  }
};



  const handleBulkUpdatePrices = async () => {
    if (bulkConfig.update_type === 'selected' && selectedCodes.length === 0) {
      return alert("Vui lòng tích chọn các hàng sản phẩm ở bảng bên dưới!");
    }
    if (window.confirm("Bạn có chắc chắn muốn thực hiện đổi giá hàng loạt?")) {
      const res = await fetch('/api/products/bulk-update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_codes: selectedCodes, ...bulkConfig })
      });
      const data = await res.json();
      alert(data.message);
      setSelectedCodes([]);
      fetchProducts(pagination.currentPage, search, sortConfig);
    }
  };
    return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginTop: '5px' }}>QUẢN LÝ SẢN PHẨM</h2>


      {/* 🌟 CẬP NHẬT: KHỐI FORM HIỆN RA RIÊNG BIỆT NẰM NỔI LÊN TRÊN MÀN HÌNH (POPUP MODAL) */}
      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '8px', width: '800px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '2px solid #2196F3' }}>
           
            {/* Tiêu đề Form riêng biệt */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#2196F3' }}>{formType === 'add' ? "➕ Thêm sản phẩm mới" : "📝 Bảng thông tin chi tiết & Sửa sản phẩm"}</h3>
              <button type="button" onClick={() => setIsFormOpen(false)} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>❌</button>
            </div>


            <form onSubmit={(e) => e.preventDefault()}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div>Mã SP: <input name="product_code" value={form.product_code} onChange={handleInputChange} style={{ width: '90%', padding: '6px', marginTop: '5px' }} disabled={formType === 'edit'} required /></div>
                <div>Tên Sản phẩm: <input name="product_name" value={form.product_name} onChange={handleInputChange} style={{ width: '90%', padding: '6px', marginTop: '5px' }} required /></div>
                <div>Slice SP: <input name="product_slice" value={form.product_slice} onChange={handleInputChange} style={{ width: '90%', padding: '6px', marginTop: '5px' }} /></div>
                <div>Giá Gốc: <input type="number" name="base_price" value={form.base_price} onChange={handleInputChange} style={{ width: '90%', padding: '6px', marginTop: '5px' }} /></div>
                <div>Giá Sỉ: <input type="number" name="wholesale_price" value={form.wholesale_price} onChange={handleInputChange} style={{ width: '90%', padding: '6px', marginTop: '5px' }} /></div>
                <div>Giá Lẻ: <input type="number" name="retail_price" value={form.retail_price} onChange={handleInputChange} style={{ width: '90%', padding: '6px', marginTop: '5px' }} /></div>
                <div>Giá Lạng: <input type="number" name="weight_price" value={form.weight_price} onChange={handleInputChange} style={{ width: '90%', padding: '6px', marginTop: '5px' }} /></div>
<div>
  Qui Cách: 
  <input 
    type="number" 
    name="specification" 
    step="0.01" // 🌟 Thêm dòng này để cho phép nhập 2 chữ số thập phân (ví dụ: 0.01, 1.25)
    value={form.specification} 
    onChange={handleInputChange} 
    style={{ width: '90%', padding: '6px', marginTop: '5px' }} 
  />
</div>
                <div>Tỷ Trọng: <input type="number" name="density" value={form.density} onChange={handleInputChange} style={{ width: '90%', padding: '6px', marginTop: '5px' }} /></div>
               
                {/* Khu vực chụp/tải album nhiều ảnh sản phẩm */}
                <div style={{ gridColumn: '1 / span 3', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '5px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Album hình ảnh sản phẩm (Hỗ trợ tải/chụp nhiều ảnh):</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <label style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        📁 Chọn nhiều ảnh từ máy
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
                      </label>
                      <label style={{ padding: '8px 12px', backgroundColor: '#e65100', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        📸 Bật Camera chụp ảnh
                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>


                  {/* Danh sách ảnh trượt ngang */}
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '5px 0' }}>
                    {form.product_image ? (
                      form.product_image.split(',').map((imgUrl, index) => (
                        <div key={index} style={{ position: 'relative', flexShrink: 0 }}>
                          <img src={imgUrl} alt={`preview-${index}`} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '4px', border: '2px solid #2196F3' }} />
                          <button
                            type="button"
                            onClick={() => {
                              const imgList = form.product_image.split(',');
                              const filteredList = imgList.filter((_, i) => i !== index);
                              setForm(prev => ({ ...prev, product_image: filteredList.join(',') }));
                            }}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer', lineHeight: '18px', padding: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: '#777', fontSize: '12px', fontStyle: 'italic' }}>Chưa có ảnh sản phẩm thực tế.</span>
                    )}
                  </div>
                </div>
              </div>


              {/* Nút lưu / đóng dưới đáy form */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <button type="button" onClick={() => setIsFormOpen(false)} style={{ padding: '8px 18px', backgroundColor: '#757575', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                  Đóng lại
                </button>
                <button 
    type="button" 
    onClick={(e) => {
      e.preventDefault();
      console.log("Trạng thái formType hiện tại khi bấm nút:", formType);

      if (formType === 'add') {
        handleCreateProduct(e); // 🚀 Ép buộc chạy hàm POST thêm mới
      } else {
        handleUpdateProduct(e); // 📝 Ép buộc chạy hàm PUT cập nhật (Hãy đổi tên cho đúng hàm sửa của bạn)
      }
    }}
    style={{ padding: '8px 25px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}
  >
    {formType === 'add' ? 'Lưu sản phẩm' : 'Cập nhật ngay'}
  </button>
              </div>
            </form>


          </div>
        </div>
      )}


          {/* ========================================================================= */}
  {/* 🌟 THANH ĐIỀU KHIỂN HÀNG NGANG: THÊM MỚI, ĐIỀU CHỈNH GIÁ, TỔNG SỐ VÀ Ô CHỌN DÒNG */}
  {/* ========================================================================= */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    marginBottom: '15px',
    flexWrap: 'wrap' // Tự động co giãn dòng mượt mà nếu màn hình bị bóp nhỏ
  }}>
    
    {/* 1. Nút Thêm sản phẩm mới */}
    <button
      onClick={handleOpenAddForm}
      style={{ 
        padding: '10px 16px', 
        backgroundColor: '#007bff', 
        color: 'white', 
        borderRadius: '4px', 
        border: 'none', 
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px'
      }}
    >
      ➕ Thêm sp
    </button>

    {/* 2. Nút Điều chỉnh giá nâng cao */}
    <button
      onClick={() => setShowBulkModal(true)}
      style={{ 
        padding: '10px 16px', 
        backgroundColor: '#e65100', 
        color: 'white', 
        borderRadius: '4px', 
        border: 'none', 
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px'
      }}
    >
      Sửa giá ({selectedCodes.length})
    </button>

    


{/* 🌟 NÚT BẤM BỔ SUNG: Kích hoạt đồng bộ dữ liệu lên AppSheet */}
<button
  onClick={handleSyncSheets}
  disabled={isSyncingSheets} // Khóa nút khi đang chạy để tránh bấm đúp liên tục
  style={{
    padding: '10px 16px',
    backgroundColor: isSyncingSheets ? '#64748b' : '#1a73e8', // Màu xanh đặc trưng của Google Sheets
    color: 'white',
    borderRadius: '4px',
    border: 'none',
    cursor: isSyncingSheets ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  }}
>
  {isSyncingSheets ? '⏳ Đang đồng bộ Sheets...' : 'Đồng bộ sp'}
</button>


    {/* 3. Ô Tổng số sản phẩm */}
    <span style={{ 
      backgroundColor: '#e7f5ff', 
      color: '#007bff',
      padding: '8px 16px', 
      borderRadius: '20px', 
      fontWeight: 'bold', 
      border: '1px solid #007bff', 
      fontSize: '14px',
      whiteSpace: 'nowrap',
      height: '38px', 
      display: 'inline-flex',
      alignItems: 'center',
      boxSizing: 'border-box'
    }}>
      TC: {pagination && pagination.totalItems ? pagination.totalItems : products.length} SP
    </span>

{/* 🌟 NÚT BẤM BỔ SUNG: Kích hoạt tính toán lại tồn kho cuốn chiếu từ đầu dữ liệu gốc */}
<button
  onClick={handleRecalculateStock}
  disabled={isRecalculatingStock} // Khóa nút khi đang chạy để tránh nhân viên bấm đúp liên tục
  style={{
    padding: '10px 16px',
    backgroundColor: isRecalculatingStock ? '#64748b' : '#e67e22', // Màu cam nổi bật cứu nguy hệ thống
    color: 'white',
    borderRadius: '4px',
    border: 'none',
    cursor: isRecalculatingStock ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  }}
>
  {isRecalculatingStock ? '⏳ Đang tính lại kho...' : 'Tính Lại Tồn Kho'}
</button>

{/* 🌟 NÚT BẤM BỔ SUNG: Kích hoạt khôi phục kho thần tốc dựa trên mốc chốt Quý trước */}
<button
  onClick={async () => {
    if (!window.confirm("⚠️ CẢNH BÁO KHÔI PHỤC:\n\nHành động này sẽ ghi đè toàn bộ kho hiện tại về mốc chốt Quý trước và cộng dồn nốt các đơn hàng của Quý này.\n\nChỉ dùng khi cài lại máy hoặc dữ liệu bị lỗi. Bạn có chắc chắn muốn chạy không?")) return;
    
    try {
      // 🌟 ĐÃ SỬA: Thay thế showAutoCloseToast bằng câu lệnh thông báo nội bộ
      console.log('⏳ Đang kết nối mốc Quý cũ để cứu hộ kho...');
      
      const res = await axios.get('http://localhost:5000/api/system/restore-stock-by-quarter');
      if (res.data && res.data.success) {
        alert(res.data.message || "🎉 Khôi phục kho theo Quý thành công!");
        
        // Load lại lưới sản phẩm để hiển thị số lượng mới
        fetchProducts(pagination.currentPage, search, sortConfig, limit);
      }
    } catch (err) {
      alert("❌ Lỗi cứu hộ kho: " + (err.response?.data?.error || err.message));
    }
  }}
  style={{
    padding: '10px 16px',
    backgroundColor: '#1e3a8a', // Màu Xanh Dương đậm cứu hộ khẩn cấp
    color: 'white',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  }}
>
  🛠️ Khôi Phục Theo Quý
</button>


   <button
  type="button"
  onClick={() => {
    // 1. Tính toán trạng thái tiếp theo dựa trên trạng thái hiện tại
    const nextState = !isCompactPrice; 
    
    // 2. Cập nhật giao diện lập tức
    setIsCompactPrice(nextState); 
    
    // 3. Ghi đè trạng thái mới vào bộ nhớ trình duyệt để lưu lại cố định
    localStorage.setItem('product_price_view_mode', nextState ? 'compact' : 'full');
  }}
  style={{
    padding: '10px 16px',
    backgroundColor: isCompactPrice ? '#10b981' : '#475569',
    color: 'white',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  }}
>
  {isCompactPrice ? 'Giá gốc' : 'Giá sỉ'}
</button>



    {/* 4. 🌟 Ô CHỌN SỐ DÒNG HIỂN THỊ MỚI: Ghim cùng hàng, nằm ngay sau ô Tổng số */}
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '6px',
      height: '38px',
      boxSizing: 'border-box'
    }}>
      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>Hiển thị:</span>
      <select 
        value={limit} // Gắn liền với biến limit của hệ thống phân trang
        onChange={(e) => setLimit(Number(e.target.value))} 
        style={{ 
          padding: '8px 12px', 
          borderRadius: '4px', 
          border: '1px solid #cbd5e1', 
          fontSize: '14px',
          backgroundColor: '#fff',
          cursor: 'pointer',
          fontWeight: 'bold',
          height: '100%',
          boxSizing: 'border-box'
        }}
      >
        <option value={10}>10 dòng</option>
        <option value={20}>20 dòng</option>
        <option value={50}>50 dòng</option>
        <option value={100}>100 dòng</option>
      </select>
    </div>

  </div>
  {/* ========================================================================= */}



      <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
  <strong>Tìm kiếm nhanh sản phẩm: </strong>
  
  <div style={{ position: 'relative', width: '30%' }}>
    <input 
      type="text" 
      placeholder="Tìm kiếm nhanh từ database..." 
      value={searchTerm} 
      onChange={handleSearchChange} 
      
      // 🌟 TÍNH NĂNG MỚI: Bắt sự kiện người dùng nhấn phím
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault(); // Ngăn chặn hành vi mặc định của trình duyệt nếu có
          setSearchTerm('');  // Xóa nội dung hiển thị trên ô nhập liệu
          setSearch(''); 
          localStorage.removeItem('last_product_search');     // Reset từ khóa gốc gửi lên API
          fetchProducts(1, '', sortConfig); // Gọi lại API để tải toàn bộ danh sách gốc
          e.target.blur();    // Tùy chọn: Thoát con trỏ chuột (unfocus) khỏi ô tìm kiếm
        }
      }}
      
      style={{ 
        width: '100%', 
        padding: '8px 35px 8px 10px', 
        boxSizing: 'border-box',
        borderRadius: '4px',
        border: '1px solid #cbd5e1',
        fontSize: '14px'
      }} 
    />

    {searchTerm && (
      <button
        type="button"
        onClick={() => {
          setSearchTerm('');
          setSearch('');
          localStorage.removeItem('last_product_search');
          fetchProducts(1, '', sortConfig);
        }}
        style={{
          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
          backgroundColor: 'transparent', border: 'none', color: '#94a3b8',
          fontSize: '16px', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.color = '#64748b'}
        onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
      >
        ✕
      </button>
    )}
  </div>
  {/* 1. BỘ LỌC SLICE */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
  <strong style={{ color: '#475569', fontSize: '14px' }}>Lọc Slice:</strong>
  <select 
    value={filterSlice} 
onChange={(e) => {
  const value = e.target.value;
  setFilterSlice(value);
  localStorage.setItem('last_product_filter_slice', value);
}}
    style={{ 
      padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer',
      borderColor: filterSlice ? '#4CAF50' : '#cbd5e1', fontWeight: filterSlice ? 'bold' : 'normal'
    }}
  >
    <option value="">-- Tất cả sỉ / lẻ --</option>
    
    {/* 🌟 VÒNG LẶP TỰ ĐỘNG KHỚP 100% VỚI PHPMYADMIN - XÓA SẠCH CÁC OPTION CŨ */}
    {availableSlices && availableSlices.length > 0 && availableSlices.map((sliceName, idx) => (
      <option key={idx} value={sliceName}>
        {String(sliceName).toUpperCase()} {/* Chuyển chữ "alu" thành chữ "ALU" in hoa đẹp mắt trên giao diện */}
      </option>
    ))}
  </select>
</div>


  {/* 2. 🌟 BỔ SUNG: BỘ LỌC QUI CÁCH NHẬP SỐ NHANH */}
  {/* 🌟 ĐÃ CẢI TIẾN: BIẾN Ô NHẬP QUY CÁCH THÀNH DROPDOWN TỰ ĐỘNG KHỚP 100% */}
<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
  <strong style={{ color: '#475569', fontSize: '14px' }}>Qui cách:</strong>
  <select 
    value={filterSpec} 
onChange={(e) => {
  const value = e.target.value;
  setFilterSpec(value);
  localStorage.setItem('last_product_filter_spec', value);
}}
    style={{ 
      padding: '8px 12px', 
      borderRadius: '4px', 
      border: '1px solid #cbd5e1', 
      fontSize: '14px',
      backgroundColor: '#fff',
      cursor: 'pointer',
      borderColor: filterSpec ? '#4CAF50' : '#cbd5e1', // Sáng viền xanh lá khi chọn lọc số
      fontWeight: filterSpec ? 'bold' : 'normal'
    }}
  >
    <option value="">-- Tất cả số quy cách --</option>
    
    {/* 🌟 VÒNG LẶP TỰ ĐỘNG KHỚP VỚI DATABASE - TỰ VẼ RA CÁC CON SỐ THẬT */}
    {availableSpecs && availableSpecs.length > 0 && availableSpecs.map((specNumber, idx) => (
      <option key={idx} value={specNumber}>
        {specNumber}
      </option>
    ))}
  </select>
</div>


  {/* 3. Nút xóa nhanh tất cả cấu hình lọc (Chỉ hiện khi đang chọn bộ lọc) */}
  {(filterSlice || filterSpec) && (
    <button
      type="button"
      onClick={() => {
        setFilterSlice('');
        setFilterSpec('');
        localStorage.removeItem('last_product_filter_slice');
      localStorage.removeItem('last_product_filter_spec');
      }}
      style={{ padding: '8px 14px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
    >
      🔄 Xóa lọc
    </button>
  )}
</div>



      <div style={{ overflowX: 'auto' }}>
        <table border="1" cellPadding="4" style={{
           width: '100%',
           borderCollapse: 'collapse',
           tableLayout: 'auto',
            whiteSpace: 'nowrap' 
            }}>
          <thead>
            <tr style={{ backgroundColor: '#e2e2e2', userSelect: 'none' }}>
              

              <th style={{ 
                cursor: 'pointer',
        whiteSpace: 'nowrap', 
        width: '1%' 
                
                 }}>Action</th>

<th onClick={() => requestSort('product_code')} style={{ 
  width: '120px',
  cursor: 'pointer' ,
  minWidth: '120px', 
    maxWidth: '120px'
  }}>Mã SP {sortConfig.field === 'product_code' ? (sortConfig.order === 'ASC' ? '🔼' : '🔽') : ''}</th>
 
 <th onClick={() => requestSort('product_name')} style={{ 
  width: '250px',
  cursor: 'pointer' ,
  minWidth: '250px', 
    maxWidth: '250px'
  }}>Tên Sản phẩm {sortConfig.field === 'product_name' ? (sortConfig.order === 'ASC' ? '🔼' : '🔽') : ''}</th>

<th style={{ cursor: 'pointer',
        whiteSpace: 'nowrap', 
        width: '1%' 
         }}>Tồn Kho</th>

 <th style={{ cursor: 'pointer',
        whiteSpace: 'nowrap', 
        width: '1%' 
        }}>Slice SP</th>

{/* 🌟 SỬA ĐOẠN NÀY: Chỉ hiển thị Giá Gốc khi KHÔNG bật chế độ thu gọn */}
    {!isCompactPrice && (
      <th onClick={() => requestSort('base_price')} style={{ 
        cursor: 'pointer',
        whiteSpace: 'nowrap', 
        width: '1%' 
         }}>
        Giá Gốc {sortConfig.field === 'base_price' ? (sortConfig.order === 'ASC' ? '🔼' : '🔽') : ''}
      </th>
      
    )}<th onClick={() => requestSort('wholesale_price')} style={{ 
      cursor: 'pointer',
      whiteSpace: 'nowrap', 
        width: '1%' 
       }}>Giá Sỉ {sortConfig.field === 'wholesale_price' ? (sortConfig.order === 'ASC' ? '🔼' : '🔽') : ''}</th>

<th onClick={() => requestSort('retail_price')} style={{
   cursor: 'pointer',
   whiteSpace: 'nowrap', 
        width: '1%' 
    }}>Giá Lẻ {sortConfig.field === 'retail_price' ? (sortConfig.order === 'ASC' ? '🔼' : '🔽') : ''}</th>

 <th style={{ 
  cursor: 'pointer' ,
  whiteSpace: 'nowrap', 
        width: '1%' 
  }}>Giá Lạng</th>

 

<th onClick={() => requestSort('specification')} style={{
   cursor: 'pointer' ,
   whiteSpace: 'nowrap', 
        width: '1%' 
   }}>Qui Cách {sortConfig.field === 'specification' ? (sortConfig.order === 'ASC' ? '🔼' : '🔽') : ''}</th>

<th onClick={() => requestSort('density')} style={{ 
  cursor: 'pointer' ,
  whiteSpace: 'nowrap', 
        width: '1%' 
  }}>Tỷ Trọng {sortConfig.field === 'density' ? (sortConfig.order === 'ASC' ? '🔼' : '🔽') : ''}</th>
              
    <th style={{ 
  width: '70px',
  whiteSpace: 'nowrap', 
        width: '1%' 
   }}>Giá Mét</th>

            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const isChecked = selectedCodes.includes(p.product_code);
             
              // 🌟 TỐI ƯU BẢNG: Lấy tấm ảnh đầu tiên trong chuỗi Album làm ảnh bìa nhỏ đại diện trên bảng danh sách
              const firstImageCover = p.product_image ? p.product_image.split(',')[0] : '';


              return (
                <tr key={p.product_code} onClick={() => handleRowClick(p)} style={{ cursor: 'pointer', backgroundColor: isChecked ? '#fff3e0' : 'transparent' }}>
                  
                  {/* 🌟 ĐÃ CẢI TIẾN: Gộp gọn thành dạng Biểu tượng Icon */}
<td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap', width: '65px', textAlign: 'center' }}>
  
  {/* Biểu tượng Sao chép (📋) - PHIÊN BẢN ĐÃ LỌC SẠCH DỮ LIỆU RÁC */}
<button 
  type="button"
  onClick={() => {
    // 1. Bóc tách loại bỏ các trường tính toán tự động (TonKho) và trường ảnh hưởng để tránh lỗi MySQL SET ?
    const { 
      TonKho,
       GiaMet,
        so_lan_len_don,
        total_imported,   // 👈 Khử cột ảo nhập
      total_exported,   // 👈 Khử cột ảo xuất
      last_order_date,  // 👈 Khử cột gây lỗi Unknown column
      last_detail_id,
         ...cleanData } = p;

    // 2. Tạo mã sản phẩm mới ngẫu nhiên một chút để không bao giờ bị trùng khóa chính (Ví dụ: SP01_COPY_123)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // Tạo 4 số ngẫu nhiên
    
    const newProductData = { 
      ...cleanData, 
      product_code: `${p.product_code}_CP${randomSuffix}`, // Mã mới tinh, không lo trùng lặp trong phpMyAdmin
      product_name: `${p.product_name} (Bản sao)`,
      total_imported: 0,  // Reset số lượng nhập về 0 cho sản phẩm mới
      total_exported: 0   // Reset số lượng xuất về 0 cho sản phẩm mới
    };

    // 3. Đổ dữ liệu sạch vào Form State
    setForm(newProductData);

    // 4. Ép trạng thái Form về chế độ 'add' để kích hoạt hàm handleCreateProduct (gọi API POST)
    setFormType('add');  

    // 5. Mở Form Modal lên để bạn kiểm tra và chỉnh sửa lại tên/mã theo ý muốn trước khi lưu
    setIsFormOpen(true); 
  }} 
  title="Sao chép sản phẩm"
  style={{ 
    backgroundColor: '#fff3e0', 
    border: '1px solid #ffe0b2', 
    padding: '4px 6px', 
    cursor: 'pointer', 
    borderRadius: '4px', 
    marginRight: '6px' 
  }}
>
  +
</button>

  
  {/* Icon Xóa (🗑️) */}
  <button 
    onClick={(e) => {
      e.stopPropagation();
      if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm: ${p.product_name}?`)) {
        fetch(`/api/products/${p.product_code}`, { method: 'DELETE' })
          .then(() => fetchProducts(pagination.currentPage, search, sortConfig));
      }
    }} 
    title="Xóa sản phẩm" // Hiện ghi chú khi rà chuột vào
    style={{ 
      backgroundColor: '#ffebee', 
      border: '1px solid #ffcdd2', 
      padding: '4px 6px', 
      cursor: 'pointer', 
      borderRadius: '4px',
      fontSize: '14px',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ffcdd2'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffebee'; }}
  >
    🗑️
  </button>

</td>

                  <td 
  style={{ 
    width: '120px',
    minWidth: '120px', 
    maxWidth: '120px',
    whiteSpace: 'nowrap',    // Ngăn không cho mã sản phẩm tự động xuống dòng
    overflow: 'hidden',      // Ẩn nội dung nếu mã quá dài (đề phòng)
    textOverflow: 'ellipsis' // Thêm dấu ba chấm nếu mã bị tràn
  }}
>
  <strong>{p.product_code}</strong>
</td>


                  <td style={{ 
                    textAlign: 'left',
                    textOverflow: 'ellipsis',
                    width: '250px',
                    minWidth: '250px', 
                    maxWidth: '250px',    
                    whiteSpace: 'nowrap',
                    overflow: 'hidden', 
                   }}>
                    {firstImageCover ? (
                      <img src={firstImageCover} alt="sp" style={{ width: '40px', height: '40px', objectFit: 'cover', marginRight: '8px', borderRadius: '4px', verticalAlign: 'middle' }} />
                    ) : (
                      <div style={{ width: '30px', height: '40px', backgroundColor: '#eee', display: 'inline-block', marginRight: '8px', borderRadius: '4px', verticalAlign: 'middle', textAlign: 'center', lineHeight: '40px', fontSize: '12px', color: '#999' }}>No ảnh</div>
                    )}
                    {p.product_name}
                  </td>

 {/* ✅ ĐÃ SỬA: Lấy trực tiếp giá trị từ cột TonKho trong Database của bác */}
<td style={{ 
  // Tự động đổi màu chữ: Dưới 5 cây/tấm thì báo Đỏ cảnh báo, từ 5 trở lên báo Xanh
  color: Number(p.TonKho || 0) < 5 ? 'red' : 'green', 
  fontWeight: 'bold',
  textAlign: 'right'
}}>
  {/* Lấy số TonKho từ DB, làm tròn tối đa 2 chữ số thập phân và format dấu chấm hàng nghìn (.toLocaleString) */}
  {(Math.round((Number(p.TonKho || 0) + Number.EPSILON) * 100) / 100).toLocaleString('vi-VN')}
</td>


       {/* 1. CỘT SLICE SP (SỬA NHANH BẰNG CÁCH NHẬP TAY TỰ DO) */}
<td 
  onClick={(e) => {
    e.stopPropagation(); // Chống kích hoạt mở Form Modal xem chi tiết dòng
    setEditingCell({ id: p.product_code, field: 'product_slice' });
    setTempValue(p.product_slice || ''); // Đổ giá trị chữ hiện tại vào ô gõ
  }}
  style={{ backgroundColor: editingCell?.id === p.product_code && editingCell?.field === 'product_slice' ? '#e8f0fe' : 'transparent' }}
>
  {editingCell?.id === p.product_code && editingCell?.field === 'product_slice' ? (
    <input
      type="text"
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onBlur={() => handleInlineSave(p.product_code, 'product_slice', tempValue)} // Kích chuột ra ngoài tự lưu
      onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p.product_code, 'product_slice', tempValue)} // Gõ Enter tự lưu
      autoFocus
      style={{ width: '90px', padding: '4px', fontWeight: 'bold' }}
      placeholder="Nhập slice..."
    />
  ) : (
    <span style={{  cursor: 'pointer', display: 'inline-block', minWidth: '40px' }}>
      {p.product_slice ? String(p.product_slice) : '---'}
    </span>
  )}
</td>


{/* 2. CỘT GIÁ GỐC (SỬA NHANH SỐ) */}
{/* 🌟 Chỉ render ô này nếu trạng thái thu gọn hiển thị đang tắt (false) */}
{!isCompactPrice && (
  <td 
    onClick={(e) => {
      e.stopPropagation();
      setEditingCell({ id: p.product_code, field: 'base_price' });
      setTempValue(p.base_price);
    }}
    style={{ 
      textAlign: 'right', 
      backgroundColor: editingCell?.id === p.product_code && editingCell?.field === 'base_price' ? '#e8f0fe' : 'transparent' 
    }}
  >
    {editingCell?.id === p.product_code && editingCell?.field === 'base_price' ? (
      <input
        type="number"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => handleInlineSave(p.product_code, 'base_price', tempValue)}
        onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p.product_code, 'base_price', tempValue)}
        autoFocus
        style={{ width: '80px', padding: '4px', textAlign: 'right' }}
      />
    ) : (
      <span style={{ color: '#000801', cursor: 'pointer' }}>
        {Number(p.base_price).toLocaleString()}đ
      </span>
    )}
  </td>
)}


{/* 3. CỘT GIÁ SỈ (SỬA NHANH SỐ) */}
<td 
  onClick={(e) => {
    e.stopPropagation();
    setEditingCell({ id: p.product_code, field: 'wholesale_price' });
    setTempValue(p.wholesale_price);
  }}
  style={{ textAlign: 'right', whiteSpace: 'nowrap',backgroundColor: editingCell?.id === p.product_code && editingCell?.field === 'wholesale_price' ? '#e8f0fe' : 'transparent' }}
>
  {editingCell?.id === p.product_code && editingCell?.field === 'wholesale_price' ? (
    <input
      type="number"
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onBlur={() => handleInlineSave(p.product_code, 'wholesale_price', tempValue)}
      onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p.product_code, 'wholesale_price', tempValue)}
      autoFocus
      style={{ width: '80px', padding: '4px', textAlign: 'right' }}
    />
  ) : (
    <span style={{ color: '#0e0c0b', cursor: 'pointer' }}>
      {Number(p.wholesale_price).toLocaleString()}đ
    </span>
  )}
</td>

{/* 4. CỘT GIÁ LẺ (SỬA NHANH SỐ) */}
<td 
  onClick={(e) => {
    e.stopPropagation();
    setEditingCell({ id: p.product_code, field: 'retail_price' });
    setTempValue(p.retail_price);
  }}
  style={{ textAlign: 'right', backgroundColor: editingCell?.id === p.product_code && editingCell?.field === 'retail_price' ? '#e8f0fe' : 'transparent' }}
>
  {editingCell?.id === p.product_code && editingCell?.field === 'retail_price' ? (
    <input
      type="number"
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onBlur={() => handleInlineSave(p.product_code, 'retail_price', tempValue)}
      onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p.product_code, 'retail_price', tempValue)}
      autoFocus
      style={{ width: '80px', padding: '4px', textAlign: 'right' }}
    />
  ) : (
    <span style={{  color: '#00070e', cursor: 'pointer' }}>
      {Number(p.retail_price).toLocaleString()}đ
    </span>
  )}
</td>

{/* 5. CỘT GIÁ LẠNG (SỬA NHANH SỐ) */}
<td 
  onClick={(e) => {
    e.stopPropagation();
    setEditingCell({ id: p.product_code, field: 'weight_price' });
    setTempValue(p.weight_price);
  }}
  style={{ textAlign: 'right', backgroundColor: editingCell?.id === p.product_code && editingCell?.field === 'weight_price' ? '#e8f0fe' : 'transparent' }}
>
  {editingCell?.id === p.product_code && editingCell?.field === 'weight_price' ? (
    <input
      type="number"
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onBlur={() => handleInlineSave(p.product_code, 'weight_price', tempValue)}
      onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p.product_code, 'weight_price', tempValue)}
      autoFocus
      style={{ width: '80px', padding: '4px', textAlign: 'right' }}
    />
  ) : (
    <span style={{  color: '#070708', cursor: 'pointer' }}>
      {Number(p.weight_price).toLocaleString()}đ
    </span>
  )}
</td>


                  <td>{Number(p.specification || 0).toFixed(2)}</td>

                  <td
  onClick={(e) => {
    e.stopPropagation(); // Chống kích hoạt mở Form Modal xem chi tiết
    setEditingCell({ id: p.product_code, field: 'density' });
    setTempValue(p.density);
  }}
  style={{
    textAlign: 'right',
    backgroundColor: editingCell?.id === p.product_code && editingCell?.field === 'density' ? '#e8f0fe' : 'transparent'
  }}
>
  {editingCell?.id === p.product_code && editingCell?.field === 'density' ? (
    <input
      type="number"
      step="0.01" // Cho phép nhập số thập phân nếu tỷ trọng có số lẻ
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onBlur={() => handleInlineSave(p.product_code, 'density', tempValue)} // Kích chuột ra ngoài tự lưu
      onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p.product_code, 'density', tempValue)} // Gõ Enter tự lưu
      autoFocus
      style={{ width: '60px', padding: '4px', textAlign: 'right' }}
    />
  ) : (
    <span style={{ cursor: 'pointer', display: 'inline-block', minWidth: '30px' }}>
      {p.density}
    </span>
  )}
</td>

    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
  {Number(p.GiaMet || 0).toLocaleString()}đ
</td>
             
                  
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* THANH PHÂN TRANG */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '5px', alignItems: 'center' }}>
        <button disabled={pagination.currentPage === 1} onClick={() => fetchProducts(pagination.currentPage - 1, search, sortConfig)} style={{ padding: '5px 10px', cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer' }}>◀ Trước</button>
        <span> Trang <strong>{pagination.currentPage}</strong> / {pagination.totalPages} </span>
        <button disabled={pagination.currentPage === pagination.totalPages} onClick={() => fetchProducts(pagination.currentPage + 1, search, sortConfig)} style={{ padding: '5px 10px', cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer' }}>Sau ▶</button>
      </div>


      {/* POPUP SỬA GIÁ HÀNG LOẠT */}
      {showBulkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px', width: '550px', border: '2px solid #e65100' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#e65100', margin: 0 }}>⚙️ Công cụ sửa giá thông minh</h3>
              <button onClick={() => setShowBulkModal(false)} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>❌</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong style={{ display: 'inline-block', width: '130px' }}>Phạm vi:</strong>
                <select style={{ padding: '6px', width: '320px' }} value={bulkConfig.update_type} onChange={(e) => setBulkConfig({ ...bulkConfig, update_type: e.target.value })}>
                  <option value="selected">Chỉ dòng tích chọn ({selectedCodes.length} SP)</option>
                  <option value="condition">Áp dụng theo điều kiện lọc...</option>
                </select>
              </div>
              {bulkConfig.update_type === 'condition' && (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
                  <span>Bộ lọc:</span>
                  <select style={{ padding: '5px' }} value={bulkConfig.filter_field} onChange={(e) => setBulkConfig({ ...bulkConfig, filter_field: e.target.value })}>
                    <option value="all">Tất cả sản phẩm</option>
                    <option value="product_slice">Mã Slice SP chính xác là</option>
                    <option value="product_name">Tên sản phẩm chứa chữ</option>
                  </select>
                 {bulkConfig.filter_field !== 'all' && (
  <>
    {bulkConfig.filter_field === 'product_slice' ? (
      /* Thay thế ô nhập bằng Dropdown chọn Slice có sẵn */
      <select
        style={{ padding: '5px', width: '130px', fontWeight: 'bold' }}
        value={bulkConfig.filter_value}
        onChange={(e) => setBulkConfig({ ...bulkConfig, filter_value: e.target.value })}
      >
        <option value="">-- Chọn Slice --</option>
        {availableSlices && availableSlices.length > 0 && availableSlices.map((sliceName, idx) => (
          <option key={idx} value={sliceName}>
            {String(sliceName).toUpperCase()}
          </option>
        ))}
      </select>
    ) : (
      /* Giữ nguyên ô nhập chữ nếu người dùng lọc theo Tên sản phẩm hoặc trường khác */
      <input 
        type="text" 
        placeholder="Từ khóa..." 
        style={{ padding: '5px', width: '110px' }} 
        value={bulkConfig.filter_value} 
        onChange={(e) => setBulkConfig({ ...bulkConfig, filter_value: e.target.value })} 
      />
    )}
  </>
)}

                </div>
              )}
              <div>
                <strong style={{ display: 'inline-block', width: '130px' }}>Loại giá sửa:</strong>
                <select style={{ padding: '6px', width: '320px' }} value={bulkConfig.price_type} onChange={(e) => setBulkConfig({ ...bulkConfig, price_type: e.target.value })}>
                  <option value="base_price">Giá Gốc</option>
                  <option value="wholesale_price">Giá Sỉ</option>
                  <option value="retail_price">Giá Lẻ</option>
                  <option value="weight_price">Giá Lạng</option>
                </select>
              </div>
              <div>
                <strong style={{ display: 'inline-block', width: '130px' }}>Công thức:</strong>
                <select style={{ padding: '6px', width: '320px' }} value={bulkConfig.action_type} onChange={(e) => setBulkConfig({ ...bulkConfig, action_type: e.target.value })}>
                  <option value="fixed">Đổi thành mức giá cố định mới</option>
                  <option value="increase_value">Tăng thêm số tiền cụ thể (+đ)</option>
                  <option value="decrease_value">Giảm bớt số tiền cụ thể (-đ)</option>
                  <option value="increase_percent">Tăng giá theo tỷ lệ phần trăm (+%)</option>
                  <option value="decrease_percent">Giảm giá theo tỷ lệ phần trăm (-%)</option>
                  <option value="by_density">Tỷ trọng x Giá trị nhập tay</option>
                  <option value="wholesale_from_base">Giá sỉ = Giá gốc + Giá trị nhập tay</option>
    <option value="retail_from_wholesale">Giá lẻ = Giá sỉ + Giá trị nhập tay</option>
  
                </select>
              </div>
              <div>
                <strong style={{ display: 'inline-block', width: '130px' }}>Giá trị nhập:</strong>
                <input type="number" style={{ padding: '6px', width: '100px' }} value={bulkConfig.value} onChange={(e) => setBulkConfig({ ...bulkConfig, value: e.target.value })} />
                <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>{bulkConfig.action_type.includes('percent') ? '%' : 'đ'}</span>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'end', gap: '10px' }}>
              <button onClick={() => setShowBulkModal(false)} style={{ padding: '8px 15px', backgroundColor: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Đóng lại</button>
              <button onClick={handleBulkUpdatePrices} style={{ padding: '8px 20px', backgroundColor: '#d84315', color: 'white', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>🚀 Thực Thi Lệnh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default SanPhamPage;





