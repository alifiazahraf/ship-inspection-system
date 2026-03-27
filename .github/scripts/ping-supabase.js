/**
 * Keep-Alive Script for Supabase
 * 
 * This script pings Supabase periodically to prevent auto-pause
 * (Free tier projects are paused after 7 days of inactivity)
 * 
 * Run interval: Every 3 days
 * Buffer safety: 4 days before 7-day limit
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Environment variables (same naming as React app for consistency)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Missing required environment variables');
  console.error('   Required: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

/**
 * Primary ping method: Query auth schema
 */
async function pingAuthSchema() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  if (error) {
    throw new Error(`Auth schema query failed: ${error.message}`);
  }
  
  return { method: 'auth.users', data };
}

/**
 * Secondary ping method: Get authentication session
 */
async function pingAuthSession() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Auth session check failed: ${error.message}`);
  }
  
  return { method: 'auth.getSession', data };
}

/**
 * Tertiary ping method: REST API health check using axios
 */
async function pingRestApi() {
  const response = await axios.get(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    timeout: 10000  // 10 second timeout
  });
  
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`REST API ping failed: ${response.status}`);
  }
  
  return { method: 'rest.health', status: response.status };
}

/**
 * Last resort: Simple GET to Supabase root
 */
async function pingRootUrl() {
  const response = await axios.get(supabaseUrl, {
    timeout: 10000
  });
  
  return { method: 'root.url', status: response.status };
}

/**
 * Main ping function with retry logic
 */
async function pingWithRetry(maxRetries = 3) {
  const methods = [
    { name: 'Auth Schema Query', fn: pingAuthSchema },
    { name: 'Auth Session Check', fn: pingAuthSession },
    { name: 'REST API Health', fn: pingRestApi },
    { name: 'Root URL Ping', fn: pingRootUrl }
  ];
  
  for (const method of methods) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting ${method.name} (attempt ${attempt}/${maxRetries})...`);
        const result = await method.fn();
        
        console.log(`✅ SUCCESS: ${method.name}`);
        console.log(`   Method: ${result.method}`);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        
        return result;
      } catch (err) {
        console.warn(`⚠️  ${method.name} attempt ${attempt} failed: ${err.message}`);
        
        if (attempt < maxRetries) {
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }
  
  throw new Error('All ping methods exhausted');
}

/**
 * Main execution
 */
async function main() {
  console.log('🏓 Supabase Keep-Alive Ping Started');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    await pingWithRetry();
    console.log('');
    console.log('✅ Keep-alive ping completed successfully');
    console.log('   Project activity registered - pause timer reset');
    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('❌ Keep-alive ping FAILED');
    console.error(`   Error: ${err.message}`);
    console.error('   Action Required: Check Supabase dashboard and resume project if paused');
    process.exit(1);
  }
}

// Run main function
main();
