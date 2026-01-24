/**
 * Debt Service
 * Service để làm việc với bảng debt_records
 */

import { supabase } from './supabaseClient';
import { DebtRecord, DebtType, DebtStatus } from '@/types';

export interface DebtRecordDB {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  partner_id: string;
  partner_type: 'CUSTOMER' | 'SUPPLIER';
  partner_name: string;
  partner_code: string | null;
  partner_phone: string | null;
  reference_id: string;
  reference_type: 'CONTRACT' | 'SUPPLIER';
  reference_code: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: 'PAID' | 'OVERDUE' | 'DUE' | 'NOT_DUE';
  notes: string | null;
  last_payment_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert DebtRecordDB từ database sang DebtRecord interface
 */
function convertToDebtRecord(dbRecord: DebtRecordDB): DebtRecord {
  return {
    id: dbRecord.id,
    code: `CN-${dbRecord.reference_code}`,
    type: dbRecord.type as DebtType,
    partnerId: dbRecord.partner_id,
    partnerName: dbRecord.partner_name,
    partnerCode: dbRecord.partner_code || '',
    referenceId: dbRecord.reference_id,
    referenceCode: dbRecord.reference_code,
    totalAmount: Number(dbRecord.total_amount),
    paidAmount: Number(dbRecord.paid_amount),
    remainingAmount: Number(dbRecord.remaining_amount),
    dueDate: dbRecord.due_date 
      ? new Date(dbRecord.due_date).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : '',
    status: dbRecord.status as DebtStatus,
    lastPaymentDate: dbRecord.last_payment_date || undefined,
    notes: dbRecord.notes || undefined
  };
}

/**
 * Lấy tất cả công nợ phải thu từ bảng debt_records
 */
export async function fetchReceivableDebtsFromDB(): Promise<DebtRecord[]> {
  try {
    const { data, error } = await supabase
      .from('debt_records')
      .select('*')
      .eq('type', 'RECEIVABLE')
      .gt('remaining_amount', 0)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return (data || []).map(convertToDebtRecord);
  } catch (error: any) {
    console.error('Error fetching receivable debts from DB:', error);
    throw error;
  }
}

/**
 * Lấy tất cả công nợ phải trả từ bảng debt_records
 */
export async function fetchPayableDebtsFromDB(): Promise<DebtRecord[]> {
  try {
    const { data, error } = await supabase
      .from('debt_records')
      .select('*')
      .eq('type', 'PAYABLE')
      .gt('remaining_amount', 0)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return (data || []).map(convertToDebtRecord);
  } catch (error: any) {
    console.error('Error fetching payable debts from DB:', error);
    throw error;
  }
}

/**
 * Lấy tất cả công nợ từ bảng debt_records
 */
export async function fetchAllDebtsFromDB(): Promise<DebtRecord[]> {
  try {
    const { data, error } = await supabase
      .from('debt_records')
      .select('*')
      .gt('remaining_amount', 0)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return (data || []).map(convertToDebtRecord);
  } catch (error: any) {
    console.error('Error fetching all debts from DB:', error);
    throw error;
  }
}

/**
 * Lấy công nợ theo ID
 */
export async function fetchDebtById(debtId: string): Promise<DebtRecord | null> {
  try {
    const { data, error } = await supabase
      .from('debt_records')
      .select('*')
      .eq('id', debtId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data ? convertToDebtRecord(data) : null;
  } catch (error: any) {
    console.error('Error fetching debt by ID:', error);
    throw error;
  }
}

/**
 * Lấy công nợ theo reference (contract hoặc supplier)
 */
export async function fetchDebtByReference(
  referenceType: 'CONTRACT' | 'SUPPLIER',
  referenceId: string
): Promise<DebtRecord | null> {
  try {
    const { data, error } = await supabase
      .from('debt_records')
      .select('*')
      .eq('reference_type', referenceType)
      .eq('reference_id', referenceId)
      .gt('remaining_amount', 0)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data ? convertToDebtRecord(data) : null;
  } catch (error: any) {
    console.error('Error fetching debt by reference:', error);
    throw error;
  }
}

/**
 * Lấy công nợ quá hạn
 */
export async function fetchOverdueDebts(): Promise<DebtRecord[]> {
  try {
    const { data, error } = await supabase
      .from('debt_records')
      .select('*')
      .eq('status', 'OVERDUE')
      .gt('remaining_amount', 0)
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(convertToDebtRecord);
  } catch (error: any) {
    console.error('Error fetching overdue debts:', error);
    throw error;
  }
}

/**
 * Lấy công nợ đến hạn trong N ngày tới
 */
export async function fetchUpcomingDebts(days: number = 7): Promise<DebtRecord[]> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
      .from('debt_records')
      .select('*')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .gt('remaining_amount', 0)
      .order('due_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(convertToDebtRecord);
  } catch (error: any) {
    console.error('Error fetching upcoming debts:', error);
    throw error;
  }
}

/**
 * Sync tất cả công nợ (gọi RPC function)
 */
export async function syncAllDebts(): Promise<void> {
  try {
    const { error } = await supabase.rpc('sync_all_debts');
    if (error) throw error;
  } catch (error: any) {
    console.error('Error syncing all debts:', error);
    throw error;
  }
}

/**
 * Sync công nợ phải thu
 */
export async function syncReceivableDebts(): Promise<void> {
  try {
    const { error } = await supabase.rpc('sync_receivable_debts');
    if (error) throw error;
  } catch (error: any) {
    console.error('Error syncing receivable debts:', error);
    throw error;
  }
}

/**
 * Sync công nợ phải trả
 */
export async function syncPayableDebts(): Promise<void> {
  try {
    const { error } = await supabase.rpc('sync_payable_debts');
    if (error) throw error;
  } catch (error: any) {
    console.error('Error syncing payable debts:', error);
    throw error;
  }
}

/**
 * Lấy thống kê công nợ
 */
export interface DebtStats {
  totalReceivable: number;
  totalPayable: number;
  totalOverdue: number;
  upcomingDueAmount: number;
  receivableCount: number;
  payableCount: number;
  overdueCount: number;
}

export async function getDebtStats(): Promise<DebtStats> {
  try {
    // Lấy tất cả công nợ
    const { data, error } = await supabase
      .from('debt_records')
      .select('type, status, remaining_amount, due_date')
      .gt('remaining_amount', 0);

    if (error) throw error;

    const debts = data || [];
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const stats: DebtStats = {
      totalReceivable: 0,
      totalPayable: 0,
      totalOverdue: 0,
      upcomingDueAmount: 0,
      receivableCount: 0,
      payableCount: 0,
      overdueCount: 0
    };

    debts.forEach((debt: any) => {
      const amount = Number(debt.remaining_amount || 0);
      
      if (debt.type === 'RECEIVABLE') {
        stats.totalReceivable += amount;
        stats.receivableCount++;
      } else if (debt.type === 'PAYABLE') {
        stats.totalPayable += amount;
        stats.payableCount++;
      }

      if (debt.status === 'OVERDUE') {
        stats.totalOverdue += amount;
        stats.overdueCount++;
      }

      // Tính dự chi tuần tới
      if (debt.due_date) {
        const dueDate = new Date(debt.due_date);
        if (dueDate >= today && dueDate <= nextWeek) {
          stats.upcomingDueAmount += amount;
        }
      }
    });

    return stats;
  } catch (error: any) {
    console.error('Error getting debt stats:', error);
    throw error;
  }
}
