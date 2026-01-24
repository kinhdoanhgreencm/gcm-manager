import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../../../_supabase';
import { linkPaymentSchedules } from '../../../_helpers';
import { TransactionStatus } from '@/types';

export const runtime = 'nodejs';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const updateVehicleTransactionStatusIfNeeded = async (contractId: string) => {
  if (!supabase) return;

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, vehicle_id, status')
    .eq('id', contractId)
    .single();

  if (contractError || !contract || !contract.vehicle_id) {
    return;
  }

  if (contract.status !== 'SIGNED' && contract.status !== 'PAYING') {
    return;
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('id, status, approved_at, created_at')
    .eq('reference_id', contractId)
    .eq('reference_type', 'CONTRACT')
    .in('status', [TransactionStatus.APPROVED, TransactionStatus.LOCKED])
    .order('approved_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (transactionsError) {
    return;
  }

  const approvedCount = transactions?.length || 0;
  let newStatus: string | null = null;
  if (approvedCount === 1) {
    newStatus = 'Đã cọc';
  } else if (approvedCount === 2) {
    newStatus = 'Đã xuất hóa đơn';
  } else if (approvedCount >= 3) {
    newStatus = 'Đã giao xe';
  }

  if (newStatus) {
    await supabase
      .from('vehicles')
      .update({ transaction_status: newStatus })
      .eq('id', contract.vehicle_id);
  }
};

const updateCustomerStatusOnContractCompleted = async (customerPhone: string, customerName?: string) => {
  if (!supabase || !customerPhone) return;

  let { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id, status')
    .eq('phone', customerPhone)
    .limit(1)
    .single();

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
    return;
  }

  if (customerData.status !== 'LOYAL') {
    await supabase
      .from('customers')
      .update({ status: 'LOYAL' })
      .eq('id', customerData.id);
  }
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow UPDATE.');
    }

    const { id } = await params;
    const transactionId = id;
    if (!transactionId) {
      return errorResponse('Transaction ID is required', 400);
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      return errorResponse('Không tìm thấy giao dịch', 404);
    }

    const formData = await request.formData();
    const userId = formData.get('userId') as string | null;
    const files = formData.getAll('files') as File[];

    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || typeof file.name !== 'string') continue;

      const fileExt = file.name.split('.').pop();
      const fileName = `transactions/${transactionId}/${Date.now()}-${i}.${fileExt}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from('ERP')
        .upload(fileName, fileBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream'
        });

      if (uploadError) {
        throw new Error(`Lỗi upload file "${file.name}": ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('ERP')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    const existingAttachments = transaction.attachments || [];
    const newAttachments = [...existingAttachments, ...uploadedUrls];

    const { data: accountData, error: accountFetchError } = await supabase
      .from('accounts')
      .select('balance, name')
      .eq('id', transaction.account_id)
      .single();

    if (accountFetchError || !accountData) {
      return errorResponse('Không tìm thấy tài khoản');
    }

    const currentBalance = Number(accountData.balance);
    let newBalance = currentBalance;

    if (transaction.status !== TransactionStatus.APPROVED) {
      if (transaction.type === 'INCOME') {
        newBalance = currentBalance + Number(transaction.amount);
      } else if (transaction.type === 'EXPENSE') {
        newBalance = currentBalance - Number(transaction.amount);
      }
    }

    if (newBalance !== currentBalance) {
      const { error: accountUpdateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', transaction.account_id);

      if (accountUpdateError) {
        return errorResponse(`Lỗi cập nhật số dư tài khoản: ${accountUpdateError.message}`);
      }
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        attachments: newAttachments,
        status: TransactionStatus.APPROVED,
        approved_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (updateError) {
      return errorResponse(updateError.message || 'Lỗi cập nhật giao dịch');
    }

    if (transaction.reference_type === 'CONTRACT' && transaction.reference_id) {
      try {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('id, total_amount, status, customer_phone, customer_name')
          .eq('id', transaction.reference_id)
          .single();

        if (contractData) {
          const { data: approvedTransactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('reference_type', 'CONTRACT')
            .eq('reference_id', transaction.reference_id)
            .in('status', ['APPROVED', 'LOCKED'])
            .eq('type', 'INCOME');

          const totalPaidAmount = approvedTransactions?.reduce(
            (sum, t) => sum + Number(t.amount || 0),
            0
          ) || 0;
          const totalAmount = Number(contractData.total_amount || 0);

          if (totalAmount > 0 && totalPaidAmount >= totalAmount && contractData.status !== 'COMPLETED') {
            await supabase
              .from('contracts')
              .update({
                status: 'COMPLETED',
                updated_by: userId || null
              })
              .eq('id', transaction.reference_id);

            await updateCustomerStatusOnContractCompleted(contractData.customer_phone || '', contractData.customer_name);
          }
        }

        if (transaction.type === 'INCOME') {
          const { data: schedules, error: schedulesError } = await supabase
            .from('payment_schedules')
            .select('id, amount, milestone_name, status, transaction_id')
            .eq('contract_id', transaction.reference_id)
            .in('status', ['PENDING', 'OVERDUE']);

          if (!schedulesError && schedules && schedules.length > 0) {
            const totalPendingAmount = schedules.reduce((sum, s) => sum + Number(s.amount || 0), 0);
            const transactionAmount = Number(transaction.amount || 0);

            if (transactionAmount >= totalPendingAmount - 1000) {
              const scheduleIds = schedules
                .filter(s => !s.transaction_id || s.transaction_id === transactionId)
                .map(s => s.id);

              if (scheduleIds.length > 0) {
                await supabase
                  .from('payment_schedules')
                  .update({
                    status: 'PAID',
                    transaction_id: transactionId,
                    paid_at: new Date().toISOString()
                  })
                  .in('id', scheduleIds);
              }
            } else {
              const matchingSchedule = schedules.find(s => 
                Math.abs(Number(s.amount) - transactionAmount) < 1000 &&
                (!s.transaction_id || s.transaction_id === transactionId)
              );

              if (matchingSchedule && matchingSchedule.status !== 'PAID') {
                await supabase
                  .from('payment_schedules')
                  .update({
                    status: 'PAID',
                    transaction_id: transactionId,
                    paid_at: new Date().toISOString()
                  })
                  .eq('id', matchingSchedule.id);
              } else if (!matchingSchedule && schedules.length > 0) {
                const firstPendingSchedule = schedules[0];
                if (!firstPendingSchedule.transaction_id) {
                  await supabase
                    .from('payment_schedules')
                    .update({
                      status: 'PAID',
                      transaction_id: transactionId,
                      paid_at: new Date().toISOString()
                    })
                    .eq('id', firstPendingSchedule.id);
                }
              }
            }
          } else {
            await linkPaymentSchedules(
              transaction.reference_id,
              transactionId,
              Number(transaction.amount || 0),
              transaction.description || ''
            );
          }
        }

        await updateVehicleTransactionStatusIfNeeded(transaction.reference_id);
      } catch (err) {
        console.error('Error processing contract updates:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in approve transaction API:', error);
    return errorResponse(error.message || 'Lỗi server khi duyệt giao dịch');
  }
}
