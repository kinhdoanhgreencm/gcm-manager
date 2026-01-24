import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id } = await params;
    const customerId = id;
    if (!customerId) {
      return errorResponse('Customer ID is required', 400);
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.error('Error fetching customer:', customerError);
      return errorResponse('Không tìm thấy thông tin khách hàng', 404);
    }

    const include = request.nextUrl.searchParams.get('include');
    if (include !== 'staff') {
      return NextResponse.json({ customer });
    }

    let assignedStaffName: string | null = null;
    if (customer.assigned_staff_id) {
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', customer.assigned_staff_id)
        .single();

      if (!staffError && staffData) {
        assignedStaffName = staffData.full_name;
      }
    }

    return NextResponse.json({ customer, assignedStaffName });
  } catch (error: any) {
    console.error('Error in customer detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải khách hàng');
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
    const customerId = id;
    if (!customerId) {
      return errorResponse('Customer ID is required', 400);
    }

    const body = await request.json();
    const customer = body?.customer ?? body;

    if (!customer) {
      return errorResponse('Thiếu dữ liệu cập nhật', 400);
    }

    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      return errorResponse(error.message || 'Lỗi cập nhật khách hàng');
    }

    return NextResponse.json({ customer: data });
  } catch (error: any) {
    console.error('Error in customer update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật khách hàng');
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
    const customerId = id;
    if (!customerId) {
      return errorResponse('Customer ID is required', 400);
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.error('Error fetching customer for delete:', customerError);
      return errorResponse('Không tìm thấy thông tin khách hàng cần xóa.', 404);
    }

    let contractsQuery = supabase
      .from('contracts')
      .select('id, contract_code, contract_type, status')
      .eq('contract_type', 'SALES');

    if (customer.phone) {
      contractsQuery = contractsQuery.or(
        `customer_name.ilike.${customer.name},customer_phone.eq.${customer.phone}`
      );
    } else {
      contractsQuery = contractsQuery.ilike('customer_name', customer.name);
    }

    const { data: contracts, error: contractsError } = await contractsQuery;

    if (contractsError) {
      console.error('Error checking contracts:', contractsError);
    }

    if (contracts && contracts.length > 0) {
      const contractCodes = contracts.slice(0, 5).map(c => c.contract_code || 'N/A').join(', ');
      const moreCount = contracts.length > 5 ? ` và ${contracts.length - 5} hợp đồng khác` : '';
      return errorResponse(
        `Không thể xóa khách hàng này vì đang có ${contracts.length} hợp đồng liên kết:\n\n` +
        `${contractCodes}${moreCount}\n\n` +
        `Vui lòng xóa hoặc cập nhật các hợp đồng liên quan trước khi xóa khách hàng.`,
        409
      );
    }

    if (contracts && contracts.length > 0) {
      const contractIds = contracts.map(c => c.id);
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, description, amount, date, reference_id')
        .eq('reference_type', 'CONTRACT')
        .in('reference_id', contractIds)
        .in('status', ['APPROVED', 'LOCKED']);

      if (transactionsError) {
        console.error('Error checking transactions:', transactionsError);
      }

      if (transactions && transactions.length > 0) {
        return errorResponse(
          `Không thể xóa khách hàng này vì đã có ${transactions.length} giao dịch thanh toán liên quan đến hợp đồng của khách hàng.\n\n` +
          `Vui lòng xóa hoặc cập nhật các giao dịch liên quan trước khi xóa khách hàng.`,
          409
        );
      }
    }

    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (deleteError) {
      return errorResponse(`Lỗi xóa khách hàng: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in customer delete API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa khách hàng');
  }
}
