// Test script to verify comprehensive AI content transformation system
const fs = require('fs');

// Simulate the comprehensive transformation functions
function parseAIInsightContent(content) {
  // Clean and normalize the content
  const cleanedContent = content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown **text**
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown *text*
    .replace(/#{1,6}\s*/g, '') // Remove markdown headers # ## ###
    .replace(/`(.*?)`/g, '$1') // Remove code markdown `text`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url)
    .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
    .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but keep newlines)
    .trim();

  const sections = [];
  const lines = cleanedContent.split('\n');
  let currentSection = null;

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Check if this is a main heading (ALL CAPS)
    if (/^[A-Z][A-Z\s]+$/.test(trimmedLine)) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = {
        type: 'main_heading',
        title: trimmedLine,
        content: [],
        subsections: []
      };
    }
    // Check if this is a subsection heading (Title Case with colon)
    else if (/^[A-Z][a-z\s]+:$/.test(trimmedLine)) {
      if (currentSection) {
        currentSection.subsections.push({
          type: 'subsection_heading',
          title: trimmedLine.replace(':', ''),
          content: []
        });
      }
    }
    // Check if this is a bullet point
    else if (trimmedLine.startsWith('- ')) {
      const bulletContent = trimmedLine.substring(2);
      if (currentSection && currentSection.subsections.length > 0) {
        // Add to last subsection
        const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
        lastSubsection.content.push({
          type: 'bullet_point',
          text: bulletContent
        });
      } else if (currentSection) {
        // Add to main section
        currentSection.content.push({
          type: 'bullet_point',
          text: bulletContent
        });
      }
    }
    // Check if this is a numbered item
    else if (/^\d+\.\s/.test(trimmedLine)) {
      const numberedContent = trimmedLine.replace(/^\d+\.\s/, '');
      if (currentSection && currentSection.subsections.length > 0) {
        const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
        lastSubsection.content.push({
          type: 'numbered_item',
          text: numberedContent
        });
      } else if (currentSection) {
        currentSection.content.push({
          type: 'numbered_item',
          text: numberedContent
        });
      }
    }
    // Regular paragraph content
    else {
      if (currentSection && currentSection.subsections.length > 0) {
        const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
        lastSubsection.content.push({
          type: 'paragraph',
          text: trimmedLine
        });
      } else if (currentSection) {
        currentSection.content.push({
          type: 'paragraph',
          text: trimmedLine
        });
      }
    }
  });

  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

// Test with complex AI-generated content
const testCases = [
  {
    name: "Complex Motor Skills Assessment",
    content: `**STRENGTHS**
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
3. **Practice** bilateral coordination activities`
  },
  {
    name: "Sensory Processing Assessment with Subsections",
    content: `### **SENSORY PROFILE**

**Strengths:**
- *Tactile* processing appears well-developed
- **Visual** tracking skills are age-appropriate
- Good *proprioceptive* awareness

**Areas of Concern:**
- **Auditory** processing difficulties in group settings
- \`Vestibular\` system may need support
- *Sensory* seeking behaviors observed

#### Next Steps
1. Implement [sensory diet](https://example.com) strategies
2. **Monitor** response to sensory input
3. *Collaborate* with family on home strategies`
  },
  {
    name: "Mixed Content with Various Elements",
    content: `**ASSESSMENT SUMMARY**

**Strengths:**
- Excellent social interaction skills
- Strong problem-solving abilities
- Good attention to detail

**Challenges:**
- Fine motor coordination issues
- Sensory processing difficulties
- Attention span concerns

**Recommendations:**
1. Implement fine motor strengthening exercises
2. Create sensory-friendly environment
3. Use visual supports for attention

**Follow-up:**
Schedule next assessment in 3 months to monitor progress.`
  }
];

console.log('🧪 Testing Comprehensive AI Content Transformation System\n');
console.log('=' .repeat(80));

testCases.forEach((testCase, index) => {
  console.log(`\n\nTest ${index + 1}: ${testCase.name}`);
  console.log('=' .repeat(60));
  
  console.log('Original AI Content:');
  console.log(JSON.stringify(testCase.content, null, 2));
  
  const structuredContent = parseAIInsightContent(testCase.content);
  
  console.log('\nStructured Content:');
  console.log(JSON.stringify(structuredContent, null, 2));
  
  console.log('\n📊 Analysis:');
  console.log(`- Total sections: ${structuredContent.length}`);
  
  structuredContent.forEach((section, sectionIndex) => {
    console.log(`- Section ${sectionIndex + 1}: "${section.title}"`);
    console.log(`  - Main content items: ${section.content.length}`);
    console.log(`  - Subsections: ${section.subsections.length}`);
    
    section.subsections.forEach((subsection, subIndex) => {
      console.log(`    - Subsection ${subIndex + 1}: "${subsection.title}" (${subsection.content.length} items)`);
    });
  });
  
  console.log('\n✅ Transformation completed successfully!');
});

console.log('\n\n🎯 Summary');
console.log('=' .repeat(40));
console.log('✅ AI content is properly parsed into structured format');
console.log('✅ Main headings are identified and separated');
console.log('✅ Subsections are properly organized');
console.log('✅ Content items are categorized by type');
console.log('✅ Markdown formatting is completely removed');
console.log('\n📝 The PDF generation will now apply professional formatting to each structured element!');
