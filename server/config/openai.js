// Mock OpenAI service for development
// In production, this would be replaced with actual OpenAI integration

const mockOpenAI = {
  chat: {
    completions: {
      create: async (options) => {
        // Mock response
        return {
          choices: [{
            message: {
              content: "This is a mock AI response. OpenAI integration is not configured."
            }
          }],
          usage: { total_tokens: 0 },
          model: "gpt-4-mock"
        };
      }
    }
  }
};

// Test OpenAI connection (mock)
const testOpenAI = async () => {
  console.log('⚠️  Using mock OpenAI service (not configured)');
};

module.exports = { 
  openai: mockOpenAI, 
  testOpenAI 
};
