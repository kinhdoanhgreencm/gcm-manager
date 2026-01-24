import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const contractId = searchParams.get('contractId');
    const contractIdsParam = searchParams.get('contractIds');
    const statusesParam = searchParams.get('statuses');

    let contractIds: string[] = [];
    if (contractId) {
      contractIds = [contractId];
    } else if (contractIdsParam) {
      contractIds = contractIdsParam.split(',').map(id => id.trim()).filter(Boolean);
    }

    if (contractIds.length === 0) {
      return NextResponse.json(
        { error: 'Thiếu contractId' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('reference_type', 'CONTRACT')
      .in('reference_id', contractIds)
      .order('date', { ascending: false });

    if (statusesParam) {
      const statuses = statusesParam.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        query = query.in('status', statuses);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contract transactions:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải giao dịch' },
        { status: 500 }
      );
    }

    return NextResponse.json({ transactions: data || [] });
  } catch (error: any) {
    console.error('Error in contracts transactions API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải giao dịch' },
      { status: 500 }
    );
  }
}
