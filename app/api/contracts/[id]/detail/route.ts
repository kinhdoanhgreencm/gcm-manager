import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id: contractId } = await params;
    if (!contractId) {
      return errorResponse('Contract ID is required', 400);
    }

    const { data: contractData, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error || !contractData) {
      console.error('Error fetching contract detail:', error);
      return errorResponse('Không tìm thấy hợp đồng', 404);
    }

    let responsibleStaff = null;
    if (contractData.responsible_staff_id) {
      const { data: staffData } = await supabase
        .from('users')
        .select('id, full_name, username')
        .eq('id', contractData.responsible_staff_id)
        .single();
      if (staffData) {
        responsibleStaff = {
          id: staffData.id,
          name: staffData.full_name || staffData.username || '',
          username: staffData.username
        };
      }
    }

    let vehicleData = null;
    if (contractData.vehicle_id) {
      const { data: vehicleInfo } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', contractData.vehicle_id)
        .single();
      if (vehicleInfo) {
        vehicleData = vehicleInfo;
      }
    }

    const { data: schedulesData } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('contract_id', contractId)
      .order('due_date', { ascending: true });

    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_type', 'CONTRACT')
      .eq('reference_id', contractId)
      .order('date', { ascending: false });

    let promotions: Array<{ code: string; name: string; discount_type: string; discount_value: number }> = [];
    if (contractData.promotions_json) {
      try {
        const promotionsData = typeof contractData.promotions_json === 'string'
          ? JSON.parse(contractData.promotions_json)
          : contractData.promotions_json;

        if (Array.isArray(promotionsData) && promotionsData.length > 0) {
          const promotionCodes = promotionsData.map((p: any) => p.code || p);
          const { data: fullPromotionsData } = await supabase
            .from('promotions')
            .select('*')
            .in('code', promotionCodes);

          if (fullPromotionsData) {
            promotions = fullPromotionsData.map((p: any) => ({
              code: p.code,
              name: p.name,
              discount_type: p.discount_type,
              discount_value: Number(p.discount_value) || 0
            }));
          }
        }
      } catch (err) {
        console.error('Error parsing promotions_json:', err);
      }
    }

    let customerData = null;
    if (contractData.customer_phone) {
      const { data: customerByPhone } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', contractData.customer_phone)
        .maybeSingle();
      if (customerByPhone) {
        customerData = customerByPhone;
      }
    }

    if (!customerData && contractData.customer_name) {
      const { data: customerByName } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', contractData.customer_name)
        .limit(1)
        .maybeSingle();
      if (customerByName) {
        customerData = customerByName;
      }
    }

    return NextResponse.json({
      contract: contractData,
      responsibleStaff,
      vehicle: vehicleData,
      schedules: schedulesData || [],
      transactions: transactionsData || [],
      promotions,
      customer: customerData,
      tempVehicleInfo: contractData.temp_vehicle_info || null
    });
  } catch (error: any) {
    console.error('Error in contract detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải hợp đồng');
  }
}
