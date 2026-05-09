// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get the full API URL for a given endpoint
 * @param {string} endpoint - The API endpoint (e.g., '/api/vehicles')
 * @returns {string} - The full API URL
 */
export const getApiUrl = (endpoint) => {
  // If we're in production and have a VITE_API_URL, use it
  // Otherwise, use relative URLs (for local development with Vite proxy)
  if (API_BASE_URL) {
    return `${API_BASE_URL}${endpoint}`;
  }
  return endpoint;
};

export default getApiUrl;
