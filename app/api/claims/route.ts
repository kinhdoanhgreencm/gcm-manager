import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const buildStaffMap = async (claims: any[]) => {
  const staffIds = new Set<string>();
  claims.forEach((claim) => {
    if (claim.created_by_id) staffIds.add(claim.created_by_id);
    if (claim.assigned_to_id) staffIds.add(claim.assigned_to_id);
    if (claim.resolved_by_id) staffIds.add(claim.resolved_by_id);
  });

  if (staffIds.size === 0) {
    return new Map<string, { id: string; name: string; username?: string }>();
  }

  if (!supabase) {
    return new Map<string, { id: string; name: string; username?: string }>();
  }

  const { data } = await supabase
    .from('users')
    .select('id, full_name, username')
    .in('id', Array.from(staffIds));

  const map = new Map<string, { id: string; name: string; username?: string }>();
  (data || []).forEach((staff: any) => {
    map.set(staff.id, {
      id: staff.id,
      name: staff.full_name || staff.username || '',
      username: staff.username
    });
  });

  return map;
};

export async function GET() {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('reported_date', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
      return errorResponse(error.message || 'Lỗi tải hồ sơ claim');
    }

    const staffMap = await buildStaffMap(data || []);
    const claims = (data || []).map((c: any) => {
      const createdByInfo = c.created_by_id ? staffMap.get(c.created_by_id) : undefined;
      const assignedToInfo = c.assigned_to_id ? staffMap.get(c.assigned_to_id) : undefined;
      const resolvedByInfo = c.resolved_by_id ? staffMap.get(c.resolved_by_id) : undefined;

      return {
        id: c.id,
        claimCode: c.claim_code || '',
        type: c.type,
        status: c.status,
        priority: c.priority,
        customerId: c.customer_id || undefined,
        customerName: c.customer_name || '',
        customerPhone: c.customer_phone || '',
        customerEmail: c.customer_email || undefined,
        vehicleId: c.vehicle_id || undefined,
        vehicleCode: c.vehicle_code || undefined,
        contractId: c.contract_id || undefined,
        contractCode: c.contract_code || undefined,
        title: c.title || '',
        description: c.description || '',
        requestedAmount: c.requested_amount ? Number(c.requested_amount) : undefined,
        approvedAmount: c.approved_amount ? Number(c.approved_amount) : undefined,
        resolution: c.resolution || undefined,
        notes: c.notes || undefined,
        assignedToId: c.assigned_to_id || undefined,
        assignedToName: assignedToInfo?.name || undefined,
        createdById: c.created_by_id || '',
        createdByName: createdByInfo?.name || undefined,
        resolvedById: c.resolved_by_id || undefined,
        resolvedByName: resolvedByInfo?.name || undefined,
        reportedDate: c.reported_date || '',
        dueDate: c.due_date || undefined,
        resolvedDate: c.resolved_date || undefined,
        closedDate: c.closed_date || undefined,
        attachments: c.attachments || [],
        createdAt: c.created_at || new Date().toISOString(),
        updatedAt: c.updated_at || new Date().toISOString()
      };
    });

    return NextResponse.json({ claims });
  } catch (error: any) {
    console.error('Error in claims API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải hồ sơ claim');
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
    const claim = body?.claim ?? body;

    if (!claim?.customer_name || !claim?.customer_phone || !claim?.title) {
      return errorResponse('Thiếu thông tin hồ sơ claim bắt buộc', 400);
    }

    const { data, error } = await supabase
      .from('claims')
      .insert([claim])
      .select()
      .single();

    if (error) {
      console.error('Error creating claim:', error);
      return errorResponse(error.message || 'Lỗi tạo hồ sơ claim');
    }

    return NextResponse.json({ claim: data });
  } catch (error: any) {
    console.error('Error in claims create API:', error);
    return errorResponse(error.message || 'Lỗi server khi tạo hồ sơ claim');
  }
}
