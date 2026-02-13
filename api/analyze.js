import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const startTime = Date.now();
  
  try {
    const { text } = req.body;
    
    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input: text is required and must be a string',
        code: 'invalid_input'
      });
    }
    
    if (text.length > 60000) {
      return res.status(400).json({ 
        error: 'Text too long: maximum 60,000 characters allowed',
        code: 'text_too_long'
      });
    }
    
    console.log(`Processing text of length: ${text.length} characters`);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: GEMINI_API_KEY environment variable is required');
      return res.status(500).json({ 
        error: 'API key not configured', 
        code: 'missing_api_key'
      });
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are a financial data parser.
Analyze this credit card or bank statement text and estimate the total monthly spending in US dollars for the following categories:
- dining
- grocery 
- travel
- rent
- other (everything else)
Return ONLY a JSON object, no commentary or markdown.
Format exactly:
{"dining": 0, "grocery": 0, "travel": 0, "rent": 0, "other": 0}
Text to analyze:
${text}`;
    
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });
    } catch (modelError) {
      console.error('Model error:', modelError);
      // Fallback to older model if needed
      try {
        response = await ai.models.generateContent({
          model: "gemini-pro",
          contents: prompt,
        });
      } catch (fallbackError) {
        throw new Error('AI model unavailable');
      }
    }
    
    const raw = response?.text;
    if (raw == null || typeof raw !== "string") {
      throw new Error("No valid response from AI model");
    }
    
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    
    const result = {
      dining: Number(parsed.dining ?? 0),
      grocery: Number(parsed.grocery ?? 0),
      travel: Number(parsed.travel ?? 0),
      rent: Number(parsed.rent ?? 0),
      other: Number(parsed.other ?? 0),
    };
    
    console.log(`Analysis completed in ${Date.now() - startTime}ms`);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Analysis error:', error);
    
    let statusCode = 500;
    let errorCode = 'server_error';
    let errorMessage = 'Analysis failed due to server error';
    
    if (error.message.includes('quota') || error.message.includes('429')) {
      statusCode = 429;
      errorCode = 'quota_exceeded';
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message.includes('API key') || error.message.includes('403')) {
      statusCode = 403;
      errorCode = 'invalid_api_key';
      errorMessage = 'Invalid API key configuration.';
    } else if (error.message.includes('AI model unavailable')) {
      statusCode = 503;
      errorCode = 'model_unavailable';
      errorMessage = 'AI service temporarily unavailable.';
    } else if (error instanceof SyntaxError) {
      statusCode = 422;
      errorCode = 'parse_error';
      errorMessage = 'Failed to parse AI response.';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage, 
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
