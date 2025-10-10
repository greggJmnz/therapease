const { openai } = require('../../server/config/openai');
const otpfFrameworkPrompt = require('../prompts/otpfFramework');
const otPromptTemplates = require('../prompts/otPromptTemplates');

class GPTService {
  constructor() {
    this.model = 'gpt-4o'; // Using GPT-4o as it works better than GPT-5
    this.maxTokens = 2500;
    this.temperature = 0.7;
  }

  async generateResponse(prompt, options = {}) {
    try {
      // Prepare messages array
      const messages = [];
      
      // Add system prompt (use custom system prompt if provided, otherwise use default OTPF)
      if (options.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      } else {
        messages.push({
          role: 'system',
          content: otpfFrameworkPrompt
        });
      }
      
      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      // Use max_completion_tokens for GPT-5, max_tokens for other models
      const model = options.model || this.model;
      const isGPT5 = model.includes('gpt-5');
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: messages,
        ...(isGPT5 ? 
          { max_completion_tokens: options.maxTokens || this.maxTokens } : 
          { max_tokens: options.maxTokens || this.maxTokens }
        ),
        // GPT-5 only supports default temperature (1), other models support custom values
        ...(isGPT5 ? {} : {
          temperature: options.temperature || this.temperature,
          top_p: options.topP || 1,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0
        })
      });

      // Handle different response formats for different models
      let content = '';
      if (response.choices && response.choices[0]) {
        content = response.choices[0].message?.content || '';
        
        // For GPT-5, check if there's reasoning content or other fields
        if (!content && response.choices[0].message?.reasoning) {
          content = response.choices[0].message.reasoning;
        }
      }

      return {
        success: true,
        content: content,
        usage: response.usage,
        model: response.model,
        rawResponse: response // Include full response for debugging
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


  // Method to select appropriate prompt template based on assessment type
  selectPromptTemplate(assessmentType, patientData, assessmentData) {
    const { interviewQuestions, observations } = assessmentData;
    
    switch (assessmentType) {
      case 'interview-only':
        return otPromptTemplates.getInterviewAnalysisPrompt(patientData, interviewQuestions);
      
      case 'observation-only':
        return otPromptTemplates.getObservationAnalysisPrompt(patientData, observations);
      
      case 'sensory-processing':
        return otPromptTemplates.getSensoryProcessingPrompt(patientData, assessmentData);
      
      case 'motor-skills':
        return otPromptTemplates.getMotorSkillsPrompt(patientData, assessmentData);
      
      case 'therapist-friendly':
        return otPromptTemplates.getTherapistFriendlyPrompt(patientData, assessmentData);
      
      case 'combined':
      default:
        return otPromptTemplates.getCombinedAssessmentPrompt(patientData, interviewQuestions, observations);
    }
  }

  async analyzeAssessmentData(patientData, assessmentData, options = {}) {
    const { interviewQuestions, observations, assessmentType = 'combined' } = assessmentData;
    
    // Select appropriate prompt template based on assessment type
    const prompt = this.selectPromptTemplate(assessmentType, patientData, assessmentData);
    
    // Add system prompt for enhanced OT context
    const systemPrompt = otPromptTemplates.getSystemPrompt();
    
    // Use enhanced prompt with system context
    const enhancedOptions = {
      ...options,
      systemPrompt: systemPrompt
    };

    return await this.generateResponse(prompt, enhancedOptions);
  }

  // Specialized OT Assessment Methods
  async analyzeInterviewData(patientData, interviewQuestions, options = {}) {
    const assessmentData = { interviewQuestions, assessmentType: 'interview-only' };
    return await this.analyzeAssessmentData(patientData, assessmentData, options);
  }

  async analyzeObservationData(patientData, observations, options = {}) {
    const assessmentData = { observations, assessmentType: 'observation-only' };
    return await this.analyzeAssessmentData(patientData, assessmentData, options);
  }

  async analyzeSensoryProcessing(patientData, assessmentData, options = {}) {
    const enhancedData = { ...assessmentData, assessmentType: 'sensory-processing' };
    return await this.analyzeAssessmentData(patientData, enhancedData, options);
  }

  async analyzeMotorSkills(patientData, assessmentData, options = {}) {
    const enhancedData = { ...assessmentData, assessmentType: 'motor-skills' };
    return await this.analyzeAssessmentData(patientData, enhancedData, options);
  }

  async generateTherapistFriendlyInsights(patientData, assessmentData, options = {}) {
    const enhancedData = { ...assessmentData, assessmentType: 'therapist-friendly' };
    return await this.analyzeAssessmentData(patientData, enhancedData, options);
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
