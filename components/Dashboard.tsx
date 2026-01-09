'use client'

import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  Car, 
  ShoppingBag, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Quote, 
  Users, 
  ShieldCheck, 
  Target,
  HeartHandshake
} from 'lucide-react';
import { MOCK_VEHICLES, MOCK_TRANSACTIONS } from '@/constants';

const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
  <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
    <div className="flex justify-between items-start mb-5">
      <div className={`p-4 rounded-2xl ${color} shadow-lg shadow-current/10 group-hover:scale-110 transition-transform`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend > 0 ? '▲' : '▼'} {trend}%
        </span>
      )}
    </div>
    <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">{label}</h3>
    <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
  </div>
);

const InspirationalCard = ({ icon: Icon, department, quote, color }: any) => (
  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:border-[#00d26a]/30 transition-all duration-300 group flex flex-col justify-between h-full">
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
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventory: MOCK_VEHICLES,
            finance: MOCK_TRANSACTIONS
          })
        });
        const data = await response.json();
        setInsights(data.insights || ["Không thể tải phân tích thông minh vào lúc này."]);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
        setInsights(["Không thể tải phân tích thông minh vào lúc này."]);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  const motivationalQuotes = [
    {
      department: "Bộ phận Kinh doanh",
      icon: Target,
      quote: "Mỗi khách hàng không chỉ là một giao dịch, mà là một cơ hội để chúng ta lan tỏa phong cách sống xanh cùng VinFast.",
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
      quote: "Con số minh bạch, dòng tiền vững vàng. Chúng ta là người giữ lửa cho sự ổn định và phát triển của GCM Pro.",
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
      {/* AI Insights Section - Giữ nguyên phân tích thông minh */}
      <div className="bg-[#0f172a] rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-[#00d26a]/10 rounded-xl border border-[#00d26a]/20">
              <Zap size={24} className="text-[#00d26a] fill-[#00d26a]" />
            </div>
            <div>
               <h3 className="text-xl font-black tracking-tight uppercase">AI VinFast Intelligence</h3>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Phân tích chuyên sâu bởi Gemini Pro</p>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="animate-pulse bg-white/5 h-4 w-64 rounded-full"></div>
              <div className="animate-pulse bg-white/5 h-4 w-96 rounded-full"></div>
            </div>
          ) : (
            <ul className="grid md:grid-cols-3 gap-8">
              {insights.map((insight, idx) => (
                <li key={idx} className="bg-white/5 rounded-[32px] p-7 text-sm font-semibold leading-relaxed border border-white/5 hover:bg-white/10 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-full bg-[#00d26a]/20 flex items-center justify-center mb-4">
                    <Sparkles size={14} className="text-[#00d26a]" />
                  </div>
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-[#00d26a]/5 rounded-full blur-[120px]"></div>
      </div>

      {/* Stats Cards - Các chỉ số nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          icon={DollarSign} 
          label="Tiền mặt tại quỹ" 
          value="5.2 tỷ VNĐ" 
          color="bg-[#00d26a]"
          trend={15}
        />
        <StatCard 
          icon={Car} 
          label="Tồn kho VinFast" 
          value="48 xe" 
          color="bg-slate-900"
          trend={12}
        />
        <StatCard 
          icon={ShoppingBag} 
          label="Doanh số tháng" 
          value="18.5 tỷ VNĐ" 
          color="bg-[#00d26a]"
          trend={32}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Lợi nhuận gộp" 
          value="2.4 tỷ VNĐ" 
          color="bg-slate-900"
          trend={10}
        />
      </div>

      {/* Inspirational Quotes Section - Thay thế cho phần biểu đồ báo cáo */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Users size={20} className="text-[#00d26a]" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Lời nhắn từ Ban Giám Đốc</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
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
