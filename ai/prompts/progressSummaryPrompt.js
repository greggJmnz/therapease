const progressSummaryPrompt = (patientData, progressData) => `
As an expert Occupational Therapist AI assistant, create a comprehensive OTPF-4 aligned progress summary for the following patient:

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age || 'Not specified'}
- Diagnosis: ${patientData.diagnosis || 'Not specified'}
- Therapy Goals: ${patientData.therapyGoals || 'Not specified'}

PROGRESS DATA:
${JSON.stringify(progressData, null, 2)}

Please provide an OTPF-4 compliant progress summary including:

## 1. **OCCUPATIONAL PERFORMANCE SUMMARY**
   - **Domain Progress**: Which areas of occupation showed improvement? (ADL, IADL, Play, Education, Social Participation)
   - **Performance Skills Development**: What motor, process, and social interaction skills have improved?
   - **Performance Patterns**: Any positive changes in habits, routines, rituals, or roles?

## 2. **CONTEXT FACTORS IMPACT**
   - **Environmental Adaptations**: What modifications have been successful?
   - **Personal Factors**: How have client factors influenced progress?
   - **Family/Caregiver Involvement**: What role has the support system played?

## 3. **OCCUPATIONAL THERAPY OUTCOMES**
   - **Occupational Performance**: Measurable improvements in daily activities
   - **Participation**: Enhanced engagement in meaningful occupations
   - **Role Competence**: Progress in fulfilling desired roles
   - **Quality of Life**: Improvements in overall well-being

## 4. **EVIDENCE-BASED PROGRESS INDICATORS**
   - **Quantifiable Measures**: Specific metrics showing improvement
   - **Functional Milestones**: Key achievements in occupational performance
   - **Standardized Assessment Results**: Any formal evaluation outcomes

## 5. **CONTINUED INTERVENTION RECOMMENDATIONS**
   - **Priority Areas**: What domains need continued focus?
   - **Intervention Strategies**: Recommended approaches for ongoing progress
   - **Environmental Modifications**: Additional adaptations to consider

## 6. **FAMILY/CAREGIVER GUIDANCE**
   - **Home Program Updates**: Modified activities for continued progress
   - **Environmental Modifications**: Home adaptations to maintain gains
   - **Progress Monitoring**: How to track continued improvement

## 7. **LONG-TERM OCCUPATIONAL GOALS**
   - **Next Phase Objectives**: Short and long-term occupational goals
   - **Transition Planning**: Preparation for next developmental stage
   - **Maintenance Strategies**: How to sustain current progress

## 8. **RE-ASSESSMENT PLANNING**
   - **Timeline**: When formal re-evaluation should occur
   - **Focus Areas**: What to assess in the next evaluation
   - **Outcome Measures**: Specific indicators to track

Please use OTPF-4 terminology throughout and focus on occupational outcomes, participation, and meaningful engagement. Structure the response for healthcare professionals while ensuring family-friendly language for parent/guardian communication.
`;

module.exports = progressSummaryPrompt;
