'use client'

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Car, 
  Scale, Calendar, Download, Filter, 
  ChevronRight, ArrowUpRight, ArrowDownRight,
  PieChart as PieIcon, BarChart3, LineChart as LineIcon,
  AlertCircle, CheckCircle2, Info, Zap, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { VehicleStatus, DebtType, Vehicle } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyPermission, PermissionCategories } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const supabase = null as any;

export const ReportDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [previousPeriodProfit, setPreviousPeriodProfit] = useState(0);
  const [profitData, setProfitData] = useState<Array<{ name: string; profit: number; margin: number }>>([]);
  const [inventoryByModel, setInventoryByModel] = useState<Array<{ name: string; value: number }>>([]);
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [availableVehiclesCount, setAvailableVehiclesCount] = useState(0);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Calculate date range
  const getDateRange = (range: string) => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date(now);
    
    switch (range) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  };

  // Calculate previous period for comparison
  const getPreviousPeriodRange = (range: string) => {
    const { startDate, endDate } = getDateRange(range);
    const periodLength = endDate.getTime() - startDate.getTime();
    
    const prevEndDate = new Date(startDate);
    prevEndDate.setTime(prevEndDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setTime(prevStartDate.getTime() - periodLength);
    
    return { startDate: prevStartDate, endDate: prevEndDate };
  };

  // Fetch vehicles from database
  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/inventory', { cache: 'no-store' });
      const result = await response.json();

      if (response.ok && result?.vehicles) {
        const transformedVehicles: Vehicle[] = result.vehicles.map((v: any) => ({
          id: v.id,
          code: v.code || undefined,
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          year: v.year,
          type: v.type as any,
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
        return;
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const transformedVehicles: Vehicle[] = data.map((v: any) => ({
          id: v.id,
          code: v.code || undefined,
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          year: v.year,
          type: v.type as any,
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
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
    }
  };

  // Fetch receivable debts from contracts
  const fetchReceivableDebts = async (): Promise<number> => {
    try {
      if (!user?.id) return 0;
      const response = await fetch(`/api/contracts/overview?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || '')}`, { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok || !result?.contracts) {
        return 0;
      }

      let total = 0;
      for (const contract of result.contracts || []) {
        const totalAmount = Number(contract.totalAmount || 0);
        const paidAmount = Number(contract.paidAmount || 0);
        const remainingAmount = Math.max(0, totalAmount - paidAmount);
        total += remainingAmount;
      }

      return total;
    } catch (error: any) {
      console.error('Error fetching receivable debts:', error);
      return 0;
    }
  };

  // Fetch payable debts from suppliers
  const fetchPayableDebts = async (): Promise<number> => {
    try {
      const response = await fetch('/api/suppliers', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok || !result?.suppliers) {
        return 0;
      }

      let total = 0;
      for (const supplier of result.suppliers || []) {
        if (supplier.payment_terms === 'DEFERRED' && supplier.status === 'ACTIVE' && Number(supplier.debt || 0) > 0) {
          total += Number(supplier.debt || 0);
        }
      }

      return total;
    } catch (error: any) {
      console.error('Error fetching payable debts:', error);
      return 0;
    }
  };

  // Calculate profit data from contracts
  const calculateProfitData = async () => {
    const { startDate, endDate } = getDateRange(dateRange);
    
    try {
      if (!user?.id) {
        setProfitData([]);
        setTotalProfit(0);
        await calculatePreviousPeriodProfit();
        return;
      }

      const response = await fetch(`/api/contracts/overview?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || '')}`, { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok || !result?.contracts) {
        setProfitData([]);
        setTotalProfit(0);
        await calculatePreviousPeriodProfit();
        return;
      }

      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      const filteredContracts = (result.contracts || []).filter((c: any) => {
        const signedDate = c.signedDate || '';
        return signedDate >= start && signedDate <= end &&
          ['SIGNED', 'PAYING', 'COMPLETED'].includes(c.status);
      });

      if (filteredContracts.length === 0) {
        setProfitData([]);
        setTotalProfit(0);
        await calculatePreviousPeriodProfit();
        return;
      }

      const profitByModel: Record<string, { profit: number; revenue: number }> = {};
      filteredContracts.forEach((contract: any) => {
        const vehicle = vehicles.find(v => v.id === contract.vehicleId);
        if (!vehicle) return;

        const profit = (Number(vehicle.price) || 0) - (Number(vehicle.cost) || 0);
        const modelName = vehicle.model || 'Không xác định';
        if (!profitByModel[modelName]) {
          profitByModel[modelName] = { profit: 0, revenue: 0 };
        }
        profitByModel[modelName].profit += profit;
        profitByModel[modelName].revenue += Number(vehicle.price) || 0;
      });

      const chartData = Object.entries(profitByModel).map(([name, data]) => ({
        name,
        profit: Math.round(data.profit),
        margin: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : 0
      }));

      const totalProfitValue = chartData.reduce((sum, item) => sum + item.profit, 0);
      setProfitData(chartData);
      setTotalProfit(totalProfitValue);
      await calculatePreviousPeriodProfit();
    } catch (error: any) {
      console.error('Error calculating profit data:', error);
      // Fallback to vehicle-based calculation
      calculateProfitDataFromVehicles();
    }
  };

  // Fallback: Calculate profit from vehicles (if contract query fails)
  const calculateProfitDataFromVehicles = () => {
    const { startDate, endDate } = getDateRange(dateRange);
    
    const soldVehicles = vehicles.filter(v => {
      if (v.status !== VehicleStatus.SOLD && v.status !== VehicleStatus.REGISTRATION && v.status !== VehicleStatus.DELIVERED) {
        return false;
      }
      const vehicleDate = new Date(v.createdAt);
      return vehicleDate >= startDate && vehicleDate <= endDate;
    });

    const profitByModel = new Map<string, { profit: number; count: number }>();
    
    soldVehicles.forEach(v => {
      const profit = v.price - v.cost;
      const model = v.model || 'Khác';
      const existing = profitByModel.get(model) || { profit: 0, count: 0 };
      profitByModel.set(model, {
        profit: existing.profit + profit,
        count: existing.count + 1
      });
    });

    const profitDataArray = Array.from(profitByModel.entries()).map(([name, data]) => ({
      name,
      profit: data.profit,
      margin: 0
    }));

    const total = profitDataArray.reduce((sum, item) => sum + item.profit, 0);
    setProfitData(profitDataArray);
    setTotalProfit(total);
  };

  // Calculate previous period profit
  const calculatePreviousPeriodProfit = async () => {
    const { startDate, endDate } = getPreviousPeriodRange(dateRange);
    
    try {
      if (user?.id) {
        const response = await fetch(`/api/contracts/overview?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || '')}`, { cache: 'no-store' });
        const result = await response.json();

        if (response.ok && result?.contracts) {
          const start = startDate.toISOString().split('T')[0];
          const end = endDate.toISOString().split('T')[0];
          const filteredContracts = (result.contracts || []).filter((c: any) => {
            const signedDate = c.signedDate || '';
            return signedDate >= start && signedDate <= end &&
              ['SIGNED', 'PAYING', 'COMPLETED'].includes(c.status);
          });

          const total = filteredContracts.reduce((sum: number, c: any) => {
            const vehicle = vehicles.find(v => v.id === c.vehicleId);
            if (!vehicle) return sum;
            return sum + (Number(vehicle.price) - Number(vehicle.cost));
          }, 0);

          setPreviousPeriodProfit(total);
          return;
        }
      }

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, signed_date, vehicle_id')
        .eq('contract_type', 'SALES')
        .in('status', ['SIGNED', 'PAYING', 'COMPLETED'])
        .gte('signed_date', startDate.toISOString().split('T')[0])
        .lte('signed_date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      if (!contracts || contracts.length === 0) {
        setPreviousPeriodProfit(0);
        return;
      }

      const vehicleIds = contracts
        .map((c: any) => c.vehicle_id)
        .filter((id: any): id is string => !!id);

      if (vehicleIds.length === 0) {
        setPreviousPeriodProfit(0);
        return;
      }

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, price, cost')
        .in('id', vehicleIds);

      if (vehiclesError) throw vehiclesError;

      let total = 0;
      for (const vehicle of vehiclesData || []) {
        if (!vehicle.price || !vehicle.cost) continue;
        total += Number(vehicle.price) - Number(vehicle.cost);
      }

      setPreviousPeriodProfit(total);
    } catch (error: any) {
      console.error('Error calculating previous period profit:', error);
      // Fallback to vehicle-based calculation
      const soldVehicles = vehicles.filter(v => {
        if (v.status !== VehicleStatus.SOLD && v.status !== VehicleStatus.REGISTRATION && v.status !== VehicleStatus.DELIVERED) {
          return false;
        }
        const vehicleDate = new Date(v.createdAt);
        return vehicleDate >= startDate && vehicleDate <= endDate;
      });

      const total = soldVehicles.reduce((sum, v) => sum + (v.price - v.cost), 0);
      setPreviousPeriodProfit(total);
    }
  };

  // Calculate inventory data
  const calculateInventoryData = () => {
    const availableVehicles = vehicles.filter(v => v.status === VehicleStatus.AVAILABLE);
    setAvailableVehiclesCount(availableVehicles.length);
    
    const inventoryValueTotal = availableVehicles.reduce((sum, v) => sum + v.cost, 0);
    setInventoryValue(inventoryValueTotal);

    // Group by model
    const inventoryByModelMap = new Map<string, number>();
    
    availableVehicles.forEach(v => {
      const model = v.model || 'Khác';
      inventoryByModelMap.set(model, (inventoryByModelMap.get(model) || 0) + 1);
    });

    const inventoryArray = Array.from(inventoryByModelMap.entries()).map(([name, value]) => ({
      name,
      value
    }));

    setInventoryByModel(inventoryArray);
  };

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchVehicles();
        const receivable = await fetchReceivableDebts();
        const payable = await fetchPayableDebts();
        setTotalReceivable(receivable);
        setTotalPayable(payable);
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Recalculate when date range or vehicles change
  useEffect(() => {
    if (vehicles.length > 0) {
      const recalculate = async () => {
        await calculateProfitData();
        calculateInventoryData();
      };
      recalculate();
    }
  }, [dateRange, vehicles]);

  const COLORS = ['#00d26a', '#059669', '#10b981', '#34d399', '#6ee7b7'];

  // Calculate profit percentage change
  const profitChangePercent = previousPeriodProfit > 0 
    ? ((totalProfit - previousPeriodProfit) / previousPeriodProfit) * 100 
    : 0;

  // Check if user has any report permissions
  const hasReportPermissions = hasAnyPermission(user?.permissions, PermissionCategories.reports);

  // If user doesn't have any report permissions, show access denied message
  if (!hasReportPermissions) {
    return (
      <AccessDenied 
        message="Bạn không có quyền xem báo cáo. Vui lòng liên hệ quản trị viên để được cấp quyền."
        redirectTo="/dashboard"
        icon="alert"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#00d26a]" />
          <p className="text-slate-500 font-bold">Đang tải dữ liệu báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/80 backdrop-blur-md p-5 rounded-[32px] border border-white shadow-sm">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {['7days', '30days', 'quarter', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                dateRange === range ? 'bg-white text-[#00d26a] shadow-lg' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {range === '7days' ? '1 Tuần' : range === '30days' ? '1 Tháng' : range === 'quarter' ? 'Quý' : 'Năm'}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-3 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl">
            <Download size={18} /> XUẤT BÁO CÁO (PDF/EXCEL)
          </button>
        </div>
      </div>

      {/* KPI Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-gradient-to-br from-[#00d26a] to-emerald-800 p-10 rounded-[48px] text-white shadow-2xl shadow-[#00d26a]/20 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-3">Lợi nhuận gộp thực tế</p>
            <h3 className="text-5xl font-black tracking-tighter">{formatVND(totalProfit)}</h3>
            <div className="mt-8 flex items-center gap-2 text-white bg-white/10 px-4 py-1.5 rounded-xl w-fit backdrop-blur-md">
              {profitChangePercent >= 0 ? (
                <ArrowUpRight size={18} className="text-[#00d26a]" />
              ) : (
                <ArrowDownRight size={18} className="text-rose-400" />
              )}
              <span className="text-xs font-black uppercase">
                {profitChangePercent >= 0 ? '+' : ''}{profitChangePercent.toFixed(1)}% {dateRange === '7days' ? 'Tuần' : dateRange === '30days' ? 'Tháng' : dateRange === 'quarter' ? 'Quý' : 'Năm'}-over-{dateRange === '7days' ? 'Tuần' : dateRange === '30days' ? 'Tháng' : dateRange === 'quarter' ? 'Quý' : 'Năm'}
              </span>
            </div>
          </div>
          <TrendingUp className="absolute -bottom-10 -right-10 text-white/5 transition-transform group-hover:scale-110" size={240} />
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[48px] border border-white shadow-xl shadow-slate-200/50 flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Vốn tồn kho lưu động</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
              {formatVND(inventoryValue)}
            </h3>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#00d26a] animate-pulse"></div>
              <span className="text-xs font-black text-slate-500 uppercase">{availableVehiclesCount} XE TRONG KHO</span>
            </div>
            <button 
              onClick={() => window.location.href = '/inventory'}
              className="text-[#00d26a] hover:underline text-[10px] font-black uppercase tracking-widest"
            >
              Kiểm kho chi tiết
            </button>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4">Chỉ số Dòng tiền (Cash Flow)</p>
            <div className="space-y-5 mt-6">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Công nợ Phải thu</span>
                  <span className="text-lg font-black text-[#00d26a] tracking-tight">{formatVND(totalReceivable)}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Công nợ Phải trả</span>
                  <span className="text-lg font-black text-rose-400 tracking-tight">{formatVND(totalPayable)}</span>
               </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
             <span className="text-xs font-black uppercase tracking-widest text-white/60">Net Profitability</span>
             <span className="text-xl font-black text-emerald-400">{formatVND(totalReceivable - totalPayable)}</span>
          </div>
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5" size={200} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[48px] border border-white shadow-xl shadow-slate-200/50">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <BarChart3 size={20} className="text-[#00d26a]" /> Phân bổ lợi nhuận dòng xe
              </h4>
           </div>
           <div className="h-80">
              {profitData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="900" />
                    <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="900" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 30px -5px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number | undefined) => [formatVND(value ?? 0), 'Lợi nhuận']}
                    />
                    <Bar dataKey="profit" fill="#00d26a" radius={[10, 10, 0, 0]} barSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p className="text-sm font-bold">Không có dữ liệu lợi nhuận trong khoảng thời gian này</p>
                </div>
              )}
           </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[48px] border border-white shadow-xl shadow-slate-200/50">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <PieIcon size={20} className="text-emerald-600" /> Tỷ lệ danh mục tồn kho
              </h4>
           </div>
           <div className="h-80 flex flex-col md:flex-row items-center">
              {inventoryByModel.length > 0 ? (
                <>
                  <div className="flex-1 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inventoryByModel}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {inventoryByModel.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={4} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-56 space-y-4">
                     {inventoryByModel.map((item, index) => (
                       <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                             <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{item.name}</span>
                          </div>
                          <span className="text-xs font-black text-slate-900">{item.value} Xe</span>
                       </div>
                     ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full w-full text-slate-400">
                  <p className="text-sm font-bold">Không có xe trong kho</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
