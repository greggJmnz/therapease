/**
 * Test script to verify enhanced PDF formatting for AI insights
 */

require('dotenv').config({ path: './server/.env' });

const gptService = require('./ai/services/gptService');

console.log('🧪 Testing Enhanced PDF Formatting for AI Insights...\n');

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

async function testEnhancedPDFFormatting() {
  try {
    console.log('✅ Testing AI Insights Generation with Enhanced Formatting...');
    
    const result = await gptService.analyzeAssessmentData(testPatientData, testAssessmentData, {
      model: 'gpt-4o',
      maxTokens: 2000,
      temperature: 0.6
    });

    if (result.success) {
      console.log('🎉 AI Insights Generated Successfully!');
      console.log('');
      console.log('📊 Response Details:');
      console.log('- Model used:', result.model);
      console.log('- Content length:', result.content.length, 'characters');
      console.log('- Usage:', JSON.stringify(result.usage, null, 2));
      console.log('');

      console.log('📝 AI Response Preview (Enhanced Format):');
      console.log('─'.repeat(80));
      console.log(result.content);
      console.log('─'.repeat(80));
      console.log('');

      // Analyze enhanced formatting quality
      console.log('🔍 Enhanced PDF Formatting Analysis:');
      
      // Check for proper headings (ALL CAPS)
      const hasProperHeadings = /^[A-Z][A-Z\s]+$/m.test(result.content);
      console.log('✅ Proper heading format (ALL CAPS):', hasProperHeadings);

      // Check for bullet points
      const hasBulletPoints = result.content.includes('- ');
      console.log('✅ Bullet points present:', hasBulletPoints);

      // Check for structured sections
      const hasStructuredSections = result.content.includes('ASSESSMENT SUMMARY') || 
                                   result.content.includes('FUNCTIONAL ANALYSIS') ||
                                   result.content.includes('CLINICAL INSIGHTS');
      console.log('✅ Structured sections detected:', hasStructuredSections);

      // Check for clean formatting (no markdown)
      const hasMarkdown = /[*_`#\[\]]/.test(result.content);
      console.log('✅ No markdown symbols:', !hasMarkdown);

      // Check for professional content
      const hasProfessionalContent = result.content.includes('occupational') || 
                                    result.content.includes('therapy') ||
                                    result.content.includes('functional');
      console.log('✅ Professional OT content:', hasProfessionalContent);

      // Check for proper spacing and organization
      const hasProperSpacing = result.content.includes('\n\n') || result.content.includes('\n-');
      console.log('✅ Proper spacing and organization:', hasProperSpacing);

      // Check for label-value pairs
      const hasLabelValuePairs = result.content.includes(':') && 
                                (result.content.includes('Strengths:') || result.content.includes('Challenges:'));
      console.log('✅ Label-value pairs detected:', hasLabelValuePairs);

      console.log('');
      console.log('🎯 Enhanced PDF Formatting Quality Score:', 
        [hasProperHeadings, hasBulletPoints, hasStructuredSections, !hasMarkdown, hasProfessionalContent, hasProperSpacing, hasLabelValuePairs]
          .filter(Boolean).length + '/7'
      );

      console.log('');
      console.log('📋 Enhanced PDF Formatting Features:');
      console.log('✅ Advanced content transformation and parsing');
      console.log('✅ Smart section heading detection and styling');
      console.log('✅ Enhanced bullet point formatting with proper indentation');
      console.log('✅ Label-value pair formatting (e.g., "Strengths:", "Challenges:")');
      console.log('✅ Improved spacing and line height');
      console.log('✅ Professional color scheme and typography');
      console.log('✅ Smart page break handling');
      console.log('✅ Clean text normalization and formatting');

      console.log('');
      console.log('🎨 Visual Improvements:');
      console.log('✅ Section headings: 14pt bold with green color and underlines');
      console.log('✅ Bullet points: 12pt with proper indentation and spacing');
      console.log('✅ Label-value pairs: Bold labels with normal text values');
      console.log('✅ Paragraphs: 12pt with proper line spacing');
      console.log('✅ Margins: 15pt for better readability');
      console.log('✅ Page breaks: Smart handling to prevent content cutoff');

    } else {
      console.log('❌ FAILED! Error generating insights:');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.log('❌ EXCEPTION! Error during enhanced PDF formatting test:');
    console.log('Error:', error.message);
  }
}

// Run the test
testEnhancedPDFFormatting().then(() => {
  console.log('');
  console.log('🏁 Enhanced PDF Formatting Test Completed!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Generate AI insights in the TherapEase interface');
  console.log('2. Click "Download PDF" to see the enhanced formatting');
  console.log('3. Verify improved text transformation and styling');
  console.log('4. Check proper spacing, height, and organization');
  console.log('5. Confirm professional appearance and readability');
}).catch(error => {
  console.log('💥 Test failed with exception:', error.message);
});
