import React, { useState, useEffect,useRef , useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const ChiTietNhapHangPage = ({ purchaseId, onViewDetail, onBack, products = [] }) => {
  const [orderInfo, setOrderInfo] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State quản lý ẩn/hiện cửa sổ Popup
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showCopyPopup, setShowCopyPopup] = useState(false); // Popup copy dòng

  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [popupItem, setPopupItem] = useState({
    product_code: '',
    quantity: 0,
    import_price: 0,
    total_amount: 0,
    notes: '',
    length_value: 0,
    width_value: 0,
    dien_tich: 0
  });

  // Tải dữ liệu từ Backend đồng thời khi mở trang
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        if (!purchaseId) return;
        const cleanId = purchaseId.toString().trim();

        const [resOrder, resDetails] = await Promise.all([
          axios.get(`http://localhost:5000/api/purchase-orders/${cleanId}`),
          axios.get(`http://localhost:5000/api/purchase-order-details?purchase_id=${cleanId}`)
        ]);

        if (resOrder.data) {
          setOrderInfo(resOrder.data);
        } else {
          setOrderInfo({ purchase_id: purchaseId, supplier_name: '---', purchase_date: '' });
        }

        if (Array.isArray(resDetails.data)) {
          setOrderDetails(resDetails.data);
        } else {
          setOrderDetails([]);
        }
      } catch (err) {
        console.error("❌ Lỗi kết nối API:", err);
        setOrderInfo({ purchase_id: purchaseId, supplier_name: '---', purchase_date: '' });
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [purchaseId]);

  // Tự động tính tổng tiền nhập kho theo tổng các thành tiền
  useEffect(() => {
    if (Array.isArray(orderDetails)) {
      const total = orderDetails.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
      setOrderInfo(prev => prev ? { ...prev, total_amount: total } : null);
    }
  }, [orderDetails]);

      
  // Lắng nghe sự kiện phím tắt Escape để tự đóng cửa sổ Popup
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowAddPopup(false);
        setShowEditPopup(false);
        setShowCopyPopup(false);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  const formatNum = (val) => {
    return Number(val || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  };
  // --- LOGIC CHỈNH SỬA DÒNG ---
  const handleOpenEditPopup = (item, index) => {
    setEditingRowIndex(index);
    setPopupItem({
      ...item,
      quantity: Number(item.quantity) || 0,
      import_price: Number(item.import_price) || 0,
      total_amount: Number(item.total_amount) || 0,
      length_value: Number(item.length_value) || 0,
      width_value: Number(item.width_value) || 0,
      dien_tich: Number(item.dien_tich) || 0,
      notes: item.notes || ''
    });
    setShowEditPopup(true);
  };

  const handleEditPopupFieldChange = (field, value) => {
    setPopupItem(prev => {
      const updated = { ...prev };
      const numericFields = ['quantity', 'import_price', 'length_value', 'width_value'];
      if (numericFields.includes(field)) {
        updated[field] = value === '' ? 0 : parseFloat(value) || 0;
      } else {
        updated[field] = value;
      }

      if (updated.length_value > 0 && updated.width_value > 0) {
        updated.dien_tich = Number((updated.length_value * updated.width_value * updated.quantity / 1000000).toFixed(2));
      } else {
        updated.dien_tich = 0;
      }

      let calculatedAmount = 0;
      if (updated.dien_tich > 0) {
        calculatedAmount = updated.dien_tich * updated.import_price;
      } else {
        calculatedAmount = updated.quantity * updated.import_price;
      }
      updated.total_amount = Math.round(calculatedAmount);
      return updated;
    });
  };

    const handleSaveEditRow = async () => {
    const updatedDetails = [...orderDetails];
    updatedDetails[editingRowIndex] = { ...updatedDetails[editingRowIndex], ...popupItem };
    const newTotalAmount = updatedDetails.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
    const payload = { ...orderInfo, total_amount: newTotalAmount };

    try {
      // Gọi API cập nhật ngay lập tức khi bấm nút Lưu
      await axios.put(`http://localhost:5000/api/purchase-orders/${orderInfo.purchase_id}/update-details`, {
        orderInfo: payload,
        updatedDetails: updatedDetails
      });
      setOrderDetails(updatedDetails);
      setOrderInfo(payload);
      setShowEditPopup(false);
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật:", err);
      // Nếu API lỗi, vẫn cho cập nhật tạm trên giao diện và bật cờ tự lưu để cố gắng lưu lại khi thoát trang
      setOrderDetails(updatedDetails);
      setOrderInfo(payload);
      setShowEditPopup(false);
    }
  };


    // --- TÍNH NĂNG XÓA DÒNG VẬT TƯ (Bản chuẩn hóa loại bỏ hoàn toàn xung đột mạng) ---
    // --- TÍNH NĂNG XÓA DÒNG VẬT TƯ (Bản đồng bộ tổng tiền dòng cha tuyệt đối) ---
  const handleDeleteRow = async (index, item) => {
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn xóa vật tư mã [${item.product_code}] này không?`)) return;

    const detailId = item.id; 

    try {
      // 1. Gọi lệnh xóa thẳng lên Database
      const response = await axios.delete(`http://localhost:5000/api/purchase-order-details/${detailId}`);
      
      // 2. Lọc bỏ dòng vừa xóa trên mảng giao diện
      const updatedDetails = orderDetails.filter((_, i) => i !== index);
      setOrderDetails(updatedDetails);
      
      // 3. 🔥 ĐỒNG BỘ TIỀN ĐƠN MẸ: Lấy con số tiền tổng chuẩn xác từ Backend phản hồi về để hiển thị
      if (response.data && response.data.newTotalAmount !== undefined) {
        setOrderInfo(prev => prev ? { ...prev, total_amount: response.data.newTotalAmount } : null);
      } else {
        // Dự phòng nếu lỗi kết nối nhẹ: Tự tính toán hiển thị tạm ở Frontend
        const newTotalAmount = updatedDetails.reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
        setOrderInfo(prev => prev ? { ...prev, total_amount: newTotalAmount } : null);
      }

      console.log("🗑️ Đã xóa dòng chi tiết và đồng bộ tổng tiền đơn cha thành công!");

    } catch (err) {
      console.error("❌ Lỗi hệ thống khi xóa dòng vật tư:", err);
      alert(`❌ Không thể xóa dòng vật tư! Lỗi: ${err.response?.data?.error || err.message}`);
    }
  };

  // --- TÍNH NĂNG XÓA TOÀN BỘ ĐƠN HÀNG NHẬP KHO ---
const handleDeletePurchaseOrder = async () => {
  if (!window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA HOÀN TOÀN đơn nhập hàng #${purchaseId} này không? \nTất cả dữ liệu vật tư chi tiết bên trong cũng sẽ bị xóa sạch!`)) return;
  
  try {
    // Gọi API xóa đơn hàng mẹ (Khóa ngoại CASCADE sẽ tự dọn dẹp bảng con)
    await axios.delete(`http://localhost:5000/api/purchase-orders/${purchaseId}`);
    
    //alert("🎉 Đã xóa đơn nhập hàng thành công!");
    
    // Gọi callback để quay về giao diện danh sách đơn hàng
    if (typeof onBack === 'function') {
      onBack();
    }
  } catch (err) {
    console.error("❌ Lỗi hệ thống khi xóa đơn hàng:", err);
    alert(`❌ Không thể xóa đơn hàng! Lỗi: ${err.response?.data?.error || err.message}`);
  }
};


  // --- TÍNH NĂNG MỞ POPUP COPY DÒNG ---
  const handleOpenCopyPopup = (item) => {
    setPopupItem({
      ...item,
      quantity: Number(item.quantity) || 0,
      import_price: Number(item.import_price) || 0,
      total_amount: Number(item.total_amount) || 0,
      length_value: Number(item.length_value) || 0,
      width_value: Number(item.width_value) || 0,
      dien_tich: Number(item.dien_tich) || 0,
      notes: item.notes || ''
    });
    setShowCopyPopup(true);
  };

    const handleConfirmCopyProduct = async () => {
    // 🌟 ĐÃ SỬA: Ép dòng sao chép mới nhận ngày hôm nay thay vì lấy ngày đơn cha
  const safeDate = (() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();
    const payload = {
      purchase_id: purchaseId,
      purchase_date: safeDate,
      supplier_id: String(orderInfo?.supplier_id || '').trim(),
      product_code: popupItem.product_code,
      quantity: popupItem.quantity,
      import_price: popupItem.import_price,
      total_amount: popupItem.total_amount,
      notes: popupItem.notes || '',
      length_value: popupItem.length_value,
      width_value: popupItem.width_value,
      dien_tich: popupItem.dien_tich
    };

    try {
      const response = await axios.post('http://localhost:5000/api/purchase-order-details', payload);
      if (response.status === 201 || response.status === 200 || response.data) {
        
        // 1. Thêm dòng bản sao mới vào bảng chi tiết vật tư
        setOrderDetails(prev => [...prev, response.data.newRow || payload]);
        
        // 🔥 2. ĐỒNG BỘ HIỂN THỊ: Ép tổng tiền dòng cha thay đổi theo số tiền mới từ Backend gửi về
        if (response.data && response.data.newTotalAmount !== undefined) {
          setOrderInfo(prev => prev ? { ...prev, total_amount: response.data.newTotalAmount } : null);
        } else {
          // Phương án dự phòng nếu Backend chưa trả về newTotalAmount: Tự tính cộng dồn ở Frontend
          setOrderInfo(prev => {
            if (!prev) return null;
            const currentTotal = Number(prev.total_amount) || 0;
            const copiedAmount = Number(payload.total_amount) || 0;
            return { ...prev, total_amount: currentTotal + copiedAmount };
          });
        }

        setShowCopyPopup(false);
        console.log("👯 Sao chép dòng vật tư và cộng dồn tiền đơn cha thành công!");
      }
    } catch (err) {
      alert(`❌ Lỗi sao chép: ${err.response?.data?.message || err.message}`);
    }
  };

  // --- CÁC HÀM THAY ĐỔI CỦA POPUP THÊM MỚI ---
  const handlePopupFieldChange = (field, value) => {
    setPopupItem(prev => {
      let updated = { ...prev };
      const numericFields = ['quantity', 'import_price', 'length_value', 'width_value'];
      if (numericFields.includes(field)) {
        updated[field] = value === '' ? 0 : parseFloat(value) || 0;
      } else {
        updated[field] = value;
      }
      let qty = updated.quantity; let price = updated.import_price;
      let len = updated.length_value; let wid = updated.width_value;
      if (len > 0 && wid > 0) {
        updated.dien_tich = Number((qty * len * wid / 1000000).toFixed(2));
        updated.total_amount = Math.round(updated.dien_tich * price);
      } else {
        updated.dien_tich = 0; updated.total_amount = Math.round(qty * price);
      }
      return updated;
    });
  };

  const handleSelectProductInPopup = (prod) => {
    if (!prod) return;
    setPopupItem(prev => {
      let updated = {
        ...prev,
        product_code: prod.product_code || '',
        product_name: prod.product_name || '',
        import_price: parseFloat(prod.base_price || prod.import_price || 0)
      };
      let qty = updated.quantity; let price = updated.import_price;
      let len = updated.length_value; let wid = updated.width_value;
      if (len > 0 && wid > 0) {
        updated.dien_tich = Number((qty * len * wid / 1000000).toFixed(2));
        updated.total_amount = Math.round(updated.dien_tich * price);
      } else {
        updated.dien_tich = 0; updated.total_amount = Math.round(qty * price);
      }
      return updated;
    });
     //setIsDirty(true);
  };

    // 🔥 HÀM MỚI: Xử lý khi chọn đổi sản phẩm khác ngay trong Popup Chỉnh Sửa
  const handleSelectProductInEditPopup = (prod) => {
    if (!prod) return;
    setPopupItem(prev => {
      let updated = {
        ...prev,
        product_code: prod.product_code || '',
        product_name: prod.product_name || '',
        import_price: parseFloat(prod.base_price || prod.import_price || 0) // Lấy giá gốc làm gợi ý
      };
      
      let qty = updated.quantity; 
      let price = updated.import_price;
      let len = updated.length_value; 
      let wid = updated.width_value;

      // Tính toán lại diện tích và thành tiền cho sản phẩm mới thay thế
      if (len > 0 && wid > 0) {
        updated.dien_tich = Number((qty * len * wid / 1000000).toFixed(2));
        updated.total_amount = Math.round(updated.dien_tich * price);
      } else {
        updated.dien_tich = 0; 
        updated.total_amount = Math.round(qty * price);
      }
      return updated;
    });
  };


  const handlePopupPriceChange = (value) => {
    setPopupItem(prev => {
      let updated = { ...prev, import_price: value === '' ? '' : (parseFloat(value) || 0) };
      let qty = parseFloat(updated.quantity) || 0; let price = parseFloat(updated.import_price) || 0;
      let len = parseFloat(updated.length_value) || 0; let wid = parseFloat(updated.width_value) || 0;
      if (len > 0 && wid > 0) {
        updated.dien_tich = Number((qty * len * wid / 1000000).toFixed(2));
        updated.total_amount = Math.round(updated.dien_tich * price);
      } else {
        updated.dien_tich = 0; updated.total_amount = Math.round(qty * price);
      }
      return updated;
    });
  };

    const handleConfirmAddProduct = async () => {
    if (!popupItem.product_code) {
      alert('⚠️ Vui lòng tìm chọn sản phẩm vật tư!');
      return;
    }
    // 🌟 ĐÃ SỬA: Tự động lấy chuỗi ngày hiện tại của hôm nay (YYYY-MM-DD)
  const safeDate = (() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();
    const payload = {
      purchase_id: purchaseId,
      purchase_date: safeDate,
      supplier_id: String(orderInfo?.supplier_id).trim(),
      product_code: popupItem.product_code,
      quantity: popupItem.quantity,
      import_price: popupItem.import_price,
      total_amount: popupItem.total_amount,
      notes: popupItem.notes || '',
      length_value: popupItem.length_value,
      width_value: popupItem.width_value,
      dien_tich: popupItem.dien_tich
    };
    try {
      const response = await axios.post('http://localhost:5000/api/purchase-order-details', payload);
      if (response.status === 201 || response.status === 200 || response.data) {
        
        // 1. Cập nhật dòng con mới vào bảng chi tiết vật tư
        setOrderDetails(prev => [...prev, response.data.newRow || payload]);
        
        // 🔥 2. ĐỒNG BỘ HIỂN THỊ: Ép tổng tiền dòng cha hiển thị trên màn hình thay đổi theo số tiền mới từ Backend gửi về
        if (response.data && response.data.newTotalAmount !== undefined) {
          setOrderInfo(prev => prev ? { ...prev, total_amount: response.data.newTotalAmount } : null);
        } else {
          // Phương án dự phòng nếu Backend chưa trả về newTotalAmount: Tự tính cộng dồn ở Frontend
          setOrderInfo(prev => {
            if (!prev) return null;
            const currentTotal = Number(prev.total_amount) || 0;
            const addedAmount = Number(payload.total_amount) || 0;
            return { ...prev, total_amount: currentTotal + addedAmount };
          });
        }

        setShowAddPopup(false);
        setPopupItem({
          product_code: '', quantity: 0, length_value: 0,
          width_value: 0, dien_tich: 0, import_price: 0, total_amount: 0, notes: ''
        });
      }
    } catch (err) {
      alert(`❌ Lỗi hệ thống: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '20px', fontWeight: 'bold' }}>⏳ Đang tải dữ liệu đơn nhập...</div>;
  if (!orderInfo) return <div style={{ padding: '20px', color: 'red' }}>❌ Không tìm thấy thông tin đơn nhập #{purchaseId}</div>;

  const rawDate = orderInfo?.purchase_date || orderInfo?.ngay_nhap;
const displayDate = (() => {
  if (!rawDate) return '---';
  // Nếu ngày chứa giờ 'T' hoặc khoảng trắng, chỉ lấy 10 ký tự YYYY-MM-DD
  const cleanDate = String(rawDate).split(/[T ]/)[0]; 
  const [yyyy, mm, dd] = cleanDate.split('-');
  return `${dd}/${mm}/${yyyy}`; // Tự chuyển đổi chuỗi chữ sang định dạng VN dd/mm/yyyy chuẩn 100%
})();
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
        <button onClick={onBack} 
        style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          ⬅️ Quay Lại Danh Sách</button>
        <button onClick={() => window.print()} 
        style={{ padding: '8px 16px', backgroundColor: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          🖨️ In Phiếu Nhập Kho</button>

          {/* 🔥 NÚT XÓA ĐƠN HÀNG ĐƯỢC THÊM VÀO ĐÂY */}
  <button onClick={handleDeletePurchaseOrder} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
    🗑️ Xóa Đơn Hàng
  </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ margin: '4px 0' }}><strong>Mã Đơn Nhập:</strong> {purchaseId}</div>
          <div style={{ margin: '4px 0' }}><strong>Nhà Cung Cấp:</strong> {orderInfo?.supplier_name || '---'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ margin: '4px 0' }}><strong>Ngày Nhập Kho:</strong> {displayDate}</div>
          <div style={{ margin: '4px 0' }}><strong>Ghi Chú Đơn:</strong> {orderInfo?.notes || '---'}</div>
        </div>
      </div>

      <h3 style={{ color: '#334155', marginBottom: '10px' }}>📋 Danh Sách Vật Tư Nhập Chi Tiết</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
            <th style={{ padding: '10px', textAlign: 'center' }}>STT</th>
            <th style={{  padding: '10px', textAlign: 'left' }}>Sản Phẩm</th>
            <th style={{  padding: '10px', textAlign: 'center' }}>Số Lượng</th>
            <th style={{  padding: '10px', textAlign: 'right' }}>Giá Nhập</th>
            <th style={{  padding: '10px', textAlign: 'right' }}>Thành Tiền</th>
            <th style={{  padding: '10px', textAlign: 'right' }}>Ghi chú</th>
            <th style={{  padding: '10px', textAlign: 'center' }}>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(orderDetails) && orderDetails.length > 0 ? (
            orderDetails.map((item, index) => (
              <NhapHangRow
                key={`${item.product_code}-${item.id || index}`}
                item={item} index={index} products={products} formatNum={formatNum}
                onViewDetail={onViewDetail} onOpenEdit={handleOpenEditPopup}
                onDelete={handleDeleteRow} onCopy={handleOpenCopyPopup}
              />
            ))
          ) : (
            <tr><td colSpan="8" style={{ padding: '20px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>Đang nạp danh sách dữ liệu vật tư chi tiết...</td></tr>
          )}
          <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
            <td colSpan="5" style={{  padding: '12px', textAlign: 'right' }}>TỔNG TIỀN :</td>
            <td colSpan="2" style={{  padding: '12px', textAlign: 'right', color: '#dc2626', fontSize: '1.1rem', fontWeight: 'bold' }}>
              {Number(orderInfo?.total_amount || 0).toLocaleString('vi-VN')} đ
            </td>
          </tr>
        </tbody>
      </table>

        {/* NÚT THÊM SẢN PHẨM GHIM CỐ ĐỊNH CHÍNH GIỮA MÉP DƯỚI MÀN HÌNH MỚI */}
  <div style={{
    position: 'fixed',
    bottom: '25px',         // Cách cạnh dưới màn hình 25px
    left: '50%',            // Đẩy sang phải 50% màn hình
    transform: 'translateX(-50%)', // Kéo ngược lại nửa chiều rộng nút để căn chuẩn tâm 100%
    zIndex: 1001,           // Đặt số lớn để nổi lên trên bảng dữ liệu vật tư khi cuộn chuột
    pointerEvents: 'none'   // Giúp người dùng click xuyên qua vùng trống xung quanh nút bình thường
  }}>
    <button 
      type="button" 
      onClick={() => {
        // Reset lại dữ liệu ô nhập về trống trước khi bung Popup
        setPopupItem({ 
          product_code: '', quantity: 0, length_value: 0, width_value: 0,
          dien_tich: 0, import_price: 0, total_amount: 0, notes: '' 
        });
        setShowAddPopup(true); // Kích hoạt mở Popup Thêm mới vật tư
      }} 
      style={{ 
        pointerEvents: 'auto', // Bật lại tính năng bấm chuột cho riêng nút
        padding: '12px 32px',
        backgroundColor: '#23a948', // Giữ nguyên tông màu xanh lá chuẩn của trang nhập kho cũ
        color: '#fff', 
        border: 'none',
        borderRadius: '50px', // Đổi sang cấu trúc bo tròn hình viên thuốc hiện đại
        cursor: 'pointer', 
        fontWeight: 'bold', 
        fontSize: '1rem', 
        display: 'flex',
        alignItems: 'center', 
        gap: '8px', 
        whiteSpace: 'nowrap', // Chặn việc chữ bị vỡ dòng khi co giãn trình duyệt
        boxShadow: '0 6px 20px rgba(35, 169, 72, 0.45)', // Đổ bóng mờ mịn tạo hiệu ứng nổi
        transition: 'all 0.2s ease-in-out'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.06)'; // Hiệu ứng phóng to nhẹ khi di chuột
        e.currentTarget.style.backgroundColor = '#1e8e3c'; // Đậm nền lên một tông
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.backgroundColor = '#23a948';
      }}
    >
      ➕ Thêm sản phẩm
    </button>
  </div>



      {/* --- POPUP THÊM MỚI --- */}
      {showAddPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>📋 Thêm Sản Phẩm Vào Đơn Nhập</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '15px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '4px' }}>Chọn Vật Tư Sản Phẩm:</label>
                <ProductSearchInput 
                item={popupItem}  
                onSelectProduct={handleSelectProductInPopup} 
                placeholder="Gõ tìm mã hoặc tên vật tư..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Số Lượng:</label>
                  <input type="number" value={popupItem.quantity || ''} placeholder="0" onChange={(e) => handlePopupFieldChange('quantity', e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', display: 'block', marginBottom: '4px' }}>Giá Nhập (đ):</label>
                  <input type="number" placeholder="Nhập đơn giá..." value={popupItem.import_price !== undefined ? popupItem.import_price : ''} onChange={(e) => handlePopupPriceChange(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontWeight: 'bold', color: '#dc2626' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Chiều Dài (m):</label>
                  <input type="number" step="any" value={popupItem.length_value || ''} placeholder="0" onChange={(e) => handlePopupFieldChange('length_value', e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Chiều Rộng (m):</label>
                  <input type="number" step="any" value={popupItem.width_value || ''} placeholder="0" onChange={(e) => handlePopupFieldChange('width_value', e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>📐 Diện Tích: <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{popupItem.dien_tich} m²</span></p>
                <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>💰 Thành Tiền: <span style={{ fontWeight: 'bold', color: '#dc2626' }}>{popupItem.total_amount.toLocaleString('vi-VN')} đ</span></p>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Ghi Chú Vật Tư:</label>
                <input type="text" value={popupItem.notes || ''} onChange={(e) => handlePopupFieldChange('notes', e.target.value)} style={{ width: '100%', padding: '6px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
              <button onClick={() => setShowAddPopup(false)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy Bỏ</button>
              <button onClick={handleConfirmAddProduct} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Xác Nhận Thêm</button>
            </div>
          </div>
        </div>
      )}
       {/* --- POPUP CHỈNH SỬA (Đã mở khóa cho phép đổi sản phẩm) --- */}
      {showEditPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>📝 Chỉnh Sửa Vật Tư Nhập Kho</h3>
            
            {/* 🔥 THAY ĐỔI TẠI ĐÂY: Cho phép tìm kiếm và đổi sản phẩm ngay khi đang sửa */}
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Vật Tư Sản Phẩm (Bấm vào để đổi):</label>
              <ProductSearchInput 
                item={popupItem} 
                onSelectProduct={handleSelectProductInEditPopup} 
                placeholder="Gõ tìm mã hoặc tên vật tư khác..." 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Số Lượng Tấm/Cây:</label>
                <input type="number" value={popupItem.quantity || ''} onChange={(e) => handleEditPopupFieldChange('quantity', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Đơn Giá Nhập (đ):</label>
                <input type="number" value={popupItem.import_price || ''} onChange={(e) => handleEditPopupFieldChange('import_price', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Chiều Dài (m):</label>
                <input type="number" value={popupItem.length_value || ''} onChange={(e) => handleEditPopupFieldChange('length_value', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Chiều Rộng (m):</label>
                <input type="number" value={popupItem.width_value || ''} onChange={(e) => handleEditPopupFieldChange('width_value', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', marginBottom: '15px' }}>
              <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>📐 Diện Tích quy đổi: <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{popupItem.dien_tich} m²</span></p>
              <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>💰 Thành Tiền dòng: <span style={{ fontWeight: 'bold', color: '#dc2626' }}>{popupItem.total_amount.toLocaleString('vi-VN')} đ</span></p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Ghi chú vật tư:</label>
              <input type="text" value={popupItem.notes || ''} onChange={(e) => handleEditPopupFieldChange('notes', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowEditPopup(false)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Hủy Bỏ</button>
              <button type="button" onClick={handleSaveEditRow} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Xác Nhận Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP COPY DÒNG --- */}
      {showCopyPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#16a34a', borderBottom: '2px solid #16a34a', paddingBottom: '10px' }}>👯 Sao Chép Vật Tư Thành Dòng Mới</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Mã Sản Phẩm:</label>
                <input type="text" value={popupItem.product_code} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Số Lượng:</label>
                <input type="number" value={popupItem.quantity || ''} onChange={(e) => handleEditPopupFieldChange('quantity', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Chiều Dài (m):</label>
                <input type="number" value={popupItem.length_value || ''} onChange={(e) => handleEditPopupFieldChange('length_value', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Chiều Rộng (m):</label>
                <input type="number" value={popupItem.width_value || ''} onChange={(e) => handleEditPopupFieldChange('width_value', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Diện Tích (m²):</label>
                <input type="number" value={popupItem.dien_tich || ''} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 'bold' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Đơn Giá Nhập (đ):</label>
                <input type="number" value={popupItem.import_price || ''} onChange={(e) => handleEditPopupFieldChange('import_price', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Thành Tiền Tổng (đ):</label>
              <input type="text" value={Number(popupItem.total_amount || 0).toLocaleString('vi-VN') + ' đ'} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fdf2f2', color: '#dc2626', fontWeight: 'bold', fontSize: '1.1rem' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>Ghi chú vật tư:</label>
              <input type="text" value={popupItem.notes} onChange={(e) => handleEditPopupFieldChange('notes', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowCopyPopup(false)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Hủy Bỏ</button>
              <button type="button" onClick={handleConfirmCopyProduct} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Xác Nhận Thêm Mới</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media print { button, .action-buttons { display: none !important; } body { background-color: #fff; padding: 0; } @page { margin: 15mm 10mm; } }`}</style>
    </div>
  );
};

export default ChiTietNhapHangPage;
// --- COMPONENT TÌM KIẾM ĐỘNG TỪ API (HỖ TRỢ TÌM CẢ MÃ + TÊN SIÊU MƯỢT, CHỐNG LAG KHÔNG CẦN TRUYỀN MẢNG PRODUCTS) ---
// --- COMPONENT TÌM KIẾM ĐỘNG TỪ API (ĐÃ TÍCH HỢP HÌNH ẢNH, TỒN KHO & MỞ RỘNG KHUNG) ---
const ProductSearchInput = ({ item, onSelectProduct, placeholder }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [typedText, setTypedText] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]); // State lưu danh sách sản phẩm lấy từ API
  const [isSearching, setIsSearching] = React.useState(false);

  // Hiển thị tên sản phẩm hiện tại (nếu đang đóng) hoặc chữ người dùng đang gõ (nếu đang mở popup)
  const displayName = isOpen ? typedText : (item?.product_name || item?.product_code || '');

  // 🔥 TỰ ĐỘNG GỌI API BACKEND KHI NGƯỜI DÙNG GÕ CHỮ
  useEffect(() => {
    if (!isOpen) return;
    
    // Cơ chế Debounce: Đợi người dùng dừng gõ phím 0.3 giây mới gọi mạng, tránh lag hệ thống
    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsSearching(true);
        const keyword = typedText.trim(); // Làm sạch khoảng trắng thừa
        
        // Gọi thẳng vào API sản phẩm có sẵn của bạn, truyền từ khóa search và lấy tối đa 20 dòng để chống lag
        const response = await axios.get(`http://localhost:5000/api/products?search=${encodeURIComponent(keyword)}&limit=20&page=1`);
        
        // Đón nhận cấu trúc dữ liệu Object bọc mảng { data: [...] } từ server.js của bạn
        if (response.data && response.data.data) {
          setSearchResults(response.data.data);
        } else if (Array.isArray(response.data)) {
          setSearchResults(response.data);
        }
      } catch (err) {
        console.error("❌ Lỗi tìm kiếm sản phẩm:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [typedText, isOpen]);

  return (
    <div style={{ position: 'relative', overflow: 'visible', width: '100%' }}>
      <input
        type="text"
        placeholder={placeholder || "Gõ mã hoặc tên để tìm..."}
        value={displayName}
        onChange={(e) => { setTypedText(e.target.value); setIsOpen(true); }}
        onFocus={() => { setTypedText(item?.product_name || ''); setIsOpen(true); }} // Gợi ý tên cũ để người dùng sửa nếu muốn
        onKeyDown={(e) => { 
          if (e.key === 'Escape') { 
            e.preventDefault(); 
            setIsOpen(false); 
            e.currentTarget.blur(); 
          } 
        }}
        style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #2196F3', fontWeight: 'bold' }}
        required
      />

      {isOpen && (
        <div className="product-dropdown-container" style={{ 
          position: 'absolute', 
          zIndex: 999999, // Ép nổi lên trên tất cả các ô input khác
          top: '100%', 
          left: '0', 
          width: '550px', // 🛠️ ĐÃ MỞ RỘNG ĐỘ RỘNG KHUNG ĐỂ CHỨA VỪA ẢNH VÀ TỒN KHO
          backgroundColor: '#fff', 
          border: '2px solid #2196F3', 
          borderRadius: '6px', 
          maxHeight: '250px', // Giới hạn chiều cao vừa vặn
          overflowY: 'auto', // Tự cuộn đứng khi danh sách dài
          boxShadow: '0 6px 16px rgba(0,0,0,0.15)', 
          marginTop: '4px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f1f1f1', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
            <span style={{ color: '#666' }}>{isSearching ? "⏳ Đang quét kho dữ liệu..." : `🔍 Tìm thấy ${searchResults.length} vật tư`}</span>
            <span style={{ cursor: 'pointer', color: '#dc3545' }} onClick={() => setIsOpen(false)}>[✕ Đóng]</span>
          </div>

          {searchResults.length > 0 ? (
            searchResults.map(p => (
              <div
                key={p.product_code}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (typeof onSelectProduct === 'function') onSelectProduct(p);
                  setIsOpen(false);
                }}
                style={{ 
                  padding: '8px 12px', 
                  cursor: 'pointer', 
                  borderBottom: '1px solid #edf2f7',
                  display: 'flex', 
                  alignItems: 'center', 
                  backgroundColor: '#fff',
                  gap: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eef5ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                {/* 📸 1. THÊM HÌNH ẢNH SẢN PHẨM PHÍA BÊN TRÁI */}
                <img
                  src={p.product_image || 'https://placeholder.com'}
                  alt={p.product_name}
                  style={{
                    width: '42px',
                    height: '42px',
                    objectFit: 'cover', // Giúp ảnh không bị méo tỉ lệ
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    flexShrink: 0
                  }}
                  onError={(e) => { e.target.src = 'https://placeholder.com'; }} // Dự phòng khi link ảnh die
                />

                {/* 📝 2. HIỂN THỊ MÃ VÀ TÊN SẢN PHẨM PHẦN THÂN TRUNG TÂM */}
                <div style={{ textAlign: 'left', flex: 1, fontSize: '0.9rem', lineHeight: '1.4' }}>
                  <span style={{ color: '#007bff', fontWeight: 'bold' }}>[{p.product_code}]</span> — {p.product_name}
                </div>

                {/* 📦 3. THÊM THÔNG TIN TỒN KHO & GIÁ VỀ PHÍA BÊN PHẢI */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: (Number(p.TonKho || p.ton_kho || 0) <= 0) ? '#dc3545' : '#1b0691', 
                    fontWeight: 'bold' 
                  }}>
                    📦 Kho: {Number(p.TonKho || p.ton_kho || 0).toFixed(2)}
                  </span>
                  {(p.base_price || p.import_price) && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                      Giá gốc: {Number(p.base_price || p.import_price).toLocaleString('vi-VN')} đ
                    </span>
                  )}
                </div>

              </div>
            ))
          ) : (
            <div style={{ padding: '15px', color: '#999', textAlign: 'center', fontSize: '0.9rem' }}>
              {isSearching ? "⏳ Hệ thống đang quét dữ liệu kho..." : "❌ Không tìm thấy vật tư phù hợp!"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// --- COMPONENT DÒNG BẢNG CHI TIẾT ---
const NhapHangRow = React.memo(({ item, index, products = [], formatNum, onViewDetail, onOpenEdit, onDelete, onCopy }) => {
  const matchProd = Array.isArray(products) ? products.find(p => p && p.product_code === item.product_code) : null;
  const displayProdName = item.product_name || matchProd?.product_name || 'Vật tư chưa phân loại';

  return (
    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
      <td onClick={() => onOpenEdit(item, index)} style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', cursor: 'pointer' }}>{index + 1}</td>
      <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="dynamic-product-link"
            style={{ color: '#000307', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => onViewDetail && onViewDetail(item.product_code)}
          >
            {displayProdName}
          </span>
        </div>
      </td>
      <td onClick={() => onOpenEdit(item, index)} style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', cursor: 'pointer' }}>{typeof formatNum === 'function' ? formatNum(item.quantity) : item.quantity}</td>
      <td onClick={() => onOpenEdit(item, index)} style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'right', cursor: 'pointer' }}>{typeof formatNum === 'function' ? formatNum(item.import_price) : item.import_price} đ</td>
      <td onClick={() => onOpenEdit(item, index)} style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'right', fontWeight: '500', cursor: 'pointer' }}>{typeof formatNum === 'function' ? formatNum(item.total_amount) : item.total_amount} đ</td>
<td onClick={() => onOpenEdit(item, index)} style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'left', cursor: 'pointer' }}>
  {item.notes || '---'}
</td>

      {/* Nút hành động nhanh trên từng dòng */}
      <td className="action-buttons" style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <button type="button" title="Sửa" onClick={() => onOpenEdit(item, index)} style={{ padding: '4px 8px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>✏️</button>
          <button type="button" title="Copy" onClick={() => onCopy(item)} style={{ padding: '4px 8px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>+</button>
          <button type="button" title="Xóa" onClick={() => onDelete(index, item)} style={{ padding: '4px 8px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
        </div>
      </td>
    </tr>
  );
});

