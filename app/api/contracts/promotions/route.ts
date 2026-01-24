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
      .from('promotions')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải khuyến mãi' },
        { status: 500 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const activePromotions = (data || []).filter((promo: any) => {
      if (!promo.start_date && !promo.end_date) return true;
      if (promo.start_date && promo.start_date > todayStr) return false;
      if (promo.end_date && promo.end_date < todayStr) return false;
      return true;
    });

    return NextResponse.json({ promotions: activePromotions });
  } catch (error: any) {
    console.error('Error in contracts promotions API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải khuyến mãi' },
      { status: 500 }
    );
  }
}
