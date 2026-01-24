import { supabase } from './supabaseClient';
import { TransactionStatus } from '@/types';

/**
 * Cập nhật transaction_status của xe khi hợp đồng được ký (hoặc chuyển sang trạng thái chờ duyệt)
 * Logic:
 * - Khi hợp đồng đã có xe (vehicle_id) và KHÔNG còn ở trạng thái DRAFT
 *   → transaction_status tối thiểu phải là "Đã ghép"
 * - KHÔNG ghi đè các trạng thái cao hơn: "Đã cọc" / "Đã xuất hóa đơn" / "Đã giao xe"
 */
export async function updateVehicleStatusOnContractSigned(contractId: string): Promise<void> {
  try {
    // 1. Lấy thông tin hợp đồng
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, vehicle_id, status')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      console.error('Error fetching contract:', contractError);
      return;
    }

    // 2. Chỉ xử lý khi hợp đồng không còn là DRAFT
    if (contract.status === 'DRAFT') {
      return;
    }

    // 3. Kiểm tra có xe được ghép vào hợp đồng chưa
    if (!contract.vehicle_id) {
      return;
    }

    // 4. Lấy trạng thái hiện tại của xe để tránh ghi đè các trạng thái cao hơn
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('transaction_status')
      .eq('id', contract.vehicle_id)
      .single();

    if (vehicleError) {
      console.error('Error fetching vehicle for transaction_status:', vehicleError);
      return;
    }

    const currentStatus = (vehicle?.transaction_status || '').trim();

    // Nếu xe đã ở trạng thái cao hơn thì không downgrade
    if (
      currentStatus === 'Đã cọc' ||
      currentStatus === 'Đã xuất hóa đơn' ||
      currentStatus === 'Đã giao xe' ||
      currentStatus === 'Đã bàn giao'
    ) {
      return;
    }

    // Nếu đang trống hoặc còn là "Sẵn sàng giao dịch" thì nâng lên "Đã ghép"
    if (!currentStatus || currentStatus === 'Sẵn sàng giao dịch') {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ transaction_status: 'Đã ghép' })
        .eq('id', contract.vehicle_id);

      if (updateError) {
        console.error('Error updating vehicle transaction status:', updateError);
      } else {
        console.log(`✅ Đã cập nhật transaction_status của xe ${contract.vehicle_id} thành "Đã ghép"`);
      }
    }
  } catch (error) {
    console.error('Unexpected error in updateVehicleStatusOnContractSigned:', error);
  }
}

/**
 * Kiểm tra và cập nhật transaction_status của xe dựa trên số lần thanh toán
 * Logic:
 * - Khi hợp đồng đã ký → "Đã ghép"
 * - Khi có thanh toán lần 1 → "Đã cọc"
 * - Khi có thanh toán lần 2 → "Đã xuất hóa đơn"
 * - Khi có thanh toán lần 3 → "Đã giao xe"
 */
export async function updateVehicleTransactionStatusIfNeeded(contractId: string): Promise<void> {
  try {
    // 1. Lấy thông tin hợp đồng
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, vehicle_id, status')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      console.error('Error fetching contract:', contractError);
      return;
    }

    // 2. Kiểm tra hợp đồng đã ký chưa
    if (contract.status !== 'SIGNED' && contract.status !== 'PAYING') {
      // Hợp đồng chưa ký, không cập nhật
      return;
    }

    // 3. Kiểm tra có xe được ghép vào hợp đồng chưa
    if (!contract.vehicle_id) {
      // Chưa có xe được ghép, không cập nhật
      return;
    }

    // 4. Lấy tất cả transactions đã APPROVED, sắp xếp theo thời gian
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, status, approved_at, created_at')
      .eq('reference_id', contractId)
      .eq('reference_type', 'CONTRACT')
      .in('status', [TransactionStatus.APPROVED, TransactionStatus.LOCKED])
      .order('approved_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return;
    }

    // 5. Đếm số lần thanh toán đã hoàn thành
    const approvedCount = transactions?.length || 0;

    // 6. Xác định trạng thái dựa trên số lần thanh toán
    let newStatus: string;
    if (approvedCount === 0) {
      // Chưa có thanh toán nào, giữ nguyên "Đã ghép" (đã được set khi ký hợp đồng)
      return;
    } else if (approvedCount === 1) {
      newStatus = 'Đã cọc';
    } else if (approvedCount === 2) {
      newStatus = 'Đã xuất hóa đơn';
    } else if (approvedCount >= 3) {
      newStatus = 'Đã giao xe';
    } else {
      return;
    }

    // 7. Cập nhật transaction_status của xe
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ transaction_status: newStatus })
      .eq('id', contract.vehicle_id);

    if (updateError) {
      console.error('Error updating vehicle transaction status:', updateError);
    } else {
      console.log(`✅ Đã cập nhật transaction_status của xe ${contract.vehicle_id} thành "${newStatus}" (${approvedCount} lần thanh toán)`);
    }
  } catch (error) {
    console.error('Unexpected error in updateVehicleTransactionStatusIfNeeded:', error);
  }
}

/**
 * Cập nhật transaction_status của xe về "Sẵn sàng giao dịch" khi hợp đồng bị xóa
 * Cũng cập nhật status của xe về AVAILABLE nếu đang là RESERVED
 */
export async function updateVehicleStatusOnContractDeleted(contractId: string): Promise<void> {
  try {
    // Lấy thông tin hợp đồng trước khi xóa (nếu còn tồn tại)
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, vehicle_id, status')
      .eq('id', contractId)
      .single();

    // Nếu hợp đồng đã bị xóa, thử lấy vehicle_id từ contractId (có thể cần query khác)
    // Hoặc truyền vehicleId trực tiếp vào hàm này
    if (contractError || !contract) {
      // Hợp đồng đã bị xóa, không thể lấy thông tin
      // Cần truyền vehicleId từ bên ngoài
      console.warn('Contract already deleted, cannot fetch vehicle_id');
      return;
    }

    // Kiểm tra có xe được ghép vào hợp đồng chưa
    if (!contract.vehicle_id) {
      return;
    }

    // Cập nhật transaction_status của xe về "Sẵn sàng giao dịch"
    // Và status về AVAILABLE nếu đang là RESERVED
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ 
        transaction_status: 'Sẵn sàng giao dịch',
        status: 'AVAILABLE' // Cập nhật status về AVAILABLE nếu đang là RESERVED
      })
      .eq('id', contract.vehicle_id);

    if (updateError) {
      console.error('Error updating vehicle status on contract deletion:', updateError);
    } else {
      console.log(`✅ Đã cập nhật xe ${contract.vehicle_id} về "Sẵn sàng giao dịch" sau khi xóa hợp đồng`);
    }
  } catch (error) {
    console.error('Unexpected error in updateVehicleStatusOnContractDeleted:', error);
  }
}

/**
 * Cập nhật transaction_status của xe về "Sẵn sàng giao dịch" khi hợp đồng bị xóa
 * Overload với vehicleId trực tiếp (dùng khi hợp đồng đã bị xóa)
 */
export async function updateVehicleStatusOnContractDeletedByVehicleId(vehicleId: string): Promise<void> {
  try {
    if (!vehicleId) {
      return;
    }

    // Cập nhật transaction_status của xe về "Sẵn sàng giao dịch"
    // Và status về AVAILABLE nếu đang là RESERVED
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ 
        transaction_status: 'Sẵn sàng giao dịch',
        status: 'AVAILABLE' // Cập nhật status về AVAILABLE nếu đang là RESERVED
      })
      .eq('id', vehicleId);

    if (updateError) {
      console.error('Error updating vehicle status on contract deletion:', updateError);
    } else {
      console.log(`✅ Đã cập nhật xe ${vehicleId} về "Sẵn sàng giao dịch" sau khi xóa hợp đồng`);
    }
  } catch (error) {
    console.error('Unexpected error in updateVehicleStatusOnContractDeletedByVehicleId:', error);
  }
}

