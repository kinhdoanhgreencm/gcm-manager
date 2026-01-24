'use client'

import React from 'react';
import { 
  DollarSign,
  Quote, 
  Users, 
  ShieldCheck, 
  Target,
  HeartHandshake
} from 'lucide-react';

const InspirationalCard = ({ icon: Icon, department, quote, color }: any) => (
  <div className="bg-white p-6 md:p-7 lg:p-8 rounded-[32px] md:rounded-[36px] lg:rounded-[40px] border border-slate-100 shadow-sm hover:border-[#00d26a]/30 transition-all duration-300 group flex flex-col justify-between h-full">
    <div>
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform`}>
        <Icon size={24} className="text-white" />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{department}</p>
      <div className="relative">
        <Quote className="absolute -top-2 -left-2 text-slate-100 w-10 h-10 -z-0" />
        <p className="relative z-10 text-lg font-bold text-slate-800 leading-relaxed italic">
          "{quote}"
        </p>
      </div>
    </div>
    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-[#00d26a]"></div>
      <span className="text-[10px] font-black text-[#00d26a] uppercase tracking-widest">Tin nhắn từ Ban Giám Đốc</span>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {

  const motivationalQuotes = [
    {
      department: "Bộ phận Kinh doanh",
      icon: Target,
      quote: "Mỗi khách hàng không chỉ là một giao dịch, mà là một cơ hội để chúng ta lan tỏa phong cách sống xanh cùng Cần Thơ GF.",
      color: "bg-[#00d26a]"
    },
    {
      department: "Quản lý Kho hàng",
      icon: ShieldCheck,
      quote: "Sự tỉ mỉ trong kiểm kê là nền tảng của niềm tin. Một kho hàng ngăn nắp là khởi đầu của mọi sự hanh thông.",
      color: "bg-slate-900"
    },
    {
      department: "Kế toán & Tài chính",
      icon: DollarSign,
      quote: "Con số minh bạch, dòng tiền vững vàng. Chúng ta là người giữ lửa cho sự ổn định và phát triển của Cần Thơ GF.",
      color: "bg-[#00d26a]"
    },
    {
      department: "Chăm sóc khách hàng",
      icon: HeartHandshake,
      quote: "Nụ cười của khách hàng khi nhận bàn giao xe là thước đo thành công lớn nhất của toàn đội ngũ chúng ta.",
      color: "bg-slate-900"
    }
  ];

  return (
    <div className="space-y-10">
      {/* Inspirational Quotes Section - Thay thế cho phần biểu đồ báo cáo */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Users size={20} className="text-[#00d26a]" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Lời nhắn từ Ban Giám Đốc</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-7 lg:gap-8">
          {motivationalQuotes.map((item, idx) => (
            <InspirationalCard 
              key={idx}
              icon={item.icon}
              department={item.department}
              quote={item.quote}
              color={item.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
