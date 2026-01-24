'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Filter, MoreVertical, 
  Battery, Zap, Timer, Car, 
  FileText, Image as ImageIcon,
  CheckCircle2, AlertCircle, Clock,
  PackageCheck, X, Eye, 
  Calendar, Hash, Truck, DollarSign,
  Info, ShieldCheck, Tag, Loader2, Edit,
  Download, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Vehicle, VehicleType, VehicleStatus } from '@/types';
import { getVehicleTransactionStatusConfig } from '@/utils/vehicleTransactionStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useReload } from '@/contexts/ReloadContext';
import { hasAnyPermission, hasPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

// Component hiển thị chi tiết xe (Stock Card)
const VehicleDetailsModal: React.FC<{ vehicle: Vehicle; onClose: () => void; canViewPrice: boolean }> = ({ vehicle, onClose, canViewPrice }) => {
  const [supplier, setSupplier] = useState<{ name: string; code?: string } | null>(null);
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [fullVehicleData, setFullVehicleData] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [createdByUser, setCreatedByUser] = useState<{ full_name: string; email?: string } | null>(null);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeLabel = (type: VehicleType) => {
    switch(type) {
      case VehicleType.EV: return 'VinFast EV (Mới)';
      case VehicleType.USED: return 'VinFast Lướt (Cũ)';
      case VehicleType.NEW: return 'Xe xăng / Loại khác';
      default: return type;
    }
  };

  const isEV = vehicle.type === VehicleType.EV;
  const isUsed = vehicle.type === VehicleType.USED;

  // Fetch full vehicle data and supplier information
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingSupplier(true);

        const response = await fetch(`/api/inventory/${vehicle.id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || 'Không thể tải thông tin xe');
        }

        if (result?.vehicle) {
          setFullVehicleData(result.vehicle);
        }

        if (result?.createdBy) {
          setCreatedByUser({
            full_name: result.createdBy.full_name,
            email: result.createdBy.email
          });
        } else {
          setCreatedByUser(null);
        }

        if (result?.supplier) {
          setSupplier({
            name: result.supplier.name,
            code: result.supplier.code
          });
        } else if (vehicle.supplierId) {
          // Fallback to MOCK_SUPPLIERS if API doesn't have the supplier
          try {
            const { MOCK_SUPPLIERS } = await import('@/constants');
            const mockSupplier = MOCK_SUPPLIERS.find(s => s.id === vehicle.supplierId);
            
            if (mockSupplier) {
              setSupplier({
                name: mockSupplier.name,
                code: mockSupplier.code
              });
            } else {
              setSupplier(null);
            }
          } catch (importError) {
            console.warn('Error importing MOCK_SUPPLIERS:', importError);
            setSupplier(null);
          }
        } else {
          setSupplier(null);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setSupplier(null);
      } finally {
        setLoadingSupplier(false);
      }
    };

    fetchData();
  }, [vehicle.id, vehicle.supplierId]);

  const images = vehicle.images || [];
  const vehicleData = fullVehicleData || vehicle;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                vehicle.status === VehicleStatus.AVAILABLE ? 'bg-emerald-50 text-emerald-600' : 
                vehicle.status === VehicleStatus.RESERVED ? 'bg-amber-50 text-amber-600' :
                vehicle.status === VehicleStatus.SOLD ? 'bg-slate-200 text-slate-700' :
                'bg-blue-50 text-blue-600'
              }`}>
                {vehicle.status === VehicleStatus.AVAILABLE ? 'Sẵn sàng giao dịch' : 
                 vehicle.status === VehicleStatus.RESERVED ? 'Đã cọc' :
                 vehicle.status === VehicleStatus.SOLD ? 'Đã bán' :
                 vehicle.status === VehicleStatus.REGISTRATION ? 'Đang làm hồ sơ' : 'Đã giao'}
              </span>
              {vehicleData.code && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mã xe: <span className="font-mono text-slate-600">{vehicleData.code}</span>
                </span>
              )}
            </div>
            <h2 className="text-3xl font-black text-slate-900">
              {vehicle.make} {vehicle.model} {vehicleData.version ? vehicleData.version : ''} {vehicle.year}
            </h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8">
          {/* Image Gallery and Identification Info - Same Row */}
          <div className="flex gap-6 items-start">
            {/* Image Gallery - Smaller */}
            {images.length > 0 && (
              <section className="space-y-2 flex-shrink-0 w-80">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} className="text-[#00d26a]" /> Hình ảnh xe ({images.length})
                </h3>
                <div className="flex gap-3">
                  {/* Main Image - Smaller */}
                  <div className="flex-1 aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shadow-sm max-w-[280px]">
                    <img 
                      src={images[selectedImageIndex]} 
                      alt={`${vehicle.make} ${vehicle.model} - Ảnh ${selectedImageIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* Thumbnail Gallery */}
                  {images.length > 1 && (
                    <div className="flex flex-col gap-2 w-16 max-h-full overflow-y-auto pr-1">
                      {images.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`aspect-square rounded-lg overflow-hidden border transition-all flex-shrink-0 ${
                            selectedImageIndex === index 
                              ? 'border-[#00d26a] ring-1 ring-[#00d26a]/30 shadow-sm' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img 
                            src={img} 
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Thông tin định danh - Same Row */}
            <section className="space-y-4 flex-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={14} className="text-[#00d26a]" /> Thông tin định danh
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số VIN (Khung)</p>
                  <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{vehicle.vin}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Hãng sản xuất</p>
                  <p className="text-sm font-black text-slate-900">{vehicle.make}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Model</p>
                  <p className="text-sm font-black text-slate-900">{vehicle.model}</p>
                </div>
                {vehicleData.version && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Phiên bản</p>
                    <p className="text-sm font-black text-slate-900">{vehicleData.version}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Năm sản xuất</p>
                  <p className="text-sm font-black text-slate-900">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Màu ngoại thất</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{backgroundColor: (vehicle.color || '#ccc').toLowerCase()}}></div>
                    <p className="text-sm font-black text-slate-900">{vehicle.color || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Phân loại</p>
                  <p className="text-sm font-black text-slate-900">{getTypeLabel(vehicle.type)}</p>
                </div>
                {isUsed && vehicle.mileage && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số km đã đi</p>
                    <p className="text-sm font-black text-slate-900">{vehicle.mileage.toLocaleString('vi-VN')} km</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Pricing */}
            <div className="lg:col-span-1 space-y-6">
              {images.length === 0 && (
                <div className="aspect-[4/3] bg-slate-50 rounded-[32px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100">
                  <Car size={80} strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase mt-4 tracking-widest">Chưa có ảnh</p>
                </div>
              )}
              
              {canViewPrice ? (
                <div className="bg-slate-900 text-white p-7 rounded-[32px] shadow-xl relative overflow-hidden">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">Giá bán lẻ niêm yết</p>
                  <h4 className="text-3xl font-black text-[#00d26a] relative z-10">{formatVND(vehicle.price)}</h4>
                  <div className="mt-6 space-y-3 pt-4 border-t border-white/10 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/40 uppercase">Giá vốn</span>
                      <span className="text-sm font-black text-white/80">{formatVND(vehicle.cost)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/40 uppercase">Lợi nhuận mục tiêu</span>
                      <span className="text-lg font-black text-white">{formatVND(vehicle.price - vehicle.cost)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-[10px] font-black text-white/40 uppercase mb-1">Tỷ lệ lãi</p>
                      <p className="text-xl font-black text-[#00d26a]">
                        {((vehicle.price - vehicle.cost) / vehicle.cost * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#00d26a]/10 rounded-full blur-2xl"></div>
                </div>
              ) : (
                <div className="bg-slate-100 text-slate-400 p-7 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                  <ShieldCheck size={32} className="mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Không có quyền xem giá</p>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-6">

              {/* Thông số kỹ thuật */}
              {isEV && vehicle.batteryHealth && (
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-[#00d26a]" /> Tình trạng Pin VinFast
                  </h3>
                  <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase mb-3">Sức khỏe Pin (SOH)</p>
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-3">
                      <div className="bg-[#00d26a] h-full transition-all" style={{width: `${vehicle.batteryHealth}%`}}></div>
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                      {vehicle.batteryHealth}% <span className="text-sm text-slate-400 font-normal">Battery Health</span>
                    </p>
                  </div>
                </section>
              )}

              {/* Nguồn gốc & Kho vận */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Truck size={14} className="text-[#00d26a]" /> Nguồn gốc & Kho vận
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nguồn nhập</p>
                    {loadingSupplier ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <p className="text-sm font-medium text-slate-400">Đang tải...</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-black text-slate-900">{supplier?.name || 'Chưa có thông tin'}</p>
                        {supplier?.code && (
                          <p className="text-[10px] text-slate-400 font-medium mt-1">Mã: {supplier.code}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ngày nhập kho</p>
                    <p className="text-sm font-black text-slate-900">
                      {vehicleData.entry_date ? formatDate(vehicleData.entry_date) : formatDate(vehicle.createdAt)}
                    </p>
                  </div>
                  {createdByUser && (
                    <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Người nhập kho</p>
                      <p className="text-sm font-black text-slate-900">{createdByUser.full_name}</p>
                      {createdByUser.email && (
                        <p className="text-xs text-slate-500 mt-0.5">{createdByUser.email}</p>
                      )}
                    </div>
                  )}
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cập nhật lần cuối</p>
                    <p className="text-sm font-black text-slate-900">
                      {vehicleData.updated_at ? formatDate(vehicleData.updated_at) : formatDate(vehicle.createdAt)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Ghi chú */}
              {vehicleData.notes && (
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-[#00d26a]" /> Ghi chú
                  </h3>
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{vehicleData.notes}</p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end items-center">
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
            >
              Đóng
            </button>
            <button className="flex items-center gap-2 px-10 py-3 bg-[#00d26a] text-white rounded-2xl text-sm font-black hover:bg-emerald-600 shadow-xl shadow-[#00d26a]/20 transition-all">
              <Plus size={18} /> Lập hợp đồng mua bán
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Inventory: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { reloadKey } = useReload();
  
  // Check permissions
  const hasInventoryPermissions = hasAnyPermission(user?.permissions, PermissionCategories.inventory);
  const canCreateVehicle = hasAnyPermission(user?.permissions, ['inventoryCreate']);
  const canUpdateVehicle = hasAnyPermission(user?.permissions, ['inventoryUpdate']);
  const canDeleteVehicle = hasAnyPermission(user?.permissions, ['inventoryDelete']);
  const canViewPrice = hasPermission(user?.permissions, 'inventoryPrice');
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesRawData, setVehiclesRawData] = useState<any[]>([]); // Store raw data to access version
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ show: boolean; vehicleId: string | null; vehicleInfo: string | null }>({ 
    show: false, 
    vehicleId: null, 
    vehicleInfo: null 
  });
  const [deleting, setDeleting] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'all' | 'day' | 'month' | 'quarter' | 'year'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // Export columns configuration - filter price columns if user doesn't have permission
  const allExportColumnsBase = [
    { key: 'Mã xe', label: 'Mã xe', default: true },
    { key: 'Số VIN (Khung)', label: 'Số VIN (Khung)', default: true },
    { key: 'Số máy', label: 'Số máy', default: true },
    { key: 'Hãng sản xuất', label: 'Hãng sản xuất', default: true },
    { key: 'Model', label: 'Model', default: true },
    { key: 'Phiên bản', label: 'Phiên bản', default: true },
    { key: 'Năm sản xuất', label: 'Năm sản xuất', default: true },
    { key: 'Phân loại xe', label: 'Phân loại xe', default: true },
    { key: 'Màu ngoại thất', label: 'Màu ngoại thất', default: true },
    { key: 'Màu nội thất', label: 'Màu nội thất', default: false },
    { key: 'Số km đã đi', label: 'Số km đã đi', default: true },
    { key: 'Tình trạng pin (SOH %)', label: 'Tình trạng pin (SOH %)', default: false },
    { key: 'Trạng thái', label: 'Trạng thái', default: true },
    { key: 'Trạng thái giao dịch', label: 'Trạng thái giao dịch', default: true },
    { key: 'Vị trí xe', label: 'Vị trí xe', default: true },
    { key: 'Ngày nhập kho', label: 'Ngày nhập kho', default: true },
    { key: 'Số ngày tồn kho', label: 'Số ngày tồn kho', default: true },
    { key: 'Nguồn nhập', label: 'Nguồn nhập', default: true },
    { key: 'Mã nhà cung cấp', label: 'Mã nhà cung cấp', default: false },
    { key: 'Ngày tạo', label: 'Ngày tạo', default: false },
    { key: 'Ngày cập nhật', label: 'Ngày cập nhật', default: false },
    { key: 'Ghi chú', label: 'Ghi chú', default: false },
    { key: 'Số lượng ảnh', label: 'Số lượng ảnh', default: false },
  ];

  const priceColumns = [
    { key: 'Giá niêm yết (VND)', label: 'Giá niêm yết (VND)', default: true },
    { key: 'Giá vốn (VND)', label: 'Giá vốn (VND)', default: true },
    { key: 'Lợi nhuận (VND)', label: 'Lợi nhuận (VND)', default: true },
    { key: 'Tỷ lệ lãi (%)', label: 'Tỷ lệ lãi (%)', default: true },
  ];

  const allExportColumns = canViewPrice 
    ? [...allExportColumnsBase, ...priceColumns]
    : allExportColumnsBase;
  
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(allExportColumns.filter(col => col.default).map(col => col.key))
  );

  // Fetch vehicles from Supabase
  useEffect(() => {
    fetchVehicles();
  }, [reloadKey]); // Re-fetch when reloadKey changes

  // Handle click outside to close action menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openActionMenu && !target.closest('.action-menu-container')) {
        setOpenActionMenu(null);
      }
    };

    if (openActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openActionMenu]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/inventory', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result?.error || 'Không thể tải dữ liệu kho xe';
        console.error('Error fetching vehicles:', errorMessage);
        setError(`Lỗi tải dữ liệu: ${errorMessage}`);
        return;
      }

      const data = result?.vehicles || [];

      if (data) {
        // Store raw data to access version field
        setVehiclesRawData(data);
        
        // Transform Supabase data to Vehicle type
        const transformedVehicles: Vehicle[] = data.map((v: any) => ({
          id: v.id,
          code: v.code || undefined, // Mã xe CTGF-XXXX
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          year: v.year,
          type: v.type as VehicleType,
          price: Number(v.price) || 0,
          cost: Number(v.cost) || 0,
          status: v.status as VehicleStatus,
          color: v.color || '',
          mileage: v.mileage || undefined,
          batteryHealth: v.battery_health || undefined,
          images: v.images || [],
          createdAt: v.created_at || new Date().toISOString(),
          supplierId: v.supplier_id || undefined,
          transactionStatus: v.transaction_status || 'Sẵn sàng giao dịch'
        }));

        setVehicles(transformedVehicles);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Calculate days in stock from entry_date or created_at to now
  const calculateDaysInStock = (vehicle: Vehicle, rawData: any): number => {
    const entryDate = rawData?.entry_date || rawData?.created_at || vehicle.createdAt;
    if (!entryDate) return 0;
    
    const entry = new Date(entryDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - entry.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getStatusConfig = (status: VehicleStatus) => {
    switch(status) {
      case VehicleStatus.AVAILABLE: 
        return { label: 'Trong kho', color: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={12} /> };
      case VehicleStatus.RESERVED: 
        return { label: 'Đã cọc', color: 'bg-amber-50 text-amber-700', icon: <Clock size={12} /> };
      case VehicleStatus.SOLD: 
        return { label: 'Đã bán', color: 'bg-slate-200 text-slate-700', icon: <FileText size={12} /> };
      case VehicleStatus.REGISTRATION:
        return { label: 'Đang làm hồ sơ', color: 'bg-blue-50 text-blue-700', icon: <FileText size={12} /> };
      case VehicleStatus.DELIVERED:
        return { label: 'Đã giao', color: 'bg-slate-200 text-slate-700', icon: <CheckCircle2 size={12} /> };
      default: 
        return { label: 'N/A', color: 'bg-slate-100 text-slate-700', icon: <AlertCircle size={12} /> };
    }
  };

  const getVehicleTypeLabel = (type: VehicleType) => {
    switch(type) {
      case VehicleType.EV:
        return { label: 'VinFast EV (Mới)', color: 'bg-blue-50 text-blue-700', icon: <Battery size={14} /> };
      case VehicleType.USED:
        return { label: 'VinFast Lướt (Cũ)', color: 'bg-amber-50 text-amber-700', icon: <Timer size={14} /> };
      case VehicleType.NEW:
        return { label: 'Xe xăng / Loại khác', color: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={14} /> };
      default:
        return { label: 'N/A', color: 'bg-slate-50 text-slate-700', icon: <Car size={14} /> };
    }
  };

  const getStatusLabel = (status: VehicleStatus) => {
    switch(status) {
      case VehicleStatus.AVAILABLE: return 'Sẵn sàng giao dịch';
      case VehicleStatus.RESERVED: return 'Đã cọc';
      case VehicleStatus.SOLD: return 'Đã bán';
      case VehicleStatus.REGISTRATION: return 'Đang làm hồ sơ';
      case VehicleStatus.DELIVERED: return 'Đã giao';
      default: return status;
    }
  };

  const getTypeLabel = (type: VehicleType) => {
    switch(type) {
      case VehicleType.EV: return 'VinFast EV (Mới)';
      case VehicleType.USED: return 'VinFast Lướt (Cũ)';
      case VehicleType.NEW: return 'Xe xăng / Loại khác';
      default: return type;
    }
  };

  const exportToExcel = async () => {
    try {
      // Get vehicles to export based on date filter
      const vehiclesToExport = filteredVehicles;
      
      if (vehiclesToExport.length === 0) {
        alert('Không có dữ liệu để xuất. Vui lòng chọn thời gian hoặc điều kiện khác.');
        return;
      }

      // Fetch supplier information for all vehicles
      const supplierIds = [...new Set(vehiclesToExport.map(v => v.supplierId).filter(Boolean))];
      const suppliersMap = new Map<string, { name: string; code?: string }>();

      if (supplierIds.length > 0) {
        try {
          const supplierResponse = await fetch('/api/inventory/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: supplierIds })
          });
          const supplierResult = await supplierResponse.json();

          if (supplierResponse.ok && supplierResult?.suppliers) {
            supplierResult.suppliers.forEach((s: { id: string; name: string; code?: string }) => {
              suppliersMap.set(s.id, { name: s.name, code: s.code });
            });
          } else {
            console.warn('Không thể tải danh sách nhà cung cấp từ API.');
          }
        } catch (err) {
          console.warn('Error fetching suppliers from API:', err);
        }
      }

      // Prepare export data with only selected columns
      const allData = vehiclesToExport.map(v => {
        const rawData = vehiclesRawData.find(r => r.id === v.id);
        const supplier = v.supplierId ? suppliersMap.get(v.supplierId) : null;
        const daysInStock = calculateDaysInStock(v, rawData);
        const profit = v.price - v.cost;
        const profitPercent = v.cost > 0 ? ((profit / v.cost) * 100).toFixed(2) : '0';

        const rowData: any = {
          'Mã xe': v.code || '',
          'Số VIN (Khung)': v.vin,
          'Số máy': rawData?.engine_number || '',
          'Hãng sản xuất': v.make,
          'Model': v.model,
          'Phiên bản': rawData?.version || '',
          'Năm sản xuất': v.year,
          'Phân loại xe': getTypeLabel(v.type),
          'Màu ngoại thất': v.color || '',
          'Màu nội thất': rawData?.interior_color || '',
          'Số km đã đi': v.mileage ? v.mileage.toLocaleString('vi-VN') : '',
          'Tình trạng pin (SOH %)': v.batteryHealth ? `${v.batteryHealth}%` : '',
          'Trạng thái': getStatusLabel(v.status),
          'Trạng thái giao dịch': v.transactionStatus || 'Sẵn sàng giao dịch',
          'Vị trí xe': rawData?.vehicle_position || '',
          'Ngày nhập kho': rawData?.entry_date 
            ? new Date(rawData.entry_date).toLocaleDateString('vi-VN')
            : rawData?.created_at 
              ? new Date(rawData.created_at).toLocaleDateString('vi-VN')
              : '',
          'Số ngày tồn kho': daysInStock,
          'Nguồn nhập': supplier?.name || '',
          'Mã nhà cung cấp': supplier?.code || '',
          'Ngày tạo': rawData?.created_at 
            ? new Date(rawData.created_at).toLocaleDateString('vi-VN') + ' ' + new Date(rawData.created_at).toLocaleTimeString('vi-VN')
            : '',
          'Ngày cập nhật': rawData?.updated_at 
            ? new Date(rawData.updated_at).toLocaleDateString('vi-VN') + ' ' + new Date(rawData.updated_at).toLocaleTimeString('vi-VN')
            : '',
          'Ghi chú': rawData?.notes || '',
          'Số lượng ảnh': v.images?.length || 0
        };

        // Chỉ thêm các cột giá nếu user có quyền
        if (canViewPrice) {
          rowData['Giá niêm yết (VND)'] = v.price;
          rowData['Giá vốn (VND)'] = v.cost;
          rowData['Lợi nhuận (VND)'] = profit;
          rowData['Tỷ lệ lãi (%)'] = `${profitPercent}%`;
        }

        return rowData;
      });

      // Filter to only selected columns
      const exportData = allData.map(row => {
        const filteredRow: any = {};
        selectedColumns.forEach(colKey => {
          if (row[colKey as keyof typeof row] !== undefined) {
            filteredRow[colKey] = row[colKey as keyof typeof row];
          }
        });
        return filteredRow;
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths for better readability (only for selected columns)
      const colWidthMap: { [key: string]: number } = {
        'Mã xe': 12,
        'Số VIN (Khung)': 20,
        'Số máy': 18,
        'Hãng sản xuất': 15,
        'Model': 20,
        'Phiên bản': 15,
        'Năm sản xuất': 12,
        'Phân loại xe': 20,
        'Màu ngoại thất': 15,
        'Màu nội thất': 15,
        'Số km đã đi': 12,
        'Tình trạng pin (SOH %)': 18,
        'Giá niêm yết (VND)': 18,
        'Giá vốn (VND)': 18,
        'Lợi nhuận (VND)': 18,
        'Tỷ lệ lãi (%)': 12,
        'Trạng thái': 18,
        'Trạng thái giao dịch': 20,
        'Vị trí xe': 15,
        'Ngày nhập kho': 15,
        'Số ngày tồn kho': 15,
        'Nguồn nhập': 25,
        'Mã nhà cung cấp': 18,
        'Ngày tạo': 20,
        'Ngày cập nhật': 20,
        'Ghi chú': 50,
        'Số lượng ảnh': 12,
      };

      const colWidths = Array.from(selectedColumns).map(col => ({
        wch: colWidthMap[col] || 15
      }));
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo kho xe');

      // Generate filename with date range info
      let dateStr = '';
      const now = new Date();
      switch (dateFilterType) {
        case 'day':
          dateStr = selectedDate ? selectedDate.replace(/-/g, '') : now.toISOString().split('T')[0].replace(/-/g, '');
          break;
        case 'month':
          dateStr = selectedMonth ? selectedMonth.replace(/-/g, '') : '';
          break;
        case 'quarter':
          dateStr = selectedQuarter ? selectedQuarter.replace(/-/g, '').replace('Q', 'Q') : '';
          break;
        case 'year':
          dateStr = selectedYear || now.getFullYear().toString();
          break;
        default:
          dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      }
      
      const filename = `Bao_cao_kho_xe_${dateStr}.xlsx`;

      // Write and download file
      XLSX.writeFile(wb, filename);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại.');
    }
  };

  const toggleColumn = (columnKey: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnKey)) {
      newSelected.delete(columnKey);
    } else {
      newSelected.add(columnKey);
    }
    setSelectedColumns(newSelected);
  };

  const selectAllColumns = () => {
    setSelectedColumns(new Set(allExportColumns.map(col => col.key)));
  };

  const deselectAllColumns = () => {
    setSelectedColumns(new Set());
  };

  const resetToDefaults = () => {
    setSelectedColumns(new Set(allExportColumns.filter(col => col.default).map(col => col.key)));
  };

  // transaction_status badge config is centralized in utils/vehicleTransactionStatus.tsx

  // Filter vehicles based on search and date
  const getFilteredVehicles = () => {
    let filtered = vehicles;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(v =>
        v.vin.toLowerCase().includes(searchLower) ||
        v.model.toLowerCase().includes(searchLower) ||
        v.make.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filter
    if (dateFilterType !== 'all') {
      filtered = filtered.filter(v => {
        const rawData = vehiclesRawData.find(r => r.id === v.id);
        const entryDate = rawData?.entry_date || rawData?.created_at || v.createdAt;
        if (!entryDate) return false;

        const entry = new Date(entryDate);
        
        switch (dateFilterType) {
          case 'day':
            if (!selectedDate) return true;
            const filterDate = new Date(selectedDate);
            return entry.toDateString() === filterDate.toDateString();
          
          case 'month':
            if (!selectedMonth) return true;
            const [year, month] = selectedMonth.split('-');
            return entry.getFullYear() === parseInt(year) && entry.getMonth() + 1 === parseInt(month);
          
          case 'quarter':
            if (!selectedQuarter) return true;
            const [qYear, quarter] = selectedQuarter.split('-Q');
            const entryQuarter = Math.floor(entry.getMonth() / 3) + 1;
            return entry.getFullYear() === parseInt(qYear) && entryQuarter === parseInt(quarter);
          
          case 'year':
            if (!selectedYear) return true;
            return entry.getFullYear() === parseInt(selectedYear);
          
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const filteredVehicles = getFilteredVehicles();

  // Get date range for filtering vehicles for export
  const getDateRangeForExport = () => {
    if (dateFilterType === 'all') return null;
    
    switch (dateFilterType) {
      case 'day':
        if (!selectedDate) return null;
        const day = new Date(selectedDate);
        return {
          start: new Date(day.setHours(0, 0, 0, 0)),
          end: new Date(day.setHours(23, 59, 59, 999))
        };
      
      case 'month':
        if (!selectedMonth) return null;
        const [year, month] = selectedMonth.split('-');
        return {
          start: new Date(parseInt(year), parseInt(month) - 1, 1),
          end: new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        };
      
      case 'quarter':
        if (!selectedQuarter) return null;
        const [qYear, quarter] = selectedQuarter.split('-Q');
        const quarterNum = parseInt(quarter);
        return {
          start: new Date(parseInt(qYear), (quarterNum - 1) * 3, 1),
          end: new Date(parseInt(qYear), quarterNum * 3, 0, 23, 59, 59, 999)
        };
      
      case 'year':
        if (!selectedYear) return null;
        return {
          start: new Date(parseInt(selectedYear), 0, 1),
          end: new Date(parseInt(selectedYear), 11, 31, 23, 59, 59, 999)
        };
      
      default:
        return null;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#00d26a] animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Đang tải dữ liệu kho xe...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-[32px] p-6 flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="flex-1">
            <h3 className="text-lg font-black text-red-900 mb-2">Lỗi tải dữ liệu</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchVehicles}
              className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleViewVehicle = (vehicleId: string) => {
    router.push(`/inventory/${vehicleId}`);
  };

  const handleDeleteClick = (vehicleId: string, vehicleInfo: string) => {
    // Hard stop if user doesn't have delete permission (prevents direct UI triggering)
    if (!canDeleteVehicle) {
      alert('Bạn không có quyền xóa xe. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }
    setOpenActionMenu(null);
    setDeleteConfirmModal({
      show: true,
      vehicleId,
      vehicleInfo
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal.vehicleId) return;
    if (!canDeleteVehicle) {
      alert('Bạn không có quyền xóa xe. Vui lòng liên hệ quản trị viên để được cấp quyền.');
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/inventory/${deleteConfirmModal.vehicleId}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Có lỗi xảy ra khi xóa xe. Vui lòng thử lại.');
      }

      // Close modal and refresh list
      setDeleteConfirmModal({ show: false, vehicleId: null, vehicleInfo: null });
      fetchVehicles();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      alert(error.message || 'Có lỗi xảy ra khi xóa xe. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  // If user doesn't have any inventory permissions, show access denied message
  if (!hasInventoryPermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem kho xe. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="shield"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Tổng số xe', value: vehicles.length, color: 'text-slate-900' },
          { label: 'Sẵn sàng giao', value: vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length, color: 'text-[#00d26a]' },
          { 
            label: 'Đã cọc', 
            value: vehicles.filter(v => 
              v.status === VehicleStatus.RESERVED || 
              v.transactionStatus === 'Đã cọc'
            ).length, 
            color: 'text-amber-600' 
          },
          { 
            label: 'Giá trị tồn kho', 
            value: (() => {
              if (!canViewPrice) return 'Không có quyền';
              // Chỉ tính các xe sẵn sàng giao dịch (AVAILABLE) và dùng giá vốn (cost)
              const inStockVehicles = vehicles.filter(v => 
                v.status === VehicleStatus.AVAILABLE
              );
              const totalValue = inStockVehicles.reduce((sum, v) => sum + v.cost, 0);
              return totalValue > 0 
                ? `${totalValue.toLocaleString('vi-VN')} đ`
                : '0 đ';
            })(), 
            color: 'text-slate-900' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-[28px] border border-slate-100 shadow-sm">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <p className={`text-xl md:text-2xl font-black mt-1 tracking-tighter ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 md:p-5 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm theo mã số VIN hoặc Model xe..."
            className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-2.5 md:py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs md:text-sm font-bold focus:ring-4 focus:ring-[#00d26a]/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 md:gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowExportModal(true)}
            disabled={filteredVehicles.length === 0}
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-8 py-2.5 md:py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-black text-xs md:text-sm transition-all shadow-xl shadow-blue-600/20 flex-1 md:flex-initial justify-center"
          >
            <Download size={16} className="md:w-[18px] md:h-[18px]" /> 
            <span className="hidden sm:inline">XUẤT EXCEL</span>
            <span className="sm:hidden">XUẤT</span>
          </button>
          
          {canCreateVehicle && (
            <Link 
              href="/inventory/new"
              className="flex items-center gap-1.5 md:gap-2 px-4 md:px-10 py-2.5 md:py-3.5 bg-[#00d26a] text-white rounded-2xl hover:bg-emerald-600 font-black text-xs md:text-sm transition-all shadow-xl shadow-[#00d26a]/20 flex-1 md:flex-initial justify-center"
            >
              <Plus size={18} className="md:w-5 md:h-5" /> 
              <span className="hidden sm:inline">NHẬP KHO XE MỚI</span>
              <span className="sm:hidden">NHẬP KHO</span>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm relative overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 md:px-10 py-5">Thông tin xe VinFast</th>
              <th className="px-6 md:px-10 py-5 hidden md:table-cell">Phân loại xe</th>
              <th className="px-6 md:px-10 py-5">Vị trí xe</th>
              <th className="px-6 md:px-10 py-5 hidden lg:table-cell">Trạng thái giao dịch</th>
              <th className="px-6 md:px-10 py-5 text-right hidden md:table-cell">Số ngày tồn kho</th>
              {canViewPrice && (
                <>
                  <th className="px-6 md:px-10 py-5 text-right hidden lg:table-cell">Giá vốn</th>
                  <th className="px-6 md:px-10 py-5 text-right hidden lg:table-cell">Giá niêm yết</th>
                </>
              )}
              <th className="px-6 md:px-10 py-5 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50" style={{ position: 'relative' }}>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={canViewPrice ? 8 : 6} className="px-6 md:px-10 py-12 md:py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Car className="text-slate-300" size={48} />
                    <div>
                      <p className="text-sm font-black text-slate-600 mb-1">
                        {search ? 'Không tìm thấy xe nào' : 'Chưa có xe trong kho'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {search ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn nút "NHẬP KHO XE MỚI" để thêm xe'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVehicles.map((v) => {
              const status = getStatusConfig(v.status);
              const typeConfig = getVehicleTypeLabel(v.type);
              const rawData = vehiclesRawData.find(r => r.id === v.id);
              const version = rawData?.version;
              const engineNumber = rawData?.engine_number;
              const transactionStatusConfig = getVehicleTransactionStatusConfig(v.transactionStatus || 'Sẵn sàng giao dịch');
              return (
                <tr
                  key={v.id}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={(e) => {
                    // If user is selecting text, don't navigate
                    if (window.getSelection()?.toString()) return;
                    handleViewVehicle(v.id);
                  }}
                >
                  <td className="px-6 md:px-10 py-6">
                    <div className="flex items-center gap-3 md:gap-5">
                      {v.images && v.images.length > 0 ? (
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 transition-all group-hover:border-[#00d26a] group-hover:scale-105 shadow-sm flex-shrink-0">
                          <img 
                            src={v.images[0]} 
                            alt={`${v.make} ${v.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center transition-all group-hover:bg-[#00d26a] group-hover:text-white group-hover:scale-105 shadow-sm flex-shrink-0">
                          <Car size={20} className="md:w-6 md:h-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-slate-900 text-sm md:text-base truncate">{v.make} {v.model} {version ? version : ''}</h4>
                        <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                          <p className="text-[10px] font-mono text-slate-400 font-bold tracking-tight uppercase truncate">{v.vin}</p>
                          {engineNumber && (
                            <>
                              <span className="text-[10px] text-slate-300 hidden md:inline">•</span>
                              <p className="text-[10px] font-mono text-slate-400 font-bold tracking-tight uppercase hidden md:inline">Số máy: {engineNumber}</p>
                            </>
                          )}
                          {v.color && (
                            <>
                              <span className="text-[10px] text-slate-300 hidden md:inline">•</span>
                              <div className="flex items-center gap-1.5 hidden md:flex">
                                <div className="w-3 h-3 rounded-full border border-slate-200" style={{backgroundColor: v.color.toLowerCase()}}></div>
                                <p className="text-[10px] text-slate-500 font-medium">{v.color}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 md:px-10 py-6 hidden md:table-cell">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${typeConfig.color}`}>
                      {typeConfig.icon} {typeConfig.label}
                    </span>
                  </td>
                  <td className="px-6 md:px-10 py-6">
                    {rawData?.vehicle_position ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight bg-blue-50 text-blue-700">
                        <PackageCheck size={12} /> {rawData.vehicle_position}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight bg-slate-100 text-slate-500">
                        <AlertCircle size={12} /> Chưa cập nhật
                      </span>
                    )}
                  </td>
                  <td className="px-6 md:px-10 py-6 hidden lg:table-cell">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${transactionStatusConfig.color}`}>
                      {transactionStatusConfig.icon} {transactionStatusConfig.label}
                    </span>
                  </td>
                  <td className="px-6 md:px-10 py-6 text-right hidden md:table-cell">
                    <p className="text-sm font-black text-slate-900">
                      {calculateDaysInStock(v, rawData)} ngày
                    </p>
                  </td>
                  {canViewPrice && (
                    <>
                      <td className="px-6 md:px-10 py-6 text-right hidden lg:table-cell">
                        <p className="text-base font-black text-slate-700">{formatVND(v.cost)}</p>
                      </td>
                      <td className="px-6 md:px-10 py-6 text-right hidden lg:table-cell">
                        <p className="text-base font-black text-slate-900">{formatVND(v.price)}</p>
                      </td>
                    </>
                  )}
                  <td className="px-6 md:px-10 py-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewVehicle(v.id);
                        }}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors flex items-center justify-center flex-shrink-0"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      {canUpdateVehicle && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/inventory/${v.id}/edit`);
                          }}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors flex items-center justify-center flex-shrink-0"
                          title="Cập nhật"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {canDeleteVehicle && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(v.id, `${v.make} ${v.model} - ${v.vin}`);
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors flex items-center justify-center flex-shrink-0"
                          title="Xóa xe"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Xuất báo cáo Excel</h2>
                <p className="text-sm text-slate-500 mt-1">Chọn thông tin và thời gian muốn xuất</p>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
              {/* Date Filter Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-[#00d26a]" /> Lọc theo thời gian nhập kho
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Loại lọc</label>
                    <select
                      value={dateFilterType}
                      onChange={(e) => setDateFilterType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#00d26a]/10 outline-none"
                    >
                      <option value="all">Tất cả</option>
                      <option value="day">Theo ngày</option>
                      <option value="month">Theo tháng</option>
                      <option value="quarter">Theo quý</option>
                      <option value="year">Theo năm</option>
                    </select>
                  </div>

                  {dateFilterType === 'day' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Chọn ngày</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#00d26a]/10 outline-none"
                      />
                    </div>
                  )}

                  {dateFilterType === 'month' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Chọn tháng</label>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#00d26a]/10 outline-none"
                      />
                    </div>
                  )}

                  {dateFilterType === 'quarter' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Chọn quý</label>
                      <select
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#00d26a]/10 outline-none"
                      >
                        <option value="">Chọn quý</option>
                        {[1, 2, 3, 4].map(q => (
                          <option key={q} value={`${selectedYear}-Q${q}`}>
                            Quý {q} - {selectedYear}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {dateFilterType === 'year' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Chọn năm</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setSelectedQuarter('');
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-[#00d26a]/10 outline-none"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {dateFilterType !== 'all' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-sm font-bold text-blue-900">
                      Sẽ xuất: <span className="text-[#00d26a]">{filteredVehicles.length}</span> xe phù hợp với điều kiện
                    </p>
                  </div>
                )}
              </section>

              {/* Column Selection Section */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-[#00d26a]" /> Chọn thông tin xuất ra
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllColumns}
                      className="px-3 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      onClick={deselectAllColumns}
                      className="px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      Bỏ chọn tất cả
                    </button>
                    <button
                      onClick={resetToDefaults}
                      className="px-3 py-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                    >
                      Mặc định
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {allExportColumns.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-[#00d26a] cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="w-4 h-4 text-[#00d26a] border-slate-300 rounded focus:ring-[#00d26a] focus:ring-2"
                        />
                        <span className="text-sm font-bold text-slate-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {selectedColumns.size === 0 && (
                  <p className="text-sm text-amber-600 font-bold">⚠️ Vui lòng chọn ít nhất một cột để xuất</p>
                )}
              </section>
            </div>

            {/* Footer Actions */}
            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
              >
                Hủy
              </button>
              <button
                onClick={exportToExcel}
                disabled={selectedColumns.size === 0 || filteredVehicles.length === 0}
                className="px-10 py-3 bg-[#00d26a] text-white rounded-2xl text-sm font-black hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-xl shadow-[#00d26a]/20 transition-all flex items-center gap-2"
              >
                <Download size={18} /> Xuất Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Xác nhận xóa xe</h2>
                  <p className="text-sm text-slate-500 mt-1">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button 
                onClick={() => setDeleteConfirmModal({ show: false, vehicleId: null, vehicleInfo: null })}
                disabled={deleting}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-10 space-y-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-red-900 mb-3">
                  Bạn có chắc chắn muốn xóa xe này?
                </p>
                <div className="bg-white rounded-xl p-4 border border-red-200">
                  <p className="text-base font-black text-slate-900">
                    {deleteConfirmModal.vehicleInfo}
                  </p>
                </div>
                <p className="text-xs text-red-700 mt-4 leading-relaxed">
                  ⚠️ Tất cả thông tin và hình ảnh của xe sẽ bị xóa vĩnh viễn khỏi hệ thống. 
                  Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
              <button
                onClick={() => setDeleteConfirmModal({ show: false, vehicleId: null, vehicleInfo: null })}
                disabled={deleting}
                className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting || !canDeleteVehicle}
                className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
