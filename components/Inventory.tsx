'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, MoreVertical, 
  Battery, Zap, Timer, Car, 
  FileText, Image as ImageIcon,
  CheckCircle2, AlertCircle, Clock,
  PackageCheck, Link2, X, Eye, 
  Calendar, Hash, Truck, DollarSign,
  Info, ShieldCheck, Tag, Loader2, Edit
} from 'lucide-react';
import { Vehicle, VehicleType, VehicleStatus } from '@/types';
import { supabase } from '@/services/supabaseClient';

// Component hiển thị chi tiết xe (Stock Card)
const VehicleDetailsModal: React.FC<{ vehicle: Vehicle; onClose: () => void }> = ({ vehicle, onClose }) => {
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
        // Fetch full vehicle data from Supabase to get all fields
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', vehicle.id)
          .single();

        if (!vehicleError && vehicleData) {
          setFullVehicleData(vehicleData);

          // Fetch thông tin người nhập kho
          if (vehicleData.created_by) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('full_name, email')
              .eq('id', vehicleData.created_by)
              .single();

            if (!userError && userData) {
              setCreatedByUser({
                full_name: userData.full_name,
                email: userData.email
              });
            }
          }
        }

        // Fetch supplier information
        if (vehicle.supplierId) {
          setLoadingSupplier(true);
          
          // Try to fetch from Supabase suppliers table first
          const { data: supabaseSupplier, error: supplierError } = await supabase
            .from('suppliers')
            .select('name, code')
            .eq('id', vehicle.supplierId)
            .single();

          if (!supplierError && supabaseSupplier) {
            setSupplier({
              name: supabaseSupplier.name,
              code: supabaseSupplier.code
            });
          } else {
            // Fallback to MOCK_SUPPLIERS if Supabase doesn't have the supplier
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesRawData, setVehiclesRawData] = useState<any[]>([]); // Store raw data to access version
  const [search, setSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  // Fetch vehicles from Supabase
  useEffect(() => {
    fetchVehicles();
  }, []);

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

      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching vehicles:', fetchError);
        setError(`Lỗi tải dữ liệu: ${fetchError.message}`);
        return;
      }

      if (data) {
        // Store raw data to access version field
        setVehiclesRawData(data);
        
        // Transform Supabase data to Vehicle type
        const transformedVehicles: Vehicle[] = data.map((v: any) => ({
          id: v.id,
          code: v.code || undefined, // Mã xe GCM-XXX
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
          supplierId: v.supplier_id || undefined
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

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(v => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      v.vin.toLowerCase().includes(searchLower) ||
      v.model.toLowerCase().includes(searchLower) ||
      v.make.toLowerCase().includes(searchLower)
    );
  });

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

  return (
    <div className="space-y-8">
      {selectedVehicle && <VehicleDetailsModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Tổng số xe', value: vehicles.length, color: 'text-slate-900' },
          { label: 'Sẵn sàng giao', value: vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length, color: 'text-[#00d26a]' },
          { label: 'Đang làm hồ sơ', value: vehicles.filter(v => v.status === VehicleStatus.REGISTRATION).length, color: 'text-amber-600' },
          { 
            label: 'Giá trị tồn kho', 
            value: vehicles.length > 0 
              ? `${vehicles.reduce((sum, v) => sum + v.price, 0).toLocaleString('vi-VN')} đ`
              : '0 đ', 
            color: 'text-slate-900' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 tracking-tighter ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo mã số VIN hoặc Model xe..."
            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold focus:ring-4 focus:ring-[#00d26a]/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Link 
          href="/inventory/new"
          className="flex items-center gap-2 px-10 py-3.5 bg-[#00d26a] text-white rounded-2xl hover:bg-emerald-600 font-black text-sm transition-all shadow-xl shadow-[#00d26a]/20"
        >
          <Plus size={20} /> NHẬP KHO XE MỚI
        </Link>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-10 py-5">Thông tin xe VinFast</th>
              <th className="px-10 py-5">Tình trạng kho</th>
              <th className="px-10 py-5 text-right">Giá niêm yết</th>
              <th className="px-10 py-5 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-10 py-20 text-center">
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
              const rawData = vehiclesRawData.find(r => r.id === v.id);
              const version = rawData?.version;
              const engineNumber = rawData?.engine_number;
              return (
                <tr 
                  key={v.id} 
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedVehicle(v)}
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      {v.images && v.images.length > 0 ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 transition-all group-hover:border-[#00d26a] group-hover:scale-105 shadow-sm">
                          <img 
                            src={v.images[0]} 
                            alt={`${v.make} ${v.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center transition-all group-hover:bg-[#00d26a] group-hover:text-white group-hover:scale-105 shadow-sm">
                          <Car size={24} />
                        </div>
                      )}
                      <div>
                        <h4 className="font-black text-slate-900">{v.make} {v.model} {version ? version : ''}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] font-mono text-slate-400 font-bold tracking-tight uppercase">{v.vin}</p>
                          {engineNumber && (
                            <>
                              <span className="text-[10px] text-slate-300">•</span>
                              <p className="text-[10px] font-mono text-slate-400 font-bold tracking-tight uppercase">Số máy: {engineNumber}</p>
                            </>
                          )}
                          {v.color && (
                            <>
                              <span className="text-[10px] text-slate-300">•</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full border border-slate-200" style={{backgroundColor: v.color.toLowerCase()}}></div>
                                <p className="text-[10px] text-slate-500 font-medium">{v.color}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <p className="text-base font-black text-slate-900">{formatVND(v.price)}</p>
                  </td>
                  <td className="px-10 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block action-menu-container">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenu(openActionMenu === v.id ? null : v.id);
                        }}
                        className="p-3 text-slate-400 hover:text-[#00d26a] hover:bg-[#00d26a]/10 rounded-2xl transition-all"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {openActionMenu === v.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(v);
                              setOpenActionMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            <Eye size={18} className="text-slate-600" />
                            <span className="text-sm font-bold text-slate-700">Xem chi tiết</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Navigate to edit page or open edit modal
                              setOpenActionMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
                          >
                            <Edit size={18} className="text-slate-600" />
                            <span className="text-sm font-bold text-slate-700">Cập nhật</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
