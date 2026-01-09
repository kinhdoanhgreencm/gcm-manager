'use client'

import React, { useState } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, 
  Battery, Zap, Timer, Car, 
  FileText, Image as ImageIcon,
  CheckCircle2, AlertCircle, Clock,
  PackageCheck, Link2, X, Eye, 
  Calendar, Hash, Truck, DollarSign,
  Info, ShieldCheck, Tag
} from 'lucide-react';
import { Vehicle, VehicleType, VehicleStatus } from '@/types';
import { MOCK_VEHICLES, MOCK_SUPPLIERS } from '@/constants';
import { VehicleForm } from './VehicleForm';

// Component hiển thị chi tiết xe (Stock Card)
const VehicleDetailsModal: React.FC<{ vehicle: Vehicle; onClose: () => void }> = ({ vehicle, onClose }) => {
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const supplier = MOCK_SUPPLIERS.find(s => s.id === vehicle.supplierId);
  const isEV = vehicle.type === VehicleType.EV;
  const isUsed = vehicle.type === VehicleType.USED;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                 vehicle.status === VehicleStatus.AVAILABLE ? 'bg-emerald-50 text-emerald-600' : 'bg-[#00d26a]/10 text-[#00d26a]'
               }`}>
                 {vehicle.status === VehicleStatus.AVAILABLE ? 'Sẵn sàng giao dịch' : 'Đang xử lý / Đã bán'}
               </span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã xe: #{vehicle.id}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{vehicle.make} {vehicle.model} {vehicle.year}</h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="aspect-[4/3] bg-slate-50 rounded-[32px] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100">
                 <Car size={80} strokeWidth={1} />
                 <p className="text-[10px] font-black uppercase mt-4 tracking-widest">Chưa có ảnh</p>
              </div>
              
              <div className="bg-slate-900 text-white p-7 rounded-[32px] shadow-xl relative overflow-hidden">
                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">Giá bán lẻ niêm yết</p>
                 <h4 className="text-2xl font-black text-[#00d26a] relative z-10">{formatVND(vehicle.price)}</h4>
                 <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
                    <span className="text-[10px] font-black text-white/40 uppercase">Lợi nhuận mục tiêu</span>
                    <span className="text-sm font-black text-white">{formatVND(vehicle.price - vehicle.cost)}</span>
                 </div>
                 <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-[#00d26a]/10 rounded-full blur-2xl"></div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Info size={14} className="text-[#00d26a]" /> Đặc điểm kỹ thuật
                </h3>
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-7 rounded-3xl border border-slate-100">
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số VIN (Khung)</p>
                      <p className="text-sm font-black text-slate-900 font-mono tracking-tighter">{vehicle.vin}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ngoại thất</p>
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full border border-slate-200" style={{backgroundColor: vehicle.color.toLowerCase()}}></div>
                         <p className="text-sm font-black text-slate-900">{vehicle.color}</p>
                      </div>
                   </div>
                   {isEV && (
                     <div className="col-span-2 mt-2 pt-4 border-t border-slate-200">
                        <p className="text-[10px] font-black text-[#00d26a] uppercase mb-2">Sức khỏe Pin VinFast (SOH)</p>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                           <div className="bg-[#00d26a] h-full" style={{width: `${vehicle.batteryHealth}%`}}></div>
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-2">{vehicle.batteryHealth}% <span className="text-[10px] text-slate-400">Battery Health</span></p>
                     </div>
                   )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Truck size={14} className="text-[#00d26a]" /> Nguồn gốc & Kho vận
                </h3>
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nguồn nhập</p>
                      <p className="text-sm font-black text-slate-900">{supplier?.name || 'N/A'}</p>
                   </div>
                   <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ngày vào kho</p>
                      <p className="text-sm font-black text-slate-900">{new Date(vehicle.createdAt).toLocaleDateString('vi-VN')}</p>
                   </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
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
  );
};

export const Inventory: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

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
      default: 
        return { label: 'N/A', color: 'bg-slate-100 text-slate-700', icon: <AlertCircle size={12} /> };
    }
  };

  return (
    <div className="space-y-8">
      {showAddForm && <VehicleForm onClose={() => setShowAddForm(false)} onSave={(v) => setVehicles([v, ...vehicles])} />}
      {selectedVehicle && <VehicleDetailsModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Tổng số xe', value: vehicles.length, color: 'text-slate-900' },
          { label: 'Sẵn sàng giao', value: vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length, color: 'text-[#00d26a]' },
          { label: 'Đang làm hồ sơ', value: vehicles.filter(v => v.status === VehicleStatus.REGISTRATION).length, color: 'text-amber-600' },
          { label: 'Giá trị tồn kho', value: '45.2 tỷ', color: 'text-slate-900' },
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
        
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-10 py-3.5 bg-[#00d26a] text-white rounded-2xl hover:bg-emerald-600 font-black text-sm transition-all shadow-xl shadow-[#00d26a]/20"
        >
          <Plus size={20} /> NHẬP KHO XE MỚI
        </button>
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
            {vehicles.map((v) => {
              const status = getStatusConfig(v.status);
              return (
                <tr 
                  key={v.id} 
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedVehicle(v)}
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center transition-all group-hover:bg-[#00d26a] group-hover:text-white group-hover:scale-105 shadow-sm">
                        <Car size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900">{v.make} {v.model}</h4>
                        <p className="text-[10px] font-mono text-slate-400 font-bold tracking-tight uppercase mt-1">{v.vin}</p>
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
                    <p className="text-[10px] text-[#00d26a] font-black uppercase mt-1">Lãi mục tiêu: {formatVND(v.price - v.cost)}</p>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <button className="p-3 text-slate-400 hover:text-[#00d26a] hover:bg-[#00d26a]/10 rounded-2xl transition-all">
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
