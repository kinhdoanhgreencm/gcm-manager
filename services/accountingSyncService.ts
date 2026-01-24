import { supabase } from './supabaseClient';
import { Transaction, TransactionType, TransactionCategory, VoucherType, Account } from '@/types';

/**
 * Service để đồng bộ transactions từ Finance sang Accounting
 */

interface AccountMapping {
  cashAccountCode: string; // 111 - Tiền mặt
  bankAccountCode: string; // 112 - Tiền gửi ngân hàng
  revenueAccountCode: string; // 511 - Doanh thu bán hàng
  receivableAccountCode: string; // 131 - Phải thu khách hàng
  inventoryAccountCode: string; // 152 - Hàng hóa
  sellingExpenseAccountCode: string; // 641 - Chi phí bán hàng
  adminExpenseAccountCode: string; // 642 - Chi phí quản lý
}

// Mapping mặc định theo chuẩn Việt Nam
const DEFAULT_ACCOUNT_MAPPING: AccountMapping = {
  cashAccountCode: '111',
  bankAccountCode: '112',
  revenueAccountCode: '511',
  receivableAccountCode: '131',
  inventoryAccountCode: '152',
  sellingExpenseAccountCode: '641',
  adminExpenseAccountCode: '642'
};

/**
 * Lấy ID tài khoản kế toán theo mã tài khoản
 */
async function getAccountIdByCode(code: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  // Lỗi PGRST116 là "not found" - không phải lỗi thực sự
  if (error && error.code !== 'PGRST116') {
    console.error(`Error finding account with code ${code}:`, error);
    return null;
  }

  if (!data) {
    console.warn(`Account with code ${code} not found`);
    return null;
  }

  return data.id;
}

/**
 * Lấy ID tài khoản kế toán tương ứng với account (tiền mặt/ngân hàng)
 * Ưu tiên sử dụng chart_of_account_id từ account, fallback về mapping theo code
 */
async function getCashOrBankAccountId(
  account: Account,
  mapping: AccountMapping
): Promise<string | null> {
  // Ưu tiên sử dụng chart_of_account_id nếu có (đã được link từ migration)
  if (account.chartOfAccountId) {
    // Verify account tồn tại và active
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name, is_active')
      .eq('id', account.chartOfAccountId)
      .maybeSingle();
    
    if (!error && data && data.is_active) {
      // Tài khoản tồn tại và active - sử dụng ngay
      console.log(`✓ Sử dụng chart_of_account_id ${account.chartOfAccountId} (${data.code} - ${data.name}) cho account "${account.name}"`);
      return account.chartOfAccountId;
    } else {
      // Log chi tiết lỗi và fallback
      if (error) {
        console.warn(`⚠️ Lỗi verify chart_of_account_id ${account.chartOfAccountId} cho account "${account.name}": ${error.message} (code: ${error.code})`);
      } else if (data && !data.is_active) {
        console.warn(`⚠️ chart_of_account_id ${account.chartOfAccountId} (${data.code} - ${data.name}) không active cho account "${account.name}"`);
      } else {
        console.warn(`⚠️ chart_of_account_id ${account.chartOfAccountId} không tồn tại cho account "${account.name}"`);
      }
      console.log(`   → Fallback: Sẽ tìm theo code thay thế`);
    }
  }

  // Fallback: Tìm theo code
  let fallbackCode: string;
  if (account.type === 'CASH') {
    fallbackCode = mapping.cashAccountCode;
  } else if (account.type === 'BANK' || account.type === 'E_WALLET') {
    fallbackCode = mapping.bankAccountCode;
  } else {
    console.error(`✗ Account "${account.name}" có type không hợp lệ: ${account.type}`);
    return null;
  }

  const fallbackAccountId = await getAccountIdByCode(fallbackCode);
  if (fallbackAccountId) {
    console.log(`   ✓ Đã tìm thấy tài khoản theo code ${fallbackCode} (ID: ${fallbackAccountId}) cho account "${account.name}"`);
    return fallbackAccountId;
  } else {
    console.error(`   ✗ Không tìm thấy tài khoản với code ${fallbackCode} cho account "${account.name}"`);
    console.error(`   → Vui lòng chạy migration_ensure_basic_accounts.sql để tạo các tài khoản cơ bản (111, 112, ...)`);
    return null;
  }
}

/**
 * Tạo chứng từ và bút toán từ transaction INCOME
 */
async function createIncomeVoucher(
  transaction: Transaction,
  account: Account,
  mapping: AccountMapping,
  userId?: string
): Promise<{ success: boolean; voucherId?: string; error?: string }> {
  try {
    // Xác định tài khoản tiền (Nợ)
    const cashBankAccountId = await getCashOrBankAccountId(account, mapping);
    if (!cashBankAccountId) {
      let errorMsg = `Không tìm thấy tài khoản kế toán cho account "${account.name}" (${account.id})`;
      if (!account.chartOfAccountId) {
        errorMsg += `. Account chưa được liên kết với chart_of_accounts. Vui lòng chạy migration_link_accounts_to_chart_of_accounts.sql`;
      } else {
        errorMsg += `. chart_of_account_id: ${account.chartOfAccountId} không hợp lệ hoặc không active, và không tìm thấy tài khoản fallback (code: ${account.type === 'CASH' ? '111' : '112'}). Vui lòng chạy migration_ensure_basic_accounts.sql`;
      }
      console.error(`[createIncomeVoucher] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // Xác định tài khoản doanh thu (Có) dựa trên category
    let revenueAccountId: string | null = null;
    
    switch (transaction.category) {
      case TransactionCategory.CAR_SALE:
      case TransactionCategory.SERVICE:
      case TransactionCategory.COMMISSION:
        revenueAccountId = await getAccountIdByCode(mapping.revenueAccountCode);
        break;
      case TransactionCategory.DEPOSIT:
        // Đặt cọc có thể là phải thu hoặc doanh thu tùy theo nghiệp vụ
        revenueAccountId = await getAccountIdByCode(mapping.receivableAccountCode);
        break;
      default:
        revenueAccountId = await getAccountIdByCode(mapping.revenueAccountCode);
    }

    if (!revenueAccountId) {
      return { success: false, error: 'Không tìm thấy tài khoản doanh thu' };
    }

    // Xác định loại chứng từ
    let voucherType: VoucherType = VoucherType.RECEIPT;
    if (transaction.category === TransactionCategory.CAR_SALE) {
      voucherType = VoucherType.SALES_INVOICE;
    }

    // Tạo số chứng từ
    const prefix = voucherType === VoucherType.RECEIPT ? 'PT' : 
                   voucherType === VoucherType.SALES_INVOICE ? 'HD' : 'CT';
    const year = new Date(transaction.date).getFullYear();
    
    // Tìm số chứng từ cuối cùng
    const { data: existingVouchers } = await supabase
      .from('accounting_vouchers')
      .select('voucher_number')
      .eq('voucher_type', voucherType)
      .like('voucher_number', `${prefix}-${year}-%`)
      .order('voucher_number', { ascending: false })
      .limit(1);

    let lastNumber = 0;
    if (existingVouchers && existingVouchers.length > 0) {
      const lastVoucher = existingVouchers[0].voucher_number;
      const parts = lastVoucher.split('-');
      if (parts.length >= 3) {
        const numberPart = parts[2];
        const parsed = parseInt(numberPart, 10);
        if (!isNaN(parsed)) {
          lastNumber = parsed;
        }
      }
    }
    
    const voucherNumber = `${prefix}-${year}-${String(lastNumber + 1).padStart(3, '0')}`;

    // Tạo chứng từ
    const { data: voucher, error: voucherError } = await supabase
      .from('accounting_vouchers')
      .insert([{
        voucher_number: voucherNumber,
        voucher_date: transaction.date,
        voucher_type: voucherType,
        description: transaction.description,
        total_amount: transaction.amount,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        status: 'POSTED', // Tự động hạch toán vì transaction đã APPROVED
        posted_by: userId || transaction.creatorId,
        posted_at: transaction.approvedAt || transaction.createdAt || new Date().toISOString(),
        created_by: userId || transaction.creatorId
      }])
      .select()
      .single();

    if (voucherError) {
      console.error('Error creating voucher:', voucherError);
      return { success: false, error: voucherError.message };
    }

    // Tạo bút toán: Nợ Tiền mặt/Tiền gửi, Có Doanh thu
    const entries = [
      {
        voucher_id: voucher.id,
        account_id: cashBankAccountId,
        debit_amount: transaction.amount,
        credit_amount: 0,
        description: transaction.description,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        created_by: userId || transaction.creatorId
      },
      {
        voucher_id: voucher.id,
        account_id: revenueAccountId,
        debit_amount: 0,
        credit_amount: transaction.amount,
        description: transaction.description,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        created_by: userId || transaction.creatorId
      }
    ];

    const { error: entriesError } = await supabase
      .from('accounting_entries')
      .insert(entries);

    if (entriesError) {
      console.error('Error creating entries:', entriesError);
      // Xóa voucher nếu tạo entries thất bại
      await supabase.from('accounting_vouchers').delete().eq('id', voucher.id);
      return { success: false, error: entriesError.message };
    }

    return { success: true, voucherId: voucher.id };
  } catch (error: any) {
    console.error('Error in createIncomeVoucher:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tạo chứng từ và bút toán từ transaction EXPENSE
 */
async function createExpenseVoucher(
  transaction: Transaction,
  account: Account,
  mapping: AccountMapping,
  userId?: string
): Promise<{ success: boolean; voucherId?: string; error?: string }> {
  try {
    // Xác định tài khoản tiền (Có)
    const cashBankAccountId = await getCashOrBankAccountId(account, mapping);
    if (!cashBankAccountId) {
      let errorMsg = `Không tìm thấy tài khoản kế toán cho account "${account.name}" (${account.id})`;
      if (!account.chartOfAccountId) {
        errorMsg += `. Account chưa được liên kết với chart_of_accounts. Vui lòng chạy migration_link_accounts_to_chart_of_accounts.sql`;
      } else {
        errorMsg += `. chart_of_account_id: ${account.chartOfAccountId} không hợp lệ hoặc không active, và không tìm thấy tài khoản fallback (code: ${account.type === 'CASH' ? '111' : '112'}). Vui lòng chạy migration_ensure_basic_accounts.sql`;
      }
      console.error(`[createExpenseVoucher] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // Xác định tài khoản chi phí (Nợ) dựa trên category
    let expenseAccountId: string | null = null;
    
    switch (transaction.category) {
      case TransactionCategory.INVENTORY_PURCHASE:
        expenseAccountId = await getAccountIdByCode(mapping.inventoryAccountCode);
        break;
      case TransactionCategory.SALARY:
      case TransactionCategory.OPERATION:
        expenseAccountId = await getAccountIdByCode(mapping.adminExpenseAccountCode);
        break;
      case TransactionCategory.MARKETING:
      case TransactionCategory.REGISTRATION_FEE:
        expenseAccountId = await getAccountIdByCode(mapping.sellingExpenseAccountCode);
        break;
      default:
        expenseAccountId = await getAccountIdByCode(mapping.adminExpenseAccountCode);
    }

    if (!expenseAccountId) {
      return { success: false, error: 'Không tìm thấy tài khoản chi phí' };
    }

    // Xác định loại chứng từ
    let voucherType: VoucherType = VoucherType.PAYMENT;
    if (transaction.category === TransactionCategory.INVENTORY_PURCHASE) {
      voucherType = VoucherType.PURCHASE_INVOICE;
    }

    // Tạo số chứng từ
    const prefix = voucherType === VoucherType.PAYMENT ? 'PC' : 
                   voucherType === VoucherType.PURCHASE_INVOICE ? 'HDM' : 'CT';
    const year = new Date(transaction.date).getFullYear();
    
    const { data: existingVouchers } = await supabase
      .from('accounting_vouchers')
      .select('voucher_number')
      .eq('voucher_type', voucherType)
      .like('voucher_number', `${prefix}-${year}-%`)
      .order('voucher_number', { ascending: false })
      .limit(1);

    let lastNumber = 0;
    if (existingVouchers && existingVouchers.length > 0) {
      const lastVoucher = existingVouchers[0].voucher_number;
      const parts = lastVoucher.split('-');
      if (parts.length >= 3) {
        const numberPart = parts[2];
        const parsed = parseInt(numberPart, 10);
        if (!isNaN(parsed)) {
          lastNumber = parsed;
        }
      }
    }
    
    const voucherNumber = `${prefix}-${year}-${String(lastNumber + 1).padStart(3, '0')}`;

    // Tạo chứng từ
    const { data: voucher, error: voucherError } = await supabase
      .from('accounting_vouchers')
      .insert([{
        voucher_number: voucherNumber,
        voucher_date: transaction.date,
        voucher_type: voucherType,
        description: transaction.description,
        total_amount: transaction.amount,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        status: 'POSTED',
        posted_by: userId || transaction.creatorId,
        posted_at: transaction.approvedAt || transaction.createdAt || new Date().toISOString(),
        created_by: userId || transaction.creatorId
      }])
      .select()
      .single();

    if (voucherError) {
      console.error('Error creating voucher:', voucherError);
      return { success: false, error: voucherError.message };
    }

    // Tạo bút toán: Nợ Chi phí, Có Tiền mặt/Tiền gửi
    const entries = [
      {
        voucher_id: voucher.id,
        account_id: expenseAccountId,
        debit_amount: transaction.amount,
        credit_amount: 0,
        description: transaction.description,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        created_by: userId || transaction.creatorId
      },
      {
        voucher_id: voucher.id,
        account_id: cashBankAccountId,
        debit_amount: 0,
        credit_amount: transaction.amount,
        description: transaction.description,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        created_by: userId || transaction.creatorId
      }
    ];

    const { error: entriesError } = await supabase
      .from('accounting_entries')
      .insert(entries);

    if (entriesError) {
      console.error('Error creating entries:', entriesError);
      await supabase.from('accounting_vouchers').delete().eq('id', voucher.id);
      return { success: false, error: entriesError.message };
    }

    return { success: true, voucherId: voucher.id };
  } catch (error: any) {
    console.error('Error in createExpenseVoucher:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tạo chứng từ và bút toán từ transaction TRANSFER
 */
async function createTransferVoucher(
  transaction: Transaction,
  fromAccount: Account,
  toAccount: Account | null,
  mapping: AccountMapping,
  userId?: string
): Promise<{ success: boolean; voucherId?: string; error?: string }> {
  try {
    if (!transaction.toAccountId || !toAccount) {
      return { success: false, error: 'Thiếu thông tin tài khoản đích' };
    }

    // Xác định tài khoản kế toán cho từng account
    const fromAccountId = await getCashOrBankAccountId(fromAccount, mapping);
    const toAccountId = await getCashOrBankAccountId(toAccount, mapping);

    if (!fromAccountId) {
      let errorMsg = `Không tìm thấy tài khoản kế toán cho tài khoản nguồn "${fromAccount.name}"`;
      if (!fromAccount.chartOfAccountId) {
        errorMsg += `. Account chưa được liên kết với chart_of_accounts. Vui lòng chạy migration_link_accounts_to_chart_of_accounts.sql`;
      } else {
        errorMsg += `. chart_of_account_id: ${fromAccount.chartOfAccountId} không hợp lệ hoặc không active, và không tìm thấy tài khoản fallback (code: ${fromAccount.type === 'CASH' ? '111' : '112'}). Vui lòng chạy migration_ensure_basic_accounts.sql`;
      }
      return { success: false, error: errorMsg };
    }

    if (!toAccountId) {
      let errorMsg = `Không tìm thấy tài khoản kế toán cho tài khoản đích "${toAccount.name}"`;
      if (!toAccount.chartOfAccountId) {
        errorMsg += `. Account chưa được liên kết với chart_of_accounts. Vui lòng chạy migration_link_accounts_to_chart_of_accounts.sql`;
      } else {
        errorMsg += `. chart_of_account_id: ${toAccount.chartOfAccountId} không hợp lệ hoặc không active, và không tìm thấy tài khoản fallback (code: ${toAccount.type === 'CASH' ? '111' : '112'}). Vui lòng chạy migration_ensure_basic_accounts.sql`;
      }
      return { success: false, error: errorMsg };
    }

    // Tạo số chứng từ
    const prefix = 'CK';
    const year = new Date(transaction.date).getFullYear();
    
    const { data: existingVouchers } = await supabase
      .from('accounting_vouchers')
      .select('voucher_number')
      .eq('voucher_type', VoucherType.TRANSFER)
      .like('voucher_number', `${prefix}-${year}-%`)
      .order('voucher_number', { ascending: false })
      .limit(1);

    let lastNumber = 0;
    if (existingVouchers && existingVouchers.length > 0) {
      const lastVoucher = existingVouchers[0].voucher_number;
      const parts = lastVoucher.split('-');
      if (parts.length >= 3) {
        const numberPart = parts[2];
        const parsed = parseInt(numberPart, 10);
        if (!isNaN(parsed)) {
          lastNumber = parsed;
        }
      }
    }
    
    const voucherNumber = `${prefix}-${year}-${String(lastNumber + 1).padStart(3, '0')}`;

    // Tạo chứng từ
    const { data: voucher, error: voucherError } = await supabase
      .from('accounting_vouchers')
      .insert([{
        voucher_number: voucherNumber,
        voucher_date: transaction.date,
        voucher_type: VoucherType.TRANSFER,
        description: transaction.description,
        total_amount: transaction.amount,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        status: 'POSTED',
        posted_by: userId || transaction.creatorId,
        posted_at: transaction.approvedAt || transaction.createdAt || new Date().toISOString(),
        created_by: userId || transaction.creatorId
      }])
      .select()
      .single();

    if (voucherError) {
      console.error('Error creating voucher:', voucherError);
      return { success: false, error: voucherError.message };
    }

    // Tạo bút toán: Nợ Tài khoản đích, Có Tài khoản nguồn
    const entries = [
      {
        voucher_id: voucher.id,
        account_id: toAccountId,
        debit_amount: transaction.amount,
        credit_amount: 0,
        description: transaction.description,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        created_by: userId || transaction.creatorId
      },
      {
        voucher_id: voucher.id,
        account_id: fromAccountId,
        debit_amount: 0,
        credit_amount: transaction.amount,
        description: transaction.description,
        reference_type: 'TRANSACTION',
        reference_id: transaction.id,
        created_by: userId || transaction.creatorId
      }
    ];

    const { error: entriesError } = await supabase
      .from('accounting_entries')
      .insert(entries);

    if (entriesError) {
      console.error('Error creating entries:', entriesError);
      await supabase.from('accounting_vouchers').delete().eq('id', voucher.id);
      return { success: false, error: entriesError.message };
    }

    return { success: true, voucherId: voucher.id };
  } catch (error: any) {
    console.error('Error in createTransferVoucher:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Đồng bộ một transaction sang accounting
 */
export async function syncTransactionToAccounting(
  transaction: Transaction,
  accounts: Account[],
  userId?: string,
  mapping: AccountMapping = DEFAULT_ACCOUNT_MAPPING
): Promise<{ success: boolean; voucherId?: string; error?: string }> {
  try {
    // Validate transaction
    if (!transaction.id) {
      return { success: false, error: 'Transaction không có ID' };
    }

    if (!transaction.accountId) {
      return { success: false, error: `Transaction ${transaction.id} không có accountId` };
    }

    // Chỉ đồng bộ các transaction đã APPROVED
    if (transaction.status !== 'APPROVED') {
      return { success: false, error: `Transaction ${transaction.id} chưa được duyệt (status: ${transaction.status})` };
    }

    // Kiểm tra xem đã có voucher cho transaction này chưa
    const { data: existingVoucher, error: checkError } = await supabase
      .from('accounting_vouchers')
      .select('id')
      .eq('reference_id', transaction.id)
      .eq('reference_type', 'TRANSACTION')
      .maybeSingle();

    // Nếu có lỗi khác ngoài "not found", return error
    if (checkError && checkError.code !== 'PGRST116') {
      return { success: false, error: `Lỗi kiểm tra voucher: ${checkError.message}` };
    }

    if (existingVoucher) {
      return { success: false, error: `Transaction ${transaction.id} đã được đồng bộ` };
    }

  // Tìm account tương ứng
  const account = accounts.find(a => a.id === transaction.accountId);
  if (!account) {
    return { success: false, error: `Không tìm thấy tài khoản với ID: ${transaction.accountId}` };
  }

  // Kiểm tra xem account có chart_of_account_id chưa
  if (!account.chartOfAccountId) {
    console.warn(`Account ${account.id} (${account.name}) chưa có chart_of_account_id. Sẽ thử tìm theo code.`);
    // Vẫn tiếp tục, sẽ fallback về tìm theo code trong getCashOrBankAccountId
  }

    // Tìm toAccount nếu là transfer
    let toAccount: Account | null = null;
    if (transaction.type === TransactionType.TRANSFER) {
      if (!transaction.toAccountId) {
        return { success: false, error: `Transaction ${transaction.id} là TRANSFER nhưng thiếu toAccountId` };
      }
      toAccount = accounts.find(a => a.id === transaction.toAccountId) || null;
      if (!toAccount) {
        return { success: false, error: `Không tìm thấy tài khoản đích với ID: ${transaction.toAccountId}` };
      }
    }

    // Tạo voucher và entries tùy theo loại transaction
    if (transaction.type === TransactionType.INCOME) {
      return await createIncomeVoucher(transaction, account, mapping, userId);
    } else if (transaction.type === TransactionType.EXPENSE) {
      return await createExpenseVoucher(transaction, account, mapping, userId);
    } else if (transaction.type === TransactionType.TRANSFER) {
      return await createTransferVoucher(transaction, account, toAccount, mapping, userId);
    }

    return { success: false, error: `Loại transaction không được hỗ trợ: ${transaction.type}` };
  } catch (error: any) {
    console.error(`Error syncing transaction ${transaction.id}:`, error);
    return { success: false, error: `Lỗi không xác định: ${error.message || error}` };
  }
}

/**
 * Đồng bộ nhiều transactions sang accounting
 */
export async function syncMultipleTransactionsToAccounting(
  transactions: Transaction[],
  accounts: Account[],
  userId?: string,
  mapping: AccountMapping = DEFAULT_ACCOUNT_MAPPING
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ transactionId: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ transactionId: string; error: string }>
  };

  for (const transaction of transactions) {
    try {
      const result = await syncTransactionToAccounting(transaction, accounts, userId, mapping);
      if (result.success) {
        results.success++;
        if (results.success <= 5) { // Chỉ log 5 transaction đầu tiên để tránh spam
          console.log(`✓ [${results.success}] Đồng bộ thành công transaction ${transaction.id}`);
        }
      } else {
        results.failed++;
        const errorMsg = result.error || 'Unknown error';
        results.errors.push({
          transactionId: transaction.id,
          error: errorMsg
        });
        // Luôn log lỗi để debug
        console.error(`✗ [${results.failed}] Transaction ${transaction.id}: ${errorMsg}`);
        console.error(`   - Type: ${transaction.type}, Category: ${transaction.category}`);
        console.error(`   - Amount: ${transaction.amount}, Account: ${transaction.accountId}`);
      }
    } catch (error: any) {
      results.failed++;
      const errorMsg = error.message || error.toString() || 'Unexpected error';
      results.errors.push({
        transactionId: transaction.id || 'unknown',
        error: errorMsg
      });
      console.error(`✗ [${results.failed}] Exception khi đồng bộ transaction ${transaction.id}:`, error);
      console.error(`   - Error stack:`, error.stack);
    }
  }
  
  // Tóm tắt kết quả
  console.log(`\n📊 Tóm tắt đồng bộ: ${results.success} thành công, ${results.failed} thất bại`);

  return results;
}

/**
 * Đồng bộ tất cả transactions đã APPROVED chưa được đồng bộ
 */
export async function syncAllPendingTransactions(
  accounts: Account[],
  userId?: string,
  mapping: AccountMapping = DEFAULT_ACCOUNT_MAPPING
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ transactionId: string; error: string }>;
}> {
  // Lấy tất cả transactions đã APPROVED
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'APPROVED')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching transactions:', error);
    return { success: 0, failed: 0, errors: [{ transactionId: '', error: error.message }] };
  }

  if (!transactions || transactions.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  // Lấy danh sách voucher đã tồn tại
  const { data: existingVouchers } = await supabase
    .from('accounting_vouchers')
    .select('reference_id')
    .eq('reference_type', 'TRANSACTION')
    .not('reference_id', 'is', null);

  const syncedTransactionIds = new Set(
    (existingVouchers || []).map((v: any) => v.reference_id)
  );

  // Lọc các transaction chưa được đồng bộ
  const pendingTransactions = transactions
    .filter((t: any) => {
      // Validate transaction có đủ thông tin
      if (!t.id) {
        console.warn('Transaction không có ID, bỏ qua');
        return false;
      }
      if (!t.account_id) {
        console.warn(`Transaction ${t.id} không có account_id, bỏ qua`);
        return false;
      }
      return !syncedTransactionIds.has(t.id);
    })
    .map((t: any) => ({
      id: t.id,
      date: t.date,
      amount: Number(t.amount) || 0,
      type: t.type as TransactionType,
      category: t.category as TransactionCategory,
      description: t.description || '',
      accountId: t.account_id,
      toAccountId: t.to_account_id || undefined,
      referenceId: t.reference_id || undefined,
      referenceType: t.reference_type || undefined,
      paymentMethod: t.payment_method,
      status: t.status,
      creatorId: t.creator_id || '',
      approverId: t.approver_id || undefined,
      approvedAt: t.approved_at || undefined,
      createdAt: t.created_at || undefined
    }));

  console.log(`Tìm thấy ${pendingTransactions.length} transaction cần đồng bộ (tổng ${transactions.length} transaction APPROVED)`);

  return await syncMultipleTransactionsToAccounting(
    pendingTransactions as Transaction[],
    accounts,
    userId,
    mapping
  );
}
