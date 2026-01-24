import { NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const contractId = id;
    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('contracts')
      .select('id, status, contract_code, total_amount, customer_phone, customer_name')
      .eq('id', contractId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Không tìm thấy hợp đồng' },
        { status: 404 }
      );
    }

    return NextResponse.json({ contract: data });
  } catch (error: any) {
    console.error('Error in finance contract API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải hợp đồng' },
      { status: 500 }
    );
  }
}
