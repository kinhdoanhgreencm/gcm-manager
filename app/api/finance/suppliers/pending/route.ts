import { NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const db = supabase;

    const { data: suppliers, error } = await db
      .from('suppliers')
      .select('id, code, name, debt, payment_terms, status')
      .eq('payment_terms', 'DEFERRED')
      .gt('debt', 0)
      .eq('status', 'ACTIVE')
      .order('debt', { ascending: false });

    if (error) {
      console.error('Error loading pending suppliers:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải nhà cung cấp' },
        { status: 500 }
      );
    }

    const suppliersWithPaymentNumber = await Promise.all(
      (suppliers || []).map(async (supplier: any) => {
        const { data: transactions } = await db
          .from('transactions')
          .select('id')
          .eq('reference_type', 'SUPPLIER')
          .or(`reference_id.eq.${supplier.id},reference_id.eq.${supplier.code || ''}`)
          .eq('type', 'EXPENSE')
          .in('status', ['APPROVED', 'LOCKED']);

        const paymentNumber = (transactions?.length || 0) + 1;

        return {
          ...supplier,
          paymentNumber,
          remainingDebt: Number(supplier.debt || 0)
        };
      })
    );

    return NextResponse.json({ suppliers: suppliersWithPaymentNumber });
  } catch (error: any) {
    console.error('Error in pending suppliers API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải nhà cung cấp' },
      { status: 500 }
    );
  }
}
