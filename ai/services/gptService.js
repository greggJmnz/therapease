const { openai } = require('../../server/config/openai');
const otpfFrameworkPrompt = require('../prompts/otpfFramework');
const otpfPromptEngineer = require('./otpfPromptEngineer');

class GPTService {
  constructor() {
    this.model = 'gpt-4';
    this.maxTokens = 1500;
    this.temperature = 0.7;
  }

  async generateResponse(prompt, options = {}) {
    try {
      const response = await openai.chat.completions.create({
        model: options.model || this.model,
        messages: [
          {
            role: 'system',
            content: otpfFrameworkPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0
      });

      return {
        success: true,
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      console.error('GPT API Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate AI response'
      };
    }
  }

  async analyzeSessionNotes(patientData, sessionNotes, options = {}) {
    const prompt = require('../prompts/assessmentPrompt')(patientData, sessionNotes);
    return await this.generateResponse(prompt, options);
  }

  async generateProgressSummary(patientData, progressData, options = {}) {
    const progressSummaryPrompt = require('../prompts/progressSummaryPrompt');
    const prompt = progressSummaryPrompt(patientData, progressData);
    return await this.generateResponse(prompt, options);
  }

  async generateHomeExercisePlan(patientData, currentAbilities, goals, options = {}) {
    const homeExercisePrompt = require('../prompts/homeExercisePrompt');
    const prompt = homeExercisePrompt(patientData, currentAbilities, goals);
    return await this.generateResponse(prompt, options);
  }

  async generateParentSummary(patientData, sessionSummary, options = {}) {
    const parentSummaryPrompt = require('../prompts/parentSummaryPrompt');
    const prompt = parentSummaryPrompt(patientData, sessionSummary);
    return await this.generateResponse(prompt, options);
  }

  async analyzeAssessmentData(patientData, assessmentData, options = {}) {
    const { interviewQuestions, observations } = assessmentData;
    
    const prompt = `
    As an expert Occupational Therapist, analyze the following assessment data and provide comprehensive insights:

    PATIENT INFORMATION:
    - Name: ${patientData.firstName} ${patientData.lastName}
    - Age: ${patientData.age || 'Not specified'}
    - Diagnosis: ${patientData.diagnosis || 'Not specified'}
    - Therapy Goals: ${patientData.therapyGoals || 'Not specified'}

    ASSESSMENT DATA:
    
    Interview Questions and Responses:
    ${interviewQuestions.map((q, index) => `${index + 1}. Question: ${q.question}\n   Response: ${q.answer || 'Not provided'}`).join('\n')}
    
    Clinical Observations:
    ${observations || 'No observations recorded'}

    Please provide a comprehensive analysis including:

    1. **Assessment Summary**:
       - Key findings from the interview responses
       - Notable observations and their clinical significance
       - Overall assessment of the patient's current status

    2. **Functional Analysis**:
       - Strengths identified during assessment
       - Areas of concern or difficulty
       - Functional abilities demonstrated

    3. **Clinical Insights**:
       - Patterns or trends in responses
       - Behavioral observations and their implications
       - Any red flags or areas requiring immediate attention

    4. **Treatment Recommendations**:
       - Specific intervention strategies
       - Goal setting suggestions
       - Home program recommendations
       - Frequency and duration of therapy sessions

    5. **Progress Monitoring**:
       - Measurable outcomes to track
       - Assessment tools for ongoing evaluation
       - Timeline for re-assessment

    6. **Parent/Guardian Guidance**:
       - Key points to communicate
       - Home activities and modifications
       - Signs of progress to watch for

    Please provide your analysis in a clear, professional manner suitable for healthcare documentation. Focus on practical, actionable insights that will help improve patient outcomes.
    `;

    return await this.generateResponse(prompt, options);
  }

  // OTPF Prompt Engineering Methods
  async generateOTPFCompliantResponse(basePrompt, options = {}) {
    const enhancedPrompt = otpfPromptEngineer.enhancePrompt(basePrompt, options);
    return await this.generateResponse(enhancedPrompt, options);
  }

  async generatePediatricOTResponse(basePrompt, options = {}) {
    const specializedPrompt = otpfPromptEngineer.createSpecializedPrompt(basePrompt);
    return await this.generateResponse(specializedPrompt, options);
  }

  validateOTPFCompliance(response) {
    return otpfPromptEngineer.validateOTPFCompliance(response);
  }

  // Rate limiting and cost management
  async checkUsage() {
    try {
      // This would integrate with your usage tracking system
      return {
        success: true,
        usage: {
          dailyRequests: 0,
          monthlyRequests: 0,
          cost: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check usage'
      };
    }
  }
}

module.exports = new GPTService();
