import { NextResponse } from 'next/server';
import { supabase } from '../../../_supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const { data: allContracts } = await supabase
      .from('contracts')
      .select('id, vehicle_id')
      .eq('contract_type', 'SALES');

    const vehicleIdsInUse = new Set(
      (allContracts || [])
        .filter((c: any) => c.vehicle_id)
        .map((c: any) => c.vehicle_id)
    );

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'AVAILABLE')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách xe' },
        { status: 500 }
      );
    }

    const vehicles = (data || []).filter((v: any) => {
      const txStatus = (v.transaction_status || '').trim();
      const allowedStatuses = ['', 'Sẵn sàng giao dịch', 'Đã ghép'];
      const isReadyForTransaction = !txStatus || allowedStatuses.includes(txStatus);
      const notInUse = !vehicleIdsInUse.has(v.id);
      return isReadyForTransaction && notInUse;
    });

    return NextResponse.json({ vehicles });
  } catch (error: any) {
    console.error('Error in available vehicles API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải danh sách xe' },
      { status: 500 }
    );
  }
}
