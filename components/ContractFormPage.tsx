'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Car, CreditCard, CheckCircle2, 
  ChevronRight, ChevronLeft, Search, Info, 
  AlertTriangle, Plus, Save, Receipt, 
  FileText, Calendar, MapPin, Mail, Hash,
  Phone, DollarSign, ArrowLeft
} from 'lucide-react';
import { MOCK_VEHICLES } from '@/constants';
import { VehicleStatus, TransactionCategory } from '@/types';

export const ContractFormPage: React.FC = () => {
  const router = useRouter();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [step, setStep] = useState(1);
  const [contractType, setContractType] = useState<'DEPOSIT' | 'SALES'>('SALES');
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerID: '',
    customerAddress: '',
    customerEmail: '',
    vehicleId: '',
    carPrice: 0,
    registrationFee: 0,
    insuranceFee: 0,
    discount: 0,
    paymentType: 'CASH' as 'CASH' | 'INSTALLMENT',
    installments: [{ milestone: 'Đặt cọc', amount: 0, date: '' }]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedVehicle = useMemo(() => 
    MOCK_VEHICLES.find(v => v.id === formData.vehicleId), 
    [formData.vehicleId]
  );

  const totalAmount = useMemo(() => 
    formData.carPrice + formData.registrationFee + formData.insuranceFee - formData.discount,
    [formData]
  );

  const isMarginLow = selectedVehicle ? formData.carPrice < selectedVehicle.cost : false;

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleFinalSave = async () => {
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleId) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newVehicleStatus = contractType === 'DEPOSIT' ? VehicleStatus.RESERVED : VehicleStatus.SOLD;
      
      // TODO: Save contract to Supabase
      const contractData = {
        contractType,
        ...formData,
        referenceId: 'CONTRACT_' + Math.floor(Math.random() * 1000),
        referenceType: 'CONTRACT',
        amount: formData.paymentType === 'INSTALLMENT' ? (contractType === 'DEPOSIT' ? 50000000 : 200000000) : totalAmount,
        category: contractType === 'DEPOSIT' ? TransactionCategory.DEPOSIT : TransactionCategory.CAR_SALE,
        description: `Thu tiền: Đợt 1 - ${contractType === 'DEPOSIT' ? 'Hợp đồng đặt cọc' : 'Hợp đồng mua bán'} - Khách hàng ${formData.customerName}`,
        customerName: formData.customerName,
        updatedVehicleStatus: newVehicleStatus
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success - redirect to contracts page
      router.push('/contracts');
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-0">
      {[
        { s: 1, label: 'Khách hàng', icon: <User size={16} /> },
        { s: 2, label: 'Chọn Xe', icon: <Car size={16} /> },
        { s: 3, label: 'Thanh toán', icon: <CreditCard size={16} /> },
        { s: 4, label: 'Xác nhận', icon: <CheckCircle2 size={16} /> },
      ].map((item, idx) => (
        <React.Fragment key={item.s}>
          <div className="flex flex-col items-center relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              step >= item.s ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-400'
            }`}>
              {step > item.s ? <CheckCircle2 size={20} /> : item.icon}
            </div>
            <span className={`absolute -bottom-6 whitespace-nowrap text-[10px] font-black uppercase tracking-widest ${
              step >= item.s ? 'text-blue-600' : 'text-slate-400'
            }`}>
              {item.label}
            </span>
          </div>
          {idx < 3 && (
            <div className={`w-12 md:w-20 h-0.5 mx-2 ${step > item.s ? 'bg-blue-600' : 'bg-slate-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">Hợp đồng điện tử</span>
               <select 
                value={contractType} 
                onChange={(e) => setContractType(e.target.value as any)}
                className="text-xs font-bold text-slate-500 bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
               >
                 <option value="SALES">Hợp đồng Mua bán xe</option>
                 <option value="DEPOSIT">Hợp đồng Đặt cọc xe</option>
               </select>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Thiết lập giao dịch khách hàng</h2>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Step Indicator Section */}
        <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100">
          {renderStepIndicator()}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                   <User size={18} />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">1. Thông tin định danh khách hàng</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên khách hàng *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      value={formData.customerName}
                      onChange={e => setFormData({...formData, customerName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="09xx xxx xxx"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      value={formData.customerPhone}
                      onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CCCD / Mã số thuế *</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input 
                      required
                      type="text" 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      value={formData.customerID}
                      onChange={e => setFormData({...formData, customerID: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Nếu có)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input 
                      type="email" 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      value={formData.customerEmail}
                      onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ liên hệ</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-400 pointer-events-none" size={18} />
                    <textarea 
                      rows={2}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      value={formData.customerAddress}
                      onChange={e => setFormData({...formData, customerAddress: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                   <Car size={18} />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Liên kết xe từ kho hàng</h3>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                  <select 
                    className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.vehicleId}
                    onChange={e => setFormData({...formData, vehicleId: e.target.value, carPrice: MOCK_VEHICLES.find(v => v.id === e.target.value)?.price || 0})}
                  >
                    <option value="">-- Tìm kiếm xe theo Model hoặc Số khung (VIN) --</option>
                    {MOCK_VEHICLES.filter(v => v.status === VehicleStatus.AVAILABLE).map(v => (
                      <option key={v.id} value={v.id}>{v.make} {v.model} - {v.vin} ({v.color})</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedVehicle ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 bg-slate-100 rounded-[32px] flex items-center justify-center p-8 text-slate-400 border-2 border-dashed border-slate-200">
                    <Car size={80} strokeWidth={1} />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Model xe</p>
                      <p className="text-lg font-black text-slate-900">{selectedVehicle.make} {selectedVehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Số VIN</p>
                      <p className="text-lg font-mono font-bold text-slate-900 tracking-tighter">{selectedVehicle.vin}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Màu sắc</p>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{backgroundColor: selectedVehicle.color.toLowerCase()}}></div>
                        <p className="text-lg font-bold text-slate-900">{selectedVehicle.color}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Giá nhập (Bảo mật)</p>
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-black uppercase tracking-tighter italic">LOCKED</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center gap-4 bg-slate-50/30">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <Car size={32} />
                   </div>
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Vui lòng chọn xe từ danh sách</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                   <DollarSign size={18} />
                 </div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">3. Định giá & Phương thức thanh toán</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá bán thỏa thuận (VNĐ) *</label>
                    <input 
                      type="number" 
                      className={`w-full p-4 bg-white border-2 rounded-2xl text-xl font-black outline-none transition-all ${isMarginLow ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 focus:border-blue-500'}`}
                      value={formData.carPrice}
                      onChange={e => setFormData({...formData, carPrice: Number(e.target.value)})}
                    />
                    {isMarginLow && (
                      <div className="flex items-center gap-1.5 text-rose-600 text-[10px] font-black uppercase">
                        <AlertTriangle size={14} /> Cảnh báo: Giá bán thấp hơn giá vốn
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phí hồ sơ/Đăng ký</label>
                      <input 
                        type="number" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                        value={formData.registrationFee}
                        onChange={e => setFormData({...formData, registrationFee: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bảo hiểm</label>
                      <input 
                        type="number" 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                        value={formData.insuranceFee}
                        onChange={e => setFormData({...formData, insuranceFee: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chiết khấu / Ưu đãi</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-bold outline-none"
                      value={formData.discount}
                      onChange={e => setFormData({...formData, discount: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl flex flex-col justify-between overflow-hidden relative">
                   <div className="relative z-10">
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Giá trị giao dịch cuối cùng</p>
                      <h3 className="text-4xl font-black text-emerald-400">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)}</h3>
                   </div>
                   
                   <div className="mt-8 space-y-4 relative z-10">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60 font-bold uppercase tracking-tight">Kế hoạch thanh toán</span>
                        <div className="flex bg-white/10 p-1 rounded-xl">
                           <button 
                             type="button"
                             onClick={() => setFormData({...formData, paymentType: 'CASH'})}
                             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.paymentType === 'CASH' ? 'bg-white text-slate-900 shadow-md' : 'text-white/60'}`}
                           >Trả thẳng</button>
                           <button 
                             type="button"
                             onClick={() => setFormData({...formData, paymentType: 'INSTALLMENT'})}
                             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.paymentType === 'INSTALLMENT' ? 'bg-white text-slate-900 shadow-md' : 'text-white/60'}`}
                           >Trả góp</button>
                        </div>
                      </div>
                   </div>
                   <DollarSign className="absolute -bottom-10 -right-10 text-white/5" size={200} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 text-center py-10">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-50">
                  <CheckCircle2 size={40} />
               </div>
               <h4 className="text-2xl font-black text-slate-900">Kiểm tra thông tin hợp đồng</h4>
               <p className="text-slate-500 max-w-md mx-auto">Vui lòng rà soát lại thông tin khách hàng và xe trước khi tiến hành tạo phiếu thu và khóa xe trên kho hàng.</p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-10">
                  <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Khách hàng</h5>
                    <p className="text-lg font-black text-slate-900 mb-1">{formData.customerName}</p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-tighter">{formData.customerPhone}</p>
                  </div>
                  <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Xe giao dịch</h5>
                    <p className="text-lg font-black text-slate-900 mb-1">{selectedVehicle?.make} {selectedVehicle?.model}</p>
                    <p className="text-sm font-mono text-blue-600 font-black uppercase tracking-tighter">VIN: {selectedVehicle?.vin}</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 space-y-4">
          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <Info className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Lỗi khi lưu dữ liệu</p>
                <p className="text-xs text-red-700 mt-1">{submitError}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button 
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-bold transition-all ${
                step === 1 ? 'opacity-0 pointer-events-none' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'
              }`}
            >
              <ChevronLeft size={18} /> Quay lại
            </button>
            
            <div className="flex gap-4">
              {step < 4 ? (
                <button 
                  type="button"
                  onClick={handleNext}
                  disabled={step === 2 && !formData.vehicleId}
                  className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  Tiếp tục thiết lập <ChevronRight size={18} />
                </button>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} /> Lưu bản nháp
                  </button>
                  <button 
                    type="button"
                    onClick={handleFinalSave}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-10 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Receipt size={18} /> Ký & Tạo phiếu thu
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

