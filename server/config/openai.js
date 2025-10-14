const OpenAI = require('openai');

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

// Test OpenAI connection
const testOpenAI = async () => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️  OPENAI_API_KEY not found in environment variables');
      return false;
    }
    
    // Test the connection with a simple request
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    console.log('✅ OpenAI API connection successful!');
    console.log('Model available:', response.model);
    return true;
  } catch (error) {
    console.log('❌ OpenAI API connection failed:', error.message);
    return false;
  }
};

module.exports = { 
  openai, 
  testOpenAI 
};
