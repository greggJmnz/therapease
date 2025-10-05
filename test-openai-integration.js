/**
 * Test script to verify OpenAI API key integration
 */

const gptService = require('./ai/services/gptService');

console.log('🧪 Testing OpenAI API Key Integration...\n');

// Test data
const testPatientData = {
  firstName: 'Alexandra',
  lastName: 'Santos',
  age: 8,
  diagnosis: 'Autism Spectrum Disorder',
  therapyGoals: 'Improve fine motor skills and sensory processing'
};

const testAssessmentData = {
  interviewQuestions: [
    {
      question: 'How does your child handle daily self-care tasks like dressing and eating?',
      answer: 'She struggles with buttoning clothes and using utensils, but can put on loose clothing independently.'
    },
    {
      question: 'What activities does your child enjoy most?',
      answer: 'She loves playing with blocks and drawing, especially with markers and crayons.'
    }
  ],
  observations: 'Child demonstrated good eye contact during assessment. Showed difficulty with fine motor precision tasks like picking up small beads. Required multiple prompts to complete structured activities but remained engaged throughout.',
  assessmentType: 'combined'
};

async function testOpenAIIntegration() {
  try {
    console.log('✅ Test 1: GPT Service Configuration');
    console.log('Model:', gptService.model);
    console.log('Max Tokens:', gptService.maxTokens);
    console.log('Temperature:', gptService.temperature);
    console.log('');

    console.log('✅ Test 2: Testing OpenAI API Call...');
    console.log('Sending request to OpenAI API...');
    
    const startTime = Date.now();
    const result = await gptService.analyzeAssessmentData(testPatientData, testAssessmentData, {
      model: 'gpt-5',
      maxTokens: 1000, // Reduced for testing
      temperature: 0.7
    });
    const endTime = Date.now();
    
    console.log('Response time:', (endTime - startTime) / 1000, 'seconds');
    console.log('');

    if (result.success) {
      console.log('🎉 SUCCESS! OpenAI API is working correctly!');
      console.log('');
      console.log('📊 Response Details:');
      console.log('- Model used:', result.model);
      console.log('- Content length:', result.content.length, 'characters');
      console.log('- Usage:', JSON.stringify(result.usage, null, 2));
      console.log('');
      console.log('📝 AI Response Preview:');
      console.log('─'.repeat(50));
      console.log(result.content.substring(0, 500) + '...');
      console.log('─'.repeat(50));
      console.log('');
      
      // Check if response contains expected OT content
      const hasOTContent = result.content.toLowerCase().includes('occupational') || 
                          result.content.toLowerCase().includes('therapy') ||
                          result.content.toLowerCase().includes('functional');
      
      console.log('✅ OT-specific content detected:', hasOTContent);
      
      // Check if response has structured sections
      const hasStructuredSections = result.content.includes('**') || 
                                   result.content.includes('Assessment Summary') ||
                                   result.content.includes('Functional Analysis');
      
      console.log('✅ Structured sections detected:', hasStructuredSections);
      
    } else {
      console.log('❌ FAILED! OpenAI API Error:');
      console.log('Error:', result.error);
      console.log('');
      console.log('🔍 Troubleshooting:');
      console.log('1. Check if OPENAI_API_KEY is set correctly');
      console.log('2. Verify the API key has proper permissions');
      console.log('3. Check if you have access to GPT-5 model');
      console.log('4. Verify your OpenAI account has sufficient credits');
    }
    
  } catch (error) {
    console.log('❌ EXCEPTION! Error during API call:');
    console.log('Error:', error.message);
    console.log('');
    console.log('🔍 Possible causes:');
    console.log('1. OPENAI_API_KEY not set in environment');
    console.log('2. Invalid API key format');
    console.log('3. Network connectivity issues');
    console.log('4. OpenAI service unavailable');
  }
}

// Run the test
testOpenAIIntegration().then(() => {
  console.log('');
  console.log('🏁 Test completed!');
}).catch(error => {
  console.log('💥 Test failed with exception:', error.message);
});
