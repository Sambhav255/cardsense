import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const startTime = Date.now();
  
  try {
    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: GEMINI_API_KEY environment variable is required');
      return res.status(500).json({ 
        error: 'API key not configured', 
        code: 'missing_api_key'
      });
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    // Parse the request body
    let text;
    try {
      if (typeof req.body === 'string') {
        const parsed = JSON.parse(req.body);
        text = parsed.text;
      } else {
        text = req.body.text;
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
      return res.status(400).json({ 
        error: 'Invalid request format',
        code: 'invalid_format'
      });
    }
    
    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input: text is required and must be a string',
        code: 'invalid_input'
      });
    }
    
    // Limit text to avoid timeout (Vercel has a 10-second limit)
    const maxChars = 15000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    console.log(`Processing text of length: ${truncatedText.length} characters`);
    
    const prompt = `You are a financial data parser. Analyze this bank statement text and estimate the total monthly spending in US dollars for these categories: dining, grocery, travel, rent, other.

Return ONLY a valid JSON object with no additional text or markdown formatting:
{"dining": 0, "grocery": 0, "travel": 0, "rent": 0, "other": 0}

StatementText:\n${truncatedText}`;

    // Call the Gemini API
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse the JSON response
    const cleanedText = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedText);
    
    // Validate and normalize the response
    const output = {
      dining: Number(parsed.dining ?? 0),
      grocery: Number(parsed.grocery ?? 0),
      travel: Number(parsed.travel ?? 0),
      rent: Number(parsed.rent ?? 0),
      other: Number(parsed.other ?? 0),
    };
    
    console.log(`Analysis completed in ${Date.now() - startTime}ms`);
    res.status(200).json(output);
    
  } catch (error) {
    console.error('Analysis error:', error);
    
    let statusCode = 500;
    let errorCode = 'server_error';
    let errorMessage = 'Analysis failed due to server error';
    
    if (error.message && error.message.includes('quota')) {
      statusCode = 429;
      errorCode = 'quota_exceeded';
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message && error.message.includes('API key')) {
      statusCode = 403;
      errorCode = 'invalid_api_key';
      errorMessage = 'Invalid API key configuration.';
    } else if (error.message && error.message.includes('timeout')) {
      statusCode = 504;
      errorCode = 'timeout';
      errorMessage = 'Request timed out. Please try with a shorter statement.';
    } else if (error instanceof SyntaxError) {
      statusCode = 422;
      errorCode = 'parse_error';
      errorMessage = 'Failed to parse AI response.';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage, 
      code: errorCode
    });
  }
}
