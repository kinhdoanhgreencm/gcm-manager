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

    const { data, error } = await supabase
      .from('accounting_vouchers')
      .select('*')
      .order('voucher_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vouchers:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải chứng từ' },
        { status: 500 }
      );
    }

    return NextResponse.json({ vouchers: data || [] });
  } catch (error: any) {
    console.error('Error in vouchers API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải chứng từ' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const voucherType = body?.voucherType;
    const voucherDate = body?.voucherDate;
    const description = body?.description;
    const notes = body?.notes || null;
    const entries = body?.entries || [];
    const userId = body?.userId || null;

    if (!voucherType || !voucherDate || !description) {
      return NextResponse.json(
        { error: 'Thiếu thông tin chứng từ' },
        { status: 400 }
      );
    }

    const prefix = voucherType === 'RECEIPT' ? 'PT' :
      voucherType === 'PAYMENT' ? 'PC' :
      voucherType === 'TRANSFER' ? 'CK' :
      voucherType === 'JOURNAL' ? 'BT' :
      voucherType === 'SALES_INVOICE' ? 'HD' :
      voucherType === 'PURCHASE_INVOICE' ? 'HDM' : 'CT';
    const year = new Date().getFullYear();

    let voucherNumber: string | null = null;
    const { data: voucherNumberData } = await supabase
      .rpc('generate_voucher_number', { v_type: voucherType });

    if (voucherNumberData) {
      voucherNumber = voucherNumberData;
    } else {
      const { data: existingVouchers } = await supabase
        .from('accounting_vouchers')
        .select('voucher_number')
        .eq('voucher_type', voucherType)
        .like('voucher_number', `${prefix}-${year}-%`)
        .order('voucher_number', { ascending: false })
        .limit(1);

      let lastNumber = 0;
      if (existingVouchers && existingVouchers.length > 0) {
        const lastVoucher = existingVouchers[0].voucher_number;
        const numberPart = lastVoucher.split('-')[2];
        lastNumber = parseInt(numberPart, 10) || 0;
      }
      voucherNumber = `${prefix}-${year}-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    const { data: voucher, error: voucherError } = await supabase
      .from('accounting_vouchers')
      .insert([{
        voucher_number: voucherNumber,
        voucher_date: voucherDate,
        voucher_type: voucherType,
        description,
        total_amount: body?.totalAmount || 0,
        notes,
        status: 'DRAFT',
        created_by: userId
      }])
      .select()
      .single();

    if (voucherError) {
      console.error('Error creating voucher:', voucherError);
      return NextResponse.json(
        { error: voucherError.message || 'Lỗi tạo chứng từ' },
        { status: 500 }
      );
    }

    if (entries.length > 0) {
      const entriesData = entries.map((entry: any) => ({
        voucher_id: voucher.id,
        account_id: entry.accountId,
        debit_amount: entry.debitAmount || 0,
        credit_amount: entry.creditAmount || 0,
        description: entry.description || null,
        created_by: userId
      }));

      const { error: entriesError } = await supabase
        .from('accounting_entries')
        .insert(entriesData);

      if (entriesError) {
        console.error('Error creating entries:', entriesError);
        return NextResponse.json(
          { error: entriesError.message || 'Lỗi tạo bút toán' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ voucher });
  } catch (error: any) {
    console.error('Error in vouchers create API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tạo chứng từ' },
      { status: 500 }
    );
  }
}
