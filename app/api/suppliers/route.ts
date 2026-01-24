import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from './_supabase';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suppliers:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách nhà cung cấp' },
        { status: 500 }
      );
    }

    return NextResponse.json({ suppliers: data || [] });
  } catch (error: any) {
    console.error('Error in suppliers list API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải danh sách nhà cung cấp' },
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
    const supplier = body?.supplier ?? body;

    if (!supplier?.name || !supplier?.type) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: name, type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplier])
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tạo nhà cung cấp' },
        { status: 500 }
      );
    }

    return NextResponse.json({ supplier: data });
  } catch (error: any) {
    console.error('Error in supplier create API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tạo nhà cung cấp' },
      { status: 500 }
    );
  }
}
