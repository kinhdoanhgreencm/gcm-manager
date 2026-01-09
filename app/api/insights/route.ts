import { NextRequest, NextResponse } from 'next/server';
import { getBusinessInsights } from '@/services/geminiService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventory, finance } = body;
    
    const insights = await getBusinessInsights(inventory || [], finance || []);
    
    return NextResponse.json({ insights });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

