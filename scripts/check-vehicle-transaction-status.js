/**
 * Script để kiểm tra transaction_status của tất cả xe trong database
 * Tìm các xe có vấn đề với transaction_status khiến không thể ghép vào hợp đồng
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

async function checkVehicleTransactionStatus() {
  console.log('🔍 Đang kiểm tra transaction_status của tất cả xe...\n');

  try {
    // Lấy tất cả xe
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, vin, make, model, status, transaction_status, code')
      .order('created_at', { ascending: false });

    if (vehiclesError) {
      console.error('❌ Lỗi khi lấy dữ liệu xe:', vehiclesError);
      return;
    }

    console.log(`📊 Tổng số xe trong database: ${vehicles.length}\n`);

    // Thống kê theo transaction_status
    const statusCounts = {};
    const vehiclesByStatus = {};

    vehicles.forEach(vehicle => {
      const txStatus = (vehicle.transaction_status || '').trim();
      const normalizedStatus = txStatus || '(null hoặc rỗng)';

      if (!statusCounts[normalizedStatus]) {
        statusCounts[normalizedStatus] = 0;
        vehiclesByStatus[normalizedStatus] = [];
      }

      statusCounts[normalizedStatus]++;
      vehiclesByStatus[normalizedStatus].push(vehicle);
    });

    console.log('📈 Thống kê transaction_status:\n');
    Object.keys(statusCounts).sort().forEach(status => {
      console.log(`  ${status}: ${statusCounts[status]} xe`);
    });

    // Kiểm tra xe có status = AVAILABLE nhưng transaction_status không phải 'Sẵn sàng giao dịch'
    console.log('\n🔍 Các xe có status = AVAILABLE nhưng transaction_status không phù hợp để ghép hợp đồng:\n');
    
    const problematicVehicles = vehicles.filter(v => {
      const isAvailable = v.status === 'AVAILABLE';
      const txStatus = (v.transaction_status || '').trim();
      const isReadyForTransaction = !txStatus || txStatus === 'Sẵn sàng giao dịch';
      
      return isAvailable && !isReadyForTransaction;
    });

    if (problematicVehicles.length > 0) {
      console.log(`⚠️  Tìm thấy ${problematicVehicles.length} xe có vấn đề:\n`);
      problematicVehicles.forEach(v => {
        console.log(`  - VIN: ${v.vin}`);
        console.log(`    Model: ${v.make} ${v.model}`);
        console.log(`    Code: ${v.code || 'N/A'}`);
        console.log(`    Status: ${v.status}`);
        console.log(`    Transaction Status: "${v.transaction_status || '(null)'}"`);
        console.log('');
      });

      // Kiểm tra xem các xe này có đang được reference trong hợp đồng không
      console.log('🔍 Kiểm tra xem các xe này có đang được sử dụng trong hợp đồng:\n');
      
      for (const vehicle of problematicVehicles) {
        const { data: contracts, error: contractError } = await supabase
          .from('contracts')
          .select('id, contract_code, status, contract_type')
          .eq('vehicle_id', vehicle.id);

        if (contractError) {
          console.log(`  ❌ Lỗi khi kiểm tra hợp đồng cho xe ${vehicle.vin}:`, contractError.message);
        } else if (contracts && contracts.length > 0) {
          console.log(`  ⚠️  Xe ${vehicle.vin} đang được sử dụng trong ${contracts.length} hợp đồng:`);
          contracts.forEach(c => {
            console.log(`     - ${c.contract_code || c.id} (${c.status})`);
          });
        } else {
          console.log(`  ✅ Xe ${vehicle.vin} không được sử dụng trong hợp đồng nào (có thể sửa transaction_status)`);
        }
      }

      console.log('\n💡 Giải pháp:');
      console.log('  Các xe có status = AVAILABLE nhưng transaction_status khác "Sẵn sàng giao dịch"');
      console.log('  nên được cập nhật transaction_status về "Sẵn sàng giao dịch" để có thể ghép vào hợp đồng.\n');
    } else {
      console.log('✅ Không tìm thấy xe nào có vấn đề với transaction_status!\n');
    }

    // Kiểm tra xe có đang được reference trong hợp đồng nhưng transaction_status không phù hợp
    console.log('🔍 Kiểm tra xe đang được sử dụng trong hợp đồng:\n');
    
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, vehicle_id, contract_code, status')
      .not('vehicle_id', 'is', null);

    if (contractsError) {
      console.error('❌ Lỗi khi lấy hợp đồng:', contractsError);
    } else {
      const vehicleIdsInContracts = new Set(
        contracts.map(c => c.vehicle_id).filter(Boolean)
      );

      console.log(`📋 Tìm thấy ${vehicleIdsInContracts.size} xe đang được sử dụng trong hợp đồng:\n`);

      for (const vehicleId of vehicleIdsInContracts) {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
          const contractList = contracts.filter(c => c.vehicle_id === vehicleId);
          console.log(`  - VIN: ${vehicle.vin}`);
          console.log(`    Model: ${vehicle.make} ${vehicle.model}`);
          console.log(`    Status: ${vehicle.status}`);
          console.log(`    Transaction Status: "${vehicle.transaction_status || '(null)'}"`);
          console.log(`    Đang sử dụng trong ${contractList.length} hợp đồng:`);
          contractList.forEach(c => {
            console.log(`      • ${c.contract_code || c.id} (${c.status})`);
          });
          console.log('');
        }
      }
    }

    // Tóm tắt
    console.log('\n📊 TÓM TẮT:\n');
    console.log(`- Tổng số xe: ${vehicles.length}`);
    console.log(`- Xe có status = AVAILABLE: ${vehicles.filter(v => v.status === 'AVAILABLE').length}`);
    console.log(`- Xe có transaction_status = 'Sẵn sàng giao dịch': ${statusCounts['Sẵn sàng giao dịch'] || 0}`);
    console.log(`- Xe có transaction_status = NULL hoặc rỗng: ${statusCounts['(null hoặc rỗng)'] || 0}`);
    console.log(`- Xe có vấn đề (AVAILABLE nhưng không thể ghép hợp đồng): ${problematicVehicles.length}`);

  } catch (error) {
    console.error('❌ Lỗi không mong đợi:', error);
  }
}

// Chạy script
checkVehicleTransactionStatus()
  .then(() => {
    console.log('\n✅ Hoàn thành kiểm tra!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });
