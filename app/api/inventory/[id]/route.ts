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

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id } = await params;
    const vehicleId = id;
    if (!vehicleId) {
      return errorResponse('Vehicle ID is required', 400);
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error('Error fetching vehicle:', vehicleError);
      return errorResponse('Không tìm thấy thông tin xe', 404);
    }

    let createdBy: { full_name: string; email?: string } | null = null;
    let updatedBy: { full_name: string; email?: string } | null = null;
    let supplier: { name: string; code?: string } | null = null;

    if (vehicle.created_by) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', vehicle.created_by)
        .single();

      if (!userError && userData) {
        createdBy = { full_name: userData.full_name, email: userData.email };
      }
    }

    if (vehicle.updated_by) {
      const { data: updatedUserData, error: updatedUserError } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', vehicle.updated_by)
        .single();

      if (!updatedUserError && updatedUserData) {
        updatedBy = { full_name: updatedUserData.full_name, email: updatedUserData.email };
      }
    }

    if (vehicle.supplier_id) {
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select('name, code')
        .eq('id', vehicle.supplier_id)
        .single();

      if (!supplierError && supplierData) {
        supplier = { name: supplierData.name, code: supplierData.code };
      }
    }

    return NextResponse.json({ vehicle, createdBy, updatedBy, supplier });
  } catch (error: any) {
    console.error('Error in inventory detail API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải thông tin xe');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const { id } = await params;
    const vehicleId = id;
    if (!vehicleId) {
      return errorResponse('Vehicle ID is required', 400);
    }

    const { data: vehicleData, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, supplier_id, images')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicleData) {
      console.error('Error fetching vehicle for delete:', vehicleError);
      return errorResponse('Không tìm thấy thông tin xe cần xóa.', 404);
    }

    const { data: contracts, error: checkError } = await supabase
      .from('contracts')
      .select('id, contract_code, contract_type, status')
      .eq('vehicle_id', vehicleId);

    if (checkError) {
      console.error('Error checking contracts:', checkError);
    }

    if (contracts && contracts.length > 0) {
      const contractCodes = contracts.map(c => c.contract_code || 'N/A').join(', ');
      return errorResponse(
        `Không thể xóa xe này vì đang được sử dụng trong ${contracts.length} hợp đồng:\n\n` +
        `${contractCodes}\n\n` +
        `Vui lòng xóa hoặc cập nhật các hợp đồng liên quan trước khi xóa xe.`,
        409
      );
    }

    const { data: vehicleTransactions, error: vehicleTransactionError } = await supabase
      .from('transactions')
      .select('id, description, amount, date, category')
      .eq('reference_type', 'VEHICLE')
      .eq('reference_id', vehicleId)
      .in('status', ['APPROVED', 'LOCKED']);

    if (vehicleTransactionError) {
      console.error('Error checking vehicle transactions:', vehicleTransactionError);
    }

    if (vehicleData.supplier_id) {
      const { data: supplierTransactions, error: transactionError } = await supabase
        .from('transactions')
        .select('id, description, amount, date')
        .eq('reference_type', 'SUPPLIER')
        .eq('reference_id', vehicleData.supplier_id)
        .eq('type', 'EXPENSE')
        .in('status', ['APPROVED', 'LOCKED']);

      if (transactionError) {
        console.error('Error checking supplier transactions:', transactionError);
      }

      const { data: debtRecords, error: debtError } = await supabase
        .from('debt_records')
        .select('id, reference_code, paid_amount, remaining_amount')
        .eq('reference_type', 'SUPPLIER')
        .eq('reference_id', vehicleData.supplier_id)
        .gt('paid_amount', 0);

      if (debtError) {
        console.error('Error checking supplier debt records:', debtError);
      }

      if ((vehicleTransactions && vehicleTransactions.length > 0) ||
          (supplierTransactions && supplierTransactions.length > 0) || 
          (debtRecords && debtRecords.length > 0)) {
        const reasons: string[] = [];

        if (vehicleTransactions && vehicleTransactions.length > 0) {
          reasons.push(`Đã có ${vehicleTransactions.length} giao dịch liên quan đến xe này`);
        }

        if (supplierTransactions && supplierTransactions.length > 0) {
          reasons.push(`Đã có ${supplierTransactions.length} giao dịch thanh toán công nợ nhà cung cấp`);
        }

        if (debtRecords && debtRecords.length > 0) {
          reasons.push(`Đã có ${debtRecords.length} bản ghi công nợ đã được thanh toán`);
        }

        return errorResponse(
          `Không thể xóa xe này vì:\n\n` +
          `${reasons.join('\n')}\n\n` +
          `Vui lòng xóa hoặc cập nhật các giao dịch công nợ liên quan trước khi xóa xe.`,
          409
        );
      }
    } else if (vehicleTransactions && vehicleTransactions.length > 0) {
      return errorResponse(
        `Không thể xóa xe này vì đã có ${vehicleTransactions.length} giao dịch liên quan đến xe này.\n\n` +
        `Vui lòng xóa hoặc cập nhật các giao dịch liên quan trước khi xóa xe.`,
        409
      );
    }

    if (vehicleData.images && vehicleData.images.length > 0) {
      const imagePaths = vehicleData.images
        .map((url: string) => {
          const match = url.match(/ERP\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('ERP')
          .remove(imagePaths);

        if (storageError) {
          console.warn('Error deleting images from storage:', storageError);
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (deleteError) {
      if (deleteError.message.includes('foreign key constraint') || deleteError.message.includes('contracts_vehicle_id_fkey')) {
        return errorResponse(
          `Không thể xóa xe này vì đang được sử dụng trong hợp đồng.\n\n` +
          `Vui lòng xóa hoặc cập nhật các hợp đồng liên quan trước khi xóa xe.`,
          409
        );
      }
      return errorResponse(`Lỗi xóa xe: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete vehicle API:', error);
    return errorResponse(error.message || 'Lỗi server khi xóa xe');
  }
}
