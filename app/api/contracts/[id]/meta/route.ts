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

    const { id } = await params;
    const contractId = id;
    if (!contractId) {
      return errorResponse('Contract ID is required', 400);
    }

    const { data: contractData, error } = await supabase
      .from('contracts')
      .select('promotions_json, temp_vehicle_info')
      .eq('id', contractId)
      .single();

    if (error || !contractData) {
      console.error('Error fetching contract meta:', error);
      return errorResponse('Không tìm thấy hợp đồng', 404);
    }

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

    return NextResponse.json({
      tempVehicleInfo: contractData.temp_vehicle_info || null,
      promotions
    });
  } catch (error: any) {
    console.error('Error in contract meta API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải thông tin hợp đồng');
  }
}
