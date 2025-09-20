const assessmentPrompt = (patientData, sessionNotes) => `
As an expert Pediatric Occupational Therapist AI assistant, analyze the following child's therapy session using OTPF-4 framework standards and provide professional insights focused on pediatric development and family-centered care.

CHILD INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age || 'Not specified'} (Pediatric focus: ages 0-21)
- Diagnosis: ${patientData.diagnosis || 'Not specified'}
- Therapy Goals: ${patientData.therapyGoals || 'Not specified'}
- Developmental Stage: ${patientData.age ? (patientData.age < 3 ? 'Early Intervention' : patientData.age < 6 ? 'Preschool' : patientData.age < 12 ? 'School Age' : 'Adolescent') : 'Not specified'}

SESSION NOTES:
${sessionNotes}

Please provide the following pediatric OTPF-4 aligned analysis:

## 1. **PEDIATRIC OCCUPATIONAL PERFORMANCE ANALYSIS**
   - **Domain Assessment**: Which pediatric areas of occupation were addressed? (Play, Education, ADL, Social Participation, Rest and Sleep)
   - **Developmental Skills**: What fine motor, gross motor, sensory processing, and social interaction skills were observed?
   - **Performance Patterns**: Any changes in daily routines, play patterns, or developmental roles?
   - **Age-Appropriate Expectations**: How does performance align with developmental milestones for this age?

## 2. **PEDIATRIC CONTEXT FACTORS ANALYSIS**
   - **Environmental Factors**: How did home, school, or therapy environments influence the child's performance?
   - **Family Factors**: What family dynamics, cultural background, or parental involvement affected engagement?
   - **Developmental Context**: How did the child's age, developmental stage, and learning style impact the session?
   - **Environmental Modifications**: What home, school, or community adaptations were needed?

## 3. **PEDIATRIC OCCUPATIONAL THERAPY PROCESS EVALUATION**
   - **Evaluation**: What new information was gathered about the child's developmental and occupational performance?
   - **Intervention**: How effective were the play-based and therapeutic intervention strategies?
   - **Outcomes**: What developmental progress was made toward age-appropriate occupational goals?

## 4. **PEDIATRIC FUNCTIONAL ANALYSIS WITH OTPF TERMINOLOGY**
   - **Occupational Performance**: What age-appropriate activities were successfully completed?
   - **Play Participation**: How did the child engage in meaningful play and learning activities?
   - **Developmental Role Competence**: What progress was made in fulfilling age-appropriate roles (student, sibling, friend)?

## 5. **PEDIATRIC EVIDENCE-BASED RECOMMENDATIONS**
   - **Play-Based Intervention Strategies**: What therapeutic play and developmental approaches should be prioritized?
   - **Environmental Adaptations**: What home, school, and community modifications would enhance the child's occupational performance?
   - **Family-Centered Care**: How can parents/caregivers facilitate the child's developmental progress?
   - **Sensory Processing Support**: What sensory strategies and accommodations are needed?

## 6. **PEDIATRIC PROGRESS MONITORING & OUTCOMES**
   - **Developmental Outcomes**: What specific developmental indicators should be tracked?
   - **Re-assessment Timeline**: When should formal developmental re-evaluation occur?
   - **Educational Integration**: How can we ensure the child's success in school and community settings?

## 7. **PEDIATRIC NEXT SESSION PLANNING**
   - **Developmental Focus**: What pediatric domains should be prioritized? (Play, Education, ADL, Social Participation)
   - **Play-Based Intervention Approaches**: What specific therapeutic play and developmental strategies should be implemented?
   - **Child Safety Considerations**: Any age-appropriate precautions or developmental contraindications?

## 8. **FAMILY-CENTERED COMMUNICATION**
   - **Developmental Progress**: Key achievements in age-appropriate activities and developmental milestones
   - **Home Program**: Specific play-based activities and routines to support the child's development
   - **Environmental Modifications**: Home, school, and community adaptations to enhance the child's performance
   - **Parent Education**: Key points to share with parents about their child's development and progress

Please structure your response using pediatric OTPF-4 terminology and focus on developmental outcomes, play-based participation, and engagement in meaningful childhood activities. Ensure all recommendations align with evidence-based pediatric occupational therapy practice and family-centered care principles.
`;

module.exports = assessmentPrompt;
