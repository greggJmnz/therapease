/**
 * Test script to verify OpenAI API key is working
 */

require('dotenv').config({ path: './server/.env' });

console.log('🔑 Testing OpenAI API Key Configuration...\n');

// Check if API key is set
const apiKey = process.env.OPENAI_API_KEY;
console.log('API Key Status:', apiKey ? '✅ Set' : '❌ Not Set');

if (!apiKey) {
  console.log('\n❌ OPENAI_API_KEY is not set in environment variables');
  console.log('Please update the .env file in the server directory:');
  console.log('OPENAI_API_KEY=your_actual_api_key_here');
  process.exit(1);
}

if (apiKey === 'your_openai_api_key_here' || apiKey === 'your-api-key-here') {
  console.log('\n⚠️  OPENAI_API_KEY is still set to placeholder value');
  console.log('Please replace the placeholder with your actual OpenAI API key');
  process.exit(1);
}

console.log('API Key Preview:', apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4));
console.log('API Key Length:', apiKey.length, 'characters');

// Test the API key with a simple request
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: apiKey
});

async function testAPIKey() {
  try {
    console.log('\n🧪 Testing API key with OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello, this is a test.' }],
      max_tokens: 10
    });
    
    console.log('✅ API Key is working!');
    console.log('Model:', response.model);
    console.log('Response:', response.choices[0].message.content);
    console.log('Usage:', JSON.stringify(response.usage, null, 2));
    
    return true;
  } catch (error) {
    console.log('❌ API Key test failed:');
    console.log('Error:', error.message);
    
    if (error.status === 401) {
      console.log('\n🔍 This is an authentication error. Please check:');
      console.log('1. Your API key is correct');
      console.log('2. Your API key has proper permissions');
      console.log('3. Your OpenAI account is active');
    } else if (error.status === 429) {
      console.log('\n🔍 This is a rate limit error. Please check:');
      console.log('1. You have sufficient credits in your OpenAI account');
      console.log('2. You are not exceeding rate limits');
    }
    
    return false;
  }
}

testAPIKey().then(success => {
  if (success) {
    console.log('\n🎉 OpenAI API integration is working correctly!');
    console.log('You can now use the AI Insights feature in TherapEase.');
  } else {
    console.log('\n💥 OpenAI API integration failed.');
    console.log('Please fix the API key configuration and try again.');
  }
});
