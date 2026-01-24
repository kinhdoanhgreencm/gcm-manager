import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const normalizeExpiredPromotions = async (promotions: any[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredIds: string[] = [];
  promotions.forEach((promo) => {
    if (promo.end_date && promo.status === 'ACTIVE') {
      const endDate = new Date(promo.end_date);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < today) {
        expiredIds.push(promo.id);
      }
    }
  });

  if (expiredIds.length === 0) {
    return promotions;
  }

  if (!supabase) {
    return promotions;
  }

  const { error } = await supabase
    .from('promotions')
    .update({ status: 'EXPIRED' })
    .in('id', expiredIds);

  if (!error) {
    promotions.forEach((promo) => {
      if (expiredIds.includes(promo.id)) {
        promo.status = 'EXPIRED';
      }
    });
  }

  return promotions;
};

export async function GET() {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
      return errorResponse(error.message || 'Lỗi tải khuyến mãi');
    }

    const normalized = await normalizeExpiredPromotions(data || []);
    return NextResponse.json({ promotions: normalized });
  } catch (error: any) {
    console.error('Error in promotions API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải khuyến mãi');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow INSERT.');
    }

    const body = await request.json();
    const promotion = body?.promotion ?? body;

    if (!promotion?.code || !promotion?.name || !promotion?.discount_type) {
      return errorResponse('Thiếu thông tin khuyến mãi bắt buộc', 400);
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert([promotion])
      .select()
      .single();

    if (error) {
      console.error('Error creating promotion:', error);
      return errorResponse(error.message || 'Lỗi tạo khuyến mãi');
    }

    return NextResponse.json({ promotion: data });
  } catch (error: any) {
    console.error('Error in promotions create API:', error);
    return errorResponse(error.message || 'Lỗi server khi tạo khuyến mãi');
  }
}
