/**
 * Utility functions for user hierarchy management
 */

/**
 * Get all superior user IDs recursively (following manager_id chain upward)
 * @param userId The user ID to get superiors for
 * @returns Array of superior user IDs (including the user's direct manager and all higher-level managers)
 */
export async function getAllSuperiors(userId: string): Promise<string[]> {
  const response = await fetch(`/api/users/hierarchy?mode=superiors&userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  const result = await response.json();

  if (!response.ok) {
    console.error('Error fetching superiors:', result?.error || 'Unknown error');
    return [];
  }

  return result.ids || [];
}

/**
 * Get all subordinate user IDs recursively (following manager_id chain downward)
 * @param userId The user ID to get subordinates for
 * @returns Array of subordinate user IDs (including direct subordinates and all their subordinates)
 */
export async function getAllSubordinates(userId: string): Promise<string[]> {
  const response = await fetch(`/api/users/hierarchy?mode=subordinates&userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  const result = await response.json();

  if (!response.ok) {
    console.error('Error fetching subordinates:', result?.error || 'Unknown error');
    return [];
  }

  return result.ids || [];
}

/**
 * Get all user IDs that should have access to a user's data (user + superiors)
 * @param userId The user ID
 * @returns Array of user IDs (the user and all their superiors)
 */
export async function getUserAndSuperiors(userId: string): Promise<string[]> {
  const superiors = await getAllSuperiors(userId);
  return [userId, ...superiors];
}

/**
 * Get all user IDs that a manager can view data for (user + subordinates)
 * @param userId The manager user ID
 * @returns Array of user IDs (the manager and all their subordinates)
 */
export async function getUserAndSubordinates(userId: string): Promise<string[]> {
  const subordinates = await getAllSubordinates(userId);
  return [userId, ...subordinates];
}
