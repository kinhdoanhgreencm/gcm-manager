'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, User, Phone, Mail, FileText, Calendar,
  AlertCircle, ArrowLeft, Car, Hash, DollarSign,
  Clock, UserCircle, CheckCircle2, XCircle, Info,
  Building2, CreditCard, MapPin, ShieldCheck
} from 'lucide-react';
import { ClaimType, ClaimStatus, ClaimPriority, Vehicle, Customer } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import { AccessDenied } from './AccessDenied';

export const ClaimFormPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [formData, setFormData] = useState({
    type: ClaimType.COMPLAINT,
    status: ClaimStatus.PENDING,
    priority: ClaimPriority.MEDIUM,
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleId: '',
    vehicleCode: '',
    contractId: '',
    contractCode: '',
    title: '',
    description: '',
    requestedAmount: '',
    approvedAmount: '',
    resolution: '',
    notes: '',
    assignedToId: '',
    reportedDate: new Date().toISOString().split('T')[0],
    dueDate: ''
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check permissions
  const canCreateClaim = hasPermission(user?.permissions, 'claimsCreate');

  // Fetch customers, vehicles, contracts, and staff
  useEffect(() => {
    fetchCustomers();
    fetchVehicles();
    fetchContracts();
    fetchStaff();
  }, []);

  // Set default assignedToId to current user
  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({
        ...prev,
        assignedToId: user.id
      }));
    }
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/claims/customers', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching customers:', result?.error || 'Unknown error');
        return;
      }

      if (result.customers) {
        const transformed: Customer[] = result.customers.map((c: any) => ({
          id: c.id,
          code: '',
          type: 'INDIVIDUAL' as any,
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || undefined,
          address: '',
          source: '',
          assignedStaffId: '',
          status: 'PROSPECT' as any,
          createdAt: '',
          totalContracts: 0,
          totalPurchased: 0,
          totalRevenue: 0,
          debt: 0
        }));
        setCustomers(transformed);
      }
    } catch (err: any) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/claims/vehicles', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching vehicles:', result?.error || 'Unknown error');
        return;
      }

      if (result.vehicles) {
        const transformed: Vehicle[] = result.vehicles.map((v: any) => ({
          id: v.id,
          code: v.code || undefined,
          vin: v.vin,
          make: v.make || 'VinFast',
          model: v.model || '',
          year: v.year,
          type: v.type as any,
          price: 0,
          cost: 0,
          status: 'AVAILABLE' as any,
          color: '',
          createdAt: ''
        }));
        setVehicles(transformed);
      }
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/claims/contracts', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching contracts:', result?.error || 'Unknown error');
        return;
      }

      setContracts(result.contracts || []);
    } catch (err: any) {
      console.error('Error fetching contracts:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/claims/staff', { cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching staff:', result?.error || 'Unknown error');
        return;
      }

      setStaffList(result.staff || []);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || ''
      }));
    }
  };

  // Handle vehicle selection
  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        vehicleId: vehicle.id,
        vehicleCode: vehicle.code || ''
      }));
    }
  };

  // Handle contract selection
  const handleContractSelect = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      setFormData(prev => ({
        ...prev,
        contractId: contract.id,
        contractCode: contract.contract_code || ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.description || !formData.customerName || !formData.customerPhone) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    if (!canCreateClaim) {
      setSubmitError('Bạn không có quyền tạo hồ sơ claim');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const claimData: any = {
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        customer_id: formData.customerId || null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail || null,
        vehicle_id: formData.vehicleId || null,
        vehicle_code: formData.vehicleCode || null,
        contract_id: formData.contractId || null,
        contract_code: formData.contractCode || null,
        title: formData.title,
        description: formData.description,
        requested_amount: formData.requestedAmount ? parseFloat(formData.requestedAmount) : null,
        approved_amount: formData.approvedAmount ? parseFloat(formData.approvedAmount) : null,
        resolution: formData.resolution || null,
        notes: formData.notes || null,
        assigned_to_id: formData.assignedToId || null,
        created_by_id: user?.id || null,
        reported_date: formData.reportedDate || new Date().toISOString().split('T')[0],
        due_date: formData.dueDate || null
      };

      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claimData })
      });
      const result = await response.json();

      if (!response.ok) {
        console.error('Error saving claim:', result?.error || 'Unknown error');
        throw new Error(result?.error || 'Lỗi lưu dữ liệu hồ sơ claim');
      }

      // Redirect to claims list
      router.push('/claims');
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      setSubmitError(error.message || 'Có lỗi xảy ra khi tạo hồ sơ claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreateClaim) {
    return <AccessDenied message="Bạn không có quyền tạo hồ sơ claim. Vui lòng liên hệ quản trị viên để được cấp quyền." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Tạo hồ sơ claim mới</h1>
          <p className="text-slate-300/80 text-sm">Khai báo thông tin khiếu nại, bảo hành hoặc yêu cầu của khách hàng</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 space-y-8">
        {/* Error Message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Lỗi khi lưu dữ liệu</p>
              <p className="text-xs text-red-700 mt-1">{submitError}</p>
            </div>
          </div>
        )}

        {/* Section 1: Thông tin cơ bản */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
              <FileText size={18} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">1. Thông tin cơ bản</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Loại claim *</label>
              <select
                required
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as ClaimType})}
              >
                <option value={ClaimType.WARRANTY}>Bảo hành</option>
                <option value={ClaimType.COMPLAINT}>Khiếu nại</option>
                <option value={ClaimType.REPAIR}>Sửa chữa</option>
                <option value={ClaimType.REPLACEMENT}>Thay thế</option>
                <option value={ClaimType.REFUND}>Hoàn tiền</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Độ ưu tiên *</label>
              <select
                required
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as ClaimPriority})}
              >
                <option value={ClaimPriority.LOW}>Thấp</option>
                <option value={ClaimPriority.MEDIUM}>Trung bình</option>
                <option value={ClaimPriority.HIGH}>Cao</option>
                <option value={ClaimPriority.URGENT}>Khẩn cấp</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-300">Tiêu đề *</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a]"
                placeholder="Nhập tiêu đề claim"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-300">Mô tả chi tiết *</label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a] resize-none"
                placeholder="Mô tả chi tiết về claim..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Ngày báo cáo *</label>
              <input
                required
                type="date"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.reportedDate}
                onChange={e => setFormData({...formData, reportedDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Ngày hạn xử lý</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Thông tin khách hàng */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
              <User size={18} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">2. Thông tin khách hàng</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Chọn khách hàng</label>
              <select
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.customerId}
                onChange={e => handleCustomerSelect(e.target.value)}
              >
                <option value="">-- Chọn khách hàng --</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Tên khách hàng *</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.customerName}
                onChange={e => setFormData({...formData, customerName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Số điện thoại *</label>
              <input
                required
                type="tel"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.customerPhone}
                onChange={e => setFormData({...formData, customerPhone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.customerEmail}
                onChange={e => setFormData({...formData, customerEmail: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Thông tin liên quan */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center">
              <Car size={18} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">3. Thông tin liên quan (Tùy chọn)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Xe liên quan</label>
              <select
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.vehicleId}
                onChange={e => handleVehicleSelect(e.target.value)}
              >
                <option value="">-- Chọn xe --</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.code || vehicle.vin} - {vehicle.make} {vehicle.model} ({vehicle.year})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Hợp đồng liên quan</label>
              <select
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.contractId}
                onChange={e => handleContractSelect(e.target.value)}
              >
                <option value="">-- Chọn hợp đồng --</option>
                {contracts.map(contract => (
                  <option key={contract.id} value={contract.id}>
                    {contract.contract_code} - {contract.customer_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 4: Thông tin tài chính */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-yellow-500/20 text-yellow-400 rounded-lg flex items-center justify-center">
              <DollarSign size={18} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">4. Thông tin tài chính (Tùy chọn)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Số tiền yêu cầu (VND)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a]"
                placeholder="0"
                value={formData.requestedAmount}
                onChange={e => setFormData({...formData, requestedAmount: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Số tiền được duyệt (VND)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a]"
                placeholder="0"
                value={formData.approvedAmount}
                onChange={e => setFormData({...formData, approvedAmount: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Section 5: Phân công và ghi chú */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center">
              <UserCircle size={18} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">5. Phân công và ghi chú</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Giao cho</label>
              <select
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-[#00d26a]"
                value={formData.assignedToId}
                onChange={e => setFormData({...formData, assignedToId: e.target.value})}
              >
                <option value="">-- Chọn nhân viên --</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-300">Giải pháp/Phương án xử lý</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a] resize-none"
                placeholder="Nhập giải pháp xử lý..."
                value={formData.resolution}
                onChange={e => setFormData({...formData, resolution: e.target.value})}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-300">Ghi chú</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00d26a] resize-none"
                placeholder="Nhập ghi chú..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-8 py-3 bg-white/10 border border-white/30 rounded-xl text-sm font-bold text-white hover:bg-white/20 transition-all disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-[#00d26a] text-white font-bold rounded-xl hover:bg-[#00b85a] transition-all shadow-lg shadow-[#00d26a]/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Lưu hồ sơ claim</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
