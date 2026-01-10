/**
 * Supabase Client Configuration
 *
 * This module initializes and exports the Supabase client for use throughout the app.
 * Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables (Vite automatically loads from .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get 3 random available states for the user to choose from
 * @returns {Promise<Array>} Array of 3 available states
 */
export async function getRandomStates() {
  const { data, error } = await supabase.rpc('get_random_available_states', { n: 3 });

  if (error) {
    console.error('Error getting random states:', error);
    throw error;
  }

  return data;
}

/**
 * Claim a specific state with user's email and name
 * @param {string} canonicalId - The canonical ID of the state to claim
 * @param {string} email - User's email
 * @param {string} nombre - User's name (optional)
 * @returns {Promise<Object>} The claimed state data
 */
export async function claimState(canonicalId, email, nombre = '') {
  const { data, error } = await supabase.rpc('claim_specific_state', {
    p_canonical_id: canonicalId,
    p_user_id: null, // No authentication, just email
    p_nombre: nombre,
    p_email: email
  });

  if (error) {
    console.error('Error claiming state:', error);
    throw error;
  }

  return data[0]; // RPC returns array, we want the first item
}

/**
 * Get statistics about claimed states
 * @returns {Promise<Object>} Stats object with total, claimed, and available counts
 */
export async function getClaimStats() {
  const { data, error } = await supabase.rpc('get_claim_stats');

  if (error) {
    console.error('Error getting stats:', error);
    throw error;
  }

  return data[0];
}

/**
 * Get all claimed state canonical IDs
 * @returns {Promise<Set<string>>} Set of claimed canonical IDs
 */
export async function getClaimedStateIds() {


  const { data, error } = await supabase.rpc('get_claimed_canonical_ids');

  if (error) {
    console.error('Error getting claimed states:', error);
    throw error;
  }

  return new Set(data.map(state => state.canonical_id));
}
