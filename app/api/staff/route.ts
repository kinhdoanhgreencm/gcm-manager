import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from './_supabase';

const resolveFields = (fields: string | null) => {
  switch (fields) {
    case 'manager':
      return 'id, full_name';
    case 'basic':
      return 'id, full_name, role';
    case 'list':
    default:
      // Only return fields used in staff management UI (exclude password and other sensitive data)
      return [
        'id',
        'username',
        'email',
        'full_name',
        'phone',
        'role',
        'branch',
        'status',
        'manager_id',
        'join_date',
        'created_at',
        'date_of_birth',
        'id_card',
        'id_card_issue_date',
        'id_card_issue_place',
        'bank_name',
        'bank_account',
        'professional_level',
        'permanent_address',
        'current_address',
        'tax_code',
        'dependents',
        'avatar_url',
        'notes'
      ].join(', ');
  }
};

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase URL hoặc key chưa được cấu hình.' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const excludeId = searchParams.get('excludeId');
    const fields = searchParams.get('fields');

    let query = supabase
      .from('users')
      .select(resolveFields(fields))
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching staff list:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải danh sách nhân sự' },
        { status: 500 }
      );
    }

    return NextResponse.json({ staff: data || [] });
  } catch (error: any) {
    console.error('Error in staff list API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải danh sách nhân sự' },
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
    const user = body?.user ?? body;
    const permissions = body?.permissions ?? null;

    if (!user?.full_name || !user?.email) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: full_name, email' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) {
      console.error('Error creating staff:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tạo nhân sự' },
        { status: 500 }
      );
    }

    if (permissions && data?.id) {
      const { error: permissionsError } = await supabase
        .from('permissions')
        .upsert({
          user_id: data.id,
          permissions: permissions
        }, {
          onConflict: 'user_id'
        });

      if (permissionsError) {
        console.error('Error saving permissions:', permissionsError);
      }
    }

    return NextResponse.json({ user: data });
  } catch (error: any) {
    console.error('Error in staff create API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tạo nhân sự' },
      { status: 500 }
    );
  }
}
