import { supabase } from './supabaseClient';

/**
 * Cập nhật trạng thái khách hàng dựa trên trạng thái hợp đồng
 * @param customerPhone - Số điện thoại khách hàng
 * @param customerName - Tên khách hàng (optional, dùng để tìm nếu không tìm thấy bằng phone)
 * @param contractStatus - Trạng thái hợp đồng: SIGNED/PAYING -> TRADING, COMPLETED -> LOYAL
 */
export async function updateCustomerStatusOnContractChange(
  customerPhone: string,
  customerName?: string,
  contractStatus?: 'SIGNED' | 'PAYING' | 'COMPLETED'
): Promise<void> {
  try {
    if (!customerPhone) {
      console.warn('Customer phone is required to update status');
      return;
    }

    // Tìm khách hàng theo số điện thoại
    let { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, status')
      .eq('phone', customerPhone)
      .limit(1)
      .single();

    // Nếu không tìm thấy bằng phone, thử tìm bằng tên
    if (customerError && customerName) {
      const { data: customerByName, error: errorByName } = await supabase
        .from('customers')
        .select('id, status')
        .eq('name', customerName)
        .limit(1)
        .single();

      if (!errorByName && customerByName) {
        customerData = customerByName;
        customerError = null;
      }
    }

    if (customerError || !customerData) {
      console.warn(`Customer not found: ${customerPhone}${customerName ? ` / ${customerName}` : ''}`);
      return;
    }

    // Xác định trạng thái mới dựa trên trạng thái hợp đồng
    let newStatus: 'PROSPECT' | 'TRADING' | 'LOYAL' | 'INACTIVE' = customerData.status as any;

    if (contractStatus === 'COMPLETED') {
      // Khi hợp đồng hoàn thành → chuyển sang LOYAL
      newStatus = 'LOYAL';
    } else if (contractStatus === 'SIGNED' || contractStatus === 'PAYING') {
      // Khi hợp đồng được ký → chuyển sang TRADING (chỉ nếu đang là PROSPECT)
      if (customerData.status === 'PROSPECT') {
        newStatus = 'TRADING';
      }
      // Nếu đã là TRADING hoặc LOYAL thì giữ nguyên
    }

    // Chỉ cập nhật nếu trạng thái thay đổi
    if (newStatus !== customerData.status) {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ status: newStatus })
        .eq('id', customerData.id);

      if (updateError) {
        console.error('Error updating customer status:', updateError);
      } else {
        console.log(`✅ Đã cập nhật customer ${customerData.id} status: ${customerData.status} → ${newStatus}`);
      }
    }
  } catch (error) {
    console.error('Error in updateCustomerStatusOnContractChange:', error);
  }
}

/**
 * Cập nhật trạng thái khách hàng khi hợp đồng được ký
 */
export async function updateCustomerStatusOnContractSigned(
  customerPhone: string,
  customerName?: string
): Promise<void> {
  await updateCustomerStatusOnContractChange(customerPhone, customerName, 'SIGNED');
}

/**
 * Cập nhật trạng thái khách hàng khi hợp đồng hoàn thành
 */
export async function updateCustomerStatusOnContractCompleted(
  customerPhone: string,
  customerName?: string
): Promise<void> {
  await updateCustomerStatusOnContractChange(customerPhone, customerName, 'COMPLETED');
}
