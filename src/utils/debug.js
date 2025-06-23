// Debug utility for inspecting user object structure
// This helps identify where the role is stored in the user object

/**
 * Debug function to inspect user object structure
 * @param {Object} user - The user object from Supabase auth
 * @param {string} context - Context where this debug is called from
 */
export const debugUser = (user, context = 'Unknown') => {
  console.group(`🔍 Debug User Object - ${context}`);
  
  console.log('📋 Full user object:', user);
  
  console.log('🔑 Basic properties:');
  console.log('  - user.id:', user?.id);
  console.log('  - user.email:', user?.email);
  console.log('  - user.role:', user?.role);
  
  console.log('📦 Metadata properties:');
  console.log('  - user.user_metadata:', user?.user_metadata);
  console.log('  - user.user_metadata?.role:', user?.user_metadata?.role);
  console.log('  - user.raw_user_meta_data:', user?.raw_user_meta_data);
  console.log('  - user.raw_user_meta_data?.role:', user?.raw_user_meta_data?.role);
  
  console.log('🏷️ App metadata:');
  console.log('  - user.app_metadata:', user?.app_metadata);
  console.log('  - user.app_metadata?.role:', user?.app_metadata?.role);
  
  // Try to extract role using our helper function
  const extractedRole = getUserRole(user);
  console.log('✅ Extracted role:', extractedRole);
  
  console.groupEnd();
  
  return extractedRole;
};

/**
 * Helper function to extract user role (same as in logging.js)
 * @param {Object} user - The user object
 * @returns {string} - The user role ('admin' or 'user')
 */
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
  if (user?.app_metadata?.role) {
    return user.app_metadata.role;
  }
  // Default fallback
  return 'user';
};

/**
 * Validate that the role is acceptable for database constraint
 * @param {string} role - The role to validate
 * @returns {boolean} - Whether the role is valid
 */
export const validateRole = (role) => {
  const validRoles = ['admin', 'user'];
  const isValid = validRoles.includes(role);
  
  if (!isValid) {
    console.warn(`⚠️ Invalid role detected: "${role}". Valid roles are: ${validRoles.join(', ')}`);
  }
  
  return isValid;
};

/**
 * Safe role extraction with validation and fallback
 * @param {Object} user - The user object
 * @param {string} context - Context for debugging
 * @returns {string} - A valid role ('admin' or 'user')
 */
export const safeGetUserRole = (user, context = 'Unknown') => {
  const extractedRole = getUserRole(user);
  const isValid = validateRole(extractedRole);
  
  if (!isValid) {
    console.warn(`🚨 Invalid role "${extractedRole}" for user ${user?.email} in context: ${context}`);
    console.warn('🔄 Falling back to "user" role');
    return 'user';
  }
  
  return extractedRole;
};

/**
 * Log user info for debugging
 * @param {Object} user - The user object
 * @param {string} action - The action being performed
 */
export const logUserInfo = (user, action = 'Unknown action') => {
  const role = safeGetUserRole(user, action);
  console.log(`👤 User: ${user?.email} (${role}) performing: ${action}`);
  return role;
}; 