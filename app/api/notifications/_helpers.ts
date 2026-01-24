import type { SupabaseClient } from '@supabase/supabase-js';

export interface NotificationPayload {
  userIds: string[];
  title: string;
  message: string;
  type?: string;
  referenceType?: string;
  referenceId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export const insertNotifications = async (
  supabase: SupabaseClient,
  payload: NotificationPayload
) => {
  const {
    userIds,
    title,
    message,
    type = 'INFO',
    referenceType,
    referenceId,
    actionUrl,
    metadata
  } = payload;

  try {
    const { data: createdNotifications, error: functionError } = await supabase
      .rpc('insert_notifications', {
        p_user_ids: userIds,
        p_title: title,
        p_message: message,
        p_type: type,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null,
        p_action_url: actionUrl || null,
        p_metadata: metadata || null
      });

    if (!functionError && createdNotifications && createdNotifications.length > 0) {
      return createdNotifications;
    }

    if (functionError) {
      console.log('Function error (will try direct insert):', functionError);
      console.log('Function error details:', JSON.stringify(functionError, null, 2));
    }
  } catch (functionErr: any) {
    console.log('Function not available or error:', functionErr?.message || functionErr);
  }

  const notifications = userIds.map((userId: string) => ({
    user_id: userId,
    title: title,
    message: message,
    type: type,
    reference_type: referenceType || null,
    reference_id: referenceId || null,
    action_url: actionUrl || null,
    metadata: metadata || null
  }));

  const { data: createdNotifications, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (error) {
    throw error;
  }

  return createdNotifications || [];
};
