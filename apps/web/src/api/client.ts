// Next.js environment variable - must be prefixed with NEXT_PUBLIC_
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export const apiFetch = async (path: string, options: FetchOptions = {}) => {
  try {
    const url = `${API_URL}${path}`;
    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token && options.token !== 'cookie' ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle network errors
    if (!res.ok) {
      let errorMessage = 'Request failed';
      let errorData: any = null;
      try {
        errorData = await res.json();
        // Handle API error format: { error: { code, message, details } }
        if (errorData?.error) {
          errorMessage = errorData.error.message || `Error: ${errorData.error.code || 'UNKNOWN'}`;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        }
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        console.error('Failed to parse error response:', parseError);
      }
      const error = new Error(errorMessage);
      // Attach the full error data for debugging (if available)
      if (errorData) {
        (error as any).errorData = errorData;
      }
      console.error(`API Error [${res.status}]:`, url, errorMessage, errorData);
      throw error;
    }

    // Parse JSON response
    const data = await res.json();
    
    // If response has pagination, return the full object (for list endpoints)
    // Otherwise, unwrap the data property if it exists
    if (data.pagination) {
      return data; // Return full object with data and pagination
    }
    return data.data ?? data;
  } catch (error) {
    // Handle network errors (connection refused, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error(`Unable to connect to server. Please ensure the API is running at ${API_URL}`);
      console.error('Network error:', networkError.message, error);
      throw networkError;
    }
    // Re-throw other errors
    console.error('API fetch error:', path, error);
    throw error;
  }
};
