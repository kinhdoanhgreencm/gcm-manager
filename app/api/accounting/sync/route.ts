import { NextRequest, NextResponse } from 'next/server';
import { syncAllPendingTransactions } from '@/services/accountingSyncService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accounts = body?.accounts || [];
    const userId = body?.userId;

    const result = await syncAllPendingTransactions(accounts, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in accounting sync API:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi server khi đồng bộ kế toán' },
      { status: 500 }
    );
  }
}
