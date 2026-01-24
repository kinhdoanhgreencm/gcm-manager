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
    const supplierId = id;
    if (!supplierId) {
      return errorResponse('Supplier ID is required', 400);
    }

    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      console.error('Error fetching supplier:', supplierError);
      return errorResponse('Không tìm thấy thông tin nhà cung cấp', 404);
    }

    const include = request.nextUrl.searchParams.get('include');
    if (include !== 'details') {
      return NextResponse.json({ supplier });
    }

    const supplierIds = [supplier.id, supplier.code].filter(Boolean);

    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .in('supplier_id', supplierIds)
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      console.warn('Error fetching supplier vehicles:', vehiclesError);
    }

    let transactions: any[] = [];
    try {
      const orFilters = [
        `reference_id.eq.${supplier.id}`,
        supplier.code ? `reference_id.eq.${supplier.code}` : null,
        supplier.name ? `description.ilike.%${supplier.name}%` : null
      ].filter(Boolean).join(',');

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference_type', 'SUPPLIER')
        .or(orFilters)
        .order('date', { ascending: false })
        .limit(50);

      if (transactionsError) {
        console.warn('Error fetching supplier transactions:', transactionsError);
      } else {
        transactions = transactionsData || [];
      }
    } catch (transErr) {
      console.warn('Could not fetch transactions:', transErr);
    }

    return NextResponse.json({
      supplier,
      vehicles: vehicles || [],
      transactions
    });
  } catch (error: any) {
    console.error('Error in supplier detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải nhà cung cấp');
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
    const supplierId = id;
    if (!supplierId) {
      return errorResponse('Supplier ID is required', 400);
    }

    const body = await request.json();
    const supplier = body?.supplier ?? body;

    if (!supplier) {
      return errorResponse('Thiếu dữ liệu cập nhật', 400);
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', supplierId)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      return errorResponse(error.message || 'Lỗi cập nhật nhà cung cấp');
    }

    return NextResponse.json({ supplier: data });
  } catch (error: any) {
    console.error('Error in supplier update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật nhà cung cấp');
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
    const supplierId = id;
    if (!supplierId) {
      return errorResponse('Supplier ID is required', 400);
    }

    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, code, name')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      console.error('Error fetching supplier for delete:', supplierError);
      return errorResponse('Không tìm thấy thông tin nhà cung cấp cần xóa.', 404);
    }

    const supplierIds = [supplier.id, supplier.code].filter(Boolean);

    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, vin, make, model')
      .in('supplier_id', supplierIds);

    if (vehiclesError) {
      console.error('Error checking vehicles:', vehiclesError);
    }

    if (vehicles && vehicles.length > 0) {
      const vehicleList = vehicles.slice(0, 5).map(v => `${v.make} ${v.model} (${v.vin})`).join(', ');
      const moreCount = vehicles.length > 5 ? ` và ${vehicles.length - 5} xe khác` : '';
      return errorResponse(
        `Không thể xóa nhà cung cấp này vì đang có ${vehicles.length} xe liên kết:\n\n` +
        `${vehicleList}${moreCount}\n\n` +
        `Vui lòng xóa hoặc chuyển các xe sang nhà cung cấp khác trước khi xóa.`,
        409
      );
    }

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, description, amount, date')
      .eq('reference_type', 'SUPPLIER')
      .in('reference_id', supplierIds)
      .in('status', ['APPROVED', 'LOCKED']);

    if (transactionsError) {
      console.error('Error checking transactions:', transactionsError);
    }

    if (transactions && transactions.length > 0) {
      return errorResponse(
        `Không thể xóa nhà cung cấp này vì đang có ${transactions.length} giao dịch thanh toán liên quan.\n\n` +
        `Vui lòng xóa hoặc cập nhật các giao dịch trước khi xóa nhà cung cấp.`,
        409
      );
    }

    const { error: deleteError } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId);

    if (deleteError) {
      return errorResponse(`Lỗi xóa nhà cung cấp: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in supplier delete API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa nhà cung cấp');
  }
}
