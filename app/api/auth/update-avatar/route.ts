import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/services/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { userId, avatarUrl } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update avatar_url in database
    const { data, error } = await supabase
      .from('users')
      .update({ 
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating avatar:', error);
      return NextResponse.json(
        { error: 'Không thể cập nhật avatar' },
        { status: 500 }
      );
    }

    // Return updated user (without password)
    const { password: _, ...userWithoutPassword } = data;

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Cập nhật avatar thành công',
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật avatar' },
      { status: 500 }
    );
  }
}
