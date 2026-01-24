import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from './_supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const assignedStaffIdsParam = searchParams.get('assignedStaffIds');
    const assignedStaffIds = assignedStaffIdsParam
      ? assignedStaffIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (assignedStaffIds.length > 0) {
      query = query.in('assigned_staff_id', assignedStaffIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách khách hàng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customers: data || [] });
  } catch (error: any) {
    console.error('Error in customers list API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải danh sách khách hàng' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow INSERT.');
    }

    const body = await request.json();
    const customer = body?.customer ?? body;

    if (!customer?.name || !customer?.type) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: name, type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tạo khách hàng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customer: data });
  } catch (error: any) {
    console.error('Error in customer create API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tạo khách hàng' },
      { status: 500 }
    );
  }
}
