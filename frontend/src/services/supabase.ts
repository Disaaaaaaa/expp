import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { Question } from '@/types/exam';
import { DbTask, TaskSheet } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});


export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  preferences?: any;
  created_at: string;
  updated_at?: string;
};

export type UserSettings = {
  user_id: string;
  theme: 'light' | 'dark';
  language: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at?: string;
};

const mapTaskToDb = (task: Question, userId: string): Omit<DbTask, 'created_at' | 'updated_at'> => {
  
  const taskId = task.id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(task.id) 
    ? task.id 
    : uuidv4();

  return {
    id: taskId,
    user_id: userId,
    text: task.text,
    type: task.type,
    topic: task.topic,
    difficulty: task.difficulty,
    answer: task.answers?.join(', ') || null,
    solution: task.solution || null
  };
};

export async function getTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return { data, error };
}

export async function deleteTasks(taskIds: string[]) {
  console.log('deleteTasks called with:', taskIds);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user');
    throw new Error('User not authenticated');
  }

  console.log('User ID:', user.id);

  if (!taskIds || taskIds.length === 0) {
    throw new Error('No task IDs provided');
  }

  try {
    // Try using the database function first (if it exists)
    console.log('Attempting to use soft_delete_tasks function...');
    const { data: functionData, error: functionError } = await supabase.rpc('soft_delete_tasks', {
      task_ids: taskIds,
      current_user_id: user.id
    });

    console.log('Function result:', { functionData, functionError });

    // If function exists and works, use it
    if (!functionError) {
      const deletedCount = typeof functionData === 'number' ? functionData : (Array.isArray(functionData) ? functionData[0]?.deleted_count : functionData);
      console.log('Function deleted count:', deletedCount);
      if (deletedCount > 0) {
        console.log('Successfully deleted via function');
        return { data: { deleted_count: deletedCount }, error: null };
      } else if (deletedCount === 0) {
        console.warn('Function returned 0 deleted rows');
      }
    } else {
      console.warn('Function error (will try direct UPDATE):', functionError);
    }

    // Fallback to direct UPDATE
    console.log('Trying direct UPDATE method...');
    
    // First verify we can see the tasks
    const { data: verifyTasks, error: verifyError } = await supabase
      .from('tasks')
      .select('id, user_id, deleted_at')
      .in('id', taskIds)
      .is('deleted_at', null);

    console.log('Verify tasks result:', { verifyTasks, verifyError });

    if (verifyError) {
      throw new Error(`Cannot verify tasks: ${verifyError.message}`);
    }

    if (!verifyTasks || verifyTasks.length === 0) {
      throw new Error('No tasks found to delete (they may already be deleted)');
    }

    // Check ownership
    const unauthorizedTasks = verifyTasks.filter(task => task.user_id !== user.id);
    if (unauthorizedTasks.length > 0) {
      throw new Error('Unauthorized: You do not own some of these tasks');
    }

    // Try UPDATE first (soft delete)
    console.log('Attempting UPDATE (soft delete)...');
    const { data, error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', taskIds)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('id');

    console.log('UPDATE result:', { data, error });

    if (error) {
      console.error('UPDATE error details:', JSON.stringify(error, null, 2));
      
      // If UPDATE fails, try hard delete as fallback
      console.log('UPDATE failed, trying hard DELETE as fallback...');
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('DELETE also failed:', deleteError);
        throw new Error(`Delete failed: ${error.message || error.code || 'Unknown error'}. Code: ${error.code || 'N/A'}. DELETE fallback also failed: ${deleteError.message}`);
      }

      console.log('Hard DELETE succeeded as fallback');
      return { data: { deleted_count: taskIds.length }, error: null };
    }

    // Check if any rows were actually updated
    if (!data || data.length === 0) {
      console.error('UPDATE returned no data - no rows were updated');
      console.log('Trying hard DELETE as fallback...');
      
      // Try hard delete as fallback
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Update failed: No rows were updated. Hard delete also failed. Please run the SQL migration to fix the UPDATE policy.');
      }

      console.log('Hard DELETE succeeded as fallback');
      return { data: { deleted_count: taskIds.length }, error: null };
    }

    console.log('Successfully deleted tasks (soft delete):', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error in deleteTasks:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to delete tasks: ${String(error)}`);
  }
}


export async function getSheets() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('task_sheets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching sheets:', error);
    throw error;
  }
}


export async function getSheetById(id: string) {
  try {
    
    const { data: sheet, error } = await supabase
      .from('task_sheets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')  
      .in('id', sheet.tasks);
    
    if (tasksError) throw tasksError;
    
    return { sheet, tasks };
  } catch (error) {
    console.error('Error fetching sheet:', error);
    throw error;
  }
}


export async function createSheet(title: string, description: string = '', taskIds: string[] = []) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('task_sheets')
      .insert({
        title,
        description,
        tasks: taskIds,
        user_id: user.id
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating sheet:', error);
    throw error;
  }
}


export async function updateSheet(sheetId: string, updates: Partial<{
  title: string;
  description: string;
  tasks: string[];
}>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const { data: sheet, error: checkError } = await supabase
      .from('task_sheets')
      .select('user_id')
      .eq('id', sheetId)
      .single();
      
    if (checkError) throw checkError;
    if (!sheet) throw new Error('Sheet not found');
    if (sheet.user_id !== user.id) throw new Error('Unauthorized');
    
    
    const { data, error } = await supabase
      .from('task_sheets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sheetId)
      .select()
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error updating sheet:', error);
    throw error;
  }
}


export async function deleteSheets(sheetIds: string[]) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const { data: sheets, error: checkError } = await supabase
      .from('task_sheets')
      .select('id, user_id')
      .in('id', sheetIds);
      
    if (checkError) throw checkError;
    
    const unauthorizedSheets = sheets?.filter(sheet => sheet.user_id !== user.id);
    if (unauthorizedSheets && unauthorizedSheets.length > 0) {
      throw new Error('Unauthorized to delete some sheets');
    }
    
    
    const { data, error } = await supabase
      .from('task_sheets')
      .delete()
      .in('id', sheetIds);
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting sheets:', error);
    throw error;
  }
}


export async function copySheet(sheetId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const original = await getSheetById(sheetId);
    
    
    const { data, error } = await supabase
      .from('task_sheets')
      .insert({
        title: `${original.sheet.title} (Copy)`,
        description: original.sheet.description,
        tasks: original.sheet.tasks,
        user_id: user.id
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    return data.id;
  } catch (error) {
    console.error('Error copying sheet:', error);
    throw error;
  }
}


export async function shareSheet(sheetId: string, recipientEmail: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const { data: sheet, error: checkError } = await supabase
      .from('task_sheets')
      .select('*')
      .eq('id', sheetId)
      .eq('user_id', user.id)
      .single();
      
    if (checkError) throw checkError;
    if (!sheet) throw new Error('Sheet not found');
    
    
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', recipientEmail)
      .single();
      
    if (recipientError) throw new Error('Recipient not found');
    
    
    const { data, error } = await supabase
      .from('shared_sheets')
      .insert({
        sheet_id: sheetId,
        owner_id: user.id,
        recipient_id: recipient.id,
        shared_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error sharing sheet:', error);
    throw error;
  }
}


export async function saveSheetVersion(sheetId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const { sheet } = await getSheetById(sheetId);
    
    
    const { data, error } = await supabase
      .from('sheet_versions')
      .insert({
        sheet_id: sheetId,
        title: sheet.title,
        description: sheet.description,
        tasks: sheet.tasks,
        created_at: new Date().toISOString(),
        user_id: user.id
      });
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error saving sheet version:', error);
    throw error;
  }
}


export async function getSheetVersions(sheetId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('sheet_versions')
      .select('*')
      .eq('sheet_id', sheetId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching sheet versions:', error);
    throw error;
  }
}

// Save tasks to Supabase
export async function saveTasks(tasks: Question[], returnIds = false): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const taskData = tasks.map(task => ({
      id: task.id,
      user_id: user.id,
      text: task.text,
      type: task.type,
      topic: task.topic,
      difficulty: task.difficulty,
      solution: task.solution || null,
      answer: task.answer || null
    }));
    
    const { data, error } = await supabase
      .from('tasks')
      .upsert(taskData, { onConflict: 'id' })
      .select('id');
    
    if (error) throw error;
    
    return returnIds ? (data?.map(item => item.id) || []) : [];
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
}


// Assign a sheet to a student by email
export async function assignSheetToStudent(sheetId: string, studentEmail: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Find the student by email
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', studentEmail) // Note: Make sure profiles table has email if needed, or join with auth.users
      .single();

    if (studentError || !student) {
      // Fallback: search in users if using Supabase Auth admin API (complex) 
      // or assume email exists in profiles as we added it
      throw new Error('Student not found with this email');
    }

    // 2. Create the assignment
    const { data, error } = await supabase
      .from('task_assignments')
      .insert({
        teacher_id: user.id,
        student_id: student.id,
        sheet_id: sheetId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error assigning sheet:', error);
    throw error;
  }
}

// Get assignments for the current student
export async function getStudentAssignments() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('task_assignments')
      .select(`
        *,
        teacher:teacher_id(first_name, last_name),
        sheet:sheet_id(title, description, tasks)
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
}

// Get all registered students (for teachers)
export async function getAllStudents() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .eq('role', 'student')
      .order('first_name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
}

export async function saveTaskSheet(sheet: Omit<TaskSheet, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    
    const taskIds = sheet.tasks;
    const { data: existingTasks, error: checkError } = await supabase
      .from('tasks')
      .select('id')
      .in('id', taskIds);
    
    if (checkError) throw checkError;
    
    const existingTaskIds = new Set(existingTasks?.map(t => t.id) || []);
    const missingTaskIds = taskIds.filter(id => !existingTaskIds.has(id));
    
    if (missingTaskIds.length > 0) {
      throw new Error(`Some tasks don't exist in the database: ${missingTaskIds.join(', ')}`);
    }
    
    
    const { data, error } = await supabase
      .from('task_sheets')
      .insert({
        ...sheet,
        user_id: user.id
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    return data.id;
  } catch (error) {
    console.error('Error saving task sheet:', error);
    throw error;
  }
}