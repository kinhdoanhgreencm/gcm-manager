import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const buildStaffMap = async (claim: any) => {
  const staffIds = [
    claim.created_by_id,
    claim.assigned_to_id,
    claim.resolved_by_id
  ].filter(Boolean);

  if (staffIds.length === 0) {
    return new Map<string, { id: string; name: string }>();
  }

  if (!supabase) {
    return new Map<string, { id: string; name: string }>();
  }

  const { data } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', staffIds);

  const map = new Map<string, { id: string; name: string }>();
  (data || []).forEach((staff: any) => {
    map.set(staff.id, {
      id: staff.id,
      name: staff.full_name || ''
    });
  });

  return map;
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id: claimId } = await params;
    if (!claimId) {
      return errorResponse('Claim ID is required', 400);
    }

    const { data: claimData, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !claimData) {
      console.error('Error fetching claim:', error);
      return errorResponse('Không tìm thấy hồ sơ claim', 404);
    }

    const staffMap = await buildStaffMap(claimData);
    const transformedClaim = {
      id: claimData.id,
      claimCode: claimData.claim_code || '',
      type: claimData.type,
      status: claimData.status,
      priority: claimData.priority,
      customerId: claimData.customer_id || undefined,
      customerName: claimData.customer_name || '',
      customerPhone: claimData.customer_phone || '',
      customerEmail: claimData.customer_email || undefined,
      vehicleId: claimData.vehicle_id || undefined,
      vehicleCode: claimData.vehicle_code || undefined,
      contractId: claimData.contract_id || undefined,
      contractCode: claimData.contract_code || undefined,
      title: claimData.title || '',
      description: claimData.description || '',
      requestedAmount: claimData.requested_amount ? Number(claimData.requested_amount) : undefined,
      approvedAmount: claimData.approved_amount ? Number(claimData.approved_amount) : undefined,
      resolution: claimData.resolution || undefined,
      notes: claimData.notes || undefined,
      assignedToId: claimData.assigned_to_id || undefined,
      assignedToName: claimData.assigned_to_id ? staffMap.get(claimData.assigned_to_id)?.name : undefined,
      createdById: claimData.created_by_id || '',
      createdByName: claimData.created_by_id ? staffMap.get(claimData.created_by_id)?.name : undefined,
      resolvedById: claimData.resolved_by_id || undefined,
      resolvedByName: claimData.resolved_by_id ? staffMap.get(claimData.resolved_by_id)?.name : undefined,
      reportedDate: claimData.reported_date || '',
      dueDate: claimData.due_date || undefined,
      resolvedDate: claimData.resolved_date || undefined,
      closedDate: claimData.closed_date || undefined,
      attachments: claimData.attachments || [],
      createdAt: claimData.created_at || new Date().toISOString(),
      updatedAt: claimData.updated_at || new Date().toISOString()
    };

    return NextResponse.json({ claim: transformedClaim });
  } catch (error: any) {
    console.error('Error in claim detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải hồ sơ claim');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const { id: claimId } = await params;
    if (!claimId) {
      return errorResponse('Claim ID is required', 400);
    }

    const body = await request.json();
    const claim = body?.claim ?? body;

    const { data, error } = await supabase
      .from('claims')
      .update(claim)
      .eq('id', claimId)
      .select()
      .single();

    if (error) {
      console.error('Error updating claim:', error);
      return errorResponse(error.message || 'Lỗi cập nhật hồ sơ claim');
    }

    return NextResponse.json({ claim: data });
  } catch (error: any) {
    console.error('Error in claim update API:', error);
    return errorResponse(error.message || 'Lỗi server khi cập nhật hồ sơ claim');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow DELETE.');
    }

    const { id: claimId } = await params;
    if (!claimId) {
      return errorResponse('Claim ID is required', 400);
    }

    const { error } = await supabase
      .from('claims')
      .delete()
      .eq('id', claimId);

    if (error) {
      console.error('Error deleting claim:', error);
      return errorResponse(error.message || 'Lỗi xóa hồ sơ claim');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in claim delete API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa hồ sơ claim');
  }
}
