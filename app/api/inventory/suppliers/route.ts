import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ suppliers: [] });
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, code')
      .in('id', ids);

    if (error) {
      console.error('Error fetching suppliers:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách nhà cung cấp' },
        { status: 500 }
      );
    }

    return NextResponse.json({ suppliers: data || [] });
  } catch (error: any) {
    console.error('Error in inventory suppliers API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải nhà cung cấp' },
      { status: 500 }
    );
  }
}
