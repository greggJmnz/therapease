const homeExercisePrompt = (patientData, currentAbilities, goals) => `
As an expert Occupational Therapist AI assistant, create an OTPF-4 aligned home exercise plan that promotes occupational performance and participation:

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age || 'Not specified'}
- Current Abilities: ${currentAbilities}
- Occupational Goals: ${goals}

Please provide a comprehensive home exercise plan following OTPF-4 standards:

## 1. **OCCUPATIONAL DOMAIN ACTIVITIES**
   - **ADL Focus**: Daily living activities that can be practiced at home
   - **IADL Integration**: Instrumental activities that support independence
   - **Play & Leisure**: Engaging activities that promote skill development
   - **Social Participation**: Activities that encourage interaction and engagement

## 2. **PERFORMANCE SKILLS DEVELOPMENT**
   - **Motor Skills**: Exercises targeting posture, mobility, coordination, strength, energy
   - **Process Skills**: Activities enhancing energy management, knowledge, organization, adaptation
   - **Social Interaction Skills**: Opportunities for initiating, responding, sustaining interactions

## 3. **ENVIRONMENTAL MODIFICATIONS & ADAPTATIONS**
   - **Physical Environment**: Home modifications to support occupational performance
   - **Social Environment**: Family involvement strategies and support systems
   - **Attitudinal Environment**: Creating positive, encouraging home atmosphere
   - **Technological Supports**: Assistive devices or technology that can be used at home

## 4. **DAILY OCCUPATIONAL ROUTINE**
   - **Morning Routine**: Activities to start the day with purpose
   - **Midday Engagement**: Occupational activities during peak energy times
   - **Evening Routine**: Calming activities that promote rest and sleep
   - **Weekend Activities**: Extended engagement in meaningful occupations

## 5. **SAFETY & RISK MANAGEMENT**
   - **Precautions**: Specific safety measures for each activity
   - **Contraindications**: Activities to avoid and why
   - **Emergency Procedures**: When and how to contact the therapist
   - **Progression Guidelines**: How to safely increase difficulty

## 6. **EQUIPMENT & RESOURCES**
   - **Household Items**: Common objects that can be used for therapy
   - **Low-Cost Adaptations**: Simple modifications to existing items
   - **Technology Integration**: Apps or digital tools that support goals
   - **Community Resources**: Local opportunities for occupational engagement

## 7. **PROGRESS MONITORING & TRACKING**
   - **Daily Logs**: Simple ways to track occupational performance
   - **Weekly Assessments**: Progress indicators to monitor
   - **Goal Achievement**: How to measure progress toward occupational outcomes
   - **Family Feedback**: Ways for caregivers to report observations

## 8. **FAMILY/CAREGIVER INVOLVEMENT**
   - **Role in Therapy**: How family members can support occupational goals
   - **Communication Strategies**: Ways to discuss progress and challenges
   - **Motivation Techniques**: How to encourage continued participation
   - **Problem-Solving**: Addressing common challenges at home

## 9. **ADAPTATION STRATEGIES**
   - **Modifications for Different Ability Levels**: How to adjust activities
   - **Alternative Approaches**: Different ways to achieve the same goal
   - **Cultural Considerations**: Respecting family values and traditions
   - **Individual Preferences**: Incorporating personal interests and motivations

## 10. **INTEGRATION WITH DAILY LIFE**
   - **Natural Opportunities**: How to incorporate therapy into daily routines
   - **Meaningful Context**: Making exercises relevant to real-life situations
   - **Motivation Maintenance**: Keeping activities engaging and purposeful
   - **Long-term Sustainability**: Creating lasting habits and routines

Please structure this plan using OTPF-4 terminology and focus on occupational outcomes, participation, and meaningful engagement. Ensure all recommendations are evidence-based and appropriate for the patient's age, abilities, and family context. Make activities fun, engaging, and integrated into natural daily routines.
`;

module.exports = homeExercisePrompt;
