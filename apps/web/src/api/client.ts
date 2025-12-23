// Next.js environment variable - must be prefixed with NEXT_PUBLIC_
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export const apiFetch = async (path: string, options: FetchOptions = {}) => {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
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
      } catch {
        // If response is not JSON, use status text
        errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      }
      const error = new Error(errorMessage);
      // Attach the full error data for debugging (if available)
      if (errorData) {
        (error as any).errorData = errorData;
      }
      throw error;
    }

    // Parse JSON response
    const data = await res.json();
    return data.data ?? data;
  } catch (error) {
    // Handle network errors (connection refused, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Unable to connect to server. Please ensure the API is running at ${API_URL}`);
    }
    // Re-throw other errors
    throw error;
  }
};
