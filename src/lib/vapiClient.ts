import { VapiClient, VapiError, Vapi } from "@vapi-ai/server-sdk";

// Ensure we have the API key from environment variables
const API_KEY = process.env.VAPI_API_KEY;

if (!API_KEY) {
  console.error("Missing VAPI_API_KEY environment variable");
}

// Create a singleton client instance
let client: VapiClient | null = null;

export const getVapiClient = (): VapiClient => {
  if (!client && API_KEY) {
    client = new VapiClient({ token: API_KEY });
  }

  if (!client) {
    throw new Error(
      "VAPI client could not be initialized. Check your API key."
    );
  }

  return client;
};

// Augment the response type to handle different call response formats
export interface VapiCallResponse extends Vapi.CallsCreateResponse {
  id?: string;
  callId?: string;
}

// Error handling wrapper for API calls
export const executeVapiCall = async <T>(
  apiCall: () => Promise<T>,
  errorMessage = "Error executing VAPI API call"
): Promise<{ data: T | null; error: string | null }> => {
  try {
    const result = await apiCall();
    return { data: result, error: null };
  } catch (err) {
    console.error(`VAPI API Error:`, err);

    if (err instanceof VapiError) {
      return {
        data: null,
        error: `${errorMessage}: ${err.message} (Status: ${err.statusCode})`,
      };
    }

    return {
      data: null,
      error: `${errorMessage}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};

// Re-export types from the SDK for use in the application
export { Vapi, VapiError };
