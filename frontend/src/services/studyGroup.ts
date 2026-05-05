import { supabase } from '@/services/supabase';
import type { StudyGroup, StudyGroupMember, GroupActivity } from '@/types/analytics';
import type { User } from '@supabase/supabase-js';

export async function createStudyGroup(
  name: string,
  description: string,
  subject: string,
  topics: string[],
  settings: StudyGroup['settings']
): Promise<StudyGroup> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const newGroup: Omit<StudyGroup, 'id'> = {
    name,
    description,
    subject,
    topics,
    created_at: new Date(),
    members: [{
      user_id: user.id,
      username: (user.user_metadata as { username?: string })?.username || 'Anonymous',
      role: 'admin',
      joined_at: new Date(),
      last_active: new Date(),
      contribution_score: 0
    }],
    settings,
    stats: {
      total_questions: 0,
      average_score: 0,
      active_members: 1,
      weekly_activity: 0
    }
  };

  const { data, error } = await supabase
    .from('study_groups')
    .insert([newGroup])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function joinStudyGroup(groupId: string): Promise<StudyGroupMember> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: group } = await supabase
    .from('study_groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (!group) throw new Error('Group not found');
  if (group.members.length >= group.settings.max_members) {
    throw new Error('Group is full');
  }

  const newMember: StudyGroupMember = {
    user_id: user.id,
    username: (user.user_metadata as { username?: string })?.username || 'Anonymous',
    role: 'member',
    joined_at: new Date(),
    last_active: new Date(),
    contribution_score: 0
  };

  const { data, error } = await supabase
    .from('study_groups')
    .update({
      members: [...group.members, newMember],
      'stats.active_members': group.members.length + 1
    })
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return newMember;
}

export async function recordGroupActivity(
  groupId: string,
  activity: Omit<GroupActivity, 'id' | 'group_id'>
): Promise<GroupActivity> {
  const { data, error } = await supabase
    .from('group_activities')
    .insert([{
      ...activity,
      group_id: groupId
    }])
    .select()
    .single();

  if (error) throw error;

  
  await updateGroupStats(groupId);

  return data;
}

async function updateGroupStats(groupId: string): Promise<void> {
  const { data: activities } = await supabase
    .from('group_activities')
    .select('*')
    .eq('group_id', groupId)
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const weeklyActivity = activities?.length || 0;

  const { error } = await supabase
    .from('study_groups')
    .update({
      'stats.weekly_activity': weeklyActivity
    })
    .eq('id', groupId);

  if (error) throw error;
}

export async function getGroupLeaderboard(groupId: string): Promise<StudyGroupMember[]> {
  const { data: group } = await supabase
    .from('study_groups')
    .select('members')
    .eq('id', groupId)
    .single();

  if (!group) throw new Error('Group not found');

  return group.members
    .sort((a: StudyGroupMember, b: StudyGroupMember) => b.contribution_score - a.contribution_score)
    .slice(0, 10);
}

export async function getGroupActivity(groupId: string, limit = 20): Promise<GroupActivity[]> {
  const { data, error } = await supabase
    .from('group_activities')
    .select('*')
    .eq('group_id', groupId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
} 