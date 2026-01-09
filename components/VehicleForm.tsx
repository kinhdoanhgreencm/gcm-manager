'use client'

import React, { useState } from 'react';
import { 
  X, Save, Car, Zap, Timer, 
  DollarSign, Calendar, Tag, Info, 
  ShieldCheck, Upload, Image as ImageIcon,
  FileText, Plus, AlertCircle, Hash,
  ChevronDown, Building2, Truck
} from 'lucide-react';
import { VehicleType, VehicleStatus } from '@/types';
import { MOCK_SUPPLIERS } from '@/constants';

interface VehicleFormProps {
  onClose: () => void;
  onSave: (data: any) => void;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    type: VehicleType.EV, 
    make: 'VinFast',
    model: '',
    version: '',
    year: new Date().getFullYear(),
    color: '',
    vin: '',
    mileage: 0,
    batteryHealth: 100,
    cost: 0,
    price: 0,
    supplierId: '',
    entryDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const isEV = formData.type === VehicleType.EV;
  const isUsed = formData.type === VehicleType.USED;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      alert("Vui lòng chọn Nhà cung cấp / Nguồn nhập xe");
      return;
    }
    onSave({ ...formData, status: VehicleStatus.AVAILABLE });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[140] flex items-center justify-center p-4">
      <form 
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
               <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter">VinFast Inventory System</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Nhập xe điện mới vào kho</h2>
            <p className="text-xs text-slate-500 font-medium">Khai báo thông tin chi tiết số khung và cấu hình xe VinFast</p>
          </div>
          <button type="button" onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          
          {/* Section 1: Thông tin cơ bản */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                 <Car size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Thông tin định danh xe</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân loại xe *</label>
                <div className="relative">
                  <select 
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as VehicleType})}
                  >
                    <option value={VehicleType.EV}>VinFast EV (Mới)</option>
                    <option value={VehicleType.USED}>VinFast Lướt (Cũ)</option>
                    <option value={VehicleType.NEW}>Xe xăng / Loại khác</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số VIN (Số khung) *</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="text" 
                    placeholder="VD: VNF8LUX..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase tracking-tighter"
                    value={formData.vin}
                    onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hãng sản xuất</label>
                <input 
                  type="text" 
                  readOnly
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500"
                  value={formData.make}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model xe</label>
                <input 
                  type="text" 
                  placeholder="VD: VF 7, VF 8..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={formData.model}
                  onChange={e => setFormData({...formData, model: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phiên bản</label>
                <input 
                  type="text" 
                  placeholder="Eco, Plus, Luxury..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  value={formData.version}
                  onChange={e => setFormData({...formData, version: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Năm sản xuất</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  value={formData.year}
                  onChange={e => setFormData({...formData, year: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu ngoại thất</label>
                <input 
                  type="text" 
                  placeholder="Màu sắc..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  value={formData.color}
                  onChange={e => setFormData({...formData, color: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Thông số pin */}
          {isEV && (
            <section className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                   <Zap size={18} />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">3. Tình trạng Pin VinFast</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50/20 p-8 rounded-[32px] border border-amber-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} /> Sức khỏe Pin (SOH)
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      max="100"
                      className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10"
                      value={formData.batteryHealth}
                      onChange={e => setFormData({...formData, batteryHealth: Number(e.target.value)})}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-400 uppercase">% Health</span>
                  </div>
                </div>
                {isUsed && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                      <Timer size={14} /> Odometer (Số KM đã đi)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-2xl text-sm font-black outline-none"
                        value={formData.mileage}
                        onChange={e => setFormData({...formData, mileage: Number(e.target.value)})}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400 uppercase">KM</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Section 3: Tài chính */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                 <DollarSign size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">3. Định giá nhập & Niêm yết</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
               <div className="space-y-4 relative z-10">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Giá vốn nhập kho (Cost)</label>
                  <input 
                    required
                    type="number" 
                    className="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-2xl font-black outline-none focus:bg-white/20 transition-all"
                    placeholder="0"
                    value={formData.cost}
                    onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                  />
               </div>

               <div className="space-y-4 relative z-10">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Giá niêm yết dự kiến (MSRP)</label>
                  <input 
                    required
                    type="number" 
                    className="w-full bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-6 py-4 text-2xl font-black text-emerald-400 outline-none focus:bg-emerald-500/30 transition-all"
                    placeholder="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  />
               </div>
               <DollarSign className="absolute -bottom-10 -right-10 text-white/5" size={200} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhà cung cấp / Nguồn xe *</label>
                <div className="relative">
                   <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <select 
                    required
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                    value={formData.supplierId}
                    onChange={e => setFormData({...formData, supplierId: e.target.value})}
                   >
                     <option value="">-- Chọn Nhà cung cấp --</option>
                     {MOCK_SUPPLIERS.map(sup => (
                       <option key={sup.id} value={sup.id}>{sup.name} ({sup.code})</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày hạch toán nhập kho</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="date" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                    value={formData.entryDate}
                    onChange={e => setFormData({...formData, entryDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 sticky bottom-0">
          <button type="button" onClick={onClose} className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm">Bỏ qua</button>
          <button type="submit" className="flex items-center gap-2 px-12 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
            <Save size={18} /> Hoàn tất nhập kho
          </button>
        </div>
      </form>
    </div>
  );
};
