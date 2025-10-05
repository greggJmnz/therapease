# AI Insights Setup Guide for GPT-5

This guide will help you set up the AI Insights feature with GPT-5 model and your OpenAI API key.

## Prerequisites

1. **OpenAI API Key**: You need a valid OpenAI API key with access to GPT-5
2. **Node.js**: Ensure Node.js is installed on your system
3. **TherapEase Application**: The application should be running

## Setup Steps

### 1. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign in to your account or create a new one
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (it starts with `sk-`)

### 2. Configure Environment Variables

#### Option A: Using .env file (Recommended)

1. Create a `.env` file in the `/server` directory
2. Add the following content:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5
OPENAI_MAX_TOKENS=2500
OPENAI_TEMPERATURE=0.7
```

#### Option B: Using system environment variables

Set the environment variable in your terminal:

```bash
export OPENAI_API_KEY="your_api_key_here"
```

### 3. Update Server Configuration

The server configuration is already set up to use GPT-5. The following files have been updated:

- `/ai/services/gptService.js` - Updated to use GPT-5 model
- `/server/routes/aiRoutes.js` - Updated to explicitly use GPT-5 for AI insights
- `/client/src/pages/Therapist/AIInsights.jsx` - Updated to make real API calls

### 4. Restart the Application

After setting up the API key:

1. Stop the current application (Ctrl+C)
2. Restart the application:
   ```bash
   npm run dev
   ```

### 5. Test the AI Insights Feature

1. Navigate to the Therapist Portal
2. Go to AI Insights section
3. Select a patient
4. Add interview questions and observations
5. Click "Generate Insights"
6. The system will now use GPT-5 to generate real AI insights

## Configuration Details

### GPT-5 Model Settings

- **Model**: `gpt-5`
- **Max Tokens**: 2500
- **Temperature**: 0.7 (for AI insights), 0.6 (for other features)
- **Top P**: 1
- **Frequency Penalty**: 0
- **Presence Penalty**: 0

### API Endpoints

The following endpoints are configured for GPT-5:

- `POST /api/ai/analyze-assessment` - AI Insights generation
- `POST /api/ai/analyze-session` - Session analysis
- `POST /api/ai/progress-summary` - Progress summaries
- `POST /api/ai/home-exercise-plan` - Home exercise plans
- `POST /api/ai/parent-summary` - Parent summaries
- `POST /api/ai/treatment-recommendations` - Treatment recommendations

## Troubleshooting

### Common Issues

1. **"API request failed: 401"**
   - Check if your API key is correct
   - Ensure the API key has proper permissions

2. **"API request failed: 429"**
   - You've hit the rate limit
   - Wait a few minutes and try again

3. **"API request failed: 500"**
   - Check server logs for detailed error messages
   - Ensure the OpenAI service is accessible

4. **"Failed to generate insights"**
   - Check if the API key is set correctly
   - Verify the GPT-5 model is available in your OpenAI account

### Debug Mode

To enable debug logging, set the following environment variable:

```env
DEBUG=therapease:ai
```

## Cost Considerations

GPT-5 is a premium model with higher costs than GPT-4. Monitor your usage:

1. Check your OpenAI usage dashboard
2. Set up usage alerts
3. Consider implementing rate limiting for production use

## Security Notes

1. **Never commit API keys to version control**
2. **Use environment variables for sensitive data**
3. **Implement proper authentication for API endpoints**
4. **Consider using API key rotation for security**

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify your OpenAI account status
3. Ensure all dependencies are installed
4. Check the network connectivity

## Next Steps

After successful setup:

1. Test all AI features thoroughly
2. Monitor API usage and costs
3. Consider implementing caching for frequently used responses
4. Set up monitoring and alerting for API failures
