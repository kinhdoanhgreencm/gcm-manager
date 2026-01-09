'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, Plus, Search, Filter, 
  User, Phone, Calendar, ShieldCheck, 
  CheckCircle2, XCircle, 
  ArrowRightLeft, Printer, MoreHorizontal,
  Car, CreditCard, ChevronRight, DollarSign,
  GanttChartSquare, Info, ArrowLeft, Clock,
  Receipt, Landmark, ChevronDown
} from 'lucide-react';
import { MOCK_DEPOSIT_CONTRACTS, MOCK_SALES_CONTRACTS, MOCK_VEHICLES, MOCK_TRANSACTIONS } from '@/constants';
import { ContractStatus, DepositContract, SalesContract, TransactionCategory, TransactionType } from '@/types';

export const Contracts: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'deposit' | 'sales'>('sales');
  const [selectedContract, setSelectedContract] = useState<SalesContract | null>(null);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch(status) {
      case ContractStatus.ACTIVE:
        return { label: 'Đang hiệu lực', class: 'bg-emerald-100 text-emerald-700', icon: <ShieldCheck size={14} /> };
      case ContractStatus.PAYING:
        return { label: 'Đang thanh toán', class: 'bg-amber-100 text-amber-700', icon: <CreditCard size={14} /> };
      case ContractStatus.COMPLETED:
        return { label: 'Hoàn tất', class: 'bg-[#00d26a]/10 text-[#00d26a]', icon: <CheckCircle2 size={14} /> };
      default:
        return { label: 'Nháp', class: 'bg-slate-100 text-slate-500', icon: <FileText size={14} /> };
    }
  };

  const mockSchedules = [
    { id: 's1', milestone: 'Đặt cọc giữ xe', amount: 50000000, date: '2024-04-20', status: 'PAID' },
    { id: 's2', milestone: 'Thanh toán đợt 2 (Đối ứng)', amount: 450000000, date: '2024-05-15', status: 'PAID' },
    { id: 's3', milestone: 'Thanh toán đợt 3 (Giải ngân ngân hàng)', amount: 713000000, date: '2024-06-01', status: 'PENDING' },
  ];

  const handleCreateReceipt = (contract: SalesContract, amount: number, milestone: string) => {
    const prefillData = {
      referenceId: contract.id,
      referenceType: 'CONTRACT',
      amount: amount,
      category: TransactionCategory.CAR_SALE,
      description: `Thu tiền: ${milestone} - Hợp đồng ${contract.contractCode}`,
      customerName: contract.customerName
    };
    const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
    router.push(`/finance/new?type=${TransactionType.INCOME}&prefill=${prefillParam}`);
  };


  if (selectedContract) {
    const vehicle = MOCK_VEHICLES.find(v => v.id === selectedContract.vehicleId);
    const relatedTransactions = MOCK_TRANSACTIONS.filter(t => t.referenceId === selectedContract.id);
    const remaining = selectedContract.totalAmount - selectedContract.paidAmount;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <button onClick={() => setSelectedContract(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black text-sm transition-colors bg-white/50 px-4 py-2 rounded-xl border border-slate-100 w-fit">
          <ArrowLeft size={18} /> QUAY LẠI DANH SÁCH
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/90 backdrop-blur-xl rounded-[40px] border border-white p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-10 right-10">
                 <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm ${getStatusBadge(selectedContract.status).class}`}>
                   {getStatusBadge(selectedContract.status).icon} {getStatusBadge(selectedContract.status).label}
                 </div>
              </div>

              <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-[#00d26a] rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-[#00d26a]/40">
                  <FileText size={40} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">{selectedContract.contractCode}</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Hợp đồng mua bán xe ô tô • Ngày ký: {selectedContract.signedDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 border-t border-slate-50 pt-10">
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Thông tin khách hàng</h4>
                    <div className="space-y-3">
                      <p className="font-black text-slate-900 text-2xl">{selectedContract.customerName}</p>
                      <div className="flex flex-col gap-2">
                         <p className="text-sm font-bold text-slate-600 flex items-center gap-3"><Phone size={16} className="text-[#00d26a]" /> {selectedContract.customerPhone}</p>
                         <p className="text-sm font-bold text-slate-600 flex items-center gap-3"><User size={16} className="text-[#00d26a]" /> CCCD: {selectedContract.customerIDCard}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Sản phẩm liên kết kho</h4>
                    <div className="flex items-center gap-5 p-6 bg-slate-50 rounded-[32px] border border-slate-100 hover:border-[#00d26a]/30 transition-all group">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#00d26a] shadow-sm group-hover:scale-110 transition-transform">
                        <Car size={32} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900">{vehicle?.make} {vehicle?.model}</p>
                        <p className="text-[11px] text-slate-400 font-mono font-bold tracking-tight mt-1 uppercase">Số VIN: {vehicle?.vin}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tóm tắt tài chính hợp đồng</h4>
                  <div className="bg-slate-900 text-white p-8 rounded-[40px] space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center opacity-40">
                      <span className="text-[10px] font-black uppercase tracking-widest">Giá trị niêm yết</span>
                      <span className="text-sm font-bold">{formatVND(selectedContract.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#00d26a]">
                      <span className="text-[10px] font-black uppercase tracking-widest">Thực tế đã thu</span>
                      <span className="text-2xl font-black">{formatVND(selectedContract.paidAmount)}</span>
                    </div>
                    <div className="pt-6 border-t border-white/10 flex justify-between items-center text-rose-400">
                      <span className="text-[10px] font-black uppercase tracking-widest">Nợ còn lại (AR)</span>
                      <span className="text-2xl font-black">{formatVND(remaining)}</span>
                    </div>
                    <DollarSign className="absolute -bottom-10 -right-10 text-white/5" size={150} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-[40px] border border-white overflow-hidden shadow-xl shadow-slate-200/50">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest flex items-center gap-2">
                  <Clock size={20} className="text-[#00d26a]" /> Lịch trình thu tiền chi tiết
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {mockSchedules.map((s, idx) => (
                  <div key={s.id} className="p-8 flex items-center justify-between hover:bg-[#00d26a]/5 transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black ${s.status === 'PAID' ? 'bg-[#00d26a] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-900">{s.milestone}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Hạn thanh toán: {s.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                      <p className="text-lg font-black text-slate-900 tracking-tighter">{formatVND(s.amount)}</p>
                      {s.status === 'PAID' ? (
                        <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-5 py-2 rounded-2xl uppercase">
                          <CheckCircle2 size={16} /> Đã tất toán
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleCreateReceipt(selectedContract, s.amount, s.milestone)}
                          className="flex items-center gap-2 px-8 py-3 bg-[#00d26a] text-white rounded-2xl text-xs font-black hover:bg-emerald-600 shadow-xl shadow-[#00d26a]/20 transition-all group-hover:scale-105"
                        >
                          <Receipt size={16} /> Tạo phiếu thu
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-md rounded-[40px] border border-white p-8 shadow-xl">
               <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-8 flex items-center gap-3">
                 <Receipt size={20} className="text-[#00d26a]" /> Chứng từ thanh toán
               </h3>
               {relatedTransactions.length > 0 ? (
                 <div className="space-y-5">
                   {relatedTransactions.map(t => (
                     <div key={t.id} className="p-5 rounded-[32px] border border-slate-50 bg-slate-50/50 hover:border-[#00d26a]/30 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-3">
                           <span className="text-[10px] font-mono text-slate-400 font-black uppercase">#{t.id}</span>
                           <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase tracking-widest">Success</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed mb-4 group-hover:text-slate-900">{t.description}</p>
                        <div className="flex justify-between items-end">
                           <p className="text-[10px] text-slate-400 font-bold uppercase">{t.date}</p>
                           <p className="text-lg font-black text-[#00d26a] tracking-tighter">{formatVND(t.amount)}</p>
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center text-slate-200 mx-auto">
                      <Receipt size={32} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Chưa có giao dịch phát sinh</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/80 backdrop-blur-md p-6 rounded-[32px] border border-white shadow-xl shadow-slate-200/40">
        <div className="relative flex-1 w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={`Tìm theo mã hợp đồng, họ tên khách hàng VinFast...`}
            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#00d26a]/10 transition-all text-sm font-bold"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <Link
            href="/contracts/new"
            className="flex items-center gap-3 px-10 py-3.5 bg-[#00d26a] text-white rounded-2xl hover:bg-emerald-600 font-black text-sm shadow-2xl shadow-[#00d26a]/30 transition-all"
          >
            <Plus size={22} /> TẠO HỢP ĐỒNG MỚI
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {MOCK_SALES_CONTRACTS.map(contract => {
          const vehicle = MOCK_VEHICLES.find(v => v.id === contract.vehicleId);
          const status = getStatusBadge(contract.status);
          const progress = (contract.paidAmount / contract.totalAmount) * 100;

          return (
            <div 
              key={contract.id} 
              onClick={() => setSelectedContract(contract)}
              className="bg-white/90 backdrop-blur-md rounded-[40px] border border-white p-8 hover:border-[#00d26a] transition-all cursor-pointer group shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-[#00d26a]/10 hover:scale-[1.02]"
            >
              <div className="flex justify-between items-start mb-6">
                <span className="px-4 py-1.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">{contract.contractCode}</span>
                <div className={`p-2 rounded-2xl shadow-sm ${status.class}`}>
                   {status.icon}
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-[#00d26a] transition-colors tracking-tight">{contract.customerName}</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">{vehicle?.make} {vehicle?.model} • {contract.signedDate}</p>

              <div className="space-y-5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ dòng tiền</span>
                  <span className="text-xs font-black text-[#00d26a] bg-[#00d26a]/10 px-3 py-1 rounded-lg">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                  <div className="bg-[#00d26a] h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                   <div className="text-left">
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Tổng giá trị</p>
                      <p className="font-black text-slate-900 text-lg tracking-tighter">{formatVND(contract.totalAmount)}</p>
                   </div>
                   <button className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-[#00d26a] group-hover:text-white transition-all flex items-center justify-center shadow-sm">
                      <ChevronRight size={24} />
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
