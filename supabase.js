const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('⚠️ Warning: Supabase configuration missing. Database operations will fail.');
  // Create a mock client that will throw errors when used
  supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.reject(new Error('Supabase not configured')) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.reject(new Error('Supabase not configured')) }) }) })
    })
  };
}

module.exports = supabase;

