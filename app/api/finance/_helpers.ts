import { supabase } from './_supabase';

export const linkPaymentSchedules = async (
  contractId: string,
  transactionId: string,
  amount: number,
  description: string
) => {
  if (!supabase) return;

  const { data: allPendingSchedules, error: allSchedulesError } = await supabase
    .from('payment_schedules')
    .select('id, amount, milestone_name, status')
    .eq('contract_id', contractId)
    .in('status', ['PENDING', 'OVERDUE'])
    .is('transaction_id', null);

  if (allSchedulesError || !allPendingSchedules || allPendingSchedules.length === 0) {
    return;
  }

  const totalPendingAmount = allPendingSchedules.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  if (amount >= totalPendingAmount - 1000) {
    const scheduleIds = allPendingSchedules.map(s => s.id);
    await supabase
      .from('payment_schedules')
      .update({ transaction_id: transactionId })
      .in('id', scheduleIds);
    return;
  }

  const milestoneMatch = description.match(/Thu tiền:\s*([^-]+)/);
  if (milestoneMatch) {
    const milestoneName = milestoneMatch[1].trim();
    const matchingSchedule = allPendingSchedules.find(s => 
      s.milestone_name === milestoneName &&
      Math.abs(Number(s.amount) - amount) < 1000
    );

    if (matchingSchedule) {
      await supabase
        .from('payment_schedules')
        .update({ transaction_id: transactionId })
        .eq('id', matchingSchedule.id);
      return;
    }
  }

  const matchingByAmount = allPendingSchedules.find(s => 
    Math.abs(Number(s.amount) - amount) < 1000
  );
  if (matchingByAmount) {
    await supabase
      .from('payment_schedules')
      .update({ transaction_id: transactionId })
      .eq('id', matchingByAmount.id);
    return;
  }

  if (allPendingSchedules.length === 1) {
    await supabase
      .from('payment_schedules')
      .update({ transaction_id: transactionId })
      .eq('id', allPendingSchedules[0].id);
  }
};
