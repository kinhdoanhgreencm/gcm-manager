import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id } = await params;
    const contractId = id;
    if (!contractId) {
      return errorResponse('Contract ID is required', 400);
    }

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error || !data) {
      console.error('Error fetching contract:', error);
      return errorResponse('Không tìm thấy hợp đồng', 404);
    }

    return NextResponse.json({ contract: data });
  } catch (error: any) {
    console.error('Error in contract detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải hợp đồng');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const { id } = await params;
    const contractId = id;
    if (!contractId) {
      return errorResponse('Contract ID is required', 400);
    }

    const body = await request.json();
    const contract = body?.contract ?? body;

    const { data, error } = await supabase
      .from('contracts')
      .update(contract)
      .eq('id', contractId)
      .select()
      .single();

    if (error) {
      console.error('Error updating contract:', error);
      return errorResponse(error.message || 'Lỗi cập nhật hợp đồng');
    }

    return NextResponse.json({ contract: data });
  } catch (error: any) {
    console.error('Error in contract update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật hợp đồng');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow DELETE.');
    }

    const { id } = await params;
    const contractId = id;
    if (!contractId) {
      return errorResponse('Contract ID is required', 400);
    }

    const { data: approvedTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference_type', 'CONTRACT')
      .eq('reference_id', contractId)
      .in('status', ['APPROVED', 'LOCKED'])
      .limit(1);

    if (approvedTx && approvedTx.length > 0) {
      return errorResponse('Không thể xóa hợp đồng đã có giao dịch thu/chi được duyệt.', 400);
    }

    const { data: contractData } = await supabase
      .from('contracts')
      .select('id, vehicle_id')
      .eq('id', contractId)
      .single();

    await supabase
      .from('payment_schedules')
      .delete()
      .eq('contract_id', contractId);

    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId);

    if (error) {
      console.error('Error deleting contract:', error);
      return errorResponse(error.message || 'Lỗi xóa hợp đồng');
    }

    if (contractData?.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({
          transaction_status: 'Sẵn sàng giao dịch',
          status: 'AVAILABLE'
        })
        .eq('id', contractData.vehicle_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in contract delete API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa hợp đồng');
  }
}
