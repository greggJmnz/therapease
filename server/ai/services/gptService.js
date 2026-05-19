const { openai } = require('../../config/openai');
const otpfFrameworkPrompt = require('../prompts/otpfFramework');
const otPromptTemplates = require('../prompts/otPromptTemplates');

class GPTService {
  constructor() {
    this.model = 'gpt-4.1'; // Using GPT-4.1 for superior analysis quality
    this.maxTokens = 2500;
    this.temperature = 0.7;
  }

  async generateResponse(prompt, options = {}) {
    try {
      // Validate API key
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-api-key-here') {
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.');
      }
      
      // Validate prompt
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt: prompt must be a non-empty string');
      }
      
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

      // Use the specified model (default: gpt-4.1)
      let model = options.model || this.model;
      
      // Try the requested model first, fall back to gpt-4o only if it fails
      let response;
      try {
        response = await openai.chat.completions.create({
          model: model,
          messages: messages,
          max_tokens: options.maxTokens || this.maxTokens,
          temperature: options.temperature || this.temperature,
          top_p: options.topP || 1,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0
        });
      } catch (modelError) {
        // If model doesn't exist (e.g., gpt-4.1 not available), fall back to gpt-4o
        if (model === 'gpt-4.1' && (modelError.message?.includes('model') || modelError.code === 'invalid_model')) {
          console.warn('⚠️ gpt-4.1 not available, falling back to gpt-4o');
          model = 'gpt-4o';
          response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            max_tokens: options.maxTokens || this.maxTokens,
            temperature: options.temperature || this.temperature,
            top_p: options.topP || 1,
            frequency_penalty: options.frequencyPenalty || 0,
            presence_penalty: options.presencePenalty || 0
          });
        } else {
          // Re-throw other errors
          throw modelError;
        }
      }

      // Handle different response formats for different models
      let content = '';
      if (response.choices && response.choices[0]) {
        content = response.choices[0].message?.content || '';
        
        // For advanced models, check if there's reasoning content or other fields
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
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        code: error.code,
        type: error.constructor.name
      });
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to generate AI response';
      
      if (error.message?.includes('API key')) {
        errorMessage = 'OpenAI API key is not configured or invalid. Please check OPENAI_API_KEY environment variable.';
      } else if (error.response?.status === 401) {
        errorMessage = 'OpenAI API key is invalid or expired. Please check your API key.';
      } else if (error.response?.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
      } else if (error.response?.status === 500 || error.response?.status === 502 || error.response?.status === 503) {
        errorMessage = 'OpenAI API server error. Please try again later.';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Cannot connect to OpenAI API. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async analyzeSessionNotes(patientData, sessionNotes, options = {}) {
    const prompt = require('../prompts/assessmentPrompt')(patientData, sessionNotes);
    return await this.generateResponse(prompt, options);
  }


  // Method to select appropriate prompt template based on assessment type
  selectPromptTemplate(assessmentType, patientData, assessmentData) {
    try {
      const { interviewQuestions, observations } = assessmentData || {};
      
      // Ensure patientData has required fields
      if (!patientData) {
        throw new Error('Patient data is required');
      }
      
      // Privacy: Patient names are anonymized - no longer required
      // Normalize patient data to ensure all fields exist (names are anonymized as "Patient")
      const normalizedPatientData = {
        firstName: patientData.firstName || 'Patient', // Default to "Patient" for privacy
        lastName: patientData.lastName || '', // Empty for privacy
        age: patientData.age || patientData.dateOfBirth ? (new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear()) : 'Not specified',
        diagnosis: patientData.diagnosis || 'Not specified',
        ...patientData
      };
      
      // Ensure interviewQuestions and observations are arrays/strings
      const normalizedInterviewQuestions = Array.isArray(interviewQuestions) ? interviewQuestions : [];
      const normalizedObservations = observations || 'No observations recorded';
      
      switch (assessmentType) {
        case 'interview-only':
          if (!normalizedInterviewQuestions || normalizedInterviewQuestions.length === 0) {
            throw new Error('Interview questions are required for interview-only assessment type');
          }
          return otPromptTemplates.getInterviewAnalysisPrompt(normalizedPatientData, normalizedInterviewQuestions);
        
        case 'observation-only':
          if (!normalizedObservations || normalizedObservations === 'No observations recorded') {
            throw new Error('Observations are required for observation-only assessment type');
          }
          return otPromptTemplates.getObservationAnalysisPrompt(normalizedPatientData, normalizedObservations);
        
        case 'sensory-processing':
          return otPromptTemplates.getSensoryProcessingPrompt(normalizedPatientData, assessmentData);
        
        case 'motor-skills':
          return otPromptTemplates.getMotorSkillsPrompt(normalizedPatientData, assessmentData);
        
        case 'therapist-friendly':
          return otPromptTemplates.getTherapistFriendlyPrompt(normalizedPatientData, assessmentData);
        
        case 'combined':
        default:
          return otPromptTemplates.getCombinedAssessmentPrompt(normalizedPatientData, normalizedInterviewQuestions, normalizedObservations);
      }
    } catch (error) {
      console.error('Error in selectPromptTemplate:', error);
      throw error;
    }
  }

  async analyzeAssessmentData(patientData, assessmentData, options = {}) {
    try {
      const { interviewQuestions, observations, assessmentType = 'combined' } = assessmentData;
      
      // Validate required data
      if (!patientData) {
        throw new Error('Patient data is required');
      }
      
      if (!assessmentData) {
        throw new Error('Assessment data is required');
      }
      
      // Select appropriate prompt template based on assessment type
      let prompt;
      try {
        prompt = this.selectPromptTemplate(assessmentType, patientData, assessmentData);
      } catch (error) {
        console.error('Error selecting prompt template:', error);
        throw new Error(`Failed to select prompt template: ${error.message}`);
      }
      
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt generated from template');
      }
      
      // Add system prompt for enhanced OT context
      let systemPrompt;
      try {
        systemPrompt = otPromptTemplates.getSystemPrompt();
      } catch (error) {
        console.error('Error getting system prompt:', error);
        // Fallback to default OTPF framework prompt
        systemPrompt = otpfFrameworkPrompt;
      }
      
      // Use enhanced prompt with system context
      const enhancedOptions = {
        ...options,
        systemPrompt: systemPrompt
      };

      return await this.generateResponse(prompt, enhancedOptions);
    } catch (error) {
      console.error('Error in analyzeAssessmentData:', error);
      return {
        success: false,
        error: error.message || 'Failed to analyze assessment data'
      };
    }
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
