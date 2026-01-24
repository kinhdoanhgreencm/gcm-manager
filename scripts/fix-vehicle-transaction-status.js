/**
 * Script để sửa transaction_status của các xe có vấn đề
 * Reset transaction_status về "Sẵn sàng giao dịch" cho các xe:
 * - Có status = AVAILABLE
 * - Không đang được sử dụng trong hợp đồng nào
 * - Nhưng có transaction_status không cho phép ghép hợp đồng (như 'Đã cọc', 'Đã xuất hóa đơn', 'Đã giao xe', 'Đã bàn giao')
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Các transaction_status cho phép ghép hợp đồng
const ALLOWED_STATUSES = ['', 'Sẵn sàng giao dịch', 'Đã ghép'];

// Các transaction_status KHÔNG cho phép ghép hợp đồng (cần reset)
const BLOCKED_STATUSES = ['Đã cọc', 'Đã xuất hóa đơn', 'Đã giao xe', 'Đã bàn giao'];

async function fixVehicleTransactionStatus() {
  console.log('🔍 Đang kiểm tra và sửa transaction_status của các xe...\n');

  try {
    // Lấy tất cả xe có status = AVAILABLE
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, vin, make, model, status, transaction_status, code')
      .eq('status', 'AVAILABLE')
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      console.error('❌ Lỗi khi lấy dữ liệu xe:', vehiclesError);
      return;
    }

    console.log(`📊 Tìm thấy ${vehicles.length} xe có status = AVAILABLE\n`);

    // Lấy tất cả hợp đồng để kiểm tra xe nào đang được sử dụng
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, vehicle_id, contract_code, status')
      .not('vehicle_id', 'is', null);

    if (contractsError) {
      console.error('❌ Lỗi khi lấy dữ liệu hợp đồng:', contractsError);
      return;
    }

    const vehicleIdsInUse = new Set(
      contracts.map(c => c.vehicle_id).filter(Boolean)
    );

    console.log(`📋 Tìm thấy ${vehicleIdsInUse.size} xe đang được sử dụng trong hợp đồng\n`);

    // Tìm các xe cần sửa
    const vehiclesToFix = vehicles.filter(v => {
      const isAvailable = v.status === 'AVAILABLE';
      const txStatus = (v.transaction_status || '').trim();
      const isBlocked = BLOCKED_STATUSES.includes(txStatus);
      const notInUse = !vehicleIdsInUse.has(v.id);

      return isAvailable && isBlocked && notInUse;
    });

    if (vehiclesToFix.length === 0) {
      console.log('✅ Không tìm thấy xe nào cần sửa!\n');
      return;
    }

    console.log(`⚠️  Tìm thấy ${vehiclesToFix.length} xe cần sửa transaction_status:\n`);

    vehiclesToFix.forEach(v => {
      console.log(`  - VIN: ${v.vin}`);
      console.log(`    Model: ${v.make} ${v.model}`);
      console.log(`    Code: ${v.code || 'N/A'}`);
      console.log(`    Transaction Status hiện tại: "${v.transaction_status || '(null)'}"`);
      console.log(`    → Sẽ reset về: "Sẵn sàng giao dịch"`);
      console.log('');
    });

    // Hỏi xác nhận trước khi sửa
    console.log('⚠️  Bạn có muốn sửa transaction_status của các xe trên không?');
    console.log('   Sử dụng --yes để tự động sửa mà không cần xác nhận.\n');

    // Kiểm tra flag --yes
    const shouldFix = process.argv.includes('--yes');

    if (!shouldFix) {
      console.log('❌ Hủy bỏ. Chạy lại với flag --yes để thực hiện sửa đổi.');
      return;
    }

    // Sửa transaction_status
    console.log('🔧 Đang sửa transaction_status...\n');

    let fixedCount = 0;
    let errorCount = 0;

    for (const vehicle of vehiclesToFix) {
      try {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ transaction_status: 'Sẵn sàng giao dịch' })
          .eq('id', vehicle.id);

        if (updateError) {
          console.error(`  ❌ Lỗi khi sửa xe ${vehicle.vin}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`  ✅ Đã sửa xe ${vehicle.vin} (${vehicle.make} ${vehicle.model})`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`  ❌ Lỗi không mong đợi khi sửa xe ${vehicle.vin}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 KẾT QUẢ:');
    console.log(`  ✅ Đã sửa thành công: ${fixedCount} xe`);
    console.log(`  ❌ Lỗi: ${errorCount} xe`);

    if (fixedCount > 0) {
      console.log('\n✅ Các xe đã được cập nhật và bây giờ có thể được ghép vào hợp đồng!');
    }

  } catch (error) {
    console.error('❌ Lỗi không mong đợi:', error);
  }
}

// Chạy script
fixVehicleTransactionStatus()
  .then(() => {
    console.log('\n✅ Hoàn thành!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });
