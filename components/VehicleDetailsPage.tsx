'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, X, Car, 
  FileText, Image as ImageIcon,
  Info, Truck, DollarSign,
  Zap, Loader2
} from 'lucide-react';
import { Vehicle, VehicleType, VehicleStatus } from '@/types';
import { getVehicleTransactionStatusConfig } from '@/utils/vehicleTransactionStatus';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';

export const VehicleDetailsPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const vehicleId = params.id as string;
  const canViewPrice = hasPermission(user?.permissions, 'inventoryPrice');

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<{ name: string; code?: string } | null>(null);
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [fullVehicleData, setFullVehicleData] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [createdByUser, setCreatedByUser] = useState<{ full_name: string; email?: string } | null>(null);
  const [updatedByUser, setUpdatedByUser] = useState<{ full_name: string; email?: string } | null>(null);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const getTypeLabel = (type: VehicleType) => {
    switch(type) {
      case VehicleType.EV: return 'VinFast EV (Mới)';
      case VehicleType.USED: return 'VinFast Lướt (Cũ)';
      case VehicleType.NEW: return 'Xe xăng / Loại khác';
      default: return type;
    }
  };

  // Fetch vehicle data
  useEffect(() => {
    const fetchData = async () => {
      if (!vehicleId) {
        console.warn('VehicleDetailsPage: No vehicleId provided');
        setError('Không tìm thấy ID xe');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        setLoadingSupplier(true);

        const response = await fetch(`/api/inventory/${vehicleId}`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          const errorMessage = result?.error || 'Không thể tải thông tin xe';
          setError(`Lỗi tải dữ liệu: ${errorMessage}`);
          setLoading(false);
          return;
        }

        const vehicleData = result?.vehicle;
        if (!vehicleData) {
          setError('Không tìm thấy thông tin xe');
          setLoading(false);
          return;
        }

        setFullVehicleData(vehicleData);

        const transformedVehicle: Vehicle = {
          id: vehicleData.id,
          code: vehicleData.code || undefined,
          vin: vehicleData.vin,
          make: vehicleData.make || 'VinFast',
          model: vehicleData.model || '',
          year: vehicleData.year,
          type: vehicleData.type as VehicleType,
          price: Number(vehicleData.price) || 0,
          cost: Number(vehicleData.cost) || 0,
          status: vehicleData.status as VehicleStatus,
          color: vehicleData.color || '',
          mileage: vehicleData.mileage || undefined,
          batteryHealth: vehicleData.battery_health || undefined,
          images: vehicleData.images || [],
          createdAt: vehicleData.created_at || new Date().toISOString(),
          supplierId: vehicleData.supplier_id || undefined,
          transactionStatus: vehicleData.transaction_status || 'Sẵn sàng giao dịch'
        };

        setVehicle(transformedVehicle);

        if (result?.createdBy) {
          setCreatedByUser({
            full_name: result.createdBy.full_name,
            email: result.createdBy.email
          });
        } else {
          setCreatedByUser(null);
        }

        if (result?.updatedBy) {
          setUpdatedByUser({
            full_name: result.updatedBy.full_name,
            email: result.updatedBy.email
          });
        } else {
          setUpdatedByUser(null);
        }

        if (result?.supplier) {
          setSupplier({
            name: result.supplier.name,
            code: result.supplier.code
          });
        } else if (vehicleData.supplier_id) {
          try {
            const { MOCK_SUPPLIERS } = await import('@/constants');
            const mockSupplier = MOCK_SUPPLIERS.find(s => s.id === vehicleData.supplier_id);
            
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
      } catch (err: any) {
        console.error('Error fetching data:', err);
        const errorMessage = err?.message || err?.error?.message || 'Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.';
        setError(errorMessage);
      } finally {
        setLoading(false);
        setLoadingSupplier(false);
      }
    };

    fetchData();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#00d26a] animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Đang tải thông tin xe...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-[32px] p-6 flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-black text-red-900 mb-2">Lỗi tải dữ liệu</h3>
            <p className="text-sm text-red-700 mb-4">{error || 'Không tìm thấy thông tin xe'}</p>
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
            >
              <ArrowLeft size={18} /> Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const images = vehicle.images || [];
  const vehicleData = fullVehicleData || vehicle;
  const isEV = vehicle.type === VehicleType.EV;
  const isUsed = vehicle.type === VehicleType.USED;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/inventory"
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {(() => {
                const txStatus = getVehicleTransactionStatusConfig(fullVehicleData?.transaction_status || 'Sẵn sàng giao dịch');
                return (
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${txStatus.color}`}>
                    {txStatus.icon} {txStatus.label}
                  </span>
                );
              })()}
              {vehicleData.code && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mã xe: <span className="font-mono text-slate-600">{vehicleData.code}</span>
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {vehicle.make} {vehicle.model} {vehicleData.version ? vehicleData.version : ''} {vehicle.year}
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 space-y-8">
          {/* Image Gallery and Identification Info - Same Row */}
          <div className="grid grid-cols-[1fr_1fr] gap-6 items-start">
            {/* Image Gallery */}
            {images.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} className="text-[#00d26a]" /> Hình ảnh xe ({images.length})
                </h3>
                <div className="flex gap-3">
                  {/* Main Image - Fixed Size */}
                  <div className="w-[360px] h-[270px] rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shadow-sm">
                    <img 
                      src={images[selectedImageIndex]} 
                      alt={`${vehicle.make} ${vehicle.model} - Ảnh ${selectedImageIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* Thumbnail Gallery */}
                  {images.length > 1 && (
                    <div className="flex flex-col gap-2 w-16 max-h-[270px] overflow-y-auto pr-1">
                      {images.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`w-16 h-16 rounded-lg overflow-hidden border transition-all flex-shrink-0 ${
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
            ) : (
              <section className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} className="text-[#00d26a]" /> Hình ảnh xe
                </h3>
                <div className="w-[360px] h-[270px] bg-slate-50 rounded-[32px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100">
                  <Car size={80} strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase mt-4 tracking-widest">Chưa có ảnh</p>
                </div>
              </section>
            )}

            {/* Thông tin định danh - Same Row */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={14} className="text-[#00d26a]" /> Thông tin định danh
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Phân loại xe</p>
                  <p className="text-sm font-black text-slate-900">{getTypeLabel(vehicle.type)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số VIN (Số khung)</p>
                  <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{vehicle.vin}</p>
                </div>
                {vehicleData.engine_number && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số máy</p>
                    <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{vehicleData.engine_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Hãng sản xuất</p>
                  <p className="text-sm font-black text-slate-900">{vehicle.make}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Model xe</p>
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
                {vehicleData.interior_color && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Màu nội thất</p>
                    <p className="text-sm font-black text-slate-900">{vehicleData.interior_color}</p>
                  </div>
                )}
                {isUsed && vehicle.mileage && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số km đã đi</p>
                    <p className="text-sm font-black text-slate-900">{vehicle.mileage.toLocaleString('vi-VN')} km</p>
                  </div>
                )}
              </div>

              {/* Ghi chú tình trạng xe */}
              {vehicleData.condition_notes && (
                <div className="mt-4 bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-amber-600" />
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Ghi chú tình trạng xe</p>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{vehicleData.condition_notes}</p>
                </div>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Pricing */}
            <div className="lg:col-span-1 space-y-6">
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
                  <DollarSign size={32} className="mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Không có quyền xem giá</p>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Thông số kỹ thuật */}
              {isUsed && vehicle.batteryHealth && (
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
                  {vehicleData.vehicle_position && (
                    <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vị trí xe</p>
                      <p className="text-sm font-black text-slate-900">{vehicleData.vehicle_position}</p>
                    </div>
                  )}
                  {createdByUser ? (
                    <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Người nhập kho</p>
                      <p className="text-sm font-black text-slate-900 mb-1">{createdByUser.full_name}</p>
                      {createdByUser.email && (
                        <p className="text-xs text-slate-500 mb-2">{createdByUser.email}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                        {vehicleData.entry_date ? formatDate(vehicleData.entry_date) : (vehicle.createdAt ? formatDate(vehicle.createdAt) : 'Chưa có thông tin')}
                      </p>
                    </div>
                  ) : (
                    <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ngày nhập kho</p>
                      <p className="text-sm font-black text-slate-900">
                        {vehicleData.entry_date ? formatDate(vehicleData.entry_date) : (vehicle.createdAt ? formatDate(vehicle.createdAt) : 'Chưa có thông tin')}
                      </p>
                    </div>
                  )}
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Cập nhật lần cuối</p>
                    {updatedByUser ? (
                      <>
                        <p className="text-sm font-black text-slate-900 mb-1">{updatedByUser.full_name}</p>
                        {updatedByUser.email && (
                          <p className="text-xs text-slate-500">{updatedByUser.email}</p>
                        )}
                      </>
                    ) : createdByUser ? (
                      <>
                        <p className="text-sm font-black text-slate-900 mb-1">{createdByUser.full_name}</p>
                        {createdByUser.email && (
                          <p className="text-xs text-slate-500">{createdByUser.email}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 mb-1">Chưa có thông tin</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                      {vehicleData.updated_at ? formatDate(vehicleData.updated_at) : formatDate(vehicle.createdAt)}
                    </p>
                  </div>
                  {vehicleData.notes && (
                    <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ghi chú</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{vehicleData.notes}</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

         {/* Footer Actions */}
         <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end items-center">
           <Link
             href="/inventory"
             className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm"
           >
             Quay lại
           </Link>
         </div>
      </div>
    </div>
  );
};

