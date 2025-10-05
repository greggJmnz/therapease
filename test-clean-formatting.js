/**
 * Test script to verify clean, properly formatted AI insights output
 */

require('dotenv').config({ path: './server/.env' });

const gptService = require('./ai/services/gptService');

console.log('🧪 Testing Clean, Professional AI Insights Formatting...\n');

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
    }
  ],
  observations: 'Child demonstrated good eye contact during assessment. Showed difficulty with fine motor precision tasks like picking up small beads and using scissors. Required multiple prompts to complete structured activities but remained engaged throughout.',
  assessmentType: 'combined'
};

async function testCleanFormatting() {
  try {
    console.log('✅ Testing AI Insights with Clean Formatting...');
    console.log('');

    const result = await gptService.analyzeAssessmentData(testPatientData, testAssessmentData, {
      model: 'gpt-4o',
      maxTokens: 2000,
      temperature: 0.6
    });

    if (result.success) {
      console.log('🎉 SUCCESS! Clean formatting test passed!');
      console.log('');
      console.log('📝 Generated AI Insights (Clean Format):');
      console.log('─'.repeat(80));
      console.log(result.content);
      console.log('─'.repeat(80));
      console.log('');

      // Analyze formatting quality
      console.log('🔍 Formatting Quality Analysis:');
      
      // Check for AI disclaimers
      const hasDisclaimers = /here is|here's|result|disclaimer|ai|artificial intelligence/i.test(result.content);
      console.log('✅ No AI disclaimers:', !hasDisclaimers);

      // Check for proper headings
      const hasProperHeadings = /^[A-Z][A-Z\s]+$/m.test(result.content);
      console.log('✅ Proper heading format (CAPS):', hasProperHeadings);

      // Check for bullet points
      const hasBulletPoints = result.content.includes('- ');
      console.log('✅ Bullet points present:', hasBulletPoints);

      // Check for markdown symbols
      const hasMarkdown = /[*_`#\[\]]/.test(result.content);
      console.log('✅ No markdown symbols:', !hasMarkdown);

      // Check for conversational filler
      const hasFiller = /let me|i'll|i will|i can|i would|i think|i believe/i.test(result.content);
      console.log('✅ No conversational filler:', !hasFiller);

      // Check for professional structure
      const hasStructure = result.content.includes('ASSESSMENT SUMMARY') || 
                          result.content.includes('FUNCTIONAL ANALYSIS') ||
                          result.content.includes('CLINICAL INSIGHTS');
      console.log('✅ Professional structure:', hasStructure);

      console.log('');
      console.log('🎯 Overall Formatting Score:', 
        [!hasDisclaimers, hasProperHeadings, hasBulletPoints, !hasMarkdown, !hasFiller, hasStructure]
          .filter(Boolean).length + '/6'
      );

    } else {
      console.log('❌ FAILED! Error generating insights:');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.log('❌ EXCEPTION! Error during formatting test:');
    console.log('Error:', error.message);
  }
}

// Run the test
testCleanFormatting().then(() => {
  console.log('');
  console.log('🏁 Clean Formatting Test Completed!');
}).catch(error => {
  console.log('💥 Test failed with exception:', error.message);
});
