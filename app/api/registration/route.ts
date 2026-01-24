import { NextResponse } from 'next/server';
import { supabase } from '../_supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const { data: contractsData, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .eq('contract_type', 'SALES')
      .in('status', ['SIGNED', 'PAYING', 'COMPLETED'])
      .order('signed_date', { ascending: false });

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError);
      return NextResponse.json(
        { error: contractsError.message || 'Lỗi tải hợp đồng' },
        { status: 500 }
      );
    }

    if (!contractsData || contractsData.length === 0) {
      return NextResponse.json({ registrations: [] });
    }

    const contractIds = contractsData.map((c: any) => c.id);
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .in('contract_id', contractIds)
      .order('due_date', { ascending: true });

    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
    }

    const registrations = contractsData.map((contract: any) => {
      const contractSchedules = (schedulesData || []).filter((s: any) => s.contract_id === contract.id);
      const sortedSchedules = [...contractSchedules].sort((a, b) => {
        const dateA = new Date(a.due_date || '').getTime();
        const dateB = new Date(b.due_date || '').getTime();
        return dateA - dateB;
      });

      let milestone1 = sortedSchedules.find((s: any) => {
        const milestoneName = (s.milestone_name || '').toLowerCase();
        return milestoneName.includes('đợt 1') || 
               milestoneName.includes('lần 1') || 
               milestoneName.includes('thanh toán lần 1') ||
               milestoneName.includes('thanh toán đợt 1') ||
               milestoneName.includes('đặt cọc');
      });

      if (!milestone1 && sortedSchedules.length >= 1) {
        milestone1 = sortedSchedules[0];
      }

      let registrationStatus = 'PENDING';
      if (milestone1 && milestone1.status === 'PAID') {
        registrationStatus = 'PROCESSING';
      } else if (contract.status === 'COMPLETED') {
        registrationStatus = 'COMPLETED';
      }

      return {
        id: `reg_${contract.id}`,
        vehicleId: contract.vehicle_id || '',
        ownerName: contract.customer_name || '',
        ownerID: contract.customer_id_card || '',
        licensePlate: undefined,
        registrationNumber: undefined,
        inspectionExpiry: undefined,
        status: registrationStatus,
        documents: [
          { type: 'Hóa đơn GTGT', url: '#', status: 'PENDING' },
          { type: 'Chứng từ thuế', url: '#', status: 'PENDING' },
          { type: 'Bản cà số khung/máy', url: '#', status: 'PENDING' }
        ],
        updatedAt: contract.updated_at || contract.signed_date || new Date().toISOString()
      };
    });

    return NextResponse.json({ registrations });
  } catch (error: any) {
    console.error('Error in registration API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải hồ sơ đăng ký' },
      { status: 500 }
    );
  }
}
