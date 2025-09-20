const otpfFrameworkPrompt = require('../prompts/otpfFramework');

class OTPFPromptEngineer {
  constructor() {
    this.framework = otpfFrameworkPrompt;
  }

  /**
   * Enhances any prompt with OTPF-4 framework compliance
   * @param {string} basePrompt - The original prompt
   * @param {Object} options - Enhancement options
   * @returns {string} - Enhanced OTPF-compliant prompt
   */
  enhancePrompt(basePrompt, options = {}) {
    const {
      includeDomains = true,
      includeProcess = true,
      includeContext = true,
      includePerformance = true,
      includeClientFactors = true,
      specificFocus = null
    } = options;

    let enhancedPrompt = basePrompt;

    // Add OTPF framework context if requested
    if (includeDomains || includeProcess || includeContext || includePerformance || includeClientFactors) {
      enhancedPrompt += '\n\n## OTPF-4 FRAMEWORK COMPLIANCE REQUIREMENTS:\n';
      
      if (includeDomains) {
        enhancedPrompt += `
- **Areas of Occupation**: Ensure your response addresses relevant domains (ADL, IADL, Play, Education, Social Participation, etc.)
- **Occupational Performance**: Focus on meaningful activities and daily life engagement`;
      }

      if (includeProcess) {
        enhancedPrompt += `
- **Evaluation**: Consider what new information is gathered about occupational performance
- **Intervention**: Address how strategies support occupational goals
- **Outcomes**: Focus on occupational performance, participation, and quality of life`;
      }

      if (includeContext) {
        enhancedPrompt += `
- **Environmental Factors**: Consider physical, social, attitudinal, and technological contexts
- **Personal Factors**: Account for age, cultural background, health status, and patterns of living`;
      }

      if (includePerformance) {
        enhancedPrompt += `
- **Performance Skills**: Address motor, process, and social interaction skills
- **Performance Patterns**: Consider habits, routines, rituals, and roles`;
      }

      if (includeClientFactors) {
        enhancedPrompt += `
- **Client Factors**: Consider values, beliefs, spirituality, body functions, and body structures
- **Client-Centered Approach**: Ensure recommendations align with client goals and preferences`;
      }
    }

    // Add specific focus areas if requested
    if (specificFocus) {
      enhancedPrompt += `\n\n## SPECIFIC FOCUS AREAS:\n${specificFocus}`;
    }

    // Add OTPF terminology requirements
    enhancedPrompt += `

## RESPONSE REQUIREMENTS:
- Use OTPF-4 terminology when describing occupational performance
- Reference specific domains and processes in your analysis
- Focus on occupational outcomes rather than just physical improvements
- Include client-centered approaches in all recommendations
- Consider environmental modifications and adaptations
- Address participation and engagement in meaningful activities
- Maintain professional documentation standards

Please structure your response using OTPF-4 terminology and focus on occupational outcomes, participation, and meaningful engagement.`;

    return enhancedPrompt;
  }

  /**
   * Creates a specialized OTPF prompt for Pediatric Occupational Therapy
   * @param {string} basePrompt - The base prompt to enhance
   * @returns {string} - Pediatric-focused OTPF prompt
   */
  createSpecializedPrompt(basePrompt) {
    const pediatricSpecialization = {
      focus: 'Pediatric Occupational Therapy with emphasis on play-based interventions, developmental milestones, and family-centered care',
      domains: 'Play, Education, ADL, Social Participation, Rest and Sleep',
      considerations: 'Age-appropriate activities, family involvement, developmental progression, school integration, sensory processing, motor development'
    };
    
    return this.enhancePrompt(basePrompt, {
      specificFocus: `
**PEDIATRIC OT SPECIALIZATION**: ${pediatricSpecialization.focus}
**PRIMARY DOMAINS**: ${pediatricSpecialization.domains}
**KEY CONSIDERATIONS**: ${pediatricSpecialization.considerations}

**PEDIATRIC-SPECIFIC FOCUS AREAS**:
- Developmental milestones and age-appropriate expectations
- Play-based interventions and therapeutic play
- Family-centered care and parent/caregiver education
- School-based therapy and educational integration
- Sensory processing and sensory integration
- Fine and gross motor development
- Self-care skills and independence building
- Social skills and peer interaction
- Behavioral regulation and emotional development
- Environmental modifications for child development`
    });
  }

  /**
   * Validates if a response aligns with OTPF standards
   * @param {string} response - The AI response to validate
   * @returns {Object} - Validation results
   */
  validateOTPFCompliance(response) {
    const otpfKeywords = [
      'occupational performance', 'participation', 'engagement', 'meaningful activities',
      'ADL', 'IADL', 'play', 'education', 'work', 'leisure', 'social participation',
      'performance skills', 'performance patterns', 'client factors', 'context',
      'environmental factors', 'personal factors', 'occupational justice'
    ];

    const foundKeywords = otpfKeywords.filter(keyword => 
      response.toLowerCase().includes(keyword.toLowerCase())
    );

    const complianceScore = (foundKeywords.length / otpfKeywords.length) * 100;

    return {
      compliant: complianceScore >= 70,
      score: complianceScore,
      foundKeywords,
      missingKeywords: otpfKeywords.filter(keyword => 
        !response.toLowerCase().includes(keyword.toLowerCase())
      ),
      suggestions: this.generateComplianceSuggestions(foundKeywords, otpfKeywords)
    };
  }

  /**
   * Generates suggestions to improve OTPF compliance
   * @param {Array} foundKeywords - Keywords found in the response
   * @param {Array} allKeywords - All OTPF keywords
   * @returns {Array} - Suggestions for improvement
   */
  generateComplianceSuggestions(foundKeywords, allKeywords) {
    const missingKeywords = allKeywords.filter(keyword => 
      !foundKeywords.includes(keyword)
    );

    const suggestions = [];
    
    if (missingKeywords.includes('occupational performance')) {
      suggestions.push('Include specific references to occupational performance and daily activities');
    }
    
    if (missingKeywords.includes('participation')) {
      suggestions.push('Address client participation and engagement in meaningful activities');
    }
    
    if (missingKeywords.includes('context')) {
      suggestions.push('Consider environmental and personal factors that influence performance');
    }
    
    if (missingKeywords.includes('performance skills')) {
      suggestions.push('Reference specific motor, process, or social interaction skills');
    }

    return suggestions;
  }
}

module.exports = new OTPFPromptEngineer();