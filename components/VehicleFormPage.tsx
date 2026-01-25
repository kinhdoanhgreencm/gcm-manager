'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, Car, Zap, Timer, 
  DollarSign, Calendar, Tag, Info, 
  ShieldCheck, Upload, Image as ImageIcon,
  FileText, Plus, AlertCircle, Hash,
  ChevronDown, Building2, Truck, ArrowLeft, X, AlertTriangle
} from 'lucide-react';
import { VehicleType, VehicleStatus, Supplier } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const supabase = null as any;

interface VehicleFormPageProps {
  onSave?: (data: any) => void;
}

interface ImagePreview {
  id: string;
  file: File;
  preview: string;
}

export const VehicleFormPage: React.FC<VehicleFormPageProps> = ({ onSave }) => {
  const router = useRouter();
  const { user } = useAuth();
  
  // Check if user is inventory staff (cannot input cost and price)
  const isInventoryStaff = user?.role === 'INVENTORY';
  
  // Get current datetime in ISO format
  const getCurrentDateTime = (): string => {
    return new Date().toISOString();
  };

  // Format datetime to "hh:mm dd/mm/yyyy"
  const formatDateTime = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Parse "hh:mm dd/mm/yyyy" to ISO string
  const parseDateTime = (value: string, currentEntryDate?: string): string => {
    // Remove extra spaces
    const cleaned = value.trim();
    if (!cleaned) return currentEntryDate || new Date().toISOString();
    
    // Match pattern: hh:mm dd/mm/yyyy
    const match = cleaned.match(/(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) {
      // If partial input, return current value to allow continued typing
      return currentEntryDate || new Date().toISOString();
    }
    
    const [, hours, minutes, day, month, year] = match;
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // Validate ranges
    if (hour > 23 || minute > 59 || dayNum > 31 || monthNum > 12 || yearNum < 2000 || yearNum > 2100) {
      return currentEntryDate || new Date().toISOString();
    }
    
    const date = new Date(
      yearNum,
      monthNum - 1,
      dayNum,
      hour,
      minute
    );
    
    if (isNaN(date.getTime())) return currentEntryDate || new Date().toISOString();
    return date.toISOString();
  };

  // Handle datetime input with auto-formatting
  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove all non-digit characters except :, /, and spaces
    const cleanedValue = value.replace(/[^\d:\/\s]/g, '');
    
    // Auto-format as user types
    let digits = cleanedValue.replace(/[^\d]/g, '');
    let formatted = '';
    
    // Format: hh:mm dd/mm/yyyy
    if (digits.length > 0) {
      // Hours (2 digits)
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        formatted += ':' + digits.slice(2, 4);
      }
      if (digits.length > 4) {
        formatted += ' ' + digits.slice(4, 6);
      }
      if (digits.length > 6) {
        formatted += '/' + digits.slice(6, 8);
      }
      if (digits.length > 8) {
        formatted += '/' + digits.slice(8, 12);
      }
    }
    
    // Limit to 16 characters (hh:mm dd/mm/yyyy)
    if (formatted.length > 16) {
      formatted = formatted.slice(0, 16);
    }
    
    // Update display value immediately
    setEntryDateDisplay(formatted || value);
    
    // Try to parse and update formData if we have a complete date
    if (formatted.length >= 16) {
      const parsed = parseDateTime(formatted, formData.entryDate);
      setFormData({...formData, entryDate: parsed});
    }
  };

  const [formData, setFormData] = useState({
    type: VehicleType.EV, 
    make: 'VinFast',
    model: '',
    version: '',
    year: new Date().getFullYear(),
    color: '',
    interiorColor: '',
    vin: '',
    engineNumber: '',
    code: '', // Mã xe (CTGF-XXXX) - để trống sẽ tự động generate
    mileage: 0,
    batteryHealth: 100,
    cost: 0,
    price: 0,
    supplierId: '',
    entryDate: getCurrentDateTime(),
    // Vị trí xe (Đang vận chuyển, Đã về kho)
    vehiclePosition: 'Đang vận chuyển',
    // Trạng thái giao dịch (Sẵn sàng giao dịch, Đã cọc, Đã xuất hóa đơn, Đã bàn giao)
    transactionStatus: 'Sẵn sàng giao dịch',
    notes: '',
    conditionNotes: ''
  });
  
  // Separate state for entry date input display value
  const [entryDateDisplay, setEntryDateDisplay] = useState(formatDateTime(getCurrentDateTime()));
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const isEV = formData.type === VehicleType.EV;
  const isUsed = formData.type === VehicleType.USED;

  // Fetch suppliers from database
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const response = await fetch('/api/suppliers', { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          console.error('Error fetching suppliers:', result?.error || 'Unknown error');
          setSuppliers([]);
          return;
        }

        if (result.suppliers) {
          const transformedSuppliers: Supplier[] = result.suppliers
            .filter((s: any) => s.status === 'ACTIVE')
            .map((s: any) => ({
              id: s.id,
              code: s.code || '',
              type: s.type as any,
              name: s.name || '',
              phone: s.phone || '',
              email: s.email || undefined,
              address: s.address || '',
              taxCode: s.tax_code || undefined,
              idCard: s.id_card || undefined,
              companyName: s.company_name || undefined,
              representative: s.representative || undefined,
              position: s.position || undefined,
              bankName: s.bank_name || undefined,
              bankAccount: s.bank_account || undefined,
              paymentTerms: (s.payment_terms || 'DEFERRED') as 'IMMEDIATE' | 'DEFERRED',
              assignedStaffId: s.assigned_staff_id || '',
              status: s.status as any,
              notes: s.notes || undefined,
              createdAt: s.created_at || new Date().toISOString(),
              totalVehicles: s.total_vehicles || 0,
              totalImportValue: Number(s.total_import_value) || 0,
              debt: Number(s.debt) || 0
            }));
          setSuppliers(transformedSuppliers);
        }
        return;

        const { data, error: fetchError } = await supabase
          .from('suppliers')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('name', { ascending: true });

        if (fetchError) {
          console.error('Error fetching suppliers:', fetchError);
          // Don't show error to user, just log it
          setSuppliers([]);
          return;
        }

        if (data) {
          // Transform Supabase data to Supplier type
          const transformedSuppliers: Supplier[] = data.map((s: any) => ({
            id: s.id,
            code: s.code || '',
            type: s.type as any,
            name: s.name || '',
            phone: s.phone || '',
            email: s.email || undefined,
            address: s.address || '',
            taxCode: s.tax_code || undefined,
            idCard: s.id_card || undefined,
            companyName: s.company_name || undefined,
            representative: s.representative || undefined,
            position: s.position || undefined,
            bankName: s.bank_name || undefined,
            bankAccount: s.bank_account || undefined,
            paymentTerms: (s.payment_terms || 'DEFERRED') as 'IMMEDIATE' | 'DEFERRED',
            assignedStaffId: s.assigned_staff_id || '',
            status: s.status as any,
            notes: s.notes || undefined,
            createdAt: s.created_at || new Date().toISOString(),
            totalVehicles: s.total_vehicles || 0,
            totalImportValue: Number(s.total_import_value) || 0,
            debt: Number(s.debt) || 0
          }));

          setSuppliers(transformedSuppliers);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching suppliers:', err);
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newImage: ImagePreview = {
            id: `img-${Date.now()}-${Math.random()}`,
            file,
            preview: reader.result as string
          };
          setImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Format number with commas for thousands
  const formatNumber = (value: number): string => {
    if (value === 0) return '';
    // Use commas as thousands separator
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Parse formatted number string back to number
  const parseNumber = (value: string): number => {
    const cleaned = value.replace(/,/g, '').trim();
    if (cleaned === '') return 0;
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Handle cost input change
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent inventory staff from changing cost
    if (isInventoryStaff) return;
    
    const inputValue = e.target.value;
    // Remove all non-digit characters
    const cleaned = inputValue.replace(/[^\d]/g, '');
    // Parse to number
    const numValue = parseNumber(cleaned);
    setFormData({...formData, cost: numValue});
  };

  // Handle price input change
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent inventory staff from changing price
    if (isInventoryStaff) return;
    
    const inputValue = e.target.value;
    // Remove all non-digit characters
    const cleaned = inputValue.replace(/[^\d]/g, '');
    // Parse to number
    const numValue = parseNumber(cleaned);
    setFormData({...formData, price: numValue});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    // Note: cost and price are not required for inventory staff
    const costValid = isInventoryStaff ? true : formData.cost > 0;
    const priceValid = isInventoryStaff ? true : formData.price > 0;
    
    if (!formData.type || !formData.vin || !formData.engineNumber || !formData.make || 
        !formData.model || !formData.version || !formData.year || !formData.color || 
        !formData.interiorColor || !formData.vehiclePosition || !formData.conditionNotes ||
        !formData.supplierId || !formData.entryDate || !costValid || !priceValid) {
      setSubmitError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    // Additional validation for USED vehicles
    if (isUsed) {
      if (formData.mileage === undefined || formData.mileage === null || 
          formData.batteryHealth === undefined || formData.batteryHealth === null) {
        setSubmitError('Vui lòng nhập đầy đủ thông tin cho xe lướt (ODO và tình trạng pin)');
        return;
      }
    }

    if (!formData.supplierId) {
      setSubmitError("Vui lòng chọn Nhà cung cấp / Nguồn nhập xe");
      return;
    }
    if (!formData.vin) {
      setSubmitError("Vui lòng nhập số VIN (Số khung)");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setUploadProgress('');

    try {
      setUploadProgress('Đang upload ảnh và lưu thông tin xe...');

      const storedUser = sessionStorage.getItem('user');
      let createdBy = null;
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          createdBy = user.id;
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }

      const vehicleData = {
        vin: formData.vin.toUpperCase(),
        make: formData.make,
        model: formData.model,
        version: formData.version || null,
        year: formData.year,
        color: formData.color || null,
        interior_color: formData.interiorColor || null,
        engine_number: formData.engineNumber || null,
        code: formData.code && formData.code.trim() !== '' ? formData.code.toUpperCase().trim() : null,
        type: formData.type,
        mileage: formData.mileage || null,
        battery_health: (isEV || isUsed) ? formData.batteryHealth : null,
        cost: formData.cost,
        price: formData.price,
        status: VehicleStatus.AVAILABLE,
        supplier_id: formData.supplierId,
        entry_date: formData.entryDate,
        vehicle_position: formData.vehiclePosition || null,
        transaction_status: formData.transactionStatus || 'Sẵn sàng giao dịch',
        notes: formData.notes || null,
        condition_notes: formData.conditionNotes || null,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const payload = new FormData();
      payload.append('data', JSON.stringify(vehicleData));
      images.forEach((image) => payload.append('images', image.file));

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        body: payload
      });
      const result = await response.json();

      if (!response.ok) {
        setSubmitError(result?.error || 'Lỗi lưu dữ liệu xe');
        setIsSubmitting(false);
        setUploadProgress('');
        return;
      }

      router.push('/inventory');
      return;
    } catch (error: any) {
      console.error('Submit error:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.';
      setSubmitError(errorMessage);
      setUploadProgress('');
    } finally {
      setIsSubmitting(false);
    }
  };

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
               <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter">VinFast Inventory System</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Nhập xe điện mới vào kho</h2>
            <p className="text-xs text-slate-500 font-medium">Khai báo thông tin chi tiết số khung và cấu hình xe VinFast</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form 
        onSubmit={handleSubmit}
        className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="p-10 space-y-10">
          
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
                    required
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as VehicleType})}
                  >
                    <option value={VehicleType.EV}>VinFast EV (Mới)</option>
                    <option value={VehicleType.USED}>VinFast Lướt (Cũ)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã xe</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="CTGF-0001 (để trống sẽ tự động tạo)"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase tracking-tighter"
                    value={formData.code}
                    onChange={e => {
                      let value = e.target.value.toUpperCase().trim();
                      // Chỉ cho phép format CTGF-XXXX
                      if (value === '' || value.match(/^CTGF-[0-9]{0,4}$/)) {
                        setFormData({...formData, code: value});
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Để trống để tự động tạo mã theo format CTGF-XXXX</p>
              </div>

              <div className="space-y-2">
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số máy *</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="text" 
                    placeholder="Số máy..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all uppercase tracking-tighter"
                    value={formData.engineNumber}
                    onChange={e => setFormData({...formData, engineNumber: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hãng sản xuất *</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.make}
                    onChange={e => setFormData({...formData, make: e.target.value})}
                  >
                    <option value="VinFast">VinFast</option>
                    <option value="Hãng khác">Hãng khác</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model xe *</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                  >
                    <option value="">-- Chọn Model --</option>
                    <option value="VF3">VF3</option>
                    <option value="VF5">VF5</option>
                    <option value="VF6">VF6</option>
                    <option value="VF7">VF7</option>
                    <option value="VF8">VF8</option>
                    <option value="VF9">VF9</option>
                    <option value="Minio Green">Minio Green</option>
                    <option value="Herio Green">Herio Green</option>
                    <option value="Nerio Green">Nerio Green</option>
                    <option value="Limo">Limo</option>
                    <option value="Limo Green">Limo Green</option>
                    <option value="EC Van">EC Van</option>
                    <option value="E Bus">E Bus</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phiên bản *</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.version}
                    onChange={e => setFormData({...formData, version: e.target.value})}
                  >
                    <option value="">-- Chọn Phiên bản --</option>
                    <option value="Eco">Eco</option>
                    <option value="Plus">Plus</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Năm sản xuất *</label>
                <input 
                  required
                  type="number" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  value={formData.year}
                  onChange={e => setFormData({...formData, year: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu ngoại thất *</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                  >
                    <option value="">-- Chọn Màu --</option>
                    <option value="Trắng">Trắng</option>
                    <option value="Đen">Đen</option>
                    <option value="Bạc">Bạc</option>
                    <option value="Đỏ">Đỏ</option>
                    <option value="Vàng">Vàng</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu nội thất *</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.interiorColor}
                    onChange={e => setFormData({...formData, interiorColor: e.target.value})}
                  >
                    <option value="">-- Chọn Màu --</option>
                    <option value="Đen">Đen</option>
                    <option value="Xám">Xám</option>
                    <option value="Be">Be</option>
                    <option value="Nâu">Nâu</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Hiển thị khi chọn "VinFast Lướt (Cũ)" */}
              {isUsed && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ODO (km) *</label>
                    <div className="relative">
                      <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        required
                        type="number" 
                        placeholder="0"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={formData.mileage || ''}
                        onChange={e => setFormData({...formData, mileage: Number(e.target.value) || 0})}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tình trạng pin (%) *</label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        required
                        type="number" 
                        placeholder="100"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        value={formData.batteryHealth || ''}
                        onChange={e => {
                          const value = Number(e.target.value);
                          const clampedValue = Math.min(100, Math.max(0, value || 0));
                          setFormData({...formData, batteryHealth: clampedValue});
                        }}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Section 2: Upload ảnh xe, Nhà cung cấp, Ngày hạch toán */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                 <ImageIcon size={18} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Hình ảnh xe, Nhà cung cấp & Ngày hạch toán</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Hình ảnh xe - Thu nhỏ */}
              <div className="space-y-4 flex flex-col">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest h-5 flex items-center">Hình ảnh xe</label>
                <div className="relative">
                  <input
                    type="file"
                    id="image-upload"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-purple-400 cursor-pointer transition-all group"
                  >
                    <div className="flex flex-col items-center justify-center py-4 px-2">
                      <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-purple-600 transition-colors" />
                      <p className="mb-1 text-xs font-bold text-slate-600 text-center">
                        <span className="text-purple-600">Upload</span> ảnh
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium text-center">PNG, JPG, WEBP</p>
                    </div>
                  </label>
                </div>

                {/* Vị trí xe */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí xe *</label>
                  <div className="relative">
                    <select
                      required
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      value={formData.vehiclePosition}
                      onChange={e => setFormData({ ...formData, vehiclePosition: e.target.value })}
                    >
                      <option value="Đang vận chuyển">Đang vận chuyển</option>
                      <option value="Đã về kho">Đã về kho</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Image Preview Grid - Compact */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={image.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(image.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú tình trạng xe */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú tình trạng xe *</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-slate-400 pointer-events-none" size={18} />
                  <textarea
                    required
                    rows={6}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                    placeholder="Ghi chú về tình trạng xe: vết xước, hư hỏng, bảo dưỡng..."
                    value={formData.conditionNotes}
                    onChange={e => setFormData({...formData, conditionNotes: e.target.value})}
                  />
                </div>
              </div>

              {/* Nhà cung cấp và Ngày hạch toán - Cùng 1 cột */}
              <div className="space-y-6 flex flex-col">
                {/* Nhà cung cấp */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest h-5 flex items-center">Nhà cung cấp / Nguồn xe *</label>
                  <div className="relative">
                     <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                     <select 
                      required
                      disabled={loadingSuppliers}
                      className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                      value={formData.supplierId}
                      onChange={e => setFormData({...formData, supplierId: e.target.value})}
                     >
                       <option value="">
                         {loadingSuppliers ? 'Đang tải danh sách...' : '-- Chọn Nhà cung cấp --'}
                       </option>
                       {suppliers.map(sup => (
                         <option key={sup.id} value={sup.id}>
                           {sup.name} {sup.code ? `(${sup.code})` : ''}
                         </option>
                       ))}
                     </select>
                     <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Ngày hạch toán */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest h-5 flex items-center">Ngày hạch toán nhập kho *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input 
                      required
                      type="text" 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono h-[46px]"
                      placeholder="hh:mm dd/mm/yyyy"
                      value={entryDateDisplay}
                      onChange={handleDateTimeChange}
                      onBlur={e => {
                        // On blur, ensure we have a valid date
                        const inputValue = e.target.value.trim();
                        
                        // If input is empty or invalid, use current date
                        if (!inputValue || inputValue.length < 16) {
                          const now = new Date();
                          const newDate = now.toISOString();
                          setFormData({...formData, entryDate: newDate});
                          setEntryDateDisplay(formatDateTime(newDate));
                        } else {
                          // Try to parse and format the input
                          const parsed = parseDateTime(inputValue, formData.entryDate);
                          setFormData({...formData, entryDate: parsed});
                          setEntryDateDisplay(formatDateTime(parsed));
                        }
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Nhập giờ và ngày nhập kho (tự động định dạng khi gõ)
                  </p>
                </div>
              </div>
            </div>
          </section>

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
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    Giá vốn nhập kho (Cost) {!isInventoryStaff && '*'}
                  </label>
                  <div className="relative">
                    <input 
                      required={!isInventoryStaff}
                      disabled={isInventoryStaff}
                      type="text" 
                      inputMode="numeric"
                      className={`w-full bg-white/10 border border-white/10 rounded-2xl px-6 pr-16 py-4 text-2xl font-black outline-none focus:bg-white/20 transition-all ${
                        isInventoryStaff ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      placeholder="0"
                      value={formData.cost === 0 ? '' : formatNumber(formData.cost)}
                      onChange={handleCostChange}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-white/60">đ</span>
                  </div>
                  {isInventoryStaff && (
                    <p className="text-[10px] text-white/40 font-medium mt-1">
                      Nhân viên kho không được nhập giá vốn
                    </p>
                  )}
               </div>

               <div className="space-y-4 relative z-10">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    Giá niêm yết dự kiến (MSRP) {!isInventoryStaff && '*'}
                  </label>
                  <div className="relative">
                    <input 
                      required={!isInventoryStaff}
                      disabled={isInventoryStaff}
                      type="text" 
                      inputMode="numeric"
                      className={`w-full bg-emerald-500/20 border border-emerald-500/30 rounded-2xl px-6 pr-16 py-4 text-2xl font-black text-emerald-400 outline-none focus:bg-emerald-500/30 transition-all ${
                        isInventoryStaff ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      placeholder="0"
                      value={formData.price === 0 ? '' : formatNumber(formData.price)}
                      onChange={handlePriceChange}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-emerald-400/80">đ</span>
                  </div>
                  {isInventoryStaff && (
                    <p className="text-[10px] text-white/40 font-medium mt-1">
                      Nhân viên kho không được nhập giá niêm yết
                    </p>
                  )}
               </div>
               <DollarSign className="absolute -bottom-10 -right-10 text-white/5" size={200} />
            </div>

          </section>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 space-y-4">
          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Lỗi khi lưu dữ liệu</p>
                <p className="text-xs text-red-700 mt-1">{submitError}</p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Progress Message */}
          {isSubmitting && uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm font-medium text-blue-900">{uploadProgress}</p>
            </div>
          )}

          {/* Warning Message */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-black text-amber-900 mb-1">⚠️ Cảnh báo quan trọng</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Nhân viên kho vui lòng <span className="font-black">kiểm tra kỹ thông tin chính xác</span> trước khi lưu vào hệ thống. 
                Mọi sai sót sẽ được xử lý bằng hình thức chế tài theo quy định công ty.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2 px-12 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={18} /> Hoàn tất nhập kho
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

