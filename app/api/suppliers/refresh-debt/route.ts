import { NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

export async function POST() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow RPC/SELECT/UPDATE.');
    }

    const { error: rpcError } = await supabase.rpc('refresh_all_supplier_debt');

    if (rpcError) {
      console.warn('RPC function not found, updating directly:', rpcError);

      const { data: allSuppliers, error: fetchError } = await supabase
        .from('suppliers')
        .select('id, code, payment_terms');

      if (fetchError) {
        console.error('Error fetching suppliers for debt refresh:', fetchError);
        return NextResponse.json(
          { error: fetchError.message || 'Lỗi tải danh sách nhà cung cấp' },
          { status: 500 }
        );
      }

      for (const supplier of allSuppliers || []) {
        const supplierIds = [supplier.id, supplier.code].filter(Boolean);

        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('cost')
          .in('supplier_id', supplierIds);

        const totalImportValue = vehicles?.reduce((sum, v) => sum + Number(v.cost || 0), 0) || 0;

        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('reference_type', 'SUPPLIER')
          .in('reference_id', supplierIds)
          .eq('type', 'EXPENSE')
          .in('status', ['APPROVED', 'LOCKED']);

        const totalPaid = transactions?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

        const debt = supplier.payment_terms === 'DEFERRED'
          ? Math.max(0, totalImportValue - totalPaid)
          : 0;

        await supabase
          .from('suppliers')
          .update({
            total_vehicles: vehicles?.length || 0,
            total_import_value: totalImportValue,
            debt: debt,
            updated_at: new Date().toISOString()
          })
          .eq('id', supplier.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in refresh supplier debt API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi cập nhật công nợ nhà cung cấp' },
      { status: 500 }
    );
  }
}
