import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../_supabase';
import { linkPaymentSchedules } from '../../_helpers';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id } = await params;
    const transactionId = id;
    if (!transactionId) {
      return errorResponse('Transaction ID is required', 400);
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      console.error('Error loading transaction:', error);
      return errorResponse('Không tìm thấy giao dịch', 404);
    }

    const includeSupplier = request.nextUrl.searchParams.get('includeSupplier') === '1';
    if (!includeSupplier) {
      return NextResponse.json({ transaction });
    }

    let supplier = null;
    if (transaction.reference_id && transaction.reference_type === 'VEHICLE' && transaction.category === 'Nhập xe') {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('supplier_id')
        .eq('id', transaction.reference_id)
        .single();

      if (vehicleData?.supplier_id) {
        const { data: supplierData } = await supabase
          .from('suppliers')
          .select('id, code, name, bank_name, bank_account')
          .eq('id', vehicleData.supplier_id)
          .single();

        if (supplierData) {
          supplier = supplierData;
        }
      }
    }

    return NextResponse.json({ transaction, supplier });
  } catch (error: any) {
    console.error('Error in transaction detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải giao dịch');
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
    const transactionId = id;
    if (!transactionId) {
      return errorResponse('Transaction ID is required', 400);
    }

    const body = await request.json();
    const transaction = body?.transaction ?? body;

    if (!transaction) {
      return errorResponse('Thiếu dữ liệu cập nhật', 400);
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(transaction)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return errorResponse(error.message || 'Lỗi cập nhật giao dịch');
    }

    if (data?.reference_id && data.reference_type === 'CONTRACT' && data.type === 'INCOME') {
      try {
        await linkPaymentSchedules(
          data.reference_id,
          data.id,
          Number(data.amount || 0),
          data.description || ''
        );
      } catch (linkError) {
        console.error('Error linking payment schedules:', linkError);
      }
    }

    return NextResponse.json({ transaction: data });
  } catch (error: any) {
    console.error('Error in transaction update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật giao dịch');
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
    const transactionId = id;
    if (!transactionId) {
      return errorResponse('Transaction ID is required', 400);
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error('Error deleting transaction:', error);
      return errorResponse(error.message || 'Lỗi xóa giao dịch');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in transaction delete API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa giao dịch');
  }
}
