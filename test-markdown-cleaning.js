// Test script to verify markdown cleaning in PDF generation
const fs = require('fs');

// Test markdown cleaning function
function cleanMarkdownText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown **text**
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown *text*
    .replace(/#{1,6}\s*/g, '') // Remove markdown headers # ## ###
    .replace(/`(.*?)`/g, '$1') // Remove code markdown `text`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url)
    .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
    .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but keep newlines)
    .trim();
}

// Test cases with various markdown formatting
const testCases = [
  {
    name: "Bold and Italic Text",
    input: "**STRENGTHS**\n- *Strong* fine motor skills\n- **Excellent** attention span",
    expected: "STRENGTHS\n- Strong fine motor skills\n- Excellent attention span"
  },
  {
    name: "Headers and Code",
    input: "## Motor Skills\n### Fine Motor\n- `Grasping` objects\n- **Pincer** grip development",
    expected: "Motor Skills\nFine Motor\n- Grasping objects\n- Pincer grip development"
  },
  {
    name: "Links and Mixed Formatting",
    input: "Visit [OT Resources](https://example.com) for more info.\n**Important**: *Remember* to document everything.",
    expected: "Visit OT Resources for more info.\nImportant: Remember to document everything."
  },
  {
    name: "Multiple Line Breaks",
    input: "First paragraph.\n\n\n\nSecond paragraph.\n\nThird paragraph.",
    expected: "First paragraph.\nSecond paragraph.\nThird paragraph."
  },
  {
    name: "Complex Mixed Content",
    input: "## **ASSESSMENT SUMMARY**\n\n**Strengths:**\n- *Excellent* social interaction\n- `Strong` problem-solving skills\n\n**Challenges:**\n- Fine motor [coordination](https://example.com)\n- **Attention** span issues",
    expected: "ASSESSMENT SUMMARY\n\nStrengths:\n- Excellent social interaction\n- Strong problem-solving skills\n\nChallenges:\n- Fine motor coordination\n- Attention span issues"
  }
];

console.log('🧪 Testing Markdown Cleaning Function\n');
console.log('=' .repeat(60));

let allPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(40));
  
  const result = cleanMarkdownText(testCase.input);
  const passed = result === testCase.expected;
  
  console.log('Input:');
  console.log(JSON.stringify(testCase.input));
  console.log('\nExpected:');
  console.log(JSON.stringify(testCase.expected));
  console.log('\nActual:');
  console.log(JSON.stringify(result));
  console.log(`\nResult: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (!passed) {
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

// Test with actual AI-generated content example
console.log('\n\n🔍 Testing with Real AI Content Example');
console.log('=' .repeat(60));

const realAIExample = `**STRENGTHS**
- *Strong* fine motor skills demonstrated through precise grasping
- **Excellent** attention span during structured activities
- Good social interaction with peers

**CHALLENGES**
- Fine motor coordination needs improvement
- Difficulty with \`bilateral\` coordination tasks
- **Sensory** processing challenges in noisy environments

## Recommendations
1. Focus on [fine motor](https://example.com) strengthening exercises
2. Implement *sensory* breaks throughout the day
3. **Practice** bilateral coordination activities`;

const cleanedRealExample = cleanMarkdownText(realAIExample);

console.log('Original AI Content:');
console.log(realAIExample);
console.log('\nCleaned Content:');
console.log(cleanedRealExample);

console.log('\n✅ Markdown cleaning test completed!');
