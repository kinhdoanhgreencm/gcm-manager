import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../_supabase';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const getAllSuperiors = async (userId: string): Promise<string[]> => {
  const superiorIds: string[] = [];
  const visited = new Set<string>();
  let currentUserId: string | null = userId;

  while (currentUserId) {
    if (visited.has(currentUserId)) break;
    visited.add(currentUserId);

    if (!supabase) break;

    const { data: userData, error }: { data: { manager_id: string | null } | null; error: any } = await supabase
      .from('users')
      .select('manager_id')
      .eq('id', currentUserId)
      .single();

    if (error || !userData || !userData.manager_id) {
      break;
    }

    superiorIds.push(userData.manager_id);
    currentUserId = userData.manager_id;
  }

  return superiorIds;
};

const getAllSubordinates = async (userId: string): Promise<string[]> => {
  const subordinateIds: string[] = [];
  const visited = new Set<string>();

  const collectSubordinates = async (managerId: string) => {
    if (visited.has(managerId)) return;
    visited.add(managerId);

    if (!supabase) return;

    const { data: subordinates, error } = await supabase
      .from('users')
      .select('id')
      .eq('manager_id', managerId);

    if (error) {
      console.error('Error fetching subordinates:', error);
      return;
    }

    if (subordinates && subordinates.length > 0) {
      for (const subordinate of subordinates) {
        subordinateIds.push(subordinate.id);
        await collectSubordinates(subordinate.id);
      }
    }
  };

  await collectSubordinates(userId);
  return subordinateIds;
};

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const mode = searchParams.get('mode');

    if (!userId || !mode) {
      return errorResponse('Thiếu userId hoặc mode', 400);
    }

    if (mode === 'superiors') {
      const superiors = await getAllSuperiors(userId);
      return NextResponse.json({ ids: superiors });
    }

    if (mode === 'subordinates') {
      const subordinates = await getAllSubordinates(userId);
      return NextResponse.json({ ids: subordinates });
    }

    return errorResponse('Mode không hợp lệ', 400);
  } catch (error: any) {
    console.error('Error in hierarchy API:', error);
    return errorResponse(error.message || 'Lỗi server khi tải hierarchy');
  }
}
