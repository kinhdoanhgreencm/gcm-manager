
import React from 'react';
import { 
  ClipboardCheck, Search, Filter, 
  User, Car, FileBadge, Hash, 
  Calendar, Upload, CheckCircle2, 
  Clock, AlertCircle, ChevronRight,
  FileText, ShieldCheck, PackageCheck
} from 'lucide-react';
import { MOCK_REGISTRATIONS, MOCK_VEHICLES } from '@/constants';
import { RegistrationStatus, VehicleStatus } from '@/types';

export const Registration: React.FC = () => {
  const getStatusConfig = (status: RegistrationStatus) => {
    switch(status) {
      case RegistrationStatus.PENDING:
        return { label: 'Chờ nộp thuế', class: 'bg-slate-100 text-slate-600', icon: <Clock size={14} /> };
      case RegistrationStatus.TAX_PAID:
        return { label: 'Đã nộp thuế', class: 'bg-blue-100 text-blue-700', icon: <FileText size={14} /> };
      case RegistrationStatus.PROCESSING:
        return { label: 'Đang làm thủ tục', class: 'bg-amber-100 text-amber-700', icon: <Hash size={14} /> };
      case RegistrationStatus.COMPLETED:
        return { label: 'Hoàn tất hồ sơ', class: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={14} /> };
      default:
        return { label: 'N/A', class: 'bg-slate-100 text-slate-500', icon: <AlertCircle size={14} /> };
    }
  };

  const handleDeliverCar = (vehicleId: string) => {
    // Logic Nghiệp vụ: Chuyển trạng thái xe từ SOLD/REGISTRATION -> DELIVERED
    alert(`Đã kích hoạt biên bản bàn giao cho xe ID: ${vehicleId}. Trạng thái xe sẽ chuyển sang "ĐÃ BÀN GIAO".`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo chủ xe, biển số hoặc số khung..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
          />
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all">
            <Filter size={18} /> Lọc hồ sơ trễ hạn
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {MOCK_REGISTRATIONS.map(reg => {
          const vehicle = MOCK_VEHICLES.find(v => v.id === reg.vehicleId);
          const status = getStatusConfig(reg.status);
          const isCompleted = reg.status === RegistrationStatus.COMPLETED;
          
          return (
            <div key={reg.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold mb-3 ${status.class}`}>
                        {status.icon} {status.label}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <User size={20} className="text-slate-400" /> {reg.ownerName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Hồ sơ liên kết xe: <span className="font-bold text-slate-700">{vehicle?.make} {vehicle?.model} ({vehicle?.vin})</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Biển số</p>
                      <div className="px-3 py-1 bg-white border-2 border-slate-900 rounded-lg text-sm font-black text-center tracking-widest">
                        {reg.licensePlate || 'CHƯA CÓ'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Hạn đăng kiểm</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {reg.inspectionExpiry || '---'}
                      </p>
                    </div>
                    <div className="flex items-end">
                      {isCompleted && vehicle?.status !== VehicleStatus.DELIVERED && (
                        <button 
                          onClick={() => handleDeliverCar(reg.vehicleId)}
                          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all animate-bounce"
                        >
                          <PackageCheck size={16} /> Bàn giao xe ngay
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:w-96 flex flex-col gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Checklist giấy tờ</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {reg.documents.map((doc, idx) => (
                        <div key={idx} className="flex justify-between items-center px-3 py-2 bg-white border border-slate-100 rounded-lg text-xs">
                          <span className="text-slate-600 font-medium">{doc.type}</span>
                          {doc.status === 'DONE' ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <div className="flex items-center gap-1 text-rose-500 font-bold">
                              <AlertCircle size={14} /> Thiếu
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <Upload size={14} /> Cập nhật tiến độ hồ sơ
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
