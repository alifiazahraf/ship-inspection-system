import { supabase } from '../supabaseClient';

/**
 * Log user activity to the database
 * @param {Object} logData - The activity data to log
 * @param {string} logData.user_id - User ID (UUID from auth.users)
 * @param {string} logData.user_email - User email
 * @param {string} logData.user_role - User role (admin/user)
 * @param {string} logData.activity_type - Type of activity (CREATE, UPDATE, DELETE, VIEW)
 * @param {string} logData.activity_description - Description of the activity
 * @param {string} logData.table_affected - Table that was affected
 * @param {number} logData.record_id - ID of the affected record
 * @param {number} logData.ship_id - Ship ID (if applicable)
 * @param {string} logData.ship_name - Ship name (if applicable)
 * @param {number} logData.finding_id - Finding ID (if applicable)
 * @param {Object} logData.old_data - Previous data (for updates)
 * @param {Object} logData.new_data - New data (for creates/updates)
 */
export const logActivity = async (logData) => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert([{
        user_id: logData.user_id,
        user_email: logData.user_email,
        user_role: logData.user_role,
        activity_type: logData.activity_type,
        activity_description: logData.activity_description,
        table_affected: logData.table_affected,
        record_id: logData.record_id || null,
        ship_id: logData.ship_id || null,
        ship_name: logData.ship_name || null,
        finding_id: logData.finding_id || null,
        old_data: logData.old_data || null,
        new_data: logData.new_data || null,
        timestamp: new Date().toISOString(),
        ip_address: null, // Could be implemented later
        user_agent: navigator.userAgent
      }]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Predefined activity types for consistency
export const ACTIVITY_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE', 
  DELETE: 'DELETE',
  VIEW: 'VIEW'
};

// Predefined table names for consistency
export const TABLES = {
  SHIPS: 'ships',
  FINDINGS: 'findings',
  ASSIGNMENTS: 'assignments'
};

// Helper function to extract user role from Supabase user object
const getUserRole = (user) => {
  // Try different possible locations for role
  if (user?.user_metadata?.role) {
    return user.user_metadata.role;
  }
  if (user?.role) {
    return user.role;
  }
  if (user?.raw_user_meta_data?.role) {
    return user.raw_user_meta_data.role;
  }
  // Default fallback - determine by checking if it's admin dashboard
  return 'user'; // Default to user instead of admin
};

// Helper function to validate role
const validateRole = (role) => {
  const validRoles = ['admin', 'user'];
  return validRoles.includes(role) ? role : 'user';
};

// Helper functions for common logging scenarios
export const logShipActivity = async (user, activityType, description, ship, oldData = null, newData = null) => {
  try {
    const userRole = validateRole(getUserRole(user));
    await logActivity({
      user_id: user.id, // This should be UUID from auth.users
      user_email: user.email,
      user_role: userRole,
      activity_type: activityType,
      activity_description: description,
      table_affected: TABLES.SHIPS,
      record_id: ship?.id,
      ship_id: ship?.id,
      ship_name: ship?.ship_name,
      old_data: oldData,
      new_data: newData
    });
  } catch (error) {
    console.error('Error in logShipActivity:', error);
  }
};

export const logFindingActivity = async (user, activityType, description, finding, ship, oldData = null, newData = null) => {
  try {
    const userRole = validateRole(getUserRole(user));
    await logActivity({
      user_id: user.id, // This should be UUID from auth.users
      user_email: user.email,
      user_role: userRole,
      activity_type: activityType,
      activity_description: description,
      table_affected: TABLES.FINDINGS,
      record_id: finding?.id,
      ship_id: ship?.id,
      ship_name: ship?.ship_name,
      finding_id: finding?.id,
      old_data: oldData,
      new_data: newData
    });
  } catch (error) {
    console.error('Error in logFindingActivity:', error);
  }
};

export const logAssignmentActivity = async (user, activityType, description, assignment, ship, oldData = null, newData = null) => {
  try {
    const userRole = validateRole(getUserRole(user));
    await logActivity({
      user_id: user.id, // This should be UUID from auth.users
      user_email: user.email,
      user_role: userRole,
      activity_type: activityType,
      activity_description: description,
      table_affected: TABLES.ASSIGNMENTS,
      record_id: assignment?.id,
      ship_id: ship?.id,
      ship_name: ship?.ship_name,
      old_data: oldData,
      new_data: newData
    });
  } catch (error) {
    console.error('Error in logAssignmentActivity:', error);
  }
}; 