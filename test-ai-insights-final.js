/**
 * Final test script to verify AI insights feature with real OpenAI API
 */

require('dotenv').config({ path: './server/.env' });

const gptService = require('./ai/services/gptService');

console.log('🧪 Testing AI Insights Feature with Real OpenAI API...\n');

// Test data for pediatric OT assessment
const testPatientData = {
  firstName: 'Emma',
  lastName: 'Johnson',
  age: 6,
  diagnosis: 'Developmental Coordination Disorder',
  therapyGoals: 'Improve fine motor skills, sensory processing, and self-care independence'
};

const testAssessmentData = {
  interviewQuestions: [
    {
      question: 'How does Emma handle daily self-care tasks like dressing and eating?',
      answer: 'She struggles with buttoning clothes and using utensils, but can put on loose clothing independently. She prefers finger foods over using utensils.'
    },
    {
      question: 'What activities does Emma enjoy most?',
      answer: 'She loves playing with blocks and drawing, especially with markers and crayons. She also enjoys sensory play with playdough.'
    },
    {
      question: 'How does Emma respond to different textures and sounds?',
      answer: 'She is sensitive to certain textures like tags in clothing and loud noises. She covers her ears during fire drills at school.'
    }
  ],
  observations: 'Child demonstrated good eye contact during assessment. Showed difficulty with fine motor precision tasks like picking up small beads and using scissors. Required multiple prompts to complete structured activities but remained engaged throughout. Showed signs of sensory seeking behavior with fidgeting and movement.',
  assessmentType: 'combined'
};

async function testAIInsights() {
  try {
    console.log('✅ Test 1: Environment Configuration');
    console.log('API Key Status:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not Set');
    console.log('API Key Preview:', process.env.OPENAI_API_KEY ? 
      process.env.OPENAI_API_KEY.substring(0, 8) + '...' + process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4) : 
      'Not available');
    console.log('');

    console.log('✅ Test 2: GPT Service Configuration');
    console.log('Model:', gptService.model);
    console.log('Max Tokens:', gptService.maxTokens);
    console.log('Temperature:', gptService.temperature);
    console.log('');

    console.log('✅ Test 3: Testing OpenAI API Connection...');
    const startTime = Date.now();
    
    const result = await gptService.analyzeAssessmentData(testPatientData, testAssessmentData, {
      model: 'gpt-4o', // Try GPT-4 instead of GPT-5
      maxTokens: 2000,
      temperature: 0.7
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000;
    
    console.log('Response time:', responseTime, 'seconds');
    console.log('');

    if (result.success) {
      console.log('🎉 SUCCESS! AI Insights Feature is Working!');
      console.log('');
      console.log('📊 Response Details:');
      console.log('- Model used:', result.model);
      console.log('- Content length:', result.content.length, 'characters');
      console.log('- Usage:', JSON.stringify(result.usage, null, 2));
      console.log('');

      console.log('📝 AI Response Preview:');
      console.log('─'.repeat(80));
      console.log('Content:', result.content);
      console.log('Content length:', result.content ? result.content.length : 'undefined');
      console.log('Full result:', JSON.stringify(result, null, 2));
      console.log('─'.repeat(80));
      console.log('');

      // Analyze response quality
      console.log('🔍 Response Quality Analysis:');
      
      // Check for OT-specific content
      const otKeywords = ['occupational', 'therapy', 'functional', 'sensory', 'motor', 'developmental', 'participation', 'activities of daily living'];
      const hasOTContent = otKeywords.some(keyword => 
        result.content.toLowerCase().includes(keyword)
      );
      console.log('✅ OT-specific terminology:', hasOTContent);

      // Check for structured sections
      const structuredIndicators = ['**', '##', '###', 'Assessment', 'Summary', 'Recommendations', 'Strengths', 'Challenges'];
      const hasStructure = structuredIndicators.some(indicator => 
        result.content.includes(indicator)
      );
      console.log('✅ Structured output:', hasStructure);

      // Check for child-centered language
      const childCenteredKeywords = ['child', 'emma', 'she', 'her', 'abilities', 'progress', 'development'];
      const hasChildCenteredLanguage = childCenteredKeywords.some(keyword => 
        result.content.toLowerCase().includes(keyword)
      );
      console.log('✅ Child-centered language:', hasChildCenteredLanguage);

      // Check for ethical compliance (no medical diagnoses)
      const medicalKeywords = ['diagnosis', 'disease', 'disorder', 'syndrome', 'pathology'];
      const hasMedicalLanguage = medicalKeywords.some(keyword => 
        result.content.toLowerCase().includes(keyword)
      );
      console.log('✅ Ethical compliance (no medical language):', !hasMedicalLanguage);

      // Check response length
      const isAppropriateLength = result.content.length > 500 && result.content.length < 3000;
      console.log('✅ Appropriate length (500-3000 chars):', isAppropriateLength);

      console.log('');
      console.log('🎯 Overall Quality Score:', 
        [hasOTContent, hasStructure, hasChildCenteredLanguage, !hasMedicalLanguage, isAppropriateLength]
          .filter(Boolean).length + '/5'
      );

    } else {
      console.log('❌ FAILED! AI Insights Error:');
      console.log('Error:', result.error);
      console.log('');
      console.log('🔍 Troubleshooting:');
      console.log('1. Check if OPENAI_API_KEY is valid');
      console.log('2. Verify the API key has proper permissions');
      console.log('3. Check if you have access to GPT-5 model');
      console.log('4. Verify your OpenAI account has sufficient credits');
    }
    
  } catch (error) {
    console.log('❌ EXCEPTION! Error during AI Insights test:');
    console.log('Error:', error.message);
    console.log('');
    console.log('🔍 Possible causes:');
    console.log('1. OPENAI_API_KEY not set correctly');
    console.log('2. Invalid API key format');
    console.log('3. Network connectivity issues');
    console.log('4. OpenAI service unavailable');
    console.log('5. GPT-5 model not available (try gpt-4 instead)');
  }
}

// Run the test
testAIInsights().then(() => {
  console.log('');
  console.log('🏁 AI Insights Test Completed!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. If successful, the AI Insights feature is ready for use');
  console.log('2. Access it through the Therapist portal in your browser');
  console.log('3. Generate insights for real patient assessments');
  console.log('4. Export insights as PDF reports');
}).catch(error => {
  console.log('💥 Test failed with exception:', error.message);
});
