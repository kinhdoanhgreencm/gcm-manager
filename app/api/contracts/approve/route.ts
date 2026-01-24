import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabaseClient';
import { VehicleStatus } from '@/types';
import { updateVehicleStatusOnContractSigned } from '@/services/vehicleStatusService';

export async function POST(request: NextRequest) {
  try {
    const { contractId, userId } = await request.json();

    if (!contractId || !userId) {
      return NextResponse.json(
        { error: 'Thiếu thông tin hợp đồng hoặc người dùng' },
        { status: 400 }
      );
    }

    // Kiểm tra quyền của người dùng: load permissions từ bảng permissions
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('permissions')
      .select('permissions')
      .eq('user_id', userId)
      .single();

    const userPermissions: Record<string, boolean> = permissionsData?.permissions ?? {};

    if (permissionsError && permissionsError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Không thể kiểm tra quyền người dùng' },
        { status: 500 }
      );
    }

    if (userPermissions.contractsApprove !== true) {
      return NextResponse.json(
        { error: 'Bạn không có quyền duyệt hợp đồng' },
        { status: 403 }
      );
    }

    // Lấy thông tin hợp đồng
    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contractData) {
      return NextResponse.json(
        { error: 'Không tìm thấy hợp đồng' },
        { status: 404 }
      );
    }

    // Kiểm tra trạng thái hợp đồng phải là PENDING_APPROVAL
    if (contractData.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'Hợp đồng không ở trạng thái chờ duyệt' },
        { status: 400 }
      );
    }

    // Xác định trạng thái mới dựa trên payment_type
    const newStatus = contractData.payment_type === 'INSTALLMENT' ? 'PAYING' : 'SIGNED';

    // Cập nhật trạng thái hợp đồng
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: newStatus,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (updateError) {
      return NextResponse.json(
        { error: `Lỗi khi cập nhật hợp đồng: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Cập nhật trạng thái xe trong kho:
    // - status: SOLD
    // - transaction_status: tối thiểu "Đã ghép" (lưu vào DB để các màn khác dùng chung)
    if (contractData.vehicle_id) {
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          status: VehicleStatus.SOLD,
          updated_by: userId
        })
        .eq('id', contractData.vehicle_id);

      if (vehicleError) {
        console.error('Error updating vehicle status:', vehicleError);
        // Không throw error vì hợp đồng đã được cập nhật
      } else {
        // Đảm bảo transaction_status trong DB phản ánh đúng việc xe đã được ghép vào hợp đồng
        try {
          await updateVehicleStatusOnContractSigned(contractId);
        } catch (txStatusError) {
          console.error('Error updating vehicle transaction_status on contract approve:', txStatusError);
          // Không throw error để tránh làm fail duyệt hợp đồng
        }
      }
    }

    // Cập nhật trạng thái khách hàng thành TRADING
    try {
      const { updateCustomerStatusOnContractSigned } = await import('@/services/customerStatusService');
      await updateCustomerStatusOnContractSigned(
        contractData.customer_phone,
        contractData.customer_name
      );
    } catch (customerStatusError) {
      console.error('Error updating customer status:', customerStatusError);
      // Không throw error vì hợp đồng đã được cập nhật
    }

    // Lấy thông tin xe đã ghép vào hợp đồng
    let vehicleData = null;
    if (contractData.vehicle_id) {
      const { data: vehicleInfo, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', contractData.vehicle_id)
        .single();

      if (!vehicleError && vehicleInfo) {
        vehicleData = vehicleInfo;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Duyệt hợp đồng thành công',
      contract: {
        ...contractData,
        status: newStatus
      },
      vehicle: vehicleData
    });
  } catch (error: any) {
    console.error('Approve contract error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi duyệt hợp đồng' },
      { status: 500 }
    );
  }
}
