import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const updateCustomerStatusOnContractSigned = async (customerPhone: string, customerName?: string) => {
  if (!supabase || !customerPhone) return;

  let { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id, status')
    .eq('phone', customerPhone)
    .limit(1)
    .single();

  if (customerError && customerName) {
    const { data: customerByName, error: errorByName } = await supabase
      .from('customers')
      .select('id, status')
      .eq('name', customerName)
      .limit(1)
      .single();

    if (!errorByName && customerByName) {
      customerData = customerByName;
      customerError = null;
    }
  }

  if (customerError || !customerData) {
    return;
  }

  if (customerData.status === 'PROSPECT') {
    await supabase
      .from('customers')
      .update({ status: 'TRADING' })
      .eq('id', customerData.id);
  }
};

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow INSERT.');
    }

    const body = await request.json();
    const contract = body?.contract;
    const schedules = body?.schedules || [];

    if (!contract?.customer_name || !contract?.customer_phone) {
      return errorResponse('Thiếu thông tin hợp đồng bắt buộc', 400);
    }

    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .insert(contract)
      .select()
      .single();

    if (contractError) {
      console.error('Error creating contract:', contractError);
      return errorResponse(contractError.message || 'Lỗi tạo hợp đồng');
    }

    if (Array.isArray(schedules) && schedules.length > 0) {
      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(schedules);

      if (schedulesError) {
        console.error('Error saving payment schedules:', schedulesError);
      }
    }

    if (contract.status === 'PENDING_APPROVAL') {
      await updateCustomerStatusOnContractSigned(contract.customer_phone, contract.customer_name);
    }

    return NextResponse.json({ contract: contractData });
  } catch (error: any) {
    console.error('Error in contracts create API:', error);
    return errorResponse(error.message || 'Lỗi server khi tạo hợp đồng');
  }
}
