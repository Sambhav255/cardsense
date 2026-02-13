// Limit input size to avoid token limits and cost; ~60k chars is safe for one request
const MAX_INPUT_CHARS = 60_000;
const MAX_FILE_SIZE_MB = 2;

export const analyzeStatement = async (text) => {
  const truncated = text.length > MAX_INPUT_CHARS
    ? text.slice(0, MAX_INPUT_CHARS) + "\n\n[Truncated for analysis.]"
    : text;

  // Production (e.g. Vercel): same origin, so relative /api/analyze. Local dev: Express runs on :3001.
  // Use relative path for API - works in both local dev and Vercel production
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: truncated }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      error.code = errorData.code || 'server_error';
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (err) {
    const msg = err?.message ?? String(err);
    const e = new Error(msg);
    
    if (err.code) {
      e.code = err.code;
    } else {
      e.code = msg.includes("ECONNREFUSED") || msg.includes("fetch") ? "network" : 
                msg.includes("quota") ? "quota" : "server";
    }
    
    throw e;
  }
};

export const validateFile = (file) => {
  const errors = [];
  
  // Check file type
  const allowedTypes = ['text/csv', 'text/plain', 'application/csv'];
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|txt)$/i)) {
    errors.push('Only CSV and text files are supported');
  }
  
  // Check file size
  const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
  }
  
  // Check if file is empty
  if (file.size === 0) {
    errors.push('File cannot be empty');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
