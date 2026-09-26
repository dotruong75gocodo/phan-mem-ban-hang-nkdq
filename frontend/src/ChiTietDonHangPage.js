import React, { useState, useEffect, useRef, useMemo  } from 'react';
import axios from 'axios';

// Hàm hỗ trợ tìm kiếm không dấu đồng bộ hệ thống
const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
};
const initialPopupState = {
  product_code: '',
  product_name: '',
  customer_slice: '',
  quantity: '',       // Để rỗng để ô input hiện placeholder đẹp hơn
  length_mm: '',
  width_value: '',
  length_value: '',
  piece_quantity: '',
  price: '',
  total_amount: 0,
  specification: '',
  converted_quantity: 0,
  tien_goc: 0,
  profit: 0,
  chiet_khau: '',
  phi_ship: '',
  detail_slice: ''
};


const ChiTietDonHangPage = ({ orderId, onBack, onViewDetail,onViewCustomerDetail}) => {
  const [orderInfo, setOrderInfo] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Thêm State để kiểm soát thông báo tự đóng
  const [toastMessage, setToastMessage] = useState('');
  // State quản lý xem dòng (row) nào đang được click mở dropdown tìm sản phẩm
// State lưu trữ thông tin sản phẩm con đang được chọn để copy chỉnh sửa
const [copyProductData, setCopyProductData] = useState(null);
const [showCopyPopup, setShowCopyPopup] = useState(false);
// State quản lý ẩn/hiện popup chỉnh sửa và lưu dữ liệu dòng đang sửa
const [showEditPopup, setShowEditPopup] = useState(false);
const [editingRowIndex, setEditingRowIndex] = useState(null);
  // 🌟 KHAI BÁO THÊM REF ĐỂ PHỤC VỤ TỰ ĐỘNG LƯU KHI RỜI TRANG
  const latestDetailsRef = useRef(orderDetails);
  const latestOrderInfoRef = useRef(orderInfo);
  // State quản lý việc ẩn/hiện khung chỉnh sửa khách hàng (Mặc định là false - ẩn)

// 🌟 TẠO BỘ TỪ ĐIỂN TRA CỨU 5.000 SẢN PHẨM TRONG 1 MILIGIÂY
const productMap = useMemo(() => {
  const map = {};
  if (Array.isArray(products)) {
    products.forEach(p => {
      if (p && p.product_code) {
        // Biến mã sản phẩm thành chữ thường để so sánh không lo lệch chữ hoa/thường
        map[String(p.product_code).trim().toLowerCase()] = p.product_name || p.ten_sp;
      }
    });
  }
  return map;
}, [products]); // Chỉ tính toán lại đúng 1 lần khi mở trang


// Đặt đoạn này ngay dưới các dòng import đầu file ChiTietDonHangPage.js
const AVAILABLE_SLICES = [
  { value: 'bao gia', label: 'Báo giá' },
  { value: 'xuat', label: 'xuất' },
  { value: 'no', label: 'nợ' },
];
// State quản lý ẩn/hiện cửa sổ Popup
const [showAddPopup, setShowAddPopup] = useState(false);
// Đặt biến này ở ngoài cùng hoặc đầu Component để làm sạch Form dễ dàng

const handleClosePopupAndReset = () => {
  setPopupItem(initialPopupState); // Xóa sạch bộ nhớ giá trị cũ
  setShowAddPopup(false);          // Ẩn popup
};


// State quản lý dữ liệu tạm thời của sản phẩm đang nhập trong Popup
const [popupItem, setPopupItem] = useState({
  product_code: '',
  quantity: 0,
  length_mm: 0,
  width_value: 0,
  length_value: 0,
  piece_quantity: 0,
  price: 0,
  total_amount: 0,
  specification: 0,
  detail_slice: '',
  customer_slice: '',
  specification: 0,
 converted_quantity: 0,
 tien_goc: 0,
 profit: 0
});


  // Quản lý vị trí dòng khách hàng đang được chọn bằng phím mũi tên (Mặc định là -1 tức là chưa chọn dòng nào)
const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // 🌟 CẬP NHẬT LIÊN TỤC DỮ LIỆU MỚI NHẤT VÀO REF KHI STATE THAY ĐỔI
  useEffect(() => {
    latestDetailsRef.current = orderDetails;
  }, [orderDetails]);

  useEffect(() => {
    latestOrderInfoRef.current = orderInfo;
  }, [orderInfo]);

  // ĐẶT Ở ĐÂY: Ngay dưới các dòng khai báo useState của ChiTietDonHangPage
const fetchProducts = async (searchTerm = '') => {
  try {
    const res = await axios.get(`http://localhost:5000/api/products?search=${encodeURIComponent(searchTerm)}`);
    if (Array.isArray(res.data)) {
      setProducts(res.data);
    } else if (res.data && Array.isArray(res.data.data)) {
      setProducts(res.data.data);
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối API tìm kiếm sản phẩm:", err);
  }
};
// 🚀 Hàm tra cứu danh sách khách hàng từ MySQL Backend



  // 1. Tải tất cả dữ liệu từ Backend khi mở trang
  // 1. Tải tất cả dữ liệu từ Backend khi mở trang
// 🛠️ Thay thế toàn bộ khối useEffect tải dữ liệu cũ bằng đoạn này:
useEffect(() => {
 const fetchAllData = async () => {
   try {
     setLoading(true); // [INDEX]
     
     // SỬA TẠI ĐÂY: Thay vì lấy cả danh sách orders trang 1, ta gọi API tìm kiếm đích danh theo mã orderId
     const [resProd, resOrderSearch, resDetails, resCustomers] = await Promise.all([
       axios.get('http://localhost:5000/api/products'), // [INDEX]
       axios.get(`http://localhost:5000/api/orders?search=${encodeURIComponent(orderId)}`), // <--- Thay đổi dòng này
       axios.get(`http://localhost:5000/api/orders/${orderId}/details`), // [INDEX]
       axios.get('http://localhost:5000/api/customers') // [INDEX]
     ]);

     // 1. Xử lý danh sách sản phẩm con (Đang chạy đúng, giữ nguyên)
     const detailsList = Array.isArray(resDetails.data.data) ? resDetails.data.data : (Array.isArray(resDetails.data) ? resDetails.data : []); // [INDEX]
     setOrderDetails(detailsList); // [INDEX]

     // 2. SỬA LẠI LOGIC XỬ LÝ ĐƠN HÀNG MẸ (Sửa lỗi Tổng tiền = 0 và sai tên Khách hàng)
     const searchList = resOrderSearch.data?.data || resOrderSearch.data || [];
     const foundOrder = Array.isArray(searchList)
       ? searchList.find((o) => String(o.order_id).trim() === String(orderId).trim())
       : searchList;

     if (foundOrder && foundOrder.order_id) {
       const systemCustomers = Array.isArray(resCustomers.data) ? resCustomers.data : (resCustomers.data?.data || []);
       
       // Khớp tìm tên khách hàng thật từ hệ thống
       const matchedCustomer = systemCustomers.find(
         (c) => String(c.customer_id).trim().toLowerCase() === String(foundOrder.customer_id).trim().toLowerCase()
       );

       // Nạp đầy đủ thông tin chuẩn từ DB (tổng tiền, nợ cũ,...) vào State đơn mẹ
       const updatedOrderInfo = {
         ...foundOrder,
         customer_name: foundOrder.customer_name || (matchedCustomer ? matchedCustomer.customer_name : `KH: ${foundOrder.customer_id}`)
       };
       
       setOrderInfo(updatedOrderInfo); // [INDEX]
     } else {
       // Phương án dự phòng tự động tính tiền từ dòng con nếu DB bị khuyết đơn mẹ
       const calculatedTotal = detailsList.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
       setOrderInfo({ 
         order_id: orderId, 
         customer_name: 'Khách lẻ', 
         total_amount: calculatedTotal,
         net_amount: calculatedTotal
       });
     }

   } catch (err) {
     console.error("❌ Lỗi tải chi tiết đơn hàng cũ:", err); // [INDEX]
     setOrderInfo({ order_id: orderId, customer_name: '---', order_date: '', total_amount: 0 }); // [INDEX]
   } finally {
     setLoading(false); // [INDEX]
   }
 };

 if (orderId) fetchAllData(); // [INDEX]
}, [orderId]);


  // 🌟 KÍCH HOẠT TỰ ĐỘNG LƯU ĐƠN HÀNG XUỐNG MYSQL KHI RỜI KHỎI TRANG (ĐÃ SỬA CHẶN LỖI)
useEffect(() => {
  return () => {
    const details = latestDetailsRef.current;
    const info = latestOrderInfoRef.current;
    
    // 🛑 RÀO CHẮN AN TOÀN: Kiểm tra nghiêm ngặt thông tin đơn hàng mẹ
    if (!info || !info.order_id || String(info.order_id).trim() === "" || info.order_id === "undefined") {
      console.log("⚠️ [Tự động lưu] Từ chối lưu ngầm vì mã đơn hàng (order_id) trống hoặc không hợp lệ!");
      return; // Thoát ngay lập tức, không cho phép gọi API gửi đè dữ liệu rỗng
    }

    if (!info.customer_id || String(info.customer_id).trim() === "") {
      console.log("⚠️ [Tự động lưu] Từ chối lưu ngầm vì không xác định được mã khách hàng!");
      return; 
    }

    // Điều kiện an toàn: Đơn hàng phải tồn tại và có ít nhất 1 mặt hàng mới lưu
    if (details && details.length > 0) {
      
      const safeNum = (val) => { const parsed = parseFloat(val); return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed; };
      
      const cleanOrderInfo = {
        ...info,
        net_amount: safeNum(info.net_amount),
        old_debt: safeNum(info.old_debt),
        total_amount: safeNum(info.total_amount),
        customer_paid: safeNum(info.customer_paid),
        current_debt: safeNum(info.current_debt),
        order_slice: info.order_slice || '',
        notes: info.notes || ''
      };

      const cleanDetails = details.map(item => ({
        ...item,
        order_date: item.order_date ? String(item.order_date).slice(0, 10) : new Date().toLocaleDateString('en-CA'),
      
        quantity: safeNum(item.quantity),
        length_mm: safeNum(item.length_mm),
        width_value: safeNum(item.width_value),
        length_value: safeNum(item.length_value),
        piece_quantity: safeNum(item.piece_quantity),
        total_length: safeNum(item.total_length),
        price: safeNum(item.price),
        total_amount: safeNum(item.total_amount),
        converted_quantity: safeNum(item.converted_quantity),
        profit: safeNum(item.profit),
        tien_goc: safeNum(item.tien_goc),
        chiet_khau: safeNum(item.chiet_khau),
        phi_ship: safeNum(item.phi_ship),
        specification: isNaN(parseFloat(item.specification)) ? 0 : parseFloat(item.specification), 
        detail_slice: item.detail_slice || ''
      }));

      // Tính toán số liệu tổng
      const calculatedNetAmount = cleanDetails.reduce((sum, item) => {
        return sum + (item.total_amount - item.chiet_khau);
      }, 0);
      
      const calculatedTotalAmount = calculatedNetAmount + safeNum(info.old_debt);
      const calculatedCurrentDebt = info.order_slice === 'no'
        ? (calculatedTotalAmount - safeNum(info.customer_paid))
        : 0;

      // Chỉ thực thi PUT khi mọi thứ đã được chứng thực an toàn
      axios.put(`/api/orders/${cleanOrderInfo.order_id}/update-details`, {
        orderInfo: cleanOrderInfo,
        updatedDetails: cleanDetails
      })
      .then(() => {
        console.log(`🚀 [Tự động] Đã lưu ngầm đơn hàng #${cleanOrderInfo.order_id} thành công!`);
      })
      .catch((error) => {
        console.error("❌ Lỗi tự động lưu đơn hàng khi rời trang:", error);
      });
    }
  };
}, []); 


  // Hàm hiển thị thông báo tự đóng sau 1 giây (1000ms)
  const showAutoCloseToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 1000);
  };

  // Logic đóng dropdown an toàn khi click chuột ra ngoài vùng tương tác
   // 🌟 KHỐI LẮNG NGHE SỰ KIỆN PHÍM ESC VÀ CLICK CHUỘT RA NGOÀI (ĐÃ CẬP NHẬT TÁC VỤ POPUP)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.classList.contains('customer-search-input') &&
          !event.target.closest('.customer-dropdown-container')) {
        // Giữ nguyên logic đóng dropdown khách hàng của bạn
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        // 1. Tắt dropdown khách hàng thông minh (Logic cũ của bạn)
        
        // 2. Tắt lập tức tất cả các cửa sổ Popup đang mở trên giao diện
        setShowAddPopup(false);   // Tắt cửa sổ Thêm mới vật tư
        setShowEditPopup(false);  // Tắt cửa sổ Sửa vật tư
        setShowCopyPopup(false);  // Tắt cửa sổ Sao chép/Copy dòng
        
        // 3. Reset lại chỉ số hàng vật tư đang tương tác về trống
        setEditingRowIndex(null);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showAddPopup, showEditPopup, showCopyPopup]); // 🌟 QUAN TRỌNG: Nạp các biến popup vào đây để React luôn nhận diện phím Esc khi bật popup

  // 2. Hàm hỗ trợ: Xác định giá bán từ sản phẩm gốc dựa vào phân đoạn khách hàng
  // 🌟 HÀM TÍNH GIÁ MỚI: Sửa bộ lọc ép bốc giá theo phân đoạn customer_slice xịn
// 🌟 HÀM TÍNH GIÁ MỚI: Tối ưu bộ lọc kích thước và phân đoạn khách hàng (Chạy được khi qty = 0)
// 🌟 HÀM TÍNH GIÁ TỰ ĐIỀN THEO ĐÚNG LOGIC CỦA BA
const determineProductPrice = (prod, sliceKH, qty, lengthMm, widthVal) => {
  if (!prod) return 0;

  // 1. Lấy các cột giá từ danh mục sản phẩm (ép kiểu số để tránh lỗi tính toán)
  const giaGoc = Number(prod.base_price) || 0;     // base_price
  const giaSi = Number(prod.wholesale_price) || 0;  // wholesale_price
  const giaLe = Number(prod.retail_price) || 0;     // retail_price
  const giaLang = Number(prod.weight_price) || 0;   // weight_price
  const giaMet = Number(prod.GiaMet) || 0;         // GiaMet

  // 2. Chuẩn hóa phân đoạn khách hàng và phân đoạn sản phẩm về chữ thường sạch sẽ
  const cleanSlice = String(sliceKH || '').trim().toLowerCase();
  const loaiSanPham = String(prod.product_slice || '').trim().toLowerCase();

  // Chuyển đổi kích thước nhập vào về kiểu số để so sánh
  const q = Number(qty) || 0;
  const lenMm = Number(lengthMm) || 0;
  const w = Number(widthVal) || 0;

  // 3. BẮT ĐẦU LUỒNG KIỂM TRA 5 ĐIỀU KIỆN CỦA BA:

  // --- Trường hợp 1: quantity <> 0, length_mm = 0, width_value = 0 ---
  if (q !== 0 && lenMm === 0 && w === 0) {
    if (cleanSlice.includes('si')) return giaSi;
    if (cleanSlice.includes('goc')) return giaGoc;
    return giaLe; // Trường hợp trống hoặc khác
  }

  // --- Trường hợp 2: quantity <> 0, length_mm <> 0, width_value <> 0 ---
  if (q !== 0 && lenMm !== 0 && w !== 0) {
    // Nếu là alu thì lấy giá lạng (weight_price) không cần xét phân đoạn khách
    if (loaiSanPham === 'alu') {
      return giaLang;
    }
    // Không phải alu thì xét theo phân đoạn khách hàng
    if (cleanSlice.includes('si')) return giaSi;
    if (cleanSlice.includes('goc')) return giaGoc;
    return giaLe;
  }

  // --- Trường hợp 3: quantity <> 0, length_mm <> 0, width_value = 0 ---
  if (q !== 0 && lenMm !== 0 && w === 0) {
    if (cleanSlice.includes('si')) return giaSi;
    if (cleanSlice.includes('goc')) return giaGoc;
    return giaLe;
  }

  // --- Trường hợp 4: quantity = 0, length_mm <> 0, width_value = 0 ---
  if (q === 0 && lenMm !== 0 && w === 0) {
    return giaMet;
  }

  // --- Trường hợp 5: quantity = 0, length_mm = 0, width_value <> 0 ---
  if (q === 0 && lenMm === 0 && w !== 0) {
    return giaLang;
  }
   
  return giaMet
};



  // 3. Hàm tính toán lại số liệu cho từng dòng vật tư khi chỉnh sửa
  const calculateRowMetrics = (items, index) => {
    const item = items[index];
    
    let qty = parseFloat(item.quantity);
    if (isNaN(qty)) qty = 0;
    
    let price = parseFloat(item.price);
    if (isNaN(price)) price = 0;
    
    let pcs = parseInt(item.piece_quantity);
    if (isNaN(pcs)) pcs = 0;
    
    let length_mm = parseFloat(item.length_mm);
    if (isNaN(length_mm)) length_mm = 0;
    
    let width_value = parseFloat(item.width_value);
    if (isNaN(width_value)) width_value = 0;
    
    const originalProd = products.find(p => p.product_code === item.product_code);
    const basePrice = originalProd ? (Number(originalProd.base_price) || 0) : 0;
    const spec = originalProd ? (Number(originalProd.specification) || 0) : 0;
    const giaMet = originalProd ? (Number(originalProd.GiaMet) || 0) : 0;
    //item.length_value = length_mm / 1000;
    item.total_length = (Number(item.length_value) || 0) * pcs;

    let calculatedAmount = 0;
    if (qty !== 0 && length_mm === 0 && width_value === 0) {
      calculatedAmount = price * qty;
    } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
      calculatedAmount = price * (length_mm / 1000);
    } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
      calculatedAmount = (price * qty) + (giaMet * (length_mm / 1000));
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0) {
      calculatedAmount = (price * qty * length_mm * width_value) / 1000000;
    } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
      calculatedAmount = price * width_value;
    } else {
      calculatedAmount = price * (Number(item.total_length)/1000 || 0);
    }

    item.total_amount = isNaN(calculatedAmount) ? 0 : Math.round(calculatedAmount);
    let safeTienGoc = parseFloat(item.tien_goc) || 0;
  let safeChietKhau = parseFloat(item.chiet_khau) || 0;
  let safePhiShip = parseFloat(item.phi_ship) || 0;
     let calculatedProfit = item.total_amount - safeTienGoc - safeChietKhau - safePhiShip;
  item.profit = isNaN(calculatedProfit) ? 0 : Math.round(calculatedProfit);
};

  const recalculateOrderTotals = (updatedDetails, currentOrderInfo) => {
const netAmount = updatedDetails.reduce((sum, item) => {
    const amount = Number(item.total_amount || 0);
    const discount = Number(item.chiet_khau || 0);
    return sum + (amount - discount);
  }, 0);   
  const totalProfit = updatedDetails.reduce((sum, item) => {
    return sum + (Number(item.profit || 0));
  }, 0);
   const totalAmount = netAmount + Number(currentOrderInfo.old_debt || 0);
const isDebt = currentOrderInfo.order_slice === 'no';
  const currentDebt = isDebt 
    ? (totalAmount - Number(currentOrderInfo.customer_paid || 0)) 
    : 0; // Nếu không phải 'no', dư nợ bằng 0
    setOrderInfo({
      ...currentOrderInfo,
      net_amount: isNaN(netAmount) ? 0 : netAmount,
      total_amount: isNaN(totalAmount) ? 0 : totalAmount,
      current_debt: isNaN(currentDebt) ? 0 : currentDebt,
      total_profit: isNaN(totalProfit) ? 0 : totalProfit
    });
  };

  // Hàm tính toán toàn bộ số liệu độc lập cho Popup Sửa
const calculateEditPopupMetrics = (item) => {
  // Lấy chính xác dữ liệu từ các ô nhập liệu của Popup (Ép về kiểu số)
  let qty = parseFloat(item.quantity) || 0;
  let price = parseFloat(item.price) || 0;
  let length_mm = parseFloat(item.length_mm) || 0;
  let width_value = parseFloat(item.width_value) || 0;
  let piece_quantity = parseInt(item.piece_quantity) || 0;
  let length_value = parseFloat(item.length_value) || 0;
  let chiet_khau = parseFloat(item.chiet_khau) || 0;
  let phi_ship = parseFloat(item.phi_ship) || 0;
  // 🌟 Lấy specification và giá gốc trực tiếp từ database hoặc state sản phẩm đang chọn
  const originProd = products.find(p => p.product_code === item.product_code);
const specification = originProd ? (originProd.specification !== null && originProd.specification !== undefined ? parseFloat(originProd.specification) : 0) : (parseFloat(item.specification) ?? 0); 
 const giaGoc = originProd ? (parseFloat(originProd.base_price) || 0) : 0;
  const giaMet = originProd ? (parseFloat(originProd.GiaMet) || 0) : (parseFloat(item.current_gia_met) || 0);

  // --- 1. TÍNH THÀNH TIỀN (Giữ nguyên logic gốc của dự án bạn) ---
  let calculatedAmount = 0;
  if (qty !== 0 && length_mm === 0 && width_value === 0) {
    calculatedAmount = price * qty;
  } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
    calculatedAmount = price * (length_mm / 1000);
  } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
    calculatedAmount = (price * qty) + (giaMet * (length_mm / 1000));
  } else if (qty !== 0 && length_mm !== 0 && width_value !== 0) {
    calculatedAmount = (price * qty * length_mm * width_value) / 1000000;
  } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
    calculatedAmount = price * width_value;
  } else {
    const totalLen = length_value * piece_quantity;
    calculatedAmount = price * (totalLen / 1000 || 0);
  }
  const total_amount = isNaN(calculatedAmount) ? 0 : Math.round(calculatedAmount);

  // --- 2. TÍNH SỐ LƯỢNG QUY ĐỔI (converted_quantity) - CHUẨN 100% THEO ĐỀ BÀI ---
  let convQty = 0;

  if (qty === 0 && length_mm === 0 && width_value === 0) {
    // Nhánh 1: nếu số lượng = dài mm = rộng = 0, lấy tổng dài/specification/10
    const totalLen = length_value * piece_quantity;
    convQty = totalLen / specification / 10;

  } else if (qty !== 0 && length_mm === 0 && width_value === 0) {
    // Nhánh 2: nếu số lượng <> 0, dài mm = rộng = 0, lấy số lượng
    convQty = qty;

  } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
    // Nhánh 3: nếu số lượng <> 0, dài mm <> 0, rộng = 0, lấy số lượng + dài mm/ specification/10
    convQty = qty + (length_mm / specification / 10);

  } else if (qty !== 0 && length_mm !== 0 && width_value !== 0 && specification === 0) {
    // Nhánh 4: nếu số lượng <> 0, dài mm <> 0, rộng <> 0, specification = 0, lấy số lượng * dài mm * rộng /1000000
    convQty = (qty * length_mm * width_value) / 1000000;

  } else if (qty !== 0 && length_mm !== 0 && width_value !== 0 && specification !== 0) {
    // Nhánh 5: nếu số lượng <> 0, dài mm <> 0, rộng <> 0, specification <> 0, lấy số lượng * dài mm * rộng / specification/1000000
    convQty = (qty * length_mm * width_value) / specification / 1000000;

  } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
    // Nhánh 6: nếu số lượng = 0, dài mm = 0, rộng <> 0, lấy rộng / specification
    convQty = width_value / specification;
  }

  // --- 3. TÍNH TIỀN GỐC & LỢI NHUẬN ĐÚNG CÔNG THỨC ---
  // tien_goc = converted_quantity * giá gốc
  const tien_goc = convQty * giaGoc;
  
  // profit = thành tiền - tien_goc
   const profit = total_amount - tien_goc - chiet_khau - phi_ship;

  // Trả về kết quả, xử lý tránh giá trị lỗi Infinity hoặc NaN trong JS
  return {
    total_amount,
    specification,
    converted_quantity: isFinite(convQty) && !isNaN(convQty) ? Number(convQty.toFixed(3)) : 0,
    tien_goc: isFinite(tien_goc) && !isNaN(tien_goc) ? Math.round(tien_goc) : 0,
    profit: isFinite(profit) && !isNaN(profit) ? Math.round(profit) : 0
  };
};



// 🌟 THÊM HÀM NÀY: Xử lý bật/tắt cộng dồn công nợ cũ của khách hàng
// 🌟 SỬA LẠI HÀM NÀY: Gọi API lấy tổng nợ cũ trực tiếp từ Backend
const toggleCalculateTotalOldDebt = async () => {
  // 1. Nếu đang có nợ cũ > 0, bấm vào sẽ đặt lại bằng 0
  if (Number(orderInfo.old_debt || 0) > 0) {
    handleOrderInfoChange('old_debt', 0);
  } else {
    try {
      // 2. Gọi API lấy danh sách đơn hàng để tính toán
      // (Hãy chỉnh lại đường dẫn API /api/orders cho đúng với Backend của bạn)
      const response = await axios.get('/api/orders'); 
      const allOrders = response.data?.data || response.data || [];

      // 3. Thực hiện gom nợ giống như cũ bằng mảng dữ liệu vừa lấy về
      const totalPreviousDebt = allOrders.reduce((sum, ord) => {
        if (
          ord.customer_id === orderInfo.customer_id && 
          ord.order_id !== orderInfo.order_id
        ) {
          return sum + (Number(ord.current_debt) || 0);
        }
        return sum;
      }, 0);

      // 4. Điền vào ô nợ cũ mang sang
      handleOrderInfoChange('old_debt', totalPreviousDebt);
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách nợ cũ:", error);
      alert("Không thể kết nối lấy dữ liệu công nợ cũ!");
    }
  }
};



  const handleOrderInfoChange = (field, value) => {
    let updatedOrderInfo = { ...orderInfo, [field]: value };
if (field === 'customer_paid' || field === 'old_debt' || field === 'order_slice') {
    // 🌟 ĐÃ SỬA: Lấy Tiền hàng hiện tại + giá trị Nợ cũ mới nhập (hoặc nợ cũ đang có)
    const netAmount = Number(orderInfo.net_amount || 0);
    const currentOldDebt = field === 'old_debt' ? Number(value || 0) : Number(orderInfo.old_debt || 0);
    
    // Công thức tổng cộng mới
    const totalAmount = netAmount + currentOldDebt;
    const paidAmount = field === 'customer_paid' ? Number(value || 0) : (Number(orderInfo.customer_paid) || 0);
    const currentSlice = field === 'order_slice' ? value : orderInfo.order_slice;
    updatedOrderInfo.total_amount = totalAmount;

    // Chỉ tính dư nợ thực tế khi trạng thái là 'no'
    if (currentSlice === 'no') {
      updatedOrderInfo.current_debt = totalAmount - paidAmount;
    } else {
      updatedOrderInfo.current_debt = 0; // Ép về 0 nếu không phải nợ
    }
  }
  
    setOrderInfo(updatedOrderInfo);
  };

  

    // 🚀 ĐÃ SỬA: Tách biệt logic tự lưu công nợ độc lập, cam kết tự động lưu 100%
 const toggleDebtStatus = async () => {
   try {
     // 1. Xác định trạng thái nợ tiếp theo
     const nextSlice = orderInfo.order_slice === 'no' ? '' : 'no';
      const totalAmount = Number(orderInfo.total_amount) || 0;
    const paidAmount = Number(orderInfo.customer_paid) || 0;
    const nextDebt = nextSlice === 'no' ? (totalAmount - paidAmount) : 0;
     // 2. Đóng gói thông tin đơn hàng mới cập nhật
     const updatedOrderInfo = { 
       ...orderInfo, 
       order_slice: nextSlice,
       current_debt: nextDebt  
     };
     
     // 3. Cập nhật lên màn hình giao diện (State) để đổi màu nút bấm ngay lập tức
     setOrderInfo(updatedOrderInfo);

     // 4. Gọi trực tiếp API cập nhật trạng thái nợ ngầm xuống MySQL
     const response = await axios.put(`/api/orders/${orderInfo.order_id}/update-details`, {
       orderInfo: {
         ...updatedOrderInfo,
         // Ép kiểu dữ liệu an toàn để tránh lỗi logic của Backend
         net_amount: parseFloat(updatedOrderInfo.net_amount) || 0,
         old_debt: parseFloat(updatedOrderInfo.old_debt) || 0,
         total_amount: parseFloat(updatedOrderInfo.total_amount) || 0,
         customer_paid: parseFloat(updatedOrderInfo.customer_paid) || 0,
         current_debt: parseFloat(nextDebt) || 0,
         order_slice: nextSlice,
         notes: updatedOrderInfo.notes || ''
       },
       updatedDetails: orderDetails // Giữ nguyên mảng vật tư hiện tại trên giao diện
     });

     if (response.status === 200 || response.data) {
       showAutoCloseToast('🎉 Đã chuyển trạng thái và tự động lưu vào hệ thống!');
     }
   } catch (error) {
     console.error("❌ Lỗi tự động lưu trạng thái nợ:", error);
     showAutoCloseToast('❌ Lỗi: Hệ thống không thể tự lưu trạng thái!');
   }
 };

  // Hàm mới: Đồng bộ hàng loạt giá trị Slice ĐH cha xuống detail_slice con
const handleApplySliceToDetails = () => {
  if (orderDetails.length === 0) {
    showAutoCloseToast('⚠️ Chưa có mặt hàng nào để áp dụng!');
    return;
  }

  const currentSlice = orderInfo.order_slice || '';
  
  // Tiến hành map qua toàn bộ mảng và cập nhật detail_slice
  const updatedDetails = orderDetails.map(item => ({
    ...item,
    detail_slice: currentSlice
  }));

  setOrderDetails(updatedDetails);
  showAutoCloseToast(`⚡ Đã đồng bộ phân đoạn "${currentSlice || 'Trống'}" cho tất cả các dòng!`);
};


  // Hàm 1: Xử lý thay đổi dữ liệu các ô nhập trong Popup (Tự động nhảy giá sỉ/lẻ/mét và tính thành tiền)
// Hàm 1: Xử lý thay đổi dữ liệu các ô nhập trong Popup (Tự động nhảy giá và tính toán thông số quy đổi)
const handlePopupFieldChange = (field, value) => {
  setPopupItem(prev => {
    let updated = { ...prev };
    
    // 1. Ép kiểu số cho các ô nhập liệu số (Giữ nguyên của bạn)
    const numericFields = ['quantity', 'length_mm', 'width_value', 'length_value', 'piece_quantity', 'price', 'chiet_khau', 'phi_ship'];
    if (numericFields.includes(field)) {
      updated[field] = value === '' ? 0 : parseFloat(value) || 0;
    } else {
      updated[field] = value;
    }

    // 2. Tìm kiếm sản phẩm trong danh sách hệ thống để lấy quy cách và giá bán gốc (Giữ nguyên của bạn)
    const prodObj = products.find(p => p.product_code === updated.product_code);
    const giaGoc = prodObj ? (parseFloat(prodObj.base_price) || 0) : 0;
    
    if (prodObj) {
      updated.specification = prodObj.specification !== null && prodObj.specification !== undefined ? parseFloat(prodObj.specification) : 0;      
      
      // Chỉ tự động nhảy giá bán gợi ý khi KHÔNG PHẢI đang mở popup chỉnh sửa
      if ((field === 'quantity' || field === 'length_mm' || field === 'width_value' || field === 'product_code') && !showEditPopup) {
        
        // 🌟 SỬA ĐỔI QUAN TRỌNG: Tìm kiếm thông minh theo cả Mã hoặc Tên khách hàng
        // Điều này đảm bảo dù orderInfo.customer_id có bị biến thành "10 hội" hay đang là "10 HOI", hệ thống vẫn tìm ra đúng người!
         const sliceKH = orderInfo.customer_slice || '';
      const safeSliceKH = String(sliceKH).trim().toLowerCase();
        // Nạp phân đoạn xịn vào để hàm tính giá luôn luôn nhảy đúng giá sỉ/lẻ/báo giá
        updated.price = determineProductPrice(prodObj, sliceKH, updated.quantity, updated.length_mm, updated.width_value);
        updated.customer_slice = safeSliceKH; 
      }
      
      // Lưu trữ ngầm Giá mét của sản phẩm vào object nếu tìm thấy (Giữ nguyên của bạn)
      if (prodObj.GiaMet) {
        updated.current_gia_met = Number(prodObj.GiaMet) || 0;
      }
    } else {
      // KHÓA CỨNG: Nếu không tìm thấy sản phẩm, giữ nguyên quy cách cũ (Giữ nguyên của bạn)
      updated.specification = updated.specification ?? 0;    
    }

    const specification = updated.specification;
    const giaMet = prodObj ? (Number(prodObj.GiaMet) || 0) : (prev.current_gia_met || prev.GiaMet || 0);
    
    // Ép kiểu các thông số kích thước để phục vụ tính toán (Giữ nguyên của bạn)
    let qty = parseFloat(updated.quantity) || 0;
    let price = parseFloat(updated.price) || 0;
    let length_mm = parseFloat(updated.length_mm) || 0;
    let width_value = parseFloat(updated.width_value) || 0;
    let piece_quantity = parseInt(updated.piece_quantity) || 0;
    let length_value = parseFloat(updated.length_value) || 0;

    // --- 3. TOÀN BỘ LOGIC TÍNH THÀNH TIỀN GỐC CỦA BẠN (Giữ nguyên vẹn 100%) ---
    let calculatedAmount = 0;
    if (qty !== 0 && length_mm === 0 && width_value === 0) {
      calculatedAmount = price * qty;
    } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
      calculatedAmount = price * (length_mm / 1000);
    } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
      calculatedAmount = (price * qty) + (giaMet * (length_mm / 1000));
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0) {
      calculatedAmount = (price * qty * length_mm * width_value) / 1000000;
    } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
      calculatedAmount = price * width_value;
    } else {
      const totalLen = length_value * piece_quantity;
      calculatedAmount = price * (totalLen / 1000 || 0);
    }
    updated.total_amount = isNaN(calculatedAmount) ? 0 : Math.round(calculatedAmount);

    // --- 4. TÍNH SỐ LƯỢNG QUY ĐỔI (converted_quantity) CHUẨN ĐIỀU KIỆN (Giữ nguyên vẹn 100%) ---
    let convQty = 0;
    if (qty === 0 && length_mm === 0 && width_value === 0) {
      const totalLen = length_value * piece_quantity;
      convQty = specification !== 0 ? (totalLen / specification / 10) : 0;
    } else if (qty !== 0 && length_mm === 0 && width_value === 0) {
      convQty = qty;
    } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
      convQty = specification !== 0 ? (qty + (length_mm / specification / 10)) : qty;
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0 && specification === 0) {
      convQty = (qty * length_mm * width_value) / 1000000;
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0 && specification !== 0) {
      convQty = (qty * length_mm * width_value) / specification / 1000000;
    } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
      convQty = specification !== 0 ? (width_value / specification) : 0;
    } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
      convQty =  (length_mm / specification)/10 ;
    }
    
    updated.converted_quantity = isFinite(convQty) && !isNaN(convQty) ? Number(convQty.toFixed(2)) : 0;

    // --- 5. TÍNH TIỀN GỐC & LỢI NHUẬN TẠM TÍNH (Giữ nguyên vẹn 100%) ---
    const tien_goc = updated.converted_quantity * giaGoc;
    updated.tien_goc = isFinite(tien_goc) && !isNaN(tien_goc) ? Math.round(tien_goc) : 0;

    const profit = updated.total_amount - updated.tien_goc - updated.phi_ship - updated.chiet_khau;
    updated.profit = isFinite(profit) && !isNaN(profit) ? Math.round(profit) : 0;

    return updated;
  });
};



// Hàm 2: Khi bấm xác nhận -> Trộn vào mảng tổng và tự động gửi dữ liệu lưu xuống Database MySQL
const handleConfirmPopupAndSave = async () => {
  const safeNum = (val) => {
    const n = parseFloat(val);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  };

  if (!popupItem.product_code) {
    showAutoCloseToast('⚠️ Vui lòng chọn sản phẩm trước khi xác nhận!');
    return;
  }

  // 🛑 KHÓA CHẶT: Bốc trực tiếp từ đơn mẹ cố định, không tra cứu lại bằng JS
  const finalRealId = orderInfo.customer_id;
  const finalRealSlice = orderInfo.customer_slice || '';

  if (!finalRealId || finalRealId === "---") {
    alert("❌ Lỗi hệ thống: Đơn hàng này chưa có thông tin khách hàng gốc!");
    return;
  }
// 🌟 LẤY CHUẨN NGÀY THÁNG HIỆN TẠI (HÔM NAY) CỦA MÁY TÍNH
  const todayStr = (() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`; // Trả về định dạng YYYY-MM-DD
  })();
  // 1. Đóng gói dữ liệu gửi lên API Backend (Ép kiểu số an toàn tuyệt đối)
  const newRowPayload = {
    order_id: orderInfo.order_id,
    order_date: todayStr, 
    customer_id: finalRealId,
    customer_slice: finalRealSlice,
    product_code: popupItem.product_code,
    quantity: safeNum(popupItem.quantity),
    length_mm: safeNum(popupItem.length_mm),
    width_value: safeNum(popupItem.width_value),
    length_value: safeNum(popupItem.length_value),
    piece_quantity: parseInt(popupItem.piece_quantity) || 0,
    total_length: safeNum(popupItem.total_length),
    price: safeNum(popupItem.price),
    total_amount: safeNum(popupItem.total_amount),
    detail_slice: popupItem.detail_slice || '',
    specification: popupItem.specification,
    converted_quantity: popupItem.converted_quantity,
    tien_goc: safeNum(popupItem.tien_goc),
    profit: safeNum(popupItem.profit),
    chiet_khau: parseFloat(popupItem.chiet_khau) || 0,
    phi_ship: parseFloat(popupItem.phi_ship) || 0,
  };

  try {
    // 2. Gửi API POST chèn dòng sản phẩm mới
    const response = await axios.post('/api/order-details', newRowPayload);
    
    if (response.status === 201 || response.status === 200 || response.data) {
      const addedRow = response.data.newRow || newRowPayload;
if (!addedRow.product_name) {
        addedRow.product_name = popupItem.product_name || ''; 
      }
      // 3. Cập nhật dòng con mới vào lưới danh sách vật tư
      setOrderDetails(prev => {
        const nextDetails = [...prev, addedRow];

        // 🔥 CƠ CHẾ DỰ PHÒNG CHUẨN: Tự động tính toán lại toàn bộ đơn mẹ từ mảng thực tế nếu Backend thiếu trường
        if (!response.data || response.data.net_amount === undefined) {
          const calculatedNetAmount = nextDetails.reduce((sum, item) => 
            sum + (safeNum(item.total_amount) - safeNum(item.chiet_khau)), 0
          );
          const calculatedTotalAmount = calculatedNetAmount + safeNum(orderInfo.old_debt);
          const calculatedCurrentDebt = orderInfo.order_slice === 'no' 
            ? (calculatedTotalAmount - safeNum(orderInfo.customer_paid)) 
            : 0;
          const calculatedTotalProfit = nextDetails.reduce((sum, item) => 
            sum + (parseFloat(item.profit) || 0), 0
          );

          setOrderInfo(prevOrderInfo => prevOrderInfo ? {
            ...prevOrderInfo,
            net_amount: calculatedNetAmount,
            total_amount: calculatedTotalAmount,
            current_debt: calculatedCurrentDebt,
            total_profit: calculatedTotalProfit
          } : null);
        }

        return nextDetails;
      });

      // 🚀 ƯU TIÊN SỐ BACKEND: Nếu Backend trả về số chuẩn, ép thẳng số này lên đơn mẹ
      if (response.data && response.data.net_amount !== undefined) {
        setOrderInfo(prevOrderInfo => prevOrderInfo ? {
          ...prevOrderInfo,
          net_amount: response.data.net_amount,
          total_amount: response.data.total_amount,
          current_debt: response.data.current_debt,
          // Tính toán dự phòng riêng cho trường lợi nhuận nếu backend không trả về
          total_profit: response.data.total_profit !== undefined 
            ? response.data.total_profit 
            : [...orderDetails, addedRow].reduce((sum, item) => sum + (parseFloat(item.profit) || 0), 0)
        } : null);
      }

      showAutoCloseToast('✅ Thêm sản phẩm thành công!');
      setShowAddPopup(false); // Đóng cửa sổ nhập liệu

      // 🌟 ĐỒNG BỘ TRIỆT ĐỂ: Reset sạch bộ nhớ popupItem để lần sau mở popup trống trơn
      setPopupItem({
        product_code: '',
        specification: 0,
        quantity: 0,
        length_mm: 0,
        width_value: 0,
        price: 0,
        length_value: 0,
        piece_quantity: 0,
        chiet_khau: 0,
        phi_ship: 0,
        notes: '',
        total_amount: 0
      });
    }
  } catch (error) {
    console.error("❌ Lỗi khi lưu dòng chi tiết sản phẩm:", error);
    alert(error.response?.data?.error || "Không thể lưu sản phẩm, vui lòng thử lại!");
  }
};


  // Cập nhật đơn giá dòng hiện tại theo thời giá của khách hàng
  // Cập nhật đơn giá cho DUY NHẤT dòng hiện tại theo thời giá của khách hàng
// Cập nhật đơn giá cho DUY NHẤT dòng hiện tại theo thời giá của khách hàng
const handleUpdateToCurrentPrice = async (index) => {
  const updatedDetails = [...orderDetails];
  const item = updatedDetails[index];
  
  const cleanItemCode = String(item.product_code || '').trim().replace(/[\r\n\t]/g, '');

  if (!cleanItemCode) {
    showAutoCloseToast('⚠️ Dòng này đang bị trống mã sản phẩm thật!');
    return;
  }

  try {
    showAutoCloseToast('⏳ Đang kiểm tra thời giá sản phẩm...');

    const res = await axios.get(`http://localhost:5000/api/products/${cleanItemCode}`);
    const prod = res.data && res.data.data ? res.data.data : res.data;

    if (prod && (prod.product_code || prod.id)) {
      
      // 🌟 1. LẤY ĐÚNG PHÂN ĐOẠN KHÁCH HÀNG (Quét mọi biến có khả năng lưu)
      const sliceKH = orderInfo.customer_slice || orderInfo.sliceKH || orderInfo.slice || '';
      
      // 🌟 2. ÉP KIỂU SỐ HỌC NGHIÊM NGẶT (Tránh lỗi truyền chuỗi "0" hoặc "0.00" vào hàm tính giá)
      const qty = parseFloat(item.quantity) || 0;
      const length = parseFloat(item.length_mm) || parseFloat(item.length) || 0;
      const width = parseFloat(item.width_value) || parseFloat(item.width) || 0;

      // 🌟 3. GỌI HÀM TÍNH GIÁ VỚI BIẾN ĐÃ CHUẨN HÓA
      let newPrice = determineProductPrice(prod, sliceKH, qty, length, width);
      
      // Kiểm tra bảo vệ nếu hàm trả về giá bằng 0 hoặc lỗi NaN
      const parsedPrice = parseFloat(newPrice);
      if (isNaN(parsedPrice) || parsedPrice === 0) {
        // Lấy giá bán tương ứng với phân đoạn khách hàng trực tiếp từ Database sản phẩm gốc nếu hàm tính bị bỏ qua
        newPrice = parseFloat(prod[sliceKH] || prod.retail_price || prod.base_price || prod.price || item.price || 0);
      } else {
        newPrice = parsedPrice;
      }
      
      // Gán giá và tính toán lại các chỉ số dòng
      item.price = newPrice;
      calculateRowMetrics(updatedDetails, index);
      setOrderDetails(updatedDetails);
      recalculateOrderTotals(updatedDetails, orderInfo);
      
      showAutoCloseToast('🔄 Đã cập nhật đơn giá mới cho dòng này!');
    } else {
      showAutoCloseToast(`❌ Không tìm thấy thông tin gốc của sản phẩm mã: ${cleanItemCode}`);
    }

  } catch (error) {
    console.error(`❌ Lỗi tra cứu đơn lẻ mã ${cleanItemCode}:`, error);
    showAutoCloseToast('❌ Không thể kết nối máy chủ để tải dữ liệu sản phẩm!');
  }
};

    
    // Hàm cập nhật giá bán thời giá hiện tại cho TOÀN BỘ các dòng cùng một lúc
  // Hàm cập nhật đơn giá thời giá hiện tại cho TOÀN BỘ các dòng cùng một lúc
// Hàm cập nhật đơn giá thời giá hiện tại cho TOÀN BỘ các dòng cùng một lúc (Khớp 100% logic hàm 1 dòng)
const handleUpdateAllPricesToCurrent = async () => {
  if (orderDetails.length === 0) {
    showAutoCloseToast('⚠️ Chưa có mặt hàng nào để tính giá!');
    return;
  } 
  
  const confirmUpdate = window.confirm('Bạn có chắc chắn muốn cập nhật lại đơn giá theo thời giá hiện tại cho TẤT CẢ các dòng không?');
  if (!confirmUpdate) return;
  
  const updatedDetails = [...orderDetails];
  let successCount = 0;
  let failedLines = [];
  
  showAutoCloseToast('⏳ Hệ thống đang tính toán lại giá hàng loạt...');

  try {
    // Gọi API bốc danh mục tươi để đồng bộ nhanh (hoặc chạy tuần tự qua từng dòng giống hàm 1 dòng)
    for (let index = 0; index < updatedDetails.length; index++) {
      const item = updatedDetails[index];
      
      // Lấy chính xác mã sản phẩm thật từ hàng, xóa các ký tự xuống dòng ẩn nếu có
      const cleanItemCode = String(item.product_code || '').trim().replace(/[\r\n\t]/g, '');

      if (!cleanItemCode) {
        failedLines.push(`Dòng ${index + 1}: Trống mã sản phẩm`);
        continue;
      }

      try {
        // 🌟 GIỐNG HỆT HÀM 1 DÒNG: Gọi trực tiếp API chi tiết của CHÍNH sản phẩm đó
        const res = await axios.get(`http://localhost:5000/api/products/${cleanItemCode}`);
        const prod = res.data && res.data.data ? res.data.data : res.data;

        if (prod && (prod.product_code || prod.id)) {
          
          // 🌟 GIỐNG HỆT HÀM 1 DÒNG: Lấy đúng phân đoạn khách hàng
          const sliceKH = orderInfo.customer_slice || orderInfo.sliceKH || orderInfo.slice || '';
          
          // 🌟 GIỐNG HỆT HÀM 1 DÒNG: Ép kiểu số học nghiêm ngặt cho kích thước từng dòng
          const qty = parseFloat(item.quantity) || 0;
          const length = parseFloat(item.length_mm) || 0;
          const width = parseFloat(item.width_value) || 0;

          // 🌟 GIỐNG HỆT HÀM 1 DÒNG: Gọi hàm công thức giá mét mới vừa cài đặt lại trong database
          let newPrice = determineProductPrice(prod, sliceKH, qty, length, width);
          
          // Kiểm tra gán đơn giá chuẩn vào dòng sản phẩm
          const parsedPrice = parseFloat(newPrice);
          if (isNaN(parsedPrice) || parsedPrice === 0) {
            updatedDetails[index].price = parseFloat(prod.price || item.price || 0);
          } else {
            updatedDetails[index].price = parsedPrice;
          }
          
          // 🌟 GIỐNG HỆT HÀM 1 DÒNG: Chạy các hàm tính toán chỉ số dòng của bác
          calculateRowMetrics(updatedDetails, index);
          successCount++;
        } else {
          failedLines.push(item.product_code);
        }
      } catch (lineError) {
        console.error(`Lỗi tra cứu mã ${cleanItemCode}:`, lineError);
        failedLines.push(item.product_code);
      }
    }
    
    // Đẩy danh sách đã tính toán chuẩn vào lưới hiển thị ngoài màn hình
    setOrderDetails(updatedDetails);
    
    // Tính toán lại tổng số tiền cuối cùng cho cả đơn hàng cha
    if (typeof recalculateOrderTotals === 'function') {
      recalculateOrderTotals(updatedDetails, orderInfo);
    }
    
    if (failedLines.length > 0) {
      alert(`⚡ Đã cập nhật xong ${successCount} dòng.\n❌ Thất bại ${failedLines.length} dòng không tra cứu được sản phẩm gốc:\n- ${failedLines.join('\n- ')}`);
    } else {
      showAutoCloseToast(`⚡ Tuyệt vời bác ơi! Toàn bộ ${successCount}/${orderDetails.length} mặt hàng đã nhảy đơn giá chuẩn xác!`);
    }

  } catch (error) {
    console.error("❌ Lỗi hệ thống vòng lặp cập nhật giá toàn cục:", error);
    showAutoCloseToast('❌ Lỗi hệ thống: Không thể xử lý đồng bộ danh sách đơn giá!');
  }
};


// =================================================================
// HÀM MỞ POPUP COPY: LẤY CHUẨN SỐ LIỆU ĐÃ LƯU ĐỂ TIỀN GỐC & LN TỰ NHẢY
// =================================================================
const handleOpenCopyPopup = (item, index) => {
  let selectedName = item.product_name || item.name || '';
  if (!selectedName && typeof index === 'number') {
    const tableRows = document.querySelectorAll('table tr');
    if (tableRows && tableRows[index + 1]) {
      const firstInput = tableRows[index + 1].querySelector('input[type="text"]');
      if (firstInput) {
        selectedName = firstInput.value;
      }
    }
  }

  const safeNum = (val) => {
    const n = parseFloat(val);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  };

  // 1. Bốc chuẩn xác toàn bộ số liệu tài chính đã lưu của dòng cũ
  const initAmount = safeNum(item.total_amount ?? 0);
  const initTienGoc = safeNum(item.tien_goc ?? 0);
  const initChietKhau = safeNum(item.chiet_khau ?? 0);
  const initPhiShip = safeNum(item.phi_ship ?? 0);

  // 🎯 CHỐT CHẶN KHỞI TẠO: Ưu tiên bốc giá trị profit đã lưu, 
  // nếu API bị khuyết trường, Server tự kích hoạt phép toán trừ khẩn cấp ngay tại form mở
  let initProfit = safeNum(item.profit ?? item.loi_nhuan ?? 0);
  if (initProfit === 0 && initAmount > 0 && initTienGoc > 0) {
    initProfit = initAmount - initTienGoc - initChietKhau - initPhiShip;
  }

  // 2. Nạp toàn bộ dữ liệu sạch vào State để Popup mở lên là tự nhảy chuẩn số ngay
  setCopyProductData({
    product_code: item.product_code || '',
    product_name: selectedName,
    specification: safeNum(item.specification ?? 0),
    quantity: safeNum(item.quantity ?? 0),
    length_mm: safeNum(item.length_mm ?? item.dai_mm ?? 0),
    width_value: safeNum(item.width_value ?? item.rong_mm ?? 0),
    length_value: safeNum(item.length_value ?? 0),
    piece_quantity: safeNum(item.piece_quantity ?? 0),
    converted_quantity: safeNum(item.converted_quantity ?? 0),
    price: safeNum(item.price ?? item.don_gia ?? 0),
    total_amount: initAmount,
    chiet_khau: initChietKhau,
    phi_ship: initPhiShip,
    customer_slice: item.customer_slice || '',
    detail_slice: item.detail_slice || '', 
    tien_goc: initTienGoc, // Giữ nguyên số tiền gốc đã lưu cũ (100,000)
    
    // 🎯 ĐÃ SỬA CHUẨN: Đảm bảo lợi nhuận hiển thị đúng số liệu đã lưu (40,000) ngay từ giây đầu tiên mở Popup
    profit: !isNaN(initProfit) && isFinite(initProfit) ? Math.round(initProfit) : 0,
    
    notes: item.notes || item.ghi_chu || ''
  });

  setShowCopyPopup(true); // Bật mở Popup lên
};


// =================================================================
// PHẦN 1: LOGIC HÀM GÕ PHÍM - ÉP TIỀN GỐC & LỢI NHUẬN TỰ ĐỘNG NHẢY
// =================================================================
const handleCopyPopupFieldChange = (field, value) => {
  setCopyProductData(prev => {
    const updated = { ...prev };
    // 1. Cập nhật giá trị vừa gõ vào state
    updated[field] = value === '' ? 0 : (isNaN(value) ? value : parseFloat(value));

    // 2. Ép kiểu số an toàn cho các biến đầu vào
    const qty = parseFloat(updated.quantity) || 0;
    const price = parseFloat(updated.price) || 0;
    const length_mm = parseFloat(updated.length_mm) || 0;
    const width_value = parseFloat(updated.width_value) || 0;

    // Tìm sản phẩm gốc trong danh mục để lấy giá gốc (giá vốn) và quy cách
    const originProd = products.find(p => p.product_code === updated.product_code);
    const specification = originProd ? (parseFloat(originProd.specification) || 0) : (parseFloat(updated.specification) || 0);
    const giaGoc = originProd ? (parseFloat(originProd.base_price) || 0) : 0;

    // Chỉ tính toán khi cả 3 trường quantity, width, length đều > 0
    if (qty > 0 && width_value > 0 && length_mm > 0) {
      
      // 🌟 ĐIỀU KIỆN TÍNH SỐ LƯỢNG QUY ĐỔI ĐỒNG BỘ:
      if (specification > 0) {
        // Nếu quy cách > 0: (Số lượng * Dài * Rộng) / Quy cách / 1,000,000
        const convQty = (qty * length_mm * width_value) / specification / 1000000;
        updated.converted_quantity = Number(convQty.toFixed(3));
      } else {
        // Nếu quy cách = 0: (Số lượng * Dài * Rộng) / 1,000,000 (Không chia quy cách)
        const convQty = (qty * length_mm * width_value) / 1000000;
        updated.converted_quantity = Number(convQty.toFixed(3));
      }

      // 🌟 Diện tích m2 gốc dùng để tính tiền (Không phụ thuộc vào quy cách chia nhỏ)
      const baseM2 = (qty * length_mm * width_value) / 1000000;
      const calculatedAmount = baseM2 * price;
      updated.total_amount = Math.round(calculatedAmount);

    } else {
      // Nếu không nhập đủ 3 thông số, đưa tất cả về 0
      updated.converted_quantity = 0;
      updated.total_amount = 0;
    }

    // 3. Tính toán Tiền gốc dựa trên số lượng quy đổi mới
    updated.tien_goc = Math.round(updated.converted_quantity * giaGoc);

    // 4. Tự động nhảy số Lợi nhuận dòng
    const safeChietKhau = parseFloat(updated.chiet_khau) || 0;
    const safePhiShip = parseFloat(updated.phi_ship) || 0;
    
    // Lợi nhuận = Thành tiền - Tiền gốc - Chiết khấu - Phí ship
    const profit = updated.total_amount - updated.tien_goc - safeChietKhau - safePhiShip;
    updated.profit = !isNaN(profit) && isFinite(profit) ? Math.round(profit) : 0;

    return updated;
  });
};

// Hàm xử lý chủ động tính lại số liệu khi bấm nút trên Popup Copy
// Hàm tính lại tiền cho Popup Copy theo logic giống hệt Thêm mới sản phẩm
const handleRecalculateCopyPrice = () => {
  if (!copyProductData || !copyProductData.product_code) {
    if (typeof showAutoCloseToast === 'function') {
      showAutoCloseToast('⚠️ Vui lòng chọn sản phẩm trước khi tính lại!');
    }
    return;
  }

  setCopyProductData(prev => {
    let updated = { ...prev };

    // 1. Tìm kiếm sản phẩm trong danh mục hệ thống để lấy quy cách và giá gốc [Page 16]
    const prodObj = products.find(p => p.product_code === updated.product_code);
    const giaGoc = prodObj ? (parseFloat(prodObj.base_price) || 0) : 0;
    const giaMet = prodObj ? (Number(prodObj.GiaMet) || 0) : (prev.current_gia_met || prev.GiaMet || 0);

    if (prodObj) {
      updated.specification = prodObj.specification !== null && prodObj.specification !== undefined 
        ? parseFloat(prodObj.specification) 
        : 0;

      // Lấy phân đoạn khách hàng từ đơn hàng mẹ để tính thời giá gợi ý [Page 16]
      const sliceKH = orderInfo.customer_slice || '';
      
      // Gọi hàm bốc giá thông minh theo 5 điều kiện của Thêm mới sản phẩm [Page 16, 8]
      updated.price = determineProductPrice(prodObj, sliceKH, updated.quantity, updated.length_mm, updated.width_value);
      updated.customer_slice = String(sliceKH).trim().toLowerCase();
    }

    // 2. Ép kiểu số các thông số kích thước để tính toán tài chính [Page 17]
    let qty = parseFloat(updated.quantity) || 0;
    let price = parseFloat(updated.price) || 0;
    let length_mm = parseFloat(updated.length_mm) || 0;
    let width_value = parseFloat(updated.width_value) || 0;
    let piece_quantity = parseInt(updated.piece_quantity) || 0;
    let length_value = parseFloat(updated.length_value) || 0;
    const specification = updated.specification;

    // --- 3. TOÀN BỘ LOGIC TÍNH THÀNH TIỀN GỐC CỦA THÊM MỚI (Khớp 100%) [Page 17] ---
    let calculatedAmount = 0;
    if (qty !== 0 && length_mm === 0 && width_value === 0) {
      calculatedAmount = price * qty;
    } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
      calculatedAmount = price * (length_mm / 1000);
    } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
      calculatedAmount = (price * qty) + (giaMet * (length_mm / 1000));
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0) {
      calculatedAmount = (price * qty * length_mm * width_value) / 1000000;
    } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
      calculatedAmount = price * width_value;
    } else {
      const totalLen = length_value * piece_quantity;
      calculatedAmount = price * (totalLen / 1000 || 0);
    }
    updated.total_amount = isNaN(calculatedAmount) ? 0 : Math.round(calculatedAmount);

    // --- 4. TÍNH SỐ LƯỢNG QUY ĐỔI (converted_quantity) CHUẨN THEO ĐIỀU KIỆN THÊM MỚI [Page 18] ---
    let convQty = 0;
    if (qty === 0 && length_mm === 0 && width_value === 0) {
      const totalLen = length_value * piece_quantity;
      convQty = specification !== 0 ? (totalLen / specification / 10) : 0;
    } else if (qty !== 0 && length_mm === 0 && width_value === 0) {
      convQty = qty;
    } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
      convQty = specification !== 0 ? (qty + (length_mm / specification / 10)) : qty;
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0 && specification === 0) {
      convQty = (qty * length_mm * width_value) / 1000000;
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0 && specification !== 0) {
      convQty = (qty * length_mm * width_value) / specification / 1000000;
    } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
      convQty = specification !== 0 ? (width_value / specification) : 0;
    } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
      convQty = specification !== 0 ? (length_mm / specification) / 10 : 0; // Đã vá lỗi chia quy cách [Page 38]
    }
    updated.converted_quantity = isFinite(convQty) && !isNaN(convQty) ? Number(convQty.toFixed(2)) : 0;

    // --- 5. TÍNH TIỀN GỐC & LỢI NHUẬN TẠM TÍNH THEO LOGIC MỚI [Page 18] ---
    const tien_goc = updated.converted_quantity * giaGoc;
    updated.tien_goc = isFinite(tien_goc) && !isNaN(tien_goc) ? Math.round(tien_goc) : 0;
    
    const safePhiShip = parseFloat(updated.phi_ship) || 0;
    const safeChietKhau = parseFloat(updated.chiet_khau) || 0;
    const profit = updated.total_amount - updated.tien_goc - safePhiShip - safeChietKhau;
    updated.profit = isFinite(profit) && !isNaN(profit) ? Math.round(profit) : 0;

    return updated;
  });

  if (typeof showAutoCloseToast === 'function') {
    showAutoCloseToast('🎉 Đã tính toán lại giá bán thời giá & thành tiền thành công!');
  }
};




const handleSaveCopyProduct = async () => {
 if (!copyProductData || !copyProductData.product_code) {
 return alert("Vui lòng chọn sản phẩm!");
 }
 
 // 1. Lấy thông tin sản phẩm gốc để bốc giá vốn (base_price)
 const prodObj = products.find(p => p.product_code === copyProductData.product_code || p.product_name === copyProductData.product_code);
 const specification = prodObj ? (Number(prodObj.specification) || 0) : (Number(copyProductData.specification) || 0);

 // 🌟 BƯỚC ĐỘT PHÁ: Lấy trực tiếp dữ liệu sạch từ State đã qua bộ lọc "Tính lại tiền" của bạn
 // Không tính toán thủ công lại từ đầu để tránh xung đột logic loại hình sản phẩm
 let qty = parseFloat(copyProductData.quantity) || 0;
 let length_mm = parseFloat(copyProductData.length_mm) || 0;
 let width_value = parseFloat(copyProductData.width_value) || 0;
 let price = parseFloat(copyProductData.price) || 0;
 
 const finalConvQty = parseFloat(copyProductData.converted_quantity) || 0;
 const finalTotalAmount = parseFloat(copyProductData.total_amount) || 0;
 const finalTienGoc = parseFloat(copyProductData.tien_goc) || 0;
 const finalProfit = parseFloat(copyProductData.profit) || 0;

 const safeChietKhau = parseFloat(copyProductData.chiet_khau) || 0;
 const safePhiShip = parseFloat(copyProductData.phi_ship) || 0;

 // 2. ĐÓNG GÓI PAYLOAD SẠCH GỬI LÊN BACKEND (Sử dụng dữ liệu đã đồng bộ)
 const newRowPayload = {
 order_id: orderInfo.order_id,
 product_code: copyProductData.product_code,
 quantity: qty,
 length_mm: length_mm,
 width_value: width_value,
 length_value: parseFloat(copyProductData.length_value) || 0,
 piece_quantity: parseInt(copyProductData.piece_quantity) || 0,
 total_length: (parseFloat(copyProductData.length_value) || 0) * (parseInt(copyProductData.piece_quantity) || 0),
 price: price,
 total_amount: finalTotalAmount, // Lấy thẳng số tiền chuẩn hiển thị trên Popup
 detail_slice: copyProductData.detail_slice || '',
 specification: specification,
 converted_quantity: finalConvQty, // Lấy thẳng số lượng quy đổi chuẩn trên Popup
 tien_goc: finalTienGoc,           // Lấy thẳng tiền gốc chuẩn trên Popup
 profit: finalProfit,               // Lấy thẳng lợi nhuận chuẩn trên Popup
 chiet_khau: safeChietKhau,
 phi_ship: safePhiShip,
 notes: copyProductData.notes || '',
 customer_id: orderInfo.customer_id,
 customer_slice: orderInfo.customer_slice || ''
 };

 try {
 // 3. Bắn dữ liệu lên API chèn dòng mới [Page 29]
 const response = await axios.post('/api/order-details', newRowPayload);
 if (response.status === 201) {
 // 4. ĐỒNG BỘ SỐ TỔNG: Hứng thẳng số liệu chuẩn từ Backend [Page 29]
 if (response.data && response.data.net_amount !== undefined) {
 setOrderInfo(prevOrderInfo => ({
 ...prevOrderInfo,
 net_amount: response.data.net_amount,
 total_amount: response.data.total_amount,
 current_debt: response.data.current_debt,
 total_profit: response.data.total_profit
 }));
 }
 // 5. Tải lại danh sách lưới sản phẩm từ Database [Page 30]
 try {
 const detailsResponse = await axios.get(`/api/orders/${orderInfo.order_id}/details`);
 if (detailsResponse.data) {
 setOrderDetails(Array.isArray(detailsResponse.data) ? detailsResponse.data : detailsResponse.data.data || []);
 }
 } catch (detailsErr) {
 console.error("❌ Lỗi khi tải lại lưới sản phẩm sau khi nhân bản:", detailsErr);
 }
 setShowCopyPopup(false);
 if (typeof showAutoCloseToast === 'function') {
 showAutoCloseToast('🎉 Nhân bản mặt hàng & tự động cập nhật đơn hàng thành công!');
 }
 } else {
 alert('❌ Lỗi lưu dữ liệu: Hệ thống không thể đồng bộ với Database!');
 }
 } catch (err) {
 console.error("❌ Lỗi hệ thống khi bấm lưu sao chép sản phẩm:", err);
 const errMsg = err.response?.data?.error || err.message || "Dữ liệu gửi lên bị lỗi";
 alert(`❌ Không thể lưu dòng sản phẩm sao chép. Lý do: ${errMsg}`);
 }
};




  const handleRemoveProduct = async (index) => {
  // 1. Tiến hành lọc mảng để loại bỏ dòng vật tư vừa xóa trên giao diện (Lọc tạm thời trên State)
  const updatedDetails = orderDetails.filter((_, i) => i !== index);
  
 
  // Ép kiểu số an toàn tương tự Backend để tránh các lỗi tính toán logic phát sinh
  const safeNum = (val) => {
    const n = parseFloat(val);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  };

  // 🌟 TÍNH TOÁN TRƯỚC SỐ LIỆU MỚI ĐỂ ĐỒNG BỘ CHO CẢ STATE VÀ API
const newNetAmount = updatedDetails.reduce((sum, item) => {
  return sum + (safeNum(item.total_amount) - safeNum(item.chiet_khau));
}, 0);
  const newTotalAmount = newNetAmount + safeNum(orderInfo.old_debt);
  const newCurrentDebt = orderInfo.order_slice === 'no' 
    ? (newTotalAmount - safeNum(orderInfo.customer_paid)) 
    : 0;
const newTotalProfit = updatedDetails.reduce((sum, item) => sum + (parseFloat(item.profit) || 0), 0);

  const updatedOrderInfo = {
    ...orderInfo,
    net_amount: newNetAmount,
    total_amount: newTotalAmount,
    current_debt: newCurrentDebt,
    total_profit: newTotalProfit,
    order_slice: orderInfo.order_slice || ''
  };

  // 2. Cập nhật đồng thời các State giao diện để hiển thị số mới tức thì
  setOrderDetails(updatedDetails);
  setOrderInfo(updatedOrderInfo); // Thay vì gọi recalculateOrderTotals, ta gán thẳng object đã tính chuẩn

  // 3. 🚀 TỰ ĐỘNG ĐẨY MẢNG MỚI XUỐNG API TRANSACTION ĐỂ LƯU VÀO MYSQL KHÔNG LO LỆCH TIỀN
  const currentOrderId = orderId || (orderInfo && orderInfo.order_id);
  
  if (currentOrderId) {
    try {
      // Đóng gói payload đúng theo cấu trúc Backend yêu cầu bằng dữ liệu mới nhất vừa tính ở trên
      const payload = {
        orderInfo: {
          ...updatedOrderInfo,
          order_id: currentOrderId
        },
        updatedDetails: updatedDetails // Mảng vật tư mới sau khi đã xóa bỏ dòng chỉ định
      };

      // Gọi API Transaction ghi đè cập nhật đồng bộ sang MySQL
      const response = await fetch(`http://localhost:5000/api/orders/${currentOrderId}/update-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Thông báo nhẹ để nhân viên biết dữ liệu đã được khóa an toàn dưới database
        if (typeof showAutoCloseToast === 'function') {
          showAutoCloseToast('🗑️ Đã xóa dòng vật tư & tự động lưu đơn hàng thành công!');
        } else {
          console.log('Đã cập nhật dữ liệu thành công xuống Database');
        }
      } else {
        alert('❌ Lỗi đồng bộ database: ' + (data.error || 'Vui lòng kiểm tra console'));
      }
    } catch (err) {
      console.error("Lỗi kết nối API cập nhật đơn hàng:", err);
      alert('❌ Không thể kết nối với Backend để lưu trạng thái đơn hàng mới!');
    }
  }
};


   // 8. Gửi toàn bộ dữ liệu đã chỉnh sửa lên Backend (ĐỒNG BỘ THÔNG BÁO TỰ ĐỘNG BIẾN MẤT)
 // 📑 HÀM LƯU ĐƠN HÀNG TỐI ƯU HÓA - GOM THÀNH 1 REQUEST DUY NHẤT CHẶN NGHẼN LOCALHOST
const handleSaveChanges = async () => {
  if (orderDetails.length > 0 && orderDetails.some(item => !item.product_code)) {
    showAutoCloseToast('⚠️ Vui lòng điền đầy đủ Mã SP cho các dòng!');
    return;
  }

  const safeNum = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
  };

  // Khôi phục mã khách hàng chính xác
  const realCustObj = customers.find(c =>
    c.customer_id === orderInfo.customer_id ||
    c.customer_name === orderInfo.customer_id ||
    c.customer_name === orderInfo.customer_name
  );
  const finalRealId = realCustObj ? realCustObj.customer_id : orderInfo.customer_id;

  if (!orderInfo.order_id || String(orderInfo.order_id).trim() === "") {
    showAutoCloseToast('❌ Lỗi: Không thể lưu đơn do mã đơn hàng không hợp lệ!');
    return;
  }

  // 1. Chuẩn bị dữ liệu cha sạch sẽ
  const cleanOrderInfo = {
    ...orderInfo,
    customer_id: finalRealId,
    net_amount: safeNum(orderInfo.net_amount),
    old_debt: safeNum(orderInfo.old_debt),
    total_amount: safeNum(orderInfo.total_amount),
    customer_paid: safeNum(orderInfo.customer_paid),
    current_debt: safeNum(orderInfo.current_debt),
    order_slice: orderInfo.order_slice || '',
    notes: orderInfo.notes || ''
  };

  // 2. Gom toàn bộ danh sách 21 thông số của các dòng con vào 1 mảng sạch duy nhất
  const cleanDetails = orderDetails.map(item => ({
    id: item.id, // Giữ lại ID khóa chính vật lý để Backend biết dòng nào mà sửa
    order_id: cleanOrderInfo.order_id,
    customer_id: finalRealId,
    customer_slice: item.customer_slice,
    product_code: item.product_code,
    order_date: item.order_date ? item.order_date.slice(0, 10) : new Date().toLocaleDateString('en-CA'),

    quantity: safeNum(item.quantity),
    length_mm: safeNum(item.length_mm),
    width_value: safeNum(item.width_value),
    price: safeNum(item.price),
    total_amount: safeNum(item.total_amount),
    length_value: safeNum(item.length_value),
    piece_quantity: safeNum(item.piece_quantity),
    total_length: safeNum(item.total_length),
    detail_slice: item.detail_slice || '',
    converted_quantity: safeNum(item.converted_quantity),
    profit: safeNum(item.profit),
    specification: isNaN(parseFloat(item.specification)) ? 0 : parseFloat(item.specification),
    chiet_khau: safeNum(item.chiet_khau),
    phi_ship: safeNum(item.phi_ship),
    tien_goc: safeNum(item.tien_goc),
    notes: item.notes || ''
  }));

  try {
    showAutoCloseToast('⏳ Đang đồng bộ hóa dữ liệu tổng kho...');

    // 🌟 3. BƯỚC ĐỔI PHÁP: Gửi 1 request duy nhất chứa cả đơn mẹ và toàn bộ mảng con
    // Tái sử dụng tuyến route transaction đồng bộ của hệ thống thay vì chạy vòng lặp map
    const response = await axios.put(`/api/orders/${cleanOrderInfo.order_id}/update-details`, {
      orderInfo: cleanOrderInfo,
      updatedDetails: cleanDetails
    });

    if (response.status === 200 || response.data) {
      showAutoCloseToast('🎉 Lưu đơn hàng và tối ưu hóa dữ liệu kho thành công!');
    }
  } catch (error) {
    showAutoCloseToast('❌ Lỗi: Hệ thống không thể lưu đồng bộ đơn hàng!');
    console.error("❌ Lỗi nghẽn vòng lặp hệ thống: ", error);
  }
};

  if (loading) return <div style={{ padding: '20px', fontWeight: 'bold' }}>⏳ Đang tải dữ liệu đơn hàng...</div>;
  if (!orderInfo) return <div style={{ padding: '20px', color: 'red' }}>❌ Không tìm thấy thông tin đơn hàng #{orderId}</div>;
   
 

  // Hàm xử lý nhảy tiền và giá mét khi chọn sản phẩm từ ProductSearchInput trong Popup Sửa
  // Hàm xử lý khi chọn sản phẩm từ ProductSearchInput trong Popup Sửa (ĐÃ KHÓA NHẢY GIÁ TỰ ĐỘNG)
// Hàm xử lý nhảy tiền và giá mét khi chọn sản phẩm từ ProductSearchInput trong Popup Sửa
const handleSelectProductInPopup = (prod) => {
  if (!prod) return;

  // 1. Bốc trực tiếp phân đoạn giá sỉ/lẻ thừa kế từ đơn hàng cha orders lên
  const sliceKH = orderInfo.customer_slice || '';
  const safeSliceKH = String(sliceKH).trim().toLowerCase();

  // 2. Tính toán đơn giá gợi ý chuẩn sỉ/lẻ cho sản phẩm này ngay lập tức khi vừa click chọn
  // Truyền số lượng mồi là 1, kích thước tạm thời là 0 để lấy đơn giá mồi chuẩn phân đoạn
  const calculatedPrice = determineProductPrice(prod, safeSliceKH, 0, 0, 0);

  setPopupItem(prev => {
    let updated = { ...prev };

    // 1. Cập nhật mã sản phẩm mới, quy cách và ghim chặt Giá mét mới của sản phẩm đó
    updated.product_code = prod.product_code || '';
     updated.product_name = prod.product_name || prod.ten_sp || prod.ten_san_pham || '';

    updated.specification = prod.specification !== null && prod.specification !== undefined ? parseFloat(prod.specification) : 0;
    updated.current_gia_met = Number(prod.GiaMet) || 0;

    // 🎯 SỬA ĐỔI QUAN TRỌNG: Nạp ngay đơn giá sỉ/lẻ vừa tính được ở trên vào Popup
    // Đảm bảo ô đơn giá lập tức đổi theo chính sách giá của khách hàng chứ không giữ giá cũ của sản phẩm trước
    updated.price = calculatedPrice; 
    updated.customer_slice = safeSliceKH;

    // 2. Tính toán lại thành tiền dựa trên Giá bán mới và thông số của sản phẩm mới
    if (typeof calculateEditPopupAmount === 'function') {
      updated.total_amount = calculateEditPopupAmount(updated);
    } else {
      // Nhánh dự phòng tính toán thành tiền thô nếu hàm bên trên gặp trục trặc bất đồng bộ
      const qty = parseFloat(updated.quantity) || 0;
      const lenMm = parseFloat(updated.length_mm) || 0;
      const w = parseFloat(updated.width_value) || 0;
      
      if (qty !== 0 && lenMm === 0 && w === 0) {
        updated.total_amount = Math.round(calculatedPrice * qty);
      }
    }
    
    return updated;
  });
};


  // 🌟 HÀM 1: Tính thành tiền độc lập chuyên dụng cho Popup Sửa
const calculateEditPopupAmount = (item) => {
  let qty = parseFloat(item.quantity) || 0;
  let price = parseFloat(item.price) || 0;
  let length_mm = parseFloat(item.length_mm) || 0;
  let width_value = parseFloat(item.width_value) || 0;
  let piece_quantity = parseInt(item.piece_quantity) || 0;
  let length_value = parseFloat(item.length_value) || 0;

  // Lấy giá mét gốc của sản phẩm từ mảng tổng, nếu lỗi thì dùng giá mét nạp sẵn
  const originProd = products.find(p => p.product_code === item.product_code);
  const giaMet = originProd ? (Number(originProd.GiaMet) || 0) : (Number(item.current_gia_met) || 0);

  let calculatedAmount = 0;

  if (qty !== 0 && length_mm === 0 && width_value === 0) {
    calculatedAmount = price * qty;
  } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
    calculatedAmount = price * (length_mm / 1000);
  } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
    calculatedAmount = (price * qty) + (giaMet * (length_mm / 1000));
  } else if (qty !== 0 && length_mm !== 0 && width_value !== 0) {
    calculatedAmount = (price * qty * length_mm * width_value) / 1000000;
  } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
    calculatedAmount = price * width_value;
  } else {
    const totalLen = length_value * piece_quantity;
    calculatedAmount = price * (totalLen / 1000 || 0);
  }

  return isNaN(calculatedAmount) ? 0 : Math.round(calculatedAmount);
};

// 🌟 HÀM 2: Bộ cập nhật ô nhập liệu riêng biệt cho Popup Sửa
// 🌟 HÀM 2 (CẢI TIẾN): Bộ cập nhật ô nhập liệu riêng biệt cho Popup Sửa (Hỗ trợ đổi sản phẩm)
const handleEditPopupFieldChange = (field, value) => {
  setPopupItem(prev => {
    // 1. Tạo object mới và cập nhật trường vừa gõ
    const updated = { ...prev };
    updated[field] = value === '' ? 0 : (isNaN(value) ? value : parseFloat(value));

    // 2. Ép kiểu an toàn toàn bộ dữ liệu số để tính toán
    let qty = parseFloat(updated.quantity) || 0;
    let price = parseFloat(updated.price) || 0;
    let length_mm = parseFloat(updated.length_mm) || 0;
    let width_value = parseFloat(updated.width_value) || 0;
    let piece_quantity = parseInt(updated.piece_quantity) || 0;
    let length_value = parseFloat(updated.length_value) || 0;

    // 3. Lấy thông số từ sản phẩm gốc
    const originProd = products.find(p => p.product_code === updated.product_code);
    const specification = originProd ? (parseFloat(originProd.specification) ?? 0) : (parseFloat(updated.specification) ?? 0);
    const giaGoc = originProd ? (parseFloat(originProd.base_price) || 0) : 0;
    const giaMet = originProd ? (parseFloat(originProd.GiaMet) || 0) : (parseFloat(updated.current_gia_met) || 0);

    // 4. Tính THÀNH TIỀN (total_amount)
    let calculatedAmount = 0;
    if (qty !== 0 && length_mm === 0 && width_value === 0) {
      calculatedAmount = price * qty;
    } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
      calculatedAmount = price * (length_mm / 1000);
    } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
      calculatedAmount = (price * qty) + (giaMet * (length_mm / 1000));
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0) {
      calculatedAmount = (price * qty * length_mm * width_value) / 1000000;
    } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
      calculatedAmount = price * width_value;
    } else {
      const totalLen = length_value * piece_quantity;
      calculatedAmount = price * (totalLen / 1000 || 0);
    }
    
    // Nếu tất cả kích thước bằng 0 nhưng có số lượng, tính theo số lượng tấm cơ bản
    if (calculatedAmount === 0 && qty !== 0) {
      calculatedAmount = price * qty;
    }
    updated.total_amount = isNaN(calculatedAmount) ? 0 : Math.round(calculatedAmount);

    // 5. Tính SỐ LƯỢNG QUY ĐỔI (converted_quantity) chuẩn 100% theo điều kiện
    let convQty = 0;
    if (qty === 0 && length_mm === 0 && width_value === 0) {
      const totalLen = length_value * piece_quantity;
      convQty = specification !== 0 ? (totalLen / specification / 10) : 0;
    } else if (qty !== 0 && length_mm === 0 && width_value === 0) {
      convQty = qty;
    } else if (qty !== 0 && length_mm !== 0 && width_value === 0) {
      convQty = specification !== 0 ? (qty + (length_mm / specification / 10)) : qty;
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0 && specification === 0) {
      convQty = (qty * length_mm * width_value) / 1000000;
    } else if (qty !== 0 && length_mm !== 0 && width_value !== 0 && specification !== 0) {
      const mauSo = specification * 1000000;
      convQty = mauSo !== 0 ? (qty * length_mm * width_value) / specification / 1000000 : 0;
    } else if (qty === 0 && length_mm === 0 && width_value !== 0) {
      convQty = specification !== 0 ? (width_value / specification) : 0;
    } else if (qty === 0 && length_mm !== 0 && width_value === 0) {
      // Bảo vệ phép chia quy cách phòng trường hợp bằng 0 gây lỗi toán học Infinity
      convQty = specification !== 0 ? (length_mm / specification) / 10 : 0;
    }

    updated.specification = specification;
    // Đồng bộ lưu số lượng quy đổi an toàn, làm tròn 3 chữ số thập phân
    const safeConvQty = isFinite(convQty) && !isNaN(convQty) ? Number(convQty.toFixed(3)) : 0;
    updated.converted_quantity = safeConvQty;

    // =================================================================
    // 6. 🚀 TÍNH TIỀN GỐC & LỢI NHUẬN (ĐÃ TÍCH HỢP NHÁNH DỰ PHÒNG KHẨN CẤP)
    // =================================================================
    const baseCost = parseFloat(giaGoc) || 0;
    
    // Mặc định tính toán: Dùng trực tiếp số lượng quy đổi local (safeConvQty) vừa xử lý xong ở trên
    let tinhTienGoc = safeConvQty * baseCost;

    // 🚨 NHÁNH DỰ PHÒNG KHẨN CẤP THEO Ý BẠN:
    // Nếu kết quả nhân mặc định bị bằng 0 (hoặc lỗi lọt khe kích thước), 
    // ép hệ thống lấy Số lượng quy đổi thực tế vừa gõ nhân trực tiếp với giá gốc gốc sản phẩm
    if (tinhTienGoc === 0 && baseCost > 0) {
      tinhTienGoc = safeConvQty * baseCost;
    }

    // Chốt chặn cuối cùng: Nếu là hàng lẻ chiếc hoàn toàn (convQty vẫn chưa ăn khớp),
    // bốc thẳng Số lượng cái (qty) nhân với Giá gốc danh mục để ép số tiền gốc tự nhảy lên!
    if (tinhTienGoc === 0 && qty > 0 && baseCost > 0) {
      tinhTienGoc = qty * baseCost;
    }

    // Gán kết quả tiền gốc tự nhảy đã làm tròn vĩnh viễn lên giao diện Popup
    updated.tien_goc = isFinite(tinhTienGoc) && !isNaN(tinhTienGoc) ? Math.round(tinhTienGoc) : 0;
    
    // Ép kiểu số an toàn cho các ô chi phí bổ sung để tránh lỗi cộng chuỗi rác
    const safeTotalAmount = parseFloat(updated.total_amount) || (qty * price) || 0;
    const safeChietKhau = parseFloat(updated.chiet_khau) || 0;
    const safePhiShip = parseFloat(updated.phi_ship) || 0;

    // Áp dụng chuẩn công thức tài chính: Thành tiền - Tiền gốc mới - Chiết khấu - Phí ship
    const profit = safeTotalAmount - updated.tien_goc - safeChietKhau - safePhiShip;
    
    // Giữ nguyên số âm bình thường nếu lỗ vốn, hiển thị mượt mà ra Popup
    updated.profit = isFinite(profit) && !isNaN(profit) ? Math.round(profit) : 0;

    return updated;
  });
};


// 🌟 HÀM 3: Lưu dữ liệu từ Popup chỉnh sửa vào danh sách chính (Đã cập nhật đồng bộ)
const handleSaveEditPopupAndSave = async () => {
  if (!popupItem.product_code) {
    showAutoCloseToast('⚠️ Vui lòng chọn sản phẩm trước khi xác nhận!');
    return;
  }
  const finalMetrics = calculateEditPopupMetrics(popupItem);
const fullPopupData = { ...popupItem, ...finalMetrics };
  // 1. Lấy thông tin ID định danh của dòng vật tư con đang sửa trong Database
  const targetRow = orderDetails[editingRowIndex];
  if (!targetRow || !targetRow.id) {
    alert("❌ Lỗi hệ thống: Không xác định được ID dòng sản phẩm cần sửa!");
    return;
  }

  const safeNum = (val) => { const n = parseFloat(val); return isNaN(n) || !isFinite(n) ? 0 : n; };

  // 2. 🎯 ĐÓNG GÓI PAYLOAD: Gom dữ liệu form mới và ép kiểu số học an toàn tuyệt đối
  const editedRowPayload = {
    order_id: orderInfo.order_id,
    product_code: popupItem.product_code,
    quantity: safeNum(popupItem.quantity),
    length_mm: safeNum(popupItem.length_mm),
    width_value: safeNum(popupItem.width_value),
    length_value: safeNum(popupItem.length_value),
    piece_quantity: parseInt(popupItem.piece_quantity) || 0,
    total_length: safeNum(popupItem.total_length) || 0,
    price: safeNum(popupItem.price),
    total_amount: safeNum(popupItem.total_amount),
    detail_slice: popupItem.detail_slice || '',
    specification: popupItem.specification,
    converted_quantity: safeNum(popupItem.converted_quantity), 
    tien_goc: safeNum(popupItem.tien_goc),                     
    profit: safeNum(popupItem.profit),                         
    phi_ship: safeNum(popupItem.phi_ship),
    chiet_khau: safeNum(popupItem.chiet_khau),
    notes: popupItem.notes || ''
  };

  try {
    // 3. 🚀 TÁI SỬ DỤNG API PUT SỬA DÒNG ĐÃ VÁ LỖI MẢNG: Bắn thẳng dữ liệu sửa đổi lên Backend
    const response = await axios.put(`/api/order-details/${targetRow.id}`, editedRowPayload);

    if (response.status === 200 || response.status === 201) {
      showAutoCloseToast('🎉 Đã cập nhật thông tin mặt hàng thành công!');
      setShowEditPopup(false); // Đóng popup sửa
      setEditingRowIndex(null);

      // 4. ĐỒNG BỘ TIỀN ĐƠN MẸ LẬP TỨC: Bốc số liệu tính toán tài chính chuẩn từ Backend nạp vào màn hình
      if (response.data && response.data.net_amount !== undefined) {
        setOrderInfo(prevOrderInfo => ({
          ...prevOrderInfo,
          net_amount: response.data.net_amount,
          total_amount: response.data.total_amount,
          current_debt: response.data.current_debt,
          // Tính toán lại tổng lợi nhuận hiển thị tạm thời trên giao diện dựa trên mảng ảo
          total_profit: orderDetails.reduce((sum, item, idx) => {
            return sum + (idx === editingRowIndex ? safeNum(popupItem.profit) : safeNum(item.profit));
          }, 0)
        }));
      }

      // 5. Nạp lại danh sách sản phẩm chuẩn từ database để lưới DataGrid cập nhật tên mặt hàng mới nhất
      try {
        const detailsResponse = await axios.get(`/api/orders/${orderInfo.order_id}/details`);
        if (detailsResponse.data) {
          setOrderDetails(Array.isArray(detailsResponse.data) ? detailsResponse.data : detailsResponse.data.data || []);
        }
      } catch (detailsErr) {
        console.error("❌ Lỗi khi tải lại lưới sản phẩm sau khi sửa:", detailsErr);
      }

    } else {
      alert('❌ Lỗi lưu dữ liệu: Hệ thống không thể đồng bộ với Database!');
    }
  } catch (err) {
    console.error("❌ Lỗi hệ thống khi bấm xác nhận sửa sản phẩm:", err);
    alert('❌ Không thể kết nối với hệ thống Backend hoặc dữ liệu sửa đổi bị lỗi!');
  }
};


// Hàm 1: Sao chép nhân bản đơn hàng hiện tại thành đơn hàng mới
// Hàm 1: Sao chép nhân bản đơn hàng hiện tại bao gồm TẤT CẢ các dòng sản phẩm con
const handleDuplicateCurrentOrder = async () => {
  if (!window.confirm(`Bạn có muốn copy đơn hàng này thành một đơn hàng mới không?`)) return;
  
  try {
    // 1. Sinh mã đơn hàng mới dựa theo thời gian thực (Giữ nguyên logic của bạn)
    const generateNewCode = () => {
      const now = new Date();
      return `X${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    };
    
    const newOrderId = generateNewCode();
const todayStr = (() => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`; // Ép lấy chuẩn ngày máy tính Việt Nam, dạng chuỗi YYYY-MM-DD
})();
    // 2. Tạo thông tin đơn hàng cha sạch sẽ để gửi đi
    const newOrderInfo = {
      order_id: newOrderId,
      order_date: todayStr,
      customer_id: orderInfo.customer_id,
      net_amount: parseFloat(orderInfo.net_amount) || 0,
      old_debt: parseFloat(orderInfo.old_debt) || 0,
      total_amount: parseFloat(orderInfo.total_amount) || 0,
      customer_paid: 0, // Mặc định đơn mới chưa thanh toán
      current_debt: parseFloat(orderInfo.order_slice === 'no' ? (Number(orderInfo.total_amount) || 0) : 0),
      order_slice: orderInfo.order_slice || '',
      notes: orderInfo.notes ? `${orderInfo.notes}` : '(Bản sao đơn tổng)'
    };

    // 3. Chuẩn hóa danh sách dòng con, loại bỏ trường ID tự tăng (id) để tránh trùng khóa chính MySQL
    const cleanDetails = orderDetails.map(({ id, ...rest }) => ({
      ...rest,
      order_id: newOrderId,
      order_date: todayStr,
      notes: rest.notes ||'',
      // Đảm bảo ép kiểu số học an toàn giống hàm lưu gốc của bạn
      quantity: parseFloat(rest.quantity) || 0,
      length_mm: parseFloat(rest.length_mm) || 0,
      width_value: parseFloat(rest.width_value) || 0,
      length_value: parseFloat(rest.length_value) || 0,
      piece_quantity: parseInt(rest.piece_quantity) || 0,
      total_length: parseFloat(rest.total_length) || 0,
      price: parseFloat(rest.price) || 0,
      total_amount: parseFloat(rest.total_amount) || 0,
      converted_quantity: parseFloat(rest.converted_quantity) || 0,
      tien_goc: parseFloat(rest.tien_goc) || 0,
      profit: parseFloat(rest.profit) || 0,
      chiet_khau: parseFloat(rest.chiet_khau) || 0,
      phi_ship: parseFloat(rest.phi_ship) || 0,
      specification: parseFloat(rest.specification) || 0,
      detail_slice: rest.detail_slice || ''
    }));

    // 4. BƯỚC THAY ĐỔI VÀNG: Tiến hành gọi tuần tự API tạo đơn hàng cha và các đơn hàng con
    // Bước 4.1: Tạo vỏ đơn hàng tổng trước
    await axios.post('/api/orders', newOrderInfo);

    // Bước 4.2: Đẩy đồng loạt các dòng sản phẩm con vào Database
    // Sử dụng API Transaction update-details của bạn (Page 30) để ghi đè mảng con cực kỳ an toàn
    await axios.put(`http://localhost:5000/api/orders/${newOrderId}/update-details`, {
      orderInfo: newOrderInfo,
      updatedDetails: cleanDetails
    });

    showAutoCloseToast(`📋 Sao chép đơn hàng thành công! Đơn mới tạo: ${newOrderId}`);
    
    if (typeof onBack === 'function') {
      setTimeout(() => onBack(), 1500);
    }
  } catch (error) {
    console.error("❌ Lỗi đồng bộ khi sao chép toàn bộ đơn hàng:", error);
    alert('Lỗi khi sao chép đơn hàng: ' + (error.response?.data?.error || error.message));
  }
};

// Hàm 2: Hủy bỏ / Xóa hoàn toàn đơn hàng khỏi cơ sở dữ liệu
const handleDeleteCurrentOrder = async () => {
  if (!window.confirm('🚨 CẢNH BÁO: Bạn có chắc chắn muốn hủy và xóa hoàn toàn đơn hàng này không?')) return;
  try {
    await axios.delete(`/api/orders/${orderInfo.order_id}`);
    showAutoCloseToast('🗑️ Đã hủy và xóa đơn hàng thành công!');
    
    // Tự động thoát giao diện chi tiết đơn hàng sau khi xóa thành công
    if (typeof onBack === 'function') {
      setTimeout(() => onBack(), 1200);
    }
  } catch (error) {
    console.error(error);
    alert('Lỗi: ' + (error.response?.data?.error || error.message));
  }
};
   

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative' }}>
      
      {/* KHUNG THÔNG BÁO POPUP TỰ ĐỘNG BIẾN MẤT SAU 1 GIÂY */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#23272b',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '4px',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          zIndex: 10000,
          boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          💡 {toastMessage}
        </div>
      )}

      {/* THANH TIÊU ĐỀ & ĐIỀU HƯỚNG */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '20px' }}>
       {/* 4. NÚT QUAY LẠI */}
    <button 
      onClick={onBack} 
      style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
    >
      ⬅️ Quay lại
    </button>
        <h2 style={{ color: '#007bff', margin: 0 }}>🛠️ CT ĐƠN HÀNG: {orderInfo.order_id}</h2>
       
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    
   {/* 1. NÚT in dh */}
{/* 🌟 NÚT IN ĐƠN HÀNG - FIX LỖI HIỂN THỊ TÊN SẢN PHẨM ĐƠN CŨ & TÌM KIẾM */}
<button
  onClick={() => {
    // Hàm phụ trợ định dạng số: Có lẻ thì hiện tối đa 2 số thập phân, tròn thì hiện số nguyên
    const formatSmartNum = (val) => {
      const num = Number(val || 0);
      return num.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    };

    // Kiểm tra và lấy danh sách sản phẩm an toàn từ biến của bạn
    // (Hãy chắc chắn biến 'products' chứa danh sách tổng gồm product_code và product_name)
    const allProducts = (typeof products !== 'undefined' && products) ? products : [];

    // 1. Khởi tạo nội dung bảng danh sách sản phẩm
    const rowsHtml = orderDetails.map((item, index) => {
      // Ép kiểu mã sản phẩm về chuỗi viết thường để so khớp chính xác nhất
      const itemCode = String(item.product_code || '').trim().toLowerCase();
      
      // Tìm sản phẩm trong danh sách tổng
      const matchedProduct = allProducts.find(p => 
        String(p.product_code || '').trim().toLowerCase() === itemCode
      );

      // LẬP LUẬN TÌM TÊN THÔNG MINH:
      let displayName = '';
      if (matchedProduct) {
        displayName = matchedProduct.product_name; // 1. Ưu tiên tên từ danh sách tổng
      } else if (item.product_name && isNaN(Number(item.product_name))) {
        displayName = item.product_name; // 2. Nếu item có sẵn product_name và KHÔNG phải là số
      } else if (item.product_title) {
        displayName = item.product_title; // 3. Tên trường dự phòng nếu có
      } else {
        displayName = item.product_code || 'Chưa chọn'; // 4. Cuối cùng mới hiện mã sản phẩm
      }
      
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 4px 4px; text-align: left;">${displayName}</td>
          <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${formatSmartNum(item.quantity)}</td>
          <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${item.length_mm ? formatSmartNum(item.length_mm) : '-'}</td>
          <td style="border: 1px solid #000; padding: 4px 2px; text-align: center;">${item.width_value ? formatSmartNum(item.width_value) : '0'}</td>
          <td style="border: 1px solid #000; padding: 4px 4px; text-align: right; white-space: nowrap;">${formatSmartNum(item.price)}</td>
          <td style="border: 1px solid #000; padding: 4px 4px; text-align: right; white-space: nowrap;">${formatSmartNum(item.total_amount)}</td>
        </tr>
      `;
    }).join('');

   // 🌟 2. MẸO QUÉT GIAO DIỆN CHỮA CHÁY TẬN GỐC: Bốc chữ từ hàng đang chọn ngoài màn hình chính
    const customerDisplayName = (() => {
      // Đầu tiên, thử tìm dòng đang được bôi đậm/chọn trên giao diện chính (Table Row)
      // Tìm theo các class chọn thông dụng hoặc thẻ tr bất kỳ đang active
      const activeRow = document.querySelector('.table-active') || 
                        document.querySelector('tr[style*="background"]') ||
                        document.querySelector('tr.selected');
      
      if (activeRow) {
        const cells = activeRow.getElementsByTagName('td');
        // Thông thường cột khách hàng sẽ là cột thứ 2 hoặc thứ 3 trong bảng danh sách
        // Quét thử ô thứ 2 (chỉ số 1) hoặc ô thứ 3 (chỉ số 2)
        if (cells && cells.length > 1) {
          const textCandidate1 = cells[1]?.innerText?.trim();
          const textCandidate2 = cells[2]?.innerText?.trim();
          
          // Ưu tiên chuỗi có chữ tiếng Việt và không chứa mã số đơn hàng hay tiền tệ
          if (textCandidate1 && textCandidate1 !== '---' && isNaN(Number(textCandidate1)) && !textCandidate1.startsWith('X2')) {
            return textCandidate1;
          }
          if (textCandidate2 && textCandidate2 !== '---' && isNaN(Number(textCandidate2))) {
            return textCandidate2;
          }
        }
      }

      // Nếu không quét được HTML, quay lại dùng biến dự phòng từ Backend
      if (orderInfo?.customer_name && orderInfo.customer_name !== '---') return orderInfo.customer_name;
      if (orderInfo?.customer_id && !orderInfo.customer_id.includes('---') && isNaN(Number(orderInfo.customer_id))) return orderInfo.customer_id;
      
      return 'Khách';
    })();
    // 2. Tạo toàn bộ cấu trúc trang HTML khổ A5 đứng
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>In Hóa Đơn A5 - ${orderInfo?.order_id || ''}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f0f2f5;
              margin: 0;
              padding: 20px 0;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .no-print-btn {
              background-color: #ffffff;
              color: #000000;
              border: 1px solid #000000;
              padding: 8px 24px;
              font-size: 15px;
              font-weight: bold;
              cursor: pointer;
              margin-bottom: 20px;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              text-transform: uppercase;
            }
            .no-print-btn:hover {
              background-color: #f5f5f5;
            }
            .invoice-card {
              background-color: #ffffff;
              width: 148mm;
              min-height: 210mm;
              padding: 10mm 8mm;
              box-shadow: 0 4px 10px rgba(0,0,0,0.08);
              box-sizing: border-box;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 14px;
            }
            th {
              border: 1px solid #000;
              padding: 6px 2px;
              font-weight: bold;
              background-color: #ffffff;
            }
            @media print {
              body { background-color: #fff; padding: 0; }
              .no-print-btn { display: none !important; }
              .invoice-card { width: 100%; box-shadow: none; padding: 0; }
              @page { size: A5 portrait; margin: 6mm 8mm 6mm 8mm; }
            }
          </style>
        </head>
        <body>
          <button class="no-print-btn" onclick="window.print()">BẤM VÀO ĐÂY ĐỂ IN</button>
          <div class="invoice-card">
            <div style="text-align: center; font-size: 13px; line-height: 1.4;">
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 3px;">NHÔM KÍNH NỘI THẤT ĐĂNG QUANG</div>
              <div style="margin-bottom: 3px;">Đ/C: Ngã 3 Tân Tây, Gò Công Đông, Tiền Giang</div>
              <div style="font-weight: bold; font-size: 14px;">ĐT: 0983.007.009</div>
            </div>
            <div style="border-top: 1px dashed #000; margin: 15px 0 10px 0;"></div>
            <h2 style="text-align: center; margin: 10px 0 15px 0; font-weight: bold; font-size: 22px;">HÓA ĐƠN BÁN HÀNG</h2>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              
            <div>Khách hàng: <span style="font-weight: bold;">${customerDisplayName}</span></div>

              <div>Mã đơn: <span style="font-weight: bold;">${orderInfo?.order_id || '---'}</span></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th width="6%">STT</th>
                  <th width="42%" style="text-align: left; padding-left: 4px;">Sản phẩm</th>
                  <th width="10%">Số lg</th>
                  <th width="7%">Dài</th>
                  <th width="7%">Rộng</th>
                  <th width="13%" style="text-align: right; padding-right: 4px;">Đơn giá</th>
                  <th width="15%" style="text-align: right; padding-right: 4px;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr>
                  <td colSpan="6" style="border: 1px solid #000; padding: 5px 4px; text-align: right; font-weight: bold;">TỔNG CỘNG ĐƠN</td>
                  <td style="border: 1px solid #000; padding: 5px 4px; text-align: right; font-weight: bold; white-space: nowrap;">${formatSmartNum(orderInfo?.net_amount)}</td>
                </tr>
                <tr>
                  <td colSpan="6" style="border: 1px solid #000; padding: 5px 4px; text-align: right;">Nợ cũ</td>
                  <td style="border: 1px solid #000; padding: 5px 4px; text-align: right; white-space: nowrap;">${formatSmartNum(orderInfo?.old_debt)}</td>
                </tr>
                <tr>
                  <td colSpan="6" style="border: 1px solid #000; padding: 5px 4px; text-align: right; font-weight: bold;">TỔNG THANH TOÁN</td>
                  <td style="border: 1px solid #000; padding: 5px 4px; text-align: right; font-weight: bold; white-space: nowrap;">${formatSmartNum(orderInfo?.total_amount)}</td>
                </tr>
                <tr>
                  <td colSpan="6" style="border: 1px solid #000; padding: 5px 4px; text-align: right;">Khách trả</td>
                  <td style="border: 1px solid #000; padding: 5px 4px; text-align: right; white-space: nowrap;">${orderInfo?.customer_paid ? formatSmartNum(orderInfo.customer_paid) : '-'}</td>
                </tr>
                <tr>
                  <td colSpan="6" style="border: 1px solid #000; padding: 5px 4px; text-align: right; font-weight: bold;">GHI NỢ (Còn lại)</td>
                  <td style="border: 1px solid #000; padding: 5px 4px; text-align: right; font-weight: bold; white-space: nowrap;">${formatSmartNum(orderInfo?.current_debt)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }}
>
  Chụp hd
</button>


{/* 🌟 NÚT IN ĐƠN HÀNG HOÀN CHỈNH - ĐÃ THÊM DÒNG TIỀN KHÁCH TRẢ & FIX LỀ SÁT MÉP */}
<button
  onClick={() => {
    // 1. Hàm định dạng số tiền VND (.toLocaleString)
    const formatSmartNum = (val) => {
      const num = Number(val || 0);
       if (num % 1 === 0) {
    return num.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  }
      return num.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    };

    const allProducts = (typeof products !== 'undefined' && products) ? products : [];

    // 2. Vòng lặp map danh sách sản phẩm lấy Tên sản phẩm thông minh
    const rowsHtml = orderDetails.map((item, index) => {
      const itemCode = String(item.product_code || '').trim().toLowerCase();
      
      const matchedProduct = allProducts.find(p =>
        String(p.product_code || '').trim().toLowerCase() === itemCode
      );

      let displayName = '';
      if (matchedProduct) {
        displayName = matchedProduct.product_name || matchedProduct.ten_sp || matchedProduct.product_code;
      } else {
        displayName = item.product_name || item.product_code || 'Sản phẩm không rõ';
      }

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 3px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 3px;">${displayName}</td>
          <td style="border: 1px solid #000; padding: 3px; text-align: center;">${formatSmartNum(item.quantity)}</td>
          <td style="border: 1px solid #000; padding: 3px; text-align: center;">${item.length_mm ? item.length_mm : '-'}</td>
          <td style="border: 1px solid #000; padding: 3px; text-align: center;">${item.width_value ? item.width_value : '-'}</td>
          <td style="border: 1px solid #000; padding: 3px; text-align: right;">${formatSmartNum(item.price)}</td>
          <td style="border: 1px solid #000; padding: 3px; text-align: right; font-weight: bold;">${formatSmartNum(item.total_amount)}</td>
        </tr>
      `;
    }).join('');

    // 3. Tạo khung in ẩn (Iframe) an toàn cho Chrome
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // 4. Đổ HTML hóa đơn của Nhôm Kính Đăng Quang ra khung in
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.write(`
      <html>
        <head>
          <title>In Đơn Hàng - Nhôm Kính Đăng Quang</title>
          <style>
            @page {
              size: auto;
              margin: 5mm; /* Ép giảm lề sát mép giấy */
            }
            body { font-family: Arial, sans-serif; margin: 0; font-size: 13px; color: #000; }
            .text-center { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { border: 1px solid #000; padding: 6px; background-color: #f2f2f2; }
            td { border: 1px solid #000; padding: 6px; }
            .total-area { text-align: right; margin-top: 15px; font-size: 13px; line-height: 1.7; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h3 style="margin: 0; font-size: 15px;">NHÔM KÍNH NỘI THẤT ĐĂNG QUANG</h3>
            <p style="margin: 2px 0; font-size: 11px;">Đ/C: Ngã 3 Tân Tây, Gò Công Đông, Tiền Giang</p>
            <p style="margin: 2px 0; font-size: 11px;">ĐT: 0983.007.009</p>
            <h2 style="margin: 12px 0 5px 0; font-size: 16px; letter-spacing: 1px;">HÓA ĐƠN BÁN HÀNG</h2>
          </div>

          <table style="width: 100%; margin-top: 5px; font-size: 13px; border: none;">
            <tr style="border: none;">
              <td style="border: none; padding: 0;">Khách hàng: <b>${orderInfo.customer_name || 'Khách hàng'}</b></td>
              <td style="border: none; padding: 0; text-align: right;">Mã đơn: <b>${orderInfo.order_id}</b></td>
            </tr>
          </table>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">STT</th>
                <th>Sản phẩm</th>
                <th style="width: 8%;">SL</th>
                <th style="width: 10%;">Dài</th>
                <th style="width: 10%;">Rộng</th>
                <th style="width: 15%;">Đơn giá</th>
                <th style="width: 18%;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total-area">
            <div>Tổng đơn: <b>${formatSmartNum(orderInfo.net_amount)} đ</b></div>
            <div>Nợ cũ : <b>${formatSmartNum(orderInfo.old_debt || 0)} đ</b></div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 2px; margin-bottom: 2px;">
              TỔNG CỘNG : <span>${formatSmartNum(orderInfo.total_amount)} đ</span>
            </div>
            <div style="color: #011004; font-weight: bold;">
              TIỀN KHÁCH TRẢ: <b>${formatSmartNum(orderInfo.customer_paid || 0)} đ</b>
            </div>
            <hr style="border: 0; border-top: 1px solid #050505; width: 230px; margin-right: 0; margin-top: 4px; margin-bottom: 4px;"/>
            <div style="font-size: 15px; font-weight: bold;">
              GHI NỢ: <span>${formatSmartNum(orderInfo.current_debt || 0)} đ</span>
            </div>
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // 5. Kích hoạt luồng in trực tiếp từ domain an toàn
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // Xóa iframe tạm sau khi hộp thoại in đóng lại
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }}
  style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
>
  🖨️ In ĐH
</button>

   
    {/* 1. NÚT LƯU THAY ĐỔI */}
    <button 
      onClick={handleSaveChanges} 
      style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
    >
      💾 Lưu ĐH
    </button>

    {/* 2. NÚT COPY ĐƠN HÀNG (MỚI CHUYỂN VÀO) */}
    <button 
      onClick={handleDuplicateCurrentOrder} 
      style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
      title="Sao chép toàn bộ thông tin đơn hàng này thành đơn mới"
    >
      📋 Copy ĐH
    </button>

    {/* 3. NÚT XÓA ĐƠN HÀNG (MỚI CHUYỂN VÀO) */}
    <button 
      onClick={handleDeleteCurrentOrder} 
      style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
      title="Hủy bỏ và xóa vĩnh viễn đơn hàng hiện tại"
    >
      🗑️ Xóa ĐH
    </button>

    

  </div>
      
      </div>

      {/* THÔNG TIN CHUNG - ĐỒNG BỘ ĐƠN HÀNG CHA */}
      <h3 style={{ color: '#333', marginBottom: '10px' }}>ℹ️ Thông tin chung đơn hàng</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
        
{/* 🌟 KHU VỰC HIỂN THỊ THÔNG TIN KHÁCH HÀNG (ĐÃ ĐÓNG BĂNG ĐỂ BẢO VỆ BẢNG GIÁ) */}
<div style={{ position: 'relative' }}>
  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', marginBottom: '5px' }}>
    Khách Hàng:
  </label>
  
  {/* ĐƯA THẲNG VỀ DẠNG TEXT TĨNH, KHÔNG CHO PHÉP CHUYỂN TRẠNG THÁI CHỈNH SỬA */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '38px' }}>
    {/* TÊN KHÁCH HÀNG CÓ HIỆU ỨNG CLICK CHUYỂN SANG TRANG CÔNG NỢ (GIỮ NGUYÊN) */}
    <span
      onClick={() => {
        if (typeof onViewCustomerDetail === 'function') {
          onViewCustomerDetail(orderInfo?.customer_id);
        } else {
          window.location.href = `/khach-hang?id=${orderInfo?.customer_id}`;
        }
      }}
      style={{
        fontWeight: 'bold',
        fontSize: '1rem',
        color: '#0056b3', // Giữ màu xanh link để nhận biết bấm được
        cursor: 'pointer'
      }}
      title="Bấm để xem chi tiết thông tin và công nợ khách hàng này"
    >
      {(() => {
        if (!orderInfo) return '---';
        // Hiển thị trực tiếp Tên khách hàng kết hợp mã được nạp sẵn từ bảng orders cha
        if (orderInfo.customer_name && String(orderInfo.customer_name).trim() !== '' && orderInfo.customer_name !== '---') {
          return `${orderInfo.customer_name}`;
        }
        return orderInfo.customer_id || 'Khách';
      })()}
    </span>

    
  </div>


</div>

{/* Thêm ô này vào phần thông tin chung đơn hàng cha, dưới ô Ngày Lập Đơn */}
<div>
  
  {/* Bọc trong div flex để đẩy nút bấm nằm ngang hàng */}
  <div>
  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', marginBottom: '5px' }}>
    Slice ĐH:
  </label>
 
  <div style={{ display: 'flex', gap: '8px' }}>
    {/* CHUYỂN HẲN SANG THẺ SELECT ĐỂ BẤM VÀO LÀ BUNG ĐẦY ĐỦ LỰA CHỌN */}
    <select
      value={orderInfo.order_slice || ''}
      onChange={(e) => handleOrderInfoChange('order_slice', e.target.value)}
      style={{
        flex: 1,
        padding: '7px',
        border: '1px solid #cbd5e1',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontWeight: 'bold',
        minWidth: '0',
        backgroundColor: '#fff', // Giữ màu nền trắng giống ô nhập cũ
        cursor: 'pointer'
      }}
    >
      <option value="">Chọn hoặc tự nhập...</option>
      {AVAILABLE_SLICES.map((slice) => (
        <option key={slice.value} value={slice.value}>
          {slice.value}
        </option>
      ))}
    </select>
 
    {/* GIỮ NGUYÊN NÚT BẤM ÁP DỤNG DÒNG CON CỦA BẠN */}
    <button
      type="button"
      onClick={handleApplySliceToDetails}
      style={{
        padding: '8px 12px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap'
      }}
    >
      🔄 Áp dụng dòng con
    </button>
  </div>
</div>


  <datalist id="order-slice-suggestions">
    {AVAILABLE_SLICES.map((slice) => (
      <option key={slice.value} value={slice.value}>
        {slice.label}
      </option>
    ))}
  </datalist>
</div>


        <div>
  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', marginBottom: '5px' }}>
    Trạng Thái Nợ :
  </label>
  
  {/* 🌟 Bổ sung alignItems: 'stretch' để chiều cao ô input và nút luôn bằng nhau */}
  <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
    <input 
      type="text" 
      value={orderInfo.order_slice || '---'} 
      disabled 
      style={{ 
        flex: 1, 
        padding: '8px', 
        border: '1px solid #cbd5e1', 
        borderRadius: '4px', 
        backgroundColor: '#e2e8f0', 
        textAlign: 'center', 
        fontWeight: 'bold', 
        color: orderInfo.order_slice === 'no' ? '#dc3545' : '#333' 
      }} 
    />
    
    {/* 🌟 Bổ sung whiteSpace: 'nowrap' để chữ trong nút không bao giờ bị nhảy dòng xuống dưới */}
    <button 
      type="button" 
      onClick={toggleDebtStatus} 
      style={{ 
        padding: '8px 12px', 
        backgroundColor: orderInfo.order_slice === 'no' ? '#28a745' : '#dc3545', 
        color: '#fff', 
        border: 'none', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        fontWeight: 'bold', 
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center'
      }} 
    >
      {orderInfo.order_slice === 'no' ? 'Xóa nợ' : 'Ghi nợ'}
    </button>
  </div>
</div>

           

        {/* 🌟 Ô TỔNG LỢI NHUẬN ĐƠN HÀNG TRONG POPUP (Ăn khớp 100% với cấu trúc đối tượng của Popup) */}

<div>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', marginBottom: '5px' }}>LN:</label>
          <input type="text" value={`${Number(orderInfo.total_profit || 0).toLocaleString()} đ`} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#16a34a', fontWeight: 'bold', boxSizing: 'border-box' }} />
        </div>


{/* Ô Ghi chú nằm ngay kế bên và tự giãn rộng chiếm nốt 3 cột còn lại */}
<div style={{ gridColumn: 'span 2' }}>
  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', marginBottom: '5px' }}>
    Ghi Chú Đơn Hàng:
  </label>
  {/* 🌟 ĐỔI TỪ INPUT SANG TEXTAREA ĐỂ CHO PHÉP XUỐNG DÒNG */}
  <textarea
    value={orderInfo.notes || ''}
    onChange={(e) => handleOrderInfoChange('notes', e.target.value)}
    placeholder="Nhập ghi chú mới (Nhấn Enter để xuống dòng)..."
    rows={2} // Thiết lập chiều cao mặc định ban đầu hiển thị được 2 dòng
    style={{
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #cbd5e1',
      borderRadius: '4px',
      boxSizing: 'border-box',
      fontSize: '0.9rem',
      backgroundColor: '#fff',
      fontFamily: 'inherit', // Giữ nguyên phông chữ giống các ô nhập khác
      resize: 'vertical',   // Cho phép người dùng chủ động kéo rộng/hẹp chiều cao nếu cần
      minHeight: '38px'     // Đảm bảo chiều cao tối thiểu bằng với ô input bên cạnh
    }}
  />
</div>

      </div>
            {/* DANH SÁCH BẢNG SẢN PHẨM CON ĐỒNG BỘ HOÀN TOÀN CẤU TRÚC TÌM KIẾM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ color: '#333', margin: 0 }}> Danh sách sản phẩm</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Nút bấm mới: Cập nhật giá bán hàng loạt cho toàn bộ các dòng sản phẩm */}
          <button 
            type="button" 
            onClick={handleUpdateAllPricesToCurrent} 
            style={{ backgroundColor: '#17a2b8', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🔄 Cập nhật giá tất cả các dòng
          </button>
          
        </div>
      </div>


      <div style={{ overflow: 'visible' }}>
        <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.8rem', borderColor: '#cbd5e1', overflow: 'visible' }}>
          <thead>
            <tr style={{ backgroundColor: '#007bff', color: '#fff' }}>
              <th width="15%">Sản phẩm</th>
              <th width="5%">Số Lg</th>
              <th width="5%">Dài(mm)</th>
              <th width="5%">Rộng</th>
              <th width="5%">Dài</th>
              <th width="5%">Số Lg dài</th>
              <th width="5%">Slice dhct</th>
              <th width="5%">SL Quy Đổi</th>
              <th width="6%">Chiết Khấu</th>
              <th width="6%">Phí Ship</th>
              <th width="7%">Giá</th>
              <th width="8%">Thành Tiền</th>
              <th width="8%">Thao Tác</th>
            </tr>
          </thead>
          <tbody style={{ overflow: 'visible' }}>
          {orderDetails.map((item, index) => {

            // Hàm phụ trợ dùng chung để kích hoạt mở Popup Sửa nhanh
  const openEditPopup = () => {
    setEditingRowIndex(index);
    setPopupItem({ 
      ...item,
      current_gia_met: item.current_gia_met || products.find(p => p.product_code === item.product_code)?.GiaMet || 0 
    }); 
    setShowEditPopup(true);
  };
  
  // 🚀 BƯỚC ĐỘT PHÁ: Tìm sản phẩm tương ứng trong mảng tổng dựa trên mã product_code của dòng
  const currentProd = products.find(p => p.product_code === item.product_code);
const displayProductName = currentProd
 ? currentProd.product_name 
 : (item.product_name || 'Chưa chọn sản phẩm');



  return (
 <tr key={index || `new-row-${index}`} style={{ backgroundColor: '#fff', borderBottom: '1px solid #cbd5e1' }}>{/* CỘT TÌM KIẾM / CHỌN SẢN PHẨM MỚI (ĐÃ THAY THẾ) */}
{/* Tên sản phẩm hiển thị dạng văn bản thường */}
        {/* Vị trí hiển thị tên sản phẩm trong bảng vật tư chi tiết đơn hàng */}
<td 
  style={{ cursor: 'pointer', color: '#02080e', fontWeight: 'bold' }}
  onClick={() => {
    if (!item.product_code) {
      showAutoCloseToast('⚠️ Dòng này chưa chọn sản phẩm!');
      return;
    }
    onViewDetail(item.product_code); 
  }}
>
  {/* 🌟 HIỂN THỊ SIÊU TỐC: Ưu tiên tên Backend JOIN -> Tên trong Bộ từ điển -> Tên thô -> Mã SP */}
  {(() => {
    const currentCode = String(item.product_code || '').trim().toLowerCase();
    
    // Tra cứu trực tiếp bằng từ điển (Tốc độ tức thì, không dùng hàm .find() chạy chậm nữa)
    const nameFromMap = productMap[currentCode];

    return item.sys_product_name || item.product_name || nameFromMap || item.product_code || 'Chưa chọn sản phẩm';
  })()}
</td>





      {/* Các cột số liệu chuyển hết từ ô input thành dạng TEXT */}
<td style={{ cursor: 'pointer' }} onClick={openEditPopup}>{item.quantity ?? 0}</td>      
  <td style={{ cursor: 'pointer' }} onClick={openEditPopup}>{item.length_mm ?? 0}</td>
<td style={{ cursor: 'pointer' }} onClick={openEditPopup}>
  {item.width_value ? Number(item.width_value) : 0}
</td>
        <td style={{ cursor: 'pointer' }} onClick={openEditPopup}>{item.length_value ?? 0}</td>
        <td style={{ cursor: 'pointer' }} onClick={openEditPopup}>{item.piece_quantity ?? 0}</td>
        <td><span style={{ color: '#64748b' }}>{item.detail_slice || '---'}</span></td>
        <td style={{ cursor: 'pointer' }} onClick={openEditPopup}>{item.converted_quantity ?? 0}</td>
        <td style={{ cursor: 'pointer' }} onClick={openEditPopup}>{item.chiet_khau ?? 0}</td>
        <td style={{ cursor: 'pointer' }} onClick={openEditPopup}>{Number(item.phi_ship || 0).toLocaleString()}đ</td>
        <td style={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={openEditPopup}>
  {Number(item.price || 0).toLocaleString()}đ
</td>
<td style={{ fontWeight: 'bold', color: '#000a04', cursor: 'pointer' }} onClick={openEditPopup}>
  {Number(item.total_amount || 0).toLocaleString()}đ
</td>        
                  {/* BẮT ĐẦU KHỐI THAO TÁC TRÊN TỪNG DÒNG VẬT TƯ CON */}
{/* Ô THAO TÁC TRÊN TỪNG DÒNG ĐƠN HÀNG CON */}
<td>

  
 <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
   

   
   {/* NÚT COPY DÒNG CON THÔNG MINH */}
{/* 🌟 ĐÃ SỬA: Truyền thêm biến index vào hàm để hệ thống nhận diện đúng dòng */}
<button
  type="button"
  onClick={() => handleOpenCopyPopup(item, index)} 
  style={{
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '5px',
    fontWeight: 'bold'
  }}
  title="Nhân bản dòng sản phẩm này"
>
  +
</button>



   {/* NÚT CẬP NHẬT GIÁ DÒNG THEO THỜI GIÁ */}
   <button 
     type="button" 
     onClick={() => handleUpdateToCurrentPrice(index)} 
     style={{ padding: '4px 6px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
     title="Cập nhật giá hiện tại"
   >
     🔄
   </button>

   {/* NÚT XÓA DÒNG VẬT TƯ AN TOÀN */}
   <button 
     type="button" 
     onClick={() => {
       const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa dòng vật tư số ${index + 1} này không?`);
       if (confirmDelete) {
         handleRemoveProduct(index);
       }
     }} 
     style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
     title="Xóa dòng này"
   >
     X
   </button>

 </div>
</td>


{/* KẾT THÚC KHỐI THAO TÁC */}


                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', margin: '12px 0', width: '100%' }}>
  <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>
    Tổng đơn:</label>
  <input type="text" value={`${Number(orderInfo.net_amount || 0).toLocaleString()} đ`} disabled style={{ width: '235px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#030303', fontWeight: 'bold', boxSizing: 'border-box', textAlign: 'right' }} />
</div>

<div style={{ 
  display: 'flex', 
  justifyContent: 'flex-end',  // Đẩy toàn bộ nhãn, ô nhập và nút bấm về sát lề phải
  alignItems: 'center', 
  gap: '15px',                 // Khoảng cách cố định từ nhãn "Nợ cũ:" đến ô nhập
  margin: '12px 0', 
  width: '100%' 
}}>

<button 
      type="button" 
      onClick={toggleDebtStatus} 
      style={{ 
        padding: '8px 12px', 
        backgroundColor: orderInfo.order_slice === 'no' ? '#28a745' : '#dc3545', 
        color: '#fff', 
        border: 'none', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        fontWeight: 'bold', 
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center'
      }} 
    >
      {orderInfo.order_slice === 'no' ? 'Xóa nợ' : 'Ghi nợ'}
    </button>


  <button
      type="button"
      onClick={toggleCalculateTotalOldDebt}
      style={{
        backgroundColor: Number(orderInfo.old_debt || 0) > 0 ? '#dc3545' : '#17a2b8',
        color: '#fff',
        border: 'none',
        padding: '8px 12px',   // Đồng bộ padding chiều cao 8px với ô input
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease'
      }}
      title="Bấm để tự động cộng dồn nợ cũ hoặc đặt lại bằng 0"
    >
      {Number(orderInfo.old_debt || 0) > 0 ? 'Reset' : '➕ Cộng'}
    </button>
  <label style={{ 
    fontWeight: 'bold', 
    fontSize: '0.85rem', 
    color: '#475569', 
    whiteSpace: 'nowrap' 
  }}>
    Nợ cũ:
  </label>
  
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px',
    width: '235px',            // Tổng độ rộng khối nhập liệu bằng khít với các ô khác
    boxSizing: 'border-box'
  }}>
    <input 
      type="number" 
      step="any"
      placeholder="0"
      value={orderInfo.old_debt ?? ''} 
      onChange={(e) => handleOrderInfoChange('old_debt', e.target.value === '' ? '' : parseFloat(e.target.value))} 
      style={{ 
        flex: 1,               // Tự động chiếm khoảng trống còn lại sau khi trừ nút bấm
        textAlign: 'right',    // Căn phải con số nợ cũ nhập vào
        padding: '8px',        // Tăng lên 8px cho bằng chiều cao các ô khác
        borderRadius: '4px', 
        border: '1px solid #cbd5e1',
        fontWeight: 'bold',
        boxSizing: 'border-box'
      }}
    />

    
  </div>
</div>


<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', margin: '12px 0', width: '100%' }}>
  <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#520404', whiteSpace: 'nowrap' }}>
    Tổng thanh toán:</label>
  <input type="text" value={`${Number(orderInfo.total_amount || 0).toLocaleString()} đ`} disabled style={{ width: '235px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#e4230d', fontWeight: 'bold', boxSizing: 'border-box', textAlign: 'right' }} />
</div>

<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', margin: '12px 0', width: '100%' }}>
  <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>Khách trả:</label>
  <input type="number" value={orderInfo.customer_paid || 0} onChange={(e) => handleOrderInfoChange('customer_paid', parseFloat(e.target.value) || 0)} style={{ width: '235px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#2563eb', fontWeight: 'bold', boxSizing: 'border-box', textAlign: 'right' }} />
</div>

<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', margin: '12px 0', width: '100%' }}>
  <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>Ghi nợ (Còn lại):</label>
  <input type="text" value={`${Number(orderInfo.current_debt || 0).toLocaleString()} đ`} disabled style={{ width: '235px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fdf2f2', color: '#dc3545', fontWeight: 'bold', boxSizing: 'border-box', textAlign: 'right' }} />
</div>



      </div>




       
<div style={{ display: 'flex', gap: '10px' }}>
  
   
   {/* NÚT THÊM SẢN PHẨM GHIM CỐ ĐỊNH CHÍNH GIỮA MÉP DƯỚI MÀN HÌNH */}
<div style={{
  position: 'fixed',
  bottom: '25px',       // Cách mép dưới màn hình 25px
  left: '50%',          // Dịch sang phải 50% màn hình
  transform: 'translateX(-50%)', // Kéo ngược lại 50% chiều rộng nút để chuẩn giữa 100%
  zIndex: 1001,         // Đặt số lớn để đảm bảo nổi trên tất cả bảng biểu và toast popup
  pointerEvents: 'none' // Giúp người dùng vẫn cuộn chuột hoặc click xuyên qua vùng trống xung quanh nút được
}}>
  <button
    type="button"
    onClick = {() => {
      setPopupItem({ 
      product_code: '', 
      specification: 0, 
      quantity: 0, 
      length_mm: 0, 
      width_value: 0, 
      price: 0, // Hoặc để 0 tùy bạn muốn giá mặc định ban đầu là bao nhiêu
      length_value: 0, 
      piece_quantity: 0, 
      chiet_khau: 0, 
      phi_ship: 0, 
      notes: '', 
      total_amount: 0 
    });
      setShowAddPopup(true);
  }}
    style={{
      pointerEvents: 'auto', // Bật lại tính năng click cho riêng nút bấm
      padding: '12px 28px',
      backgroundColor: '#28a745', // Màu xanh lá cây của hệ thống
      color: '#fff',
      border: 'none',
      borderRadius: '50px', // Tạo bo tròn hình viên thuốc
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '1rem',
      boxShadow: '0 5px 20px rgba(40, 167, 69, 0.45)', // Đổ bóng tạo hiệu ứng nổi hẳn lên trên bảng dữ liệu
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap', // Không cho chữ bị xuống dòng khi co giãn màn hình
      transition: 'all 0.2s ease-in-out'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.06)';
      e.currentTarget.style.backgroundColor = '#218838'; // Đậm màu hơn một chút khi di chuột vào
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.backgroundColor = '#28a745';
    }}
  >
    ✨ Thêm sản phẩm
  </button>
</div>

{/* ================================================================= */}
{/* PHẦN 1: KHUNG MODAL CO GIÃN CHỐT NÚT ĐÁY & CỘT 1 + CỘT 2 NHẬP LIỆU */}
{/* ================================================================= */}
{showCopyPopup && copyProductData && (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
    <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '580px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif' }}>
      
      {/* 1. Tiêu đề Popup (Cố định ở đáy trên) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #28a745', padding: '15px 20px 10px 20px', flexShrink: 0 }}>
        <h3 style={{ margin: 0, color: '#28a745', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📋 COPY SẢN PHẨM
        </h3>
        <button type="button" onClick={() => setShowCopyPopup(false)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>✕</button>
      </div>

      {/* 2. Vùng nội dung nhập liệu (Tự động xuất hiện thanh cuộn nếu thu nhỏ trình duyệt quá mức) */}
      <div style={{ overflowY: 'auto', padding: '15px 20px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Hàng thông tin định danh sản phẩm con */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
              Sản Phẩm copy:</label>
            <input type="text" value={copyProductData.product_name || ''} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#e2e8f0', fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>Mã SP Đang Chọn:</label>
            <input type="text" value={copyProductData.product_code || ''} disabled style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#e2e8f0', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
          </div>
        </div>

        {/* BẮT ĐẦU LƯỚI PHÂN CHIA THÀNH 3 CỘT SONG SONG ĐỀU NHAU */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          
          {/* CỘT BÊN TRÁI (CỘT 1 - SỐ LƯỢNG KÍCH THƯỚC MM) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Số Lượng:</label>
              <input type="number" step="any" value={copyProductData.quantity ?? ''} onChange={(e) => handleCopyPopupFieldChange('quantity', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Dài (mm):</label>
              <input type="number" value={copyProductData.length_mm ?? ''} onChange={(e) => handleCopyPopupFieldChange('length_mm', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Rộng:</label>
              <input type="number" step="any" value={copyProductData.width_value ?? ''} onChange={(e) => handleCopyPopupFieldChange('width_value', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Giá :</label>
              <input type="number" value={copyProductData.price ?? 0} onChange={(e) => handleCopyPopupFieldChange('price', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontWeight: 'bold', color: '#007bff', fontSize: '0.85rem' }} />
            </div>
          </div>

          {/* CỘT Ở GIỮA (CỘT 2 - CHIỀU DÀI MÉT & CHI PHÍ KHÁC) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Dài :</label>
              <input type="number" step="any" value={copyProductData.length_value ?? ''} onChange={(e) => handleCopyPopupFieldChange('length_value', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Số Lg Dài:</label>
              <input type="number" value={copyProductData.piece_quantity ?? ''} onChange={(e) => handleCopyPopupFieldChange('piece_quantity', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>Chiết Khấu (đ):</label>
              <input type="number" value={copyProductData.chiet_khau ?? ''} onChange={(e) => handleCopyPopupFieldChange('chiet_khau', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>Phí Ship (đ):</label>
              <input type="number" value={copyProductData.phi_ship ?? ''} onChange={(e) => handleCopyPopupFieldChange('phi_ship', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
          </div>
          {/* ================================================================= */}
          {/* PHẦN 2: CỘT 3 (SỐ LIỆU TỰ NHẢY) & CHÂN POPUP CHỨA NÚT BẤM CỐ ĐỊNH */}
          {/* ================================================================= */}
          {/* CỘT BÊN PHẢI (CỘT 3 - KHU VỰC SỐ LIỆU HỆ THỐNG TỰ NHẢY SỐ 100%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>Quy cách gốc (Spec):</label>
              <input type="text" value={copyProductData.specification ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>SL Quy Đổi:</label>
              <input type="text" value={copyProductData.converted_quantity || 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>TG (đ):</label>
              {/* Giữ nguyên số thuần số học để chặn đứng lỗi gõ kí tự đặc biệt của form */}
              <input type="text" value={copyProductData.tien_goc ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>LN (đ):</label>
              <input type="text" value={copyProductData.profit ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', color: copyProductData.profit >= 0 ? '#16a34a' : '#ef4444', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
          </div>

        </div> {/* Hết lưới 3 cột */}

        {/* Ô nhập ghi chú riêng cho dòng copy */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
            Ghi Chú :</label>
          <textarea value={copyProductData.notes || ''} onChange={(e) => handleCopyPopupFieldChange('notes', e.target.value)} placeholder="Nhập ghi chú riêng cho dòng vật tư nhân bản này..." style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', height: '50px', fontFamily: 'Arial, sans-serif', resize: 'none', fontSize: '0.85rem' }} />
        </div>
      </div> {/* Hết vùng nội dung scroll */}

      {/* 3. Chân Popup (Khóa chặt bằng flexShrink, đảm bảo thu nhỏ cửa sổ luôn thấy đường bấm nút) */}
      <div style={{ padding: '10px 20px 15px 20px', borderTop: '1px solid #e2e8f0', background: '#fff', borderRadius: '0 0 8px 8px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>
          🔹 THÀNH TIỀN: 
          <span style={{ fontSize: '1.2rem', color: '#16a34a', marginLeft: '10px' }}>
            {(copyProductData.total_amount || 0).toLocaleString()} đ
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>


{/* Nút tính lại tiền bạn muốn thêm */}
  <button
    type="button"
    onClick={handleRecalculateCopyPrice}
    style={{
      padding: '8px 16px',
      backgroundColor: '#17a2b8', // Màu xanh Teal/Cyan cá tính
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold'
    }}
  >
    🔄 Tính lại tiền
  </button>

          <button type="button" onClick={() => setShowCopyPopup(false)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Hủy
          </button>
          <button type="button" onClick={handleSaveCopyProduct} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
            📥 Copy
          </button>
        </div>
      </div>

    </div>
  </div>
)}



   
</div>

{/* 🌟 PHẦN 1: KHUNG MODAL & TIÊU ĐỀ CỐ ĐỊNH (PHẦN ĐỈNH) */}
{showEditPopup && popupItem && (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
    <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '580px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Tiêu đề Popup (Khóa chặt ở đỉnh trên) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ffc107', padding: '15px 20px 10px 20px', flexShrink: 0 }}>
        <h3 style={{ margin: 0, color: '#d39e00', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ✏️ CHỈNH SỬA SẢN PHẨM
        </h3>
        <button type="button" onClick={() => setShowEditPopup(false)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>✕</button>
      </div>
      {/* 🌟 PHẦN 2: THÂN MODAL & LƯỚI NHẬP LIỆU 3 CỘT (VÙNG TỰ ĐỘNG XUẤT HIỆN THANH CUỘN) */}
      <div style={{ overflowY: 'auto', padding: '15px 20px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Hàng thông tin định danh sản phẩm */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
              Thay đổi Sản phẩm:
            </label>
            <ProductSearchInput
              item={popupItem} 
              products={products} 
              fetchProducts={fetchProducts} 
              onSelectProduct={(prod) => handleSelectProductInPopup(prod)} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
              Mã SP Đang Chọn:
            </label>
            <input 
              type="text" 
              value={popupItem.product_code || 'Chưa chọn'} 
              disabled 
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#e2e8f0', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} 
            />
          </div>
        </div>

        {/* LƯỚI PHÂN CHIA THÀNH 3 CỘT SONG SONG ĐỀU NHAU */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          
          {/* CỘT BÊN TRÁI (CỘT 1 - SỐ LƯỢNG KÍCH THƯỚC MM) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Số Lượng:
              </label>
              <input type="number" step="any" value={popupItem.quantity ?? ''} onChange={(e) => handleEditPopupFieldChange('quantity', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Dài (mm):
              </label>
              <input type="number" value={popupItem.length_mm ?? ''} onChange={(e) => handleEditPopupFieldChange('length_mm', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Rộng:
              </label>
              <input type="number" step="any" value={popupItem.width_value ?? ''} onChange={(e) => handleEditPopupFieldChange('width_value', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Giá :
              </label>
              <input type="number" value={popupItem.price ?? 0} onChange={(e) => handleEditPopupFieldChange('price', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontWeight: 'bold', color: '#007bff', fontSize: '0.85rem' }} />
            </div>
          </div>

          {/* CỘT Ở GIỮA (CỘT 2 - CHIỀU DÀI MÉT & CHI PHÍ KHÁC) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Dài :
              </label>
              <input type="number" step="any" value={popupItem.length_value ?? ''} onChange={(e) => handleEditPopupFieldChange('length_value', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Số Lg Dài:
              </label>
              <input type="number" value={popupItem.piece_quantity ?? ''} onChange={(e) => handleEditPopupFieldChange('piece_quantity', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Chiết Khấu (đ):
              </label>
              <input type="number" value={popupItem.chiet_khau ?? ''} onChange={(e) => handleEditPopupFieldChange('chiet_khau', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Phí Ship (đ):
              </label>
              <input type="number" value={popupItem.phi_ship ?? ''} onChange={(e) => handleEditPopupFieldChange('phi_ship', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
          </div>

          {/* CỘT BÊN PHẢI (CỘT 3 - KHU VỰC SỐ LIỆU HỆ THỐNG TỰ NHẢY SỐ 100%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Quy cách gốc (Spec):
              </label>
              <input type="text" value={popupItem.specification ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                SL Quy Đổi:
              </label>
              <input type="text" value={popupItem.converted_quantity || 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                TG (đ):
              </label>
              <input type="text" value={popupItem.tien_goc ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                LN (đ):
              </label>
              <input type="text" value={popupItem.profit ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', color: popupItem.profit >= 0 ? '#16a34a' : '#ef4444', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
          </div>

        </div> {/* Hết lưới 3 cột */}

        {/* Ô nhập ghi chú */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
            Ghi Chú :
          </label>
          <textarea value={popupItem.notes || ''} onChange={(e) => handleEditPopupFieldChange('notes', e.target.value)} placeholder="Nhập ghi chú riêng cho dòng vật tư này..." style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', height: '50px', fontFamily: 'Arial, sans-serif', resize: 'none', fontSize: '0.85rem' }} />
        </div>

      </div> {/* Hết vùng nội dung scroll */}
      {/* 🌟 PHẦN 3: CHÂN POPUP CỐ ĐỊNH & ĐÓNG THẺ (THÀNH TIỀN & NÚT BẤM) */}
      <div style={{ padding: '10px 20px 15px 20px', borderTop: '1px solid #e2e8f0', background: '#fff', borderRadius: '0 0 8px 8px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>
          🔹 THÀNH TIỀN:
          <span style={{ fontSize: '1.2rem', color: '#16a34a', marginLeft: '10px' }}>
            {(popupItem.total_amount || 0).toLocaleString()} đ
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={() => setShowEditPopup(false)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Hủy
          </button>
          <button type="button" onClick={handleSaveEditPopupAndSave} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
            💾 Xác nhận
          </button>
        </div>
      </div>

    </div>
  </div>
)}



  {/* 🌟 PHẦN 1: KHUNG OVERLAY BỌC NGOÀI & TIÊU ĐỀ CỐ ĐỊNH ĐỈNH */}
{showAddPopup && (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
    <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '580px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Tiêu đề cửa sổ (Khóa chặt bằng flexShrink ở đỉnh trên) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #007bff', padding: '15px 20px 10px 20px', flexShrink: 0 }}>
        <h3 style={{ margin: 0, color: '#007bff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ➕ THÊM SẢN PHẨM
        </h3>
        <button type="button" onClick={handleClosePopupAndReset} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>✕</button>
      </div>

      {/* Mở vùng nội dung scroll tự động */}
      <div style={{ overflowY: 'auto', padding: '15px 20px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 🌟 PHẦN 2: HÀNG ĐỊNH DANH CHỌN SẢN PHẨM & COMPONENT TÌM KIẾM MYSQL */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
              Chọn Sản Phẩm:
            </label>
            <div style={{ position: 'relative', width: '100%', minHeight: '38px' }}>
              <ProductSearchInput
                item={popupItem}
                index={0}
                products={products}
                orderDetails={[popupItem]}
                setOrderDetails={(updatedData) => {
                  let selectedCode = '';
                  if (Array.isArray(updatedData) && updatedData.length > 0) {
                    selectedCode = updatedData[0]?.product_code || '';
                  } else if (updatedData && updatedData.product_code) {
                    selectedCode = updatedData.product_code;
                  }
                  if (!selectedCode) return;

                  const fullProduct = products.find(p => p.product_code === selectedCode);
                  if (fullProduct) {
                    setPopupItem(prev => {
                      const custObj = customers.find(c =>
                        c.customer_id === orderInfo.customer_id ||
                        c.customer_name === orderInfo.customer_id
                      );
                      const maKhachHang = custObj ? (custObj.customer_slice || '') : '';
                      const newPrice = determineProductPrice(fullProduct, maKhachHang, prev.quantity, prev.length_mm, prev.width_value);
                      const giaMet = Number(fullProduct.GiaMet) || 0;
                      let calculatedAmount = 0;

                      if (prev.quantity !== 0 && prev.length_mm === 0 && prev.width_value === 0) {
                        calculatedAmount = newPrice * prev.quantity;
                      } else if (prev.quantity === 0 && prev.length_mm !== 0 && prev.width_value === 0) {
                        calculatedAmount = newPrice * (prev.length_mm / 1000);
                      } else if (prev.quantity !== 0 && prev.length_mm !== 0 && prev.width_value === 0) {
                        calculatedAmount = (newPrice * prev.quantity) + (giaMet * (prev.length_mm / 1000));
                      } else if (prev.quantity !== 0 && prev.length_mm !== 0 && prev.width_value !== 0) {
                        calculatedAmount = (newPrice * prev.quantity * prev.length_mm * prev.width_value) / 1000000;
                      } else if (prev.quantity === 0 && prev.length_mm === 0 && prev.width_value !== 0) {
                        calculatedAmount = newPrice * prev.width_value;
                      } else {
                        const totalLen = (Number(prev.length_value) || 0) * (parseInt(prev.piece_quantity) || 0);
                        calculatedAmount = newPrice * (totalLen / 1000 || 0);
                      }

                      return {
                        ...prev,
                        product_code: fullProduct.product_code,
                        specification: parseFloat(fullProduct.specification) || 0,
                        price: newPrice,
                        customer_slice: maKhachHang,
                        detail_slice: '',
                        total_amount: isNaN(calculatedAmount) ? 0 : Math.round(calculatedAmount)
                      };
                    });
                  }
                }}
                recalculateOrderTotals={() => {}}
                orderInfo={orderInfo}
                fetchProducts={fetchProducts}
                customers={customers}
                determineProductPrice={determineProductPrice}
                calculateRowMetrics={() => {}}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
              Mã SP Đang Chọn:
            </label>
            <input 
              type="text" 
              value={popupItem.product_code || 'Chưa chọn'} 
              disabled 
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#e2e8f0', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} 
            />
          </div>
        </div>

        {/* Mở lưới phân chia 3 cột */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          {/* 🌟 PHẦN 3: CỘT 1 (SỐ LƯỢNG, KÍCH THƯỚC MM) & CỘT 2 (CHIỀU DÀI MÉT, PHỤ PHÍ) */}
          
          {/* CỘT BÊN TRÁI (CỘT 1) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Số Lượng:
              </label>
              <input type="number" step="any" value={popupItem.quantity ?? ''} placeholder="0" onChange={(e) => handlePopupFieldChange('quantity', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Dài (mm):
              </label>
              <input type="number" value={popupItem.length_mm ?? ''} placeholder="0" onChange={(e) => handlePopupFieldChange('length_mm', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Rộng:
              </label>
              <input type="number" step="any" value={popupItem.width_value ?? ''} placeholder="0" onChange={(e) => handlePopupFieldChange('width_value', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Giá :
              </label>
              <input type="number" value={popupItem.price ?? ''} placeholder="Tự nhảy giá..." onChange={(e) => handlePopupFieldChange('price', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontWeight: 'bold', color: '#007bff', fontSize: '0.85rem' }} />
            </div>
          </div>

          {/* CỘT Ở GIỮA (CỘT 2) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Dài :
              </label>
              <input type="number" step="any" value={popupItem.length_value ?? ''} placeholder="0" onChange={(e) => handlePopupFieldChange('length_value', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Số Lg Dài:
              </label>
              <input type="number" value={popupItem.piece_quantity ?? ''} placeholder="0" onChange={(e) => handlePopupFieldChange('piece_quantity', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Chiết Khấu (đ):
              </label>
              <input type="number" value={popupItem.chiet_khau ?? ''} placeholder="0" onChange={(e) => handlePopupFieldChange('chiet_khau', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Phí Ship (đ):
              </label>
              <input type="number" value={popupItem.phi_ship ?? ''} placeholder="0" onChange={(e) => handlePopupFieldChange('phi_ship', e.target.value)} style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
          </div>
          {/* 🌟 PHẦN 4: CỘT 3 (SỐ LIỆU HỆ THỐNG NHẢY TỰ ĐỘNG) & Ô GHI CHÚ CHÂN LƯỚI */}
          
          {/* CỘT BÊN PHẢI (CỘT 3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                Quy cách gốc (Spec):
              </label>
              <input type="text" value={popupItem.specification ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                SL Quy Đổi:
              </label>
              <input type="text" value={popupItem.converted_quantity || 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                TG (đ):
              </label>
              <input type="text" value={popupItem.tien_goc ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
                LN (đ):
              </label>
              <input type="text" value={popupItem.profit ?? 0} disabled style={{ width: '100%', padding: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1', color: popupItem.profit >= 0 ? '#16a34a' : '#ef4444', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }} />
            </div>
          </div>

        </div> {/* Đóng lưới 3 cột */}

        {/* Ô nhập ghi chú riêng dưới lưới */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', color: '#475569', textAlign: 'left' }}>
            Ghi Chú :
          </label>
          <textarea value={popupItem.notes || ''} onChange={(e) => handlePopupFieldChange('notes', e.target.value)} placeholder="Nhập ghi chú chi tiết cho dòng vật tư này..." style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box', height: '50px', fontFamily: 'Arial, sans-serif', resize: 'none', fontSize: '0.85rem' }} />
        </div>

      </div> {/* Đóng vùng nội dung scroll tự động */}
      {/* 🌟 PHẦN 5: CHÂN POPUP KHÓA ĐÁY HIỂN THỊ THÀNH TIỀN & CÁC NÚT HÀNH ĐỘNG */}
      <div style={{ padding: '10px 20px 15px 20px', borderTop: '1px solid #e2e8f0', background: '#fff', borderRadius: '0 0 8px 8px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>
          🔹 THÀNH TIỀN:
          <span style={{ fontSize: '1.2rem', color: '#16a34a', marginLeft: '10px' }}>
            {(popupItem.total_amount || 0).toLocaleString()} đ
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={handleClosePopupAndReset} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Hủy
          </button>
          <button type="button" onClick={handleConfirmPopupAndSave} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
            ✅ Xác Nhận & Lưu Đơn
          </button>
        </div>
      </div>

    </div>
  </div>
)}

  

    </div>
  );
};



export default ChiTietDonHangPage;

// 🚀 COMPONENT CÁCH LY LOGIC - ĐÃ ĐỒNG BỘ GỌI API MYSQL KHÔNG LAG TỪ DONHANGPAGE
const ProductSearchInput = ({ item, index, products, orderDetails,
setOrderDetails, recalculateOrderTotals, orderInfo, fetchProducts, customers, determineProductPrice, calculateRowMetrics, onSelectProduct }) => { // 🌟 THÊM PROP onSelectProduct ĐỂ DÙNG TRONG POPUP
  const [isOpen, setIsOpen] = useState(false);
  const [typedText, setTypedText] = useState('');

   // 🌟 SỬA LỖI AN TOÀN: Thêm dấu ?. đề phòng trường hợp item bị undefined khi gọi trong Popup
  const currentProd = products && products.find(p => p && p.product_code === item?.product_code);

  useEffect(() => {
    if (!item || !item.product_code) {
      setTypedText('');
    }
  }, [item?.product_code]); // 🌟 SỬA TẠI ĐÂY: Theo dõi chính xác mã sản phẩm để kích hoạt xóa chữ cũ

  // Khi đang mở tìm kiếm (isOpen = true) thì hiển thị chữ đang gõ (typedText).
  // Khi đã chọn xong và đóng lại (isOpen = false) thì CHỈ HIỂN THỊ TÊN sản phẩm, ẩn mã sp đi.
  // 🌟 SỬA TẠI ĐÂY: Thêm điều kiện (item?.product_code) để ép ô nhập liệu trống trơn khi chưa chọn sản phẩm mới
  const displayName = isOpen ? typedText : (item?.product_code && currentProd ? currentProd.product_name : '');

  return (
    <div style={{ position: 'relative', overflow: 'visible', width: '100%' }}>
      <input
        type="text"
        placeholder="Gõ mã hoặc tên để tìm..."
        className="product-search-input"
        value={displayName}
        onChange={(e) => {
          const val = e.target.value;
          setTypedText(val); // Gõ chữ render nội bộ cực mượt không lag
          setIsOpen(true);

          if (val === '') {
            // 🌟 SỬA LỖI AN TOÀN: Chỉ chạy logic mảng nếu có truyền orderDetails và index đầy đủ
            if (orderDetails && typeof index !== 'undefined') {
              const updated = [...orderDetails];
              updated[index].product_code = '';
              setOrderDetails(updated);
            }
            if (typeof onSelectProduct === 'function') {
              // Nếu dùng trong Popup, báo lên cha là sản phẩm đã bị xóa trống
              onSelectProduct(null);
            }
            if (typeof fetchProducts === 'function') {
              fetchProducts(''); // Reset nạp lại danh sách mặc định
            }
          } 
          // Kích hoạt tìm kiếm Backend nếu không phải chuỗi định dạng "[MÃ] TÊN" có sẵn
          else if (!(val.startsWith('[') && val.includes('] '))) {
            if (typeof fetchProducts === 'function') {
              fetchProducts(val);
            }
          }
        }}
        onFocus={() => {
          setTypedText(currentProd ? currentProd.product_name : '');
          setIsOpen(true);
           }}
        onBlur={() => {
          // Tránh bị mất hiển thị chữ khi người dùng click ra ngoài mà chưa chọn sản phẩm
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault(); 
            setIsOpen(false);   
            e.currentTarget.blur(); 
          }
        }}
        style={{ width: '100%', padding: '6px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #2196F3', fontWeight: 'bold' }}
        required
      />

      {/* KHUNG DROPUP BUNG LÊN TRÊN ĐỂ TRÁNH BỊ CHE KHUẤT DƯỚI ĐÁY TRANG */}
      {isOpen && products && (
        <div className="product-dropdown-container" style={{
          position: 'absolute', 
          zIndex: 999999,           // Tăng zIndex cao hẳn lên để không bị các ô nhập liệu che mất
          top: '100%',              // Thay 'bottom' bằng 'top: 100%' để ép nó xổ từ đáy ô nhập liệu đi xuống
          left: '0',
          width: '550px',            // Đổi từ cố định '550px' sang '100%' để khung gợi ý rộng bằng khít với ô nhập liệu cho đẹp
          backgroundColor: '#fff', 
          border: '2px solid #2196F3',
          borderRadius: '6px', 
          maxHeight: '320px', 
          overflowY: 'auto',
          boxShadow: '0 6px 16px rgba(0,0,0,0.15)', // Đổi thành số dương để bóng đổ xuống dưới
          marginTop: '4px'          // Khoảng cách hở một chút giữa ô nhập và danh sách gợi ý
        }}>
          <div style={{ textAlign: 'right', backgroundColor: '#f1f1f1', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', color: '#dc3545' }} onClick={() => setIsOpen(false)}>
            [✕ Đóng]
          </div>

          {products.length > 0 ? (
            products.slice(0, 30).map(p => (
              <div
                key={p.product_code}
                onMouseDown={(e) => {
                  e.preventDefault(); // Giữ chặt con trỏ chuột không bị văng focus ô input
                  
                  // 🌟 TÌNH HUỐNG 1: Nếu gọi ở Popup Chỉnh sửa (Sử dụng callback onSelectProduct)
                  if (typeof onSelectProduct === 'function') {
                    onSelectProduct(p);
                    setIsOpen(false);
                    return;
                  }

                  // 🌟 TÌNH HUỐNG 2: Chạy mặc định ở bảng danh sách ngoài
                  if (orderDetails && typeof index !== 'undefined') {
                    const updated = [...orderDetails];
                    const currentItem = updated[index];
                    
                    // 1. Gán thông tin sản phẩm được chọn
                    currentItem.product_code = p.product_code;
                    currentItem.specification = p.specification || 0;
                    
                    // 2. Giữ nguyên giá trị cũ nếu đã có, nếu chưa có gán mặc định bằng 0
                    currentItem.quantity = currentItem.quantity || 0;
                    currentItem.length_mm = currentItem.length_mm || 0;
                    currentItem.width_value = currentItem.width_value || 0;
                    currentItem.length_value = currentItem.length_value || 0;
                    currentItem.piece_quantity = currentItem.piece_quantity || 0;
                    
                    // 3. Kích hoạt nhảy đơn giá gợi ý tự động real-time theo đối tượng khách hàng
                    const custObj = customers && customers.find(c => c.customer_id === orderInfo.customer_id);
                    const sliceKH = custObj ? custObj.customer_slice : '';
                    
                    if (typeof determineProductPrice === 'function') {
                      currentItem.price = determineProductPrice(
                        p,
                        sliceKH,
                        currentItem.quantity,
                        currentItem.length_mm,
                        currentItem.width_value
                      );
                    }

                    // 4. Tính toán lại toàn bộ thành tiền dòng và tổng đơn hàng
                    if (typeof calculateRowMetrics === 'function') {
                      calculateRowMetrics(updated, index);
                    }
                    setOrderDetails(updated);
                    if (typeof recalculateOrderTotals === 'function') {
                      recalculateOrderTotals(updated, orderInfo);
                    }
                  }
                  setIsOpen(false); // Chọn xong đóng bảng gợi ý
                }}
                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eef5ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                <img 
        src={p.product_image || 'https://placeholder.com'} // Sử dụng p.product_image, nếu trống sẽ hiện ảnh mặc định
        alt={p.product_name}
        style={{
          width: '42px',
          height: '42px',
          objectFit: 'cover', // Giúp ảnh không bị móp méo
          borderRadius: '4px',
          marginRight: '12px',
          border: '1px solid #ddd'
        }}
        // Tự động chuyển sang ảnh mặc định nếu đường dẫn từ server bị lỗi 404
        onError={(e) => { e.target.src = 'https://placeholder.com'; }} 
      />
                
                <div style={{ textAlign: 'left', flex: 1, paddingRight: '10px', fontSize: '1rem' }}>
                  <span style={{ color: '#007bff', fontWeight: 'bold' }}>[{p.product_code}]</span> — {p.product_name}
                </div>
                
                <span style={{ fontSize: '0.8rem', color: (Number(p.total_imported || 0) - Number(p.total_exported || 0)) <= 0 ? '#dc3545' : '#1b0691', fontWeight: 'bold' }}>
                  📦 Kho: {Number(p.TonKho).toFixed(2)}
                </span>

                  {/* 🏷️ GIÁ SỈ: Đã ánh xạ chính xác sang trường wholesale_price */}
                  {p.wholesale_price !== undefined && p.wholesale_price !== null && (
                    <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
                      🏷️ Sỉ: {Number(p.wholesale_price).toLocaleString('vi-VN')} đ
                    </span>
                  )}
              </div>



            ))
          ) : (
            <div style={{ padding: '15px', color: '#999', textAlign: 'center', fontSize: '0.9rem' }}>
              ❌ Không tìm thấy vật tư phù hợp trong MySQL!
            </div>
          )}
        </div>
      )}
    </div>
  );
};







