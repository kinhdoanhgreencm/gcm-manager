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

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Thiếu userId' },
        { status: 400 }
      );
    }

    const { data: permissionsData } = await supabase
      .from('permissions')
      .select('permissions')
      .eq('user_id', userId)
      .single();

    const permissions: Record<string, boolean> = permissionsData?.permissions || {};
    const canViewAll = permissions.customerAll === true;
    const canViewOwn = permissions.customerSelf === true || canViewAll;
    const canViewSubordinates = permissions.customerSubordinates === true || canViewAll;

    let query = supabase
      .from('customers')
      .select('id, code, type, name, phone, email, address, id_card, tax_code, company_name, representative, position, source, assigned_staff_id, status, notes, created_at, total_contracts, total_purchased, total_revenue, debt, date_of_birth, gender, id_card_issue_date, id_card_issue_place, bank_name, bank_account, bank_branch')
      .order('created_at', { ascending: false });

    if (!canViewAll) {
      let allowedStaffIds: string[] = [];
      if (canViewOwn || !canViewSubordinates) {
        allowedStaffIds.push(userId);
      }

      if (canViewSubordinates) {
        const { data: subordinates } = await supabase
          .from('users')
          .select('id')
          .eq('manager_id', userId);

        if (subordinates && subordinates.length > 0) {
          allowedStaffIds = [
            ...allowedStaffIds,
            ...subordinates.map((s: any) => s.id)
          ];
        }
      }

      if (allowedStaffIds.length === 0) {
        allowedStaffIds = [userId];
      }

      query = query.in('assigned_staff_id', allowedStaffIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: error.message || 'Lỗi tải khách hàng' },
        { status: 500 }
      );
    }

    return NextResponse.json({ customers: data || [] });
  } catch (error: any) {
    console.error('Error in contracts customers API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi tải khách hàng' },
      { status: 500 }
    );
  }
}
