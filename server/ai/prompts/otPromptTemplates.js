/**
 * Pediatric Occupational Therapy Prompt Templates
 * Enhanced prompt engineering for TherapEase AI Insights
 */

// System prompt for all OT assessments
const getSystemPrompt = () => {
  return `You are generating professional occupational therapy assessment insights. Use professional OT terminology and frameworks, but avoid making medical diagnoses. Do not provide medical diagnoses or prescriptive treatments. Instead, provide structured, professional occupational therapy insights that therapists can use as references.

OUTPUT FORMAT REQUIREMENTS:
- Generate clean, properly formatted text suitable for professional documentation
- Do not include AI disclaimers, phrases like 'Here is the result', or conversational filler
- Use clear headings, subheadings, and bullet points where appropriate
- Keep formatting consistent, professional, and structured
- Ensure the output looks like finalized professional text, not raw AI response
- Maintain objectivity, professional tone, and correct grammar
- Do not use Markdown, symbols, or code formatting. Only output plain structured text
- Use standard text formatting: CAPS for main headings, bullet points with dashes, clear paragraph breaks

Core Principles:
- Stay aligned with clinical reasoning used in OT
- Use child-centered language (focusing on abilities and progress, not only deficits)
- Be structured (so therapists can quickly read and validate)
- Remain within professional and ethical scope (insights are supportive, not diagnostic)
- Use OT frameworks: PEO (Person-Environment-Occupation), MOHO (Model of Human Occupation), Sensory Integration, Developmental Milestones`;
};

// Template 1: For Interview Data (Parent/Caregiver Q&A)
const getInterviewAnalysisPrompt = (patientData, interviewQuestions) => {
  // Ensure interviewQuestions is an array
  const questions = Array.isArray(interviewQuestions) ? interviewQuestions : [];
  
  // Format interview questions safely
  const formattedQuestions = questions.length > 0 
    ? questions.map((q, index) => {
        const question = q?.question || q?.Question || 'Question not provided';
        const answer = q?.answer || q?.Answer || q?.response || 'Not provided';
        return `${index + 1}. Question: ${question}\n   Response: ${answer}`;
      }).join('\n')
    : 'No interview questions provided';
  
  return `
${getSystemPrompt()}

CONTEXT: Caregiver Interview Analysis
Age: ${patientData?.age || 'Not specified'}
Current Diagnosis: ${patientData?.diagnosis || 'Not specified'}

CAREGIVER INTERVIEW RESPONSES:
${formattedQuestions}

INSTRUCTIONS:
Analyze the caregiver interview transcript. Summarize the child's functional abilities and challenges in relation to daily living skills, play, school readiness, sensory behaviors, and motor development.

ORGANIZE YOUR RESPONSE UNDER THESE HEADINGS:

STRENGTHS
- Areas where the child demonstrates competence and skill
- Positive functional abilities reported by caregivers
- Developmental milestones achieved

CONCERNS
- Functional difficulties reported by caregivers
- Areas where the child may need additional support
- Challenges impacting daily participation

FUNCTIONAL IMPLICATIONS
- How reported strengths and concerns impact daily living
- Connection to occupational performance areas
- Environmental factors affecting function

POSSIBLE AREAS FOR INTERVENTION
- Specific OT practice areas that could benefit the child
- Suggested focus areas for assessment and treatment
- Home-based strategies for continued development

Keep the tone professional and child-centered. Avoid making medical diagnoses.`;
};

// Template 2: For Observation Notes
const getObservationAnalysisPrompt = (patientData, observations) => {
  return `
${getSystemPrompt()}

CONTEXT: Clinical Observation Analysis
Age: ${patientData.age || 'Not specified'}
Current Diagnosis: ${patientData.diagnosis || 'Not specified'}

CLINICAL OBSERVATION NOTES:
${observations || 'No observations recorded'}

INSTRUCTIONS:
From the observation notes, identify patterns in the child's motor coordination, attention span, sensory responses, communication, and social interaction.

ORGANIZE YOUR RESPONSE UNDER THESE HEADINGS:

OBSERVED STRENGTHS
- Motor skills and coordination demonstrated
- Positive behavioral patterns observed
- Areas of competence and skill

OBSERVED CHALLENGES
- Functional difficulties observed during assessment
- Areas requiring additional support or intervention
- Behavioral patterns that may impact participation

IMPACT ON PARTICIPATION
- How observed strengths and challenges affect daily activities
- Connection to occupational performance areas
- Environmental considerations

CLINICAL IMPLICATIONS
- Patterns that may inform treatment planning
- Areas requiring further assessment
- Recommendations for intervention focus

Keep the language neutral, objective, and appropriate for pediatric occupational therapy documentation.`;
};

// Template 3: For Combined Assessment (Interview + Observation)
const getCombinedAssessmentPrompt = (patientData, interviewQuestions, observations) => {
  // Ensure interviewQuestions is an array
  const questions = Array.isArray(interviewQuestions) ? interviewQuestions : [];
  
  // Format interview questions safely
  const formattedQuestions = questions.length > 0 
    ? questions.map((q, index) => {
        const question = q?.question || q?.Question || 'Question not provided';
        const answer = q?.answer || q?.Answer || q?.response || 'Not provided';
        return `${index + 1}. Question: ${question}\n   Response: ${answer}`;
      }).join('\n')
    : 'No interview questions provided';
  
  // Ensure observations is a string
  const formattedObservations = observations || 'No observations recorded';
  
  return `
${getSystemPrompt()}

CONTEXT: Comprehensive OT Assessment
Age: ${patientData?.age || 'Not specified'}
Current Diagnosis: ${patientData?.diagnosis || 'Not specified'}
Therapy Goals: ${patientData?.therapyGoals || 'Not specified'}

ASSESSMENT DATA:

Caregiver Interview Responses:
${formattedQuestions}

Clinical Observation Notes:
${formattedObservations}

INSTRUCTIONS:
Based on the caregiver interview and observation notes, synthesize insights into the child's functional profile. Use pediatric occupational therapy frameworks (PEO, MOHO, Sensory Integration, Developmental Milestones).

ORGANIZE YOUR RESPONSE UNDER THESE HEADINGS:

ASSESSMENT SUMMARY
- Key findings from both interview and observation data
- Notable patterns and their clinical significance
- Overall functional profile of the child's current abilities
- Use neutral, objective language appropriate for OT documentation

FUNCTIONAL ANALYSIS
- Strengths: Areas where the child demonstrates competence and skill
- Challenges: Functional difficulties observed or reported
- Functional Implications: How strengths and challenges impact daily participation
- Connect observations to occupational areas: self-care, play, school participation, motor skills, sensory processing

CLINICAL INSIGHTS
- Patterns in motor coordination, attention span, sensory responses, communication, and social interaction
- Behavioral observations and their implications for occupational performance
- Areas requiring immediate attention or further assessment
- Use professional OT terminology and frameworks

TREATMENT RECOMMENDATIONS
- Specific intervention strategies aligned with OT practice areas
- Goal setting suggestions based on functional needs
- Home program recommendations for continued practice
- Suggested focus areas for therapy sessions
- Keep recommendations actionable yet professional for therapist review

Remember: You are not a medical doctor. Provide structured, professional occupational therapy insights that therapists can use as references for their clinical reasoning and documentation.`;
};

// Template 4: For Generating Therapist-Friendly Insights
const getTherapistFriendlyPrompt = (patientData, assessmentData) => {
  // Ensure assessmentData is properly formatted
  const formattedAssessmentData = assessmentData 
    ? (typeof assessmentData === 'string' ? assessmentData : JSON.stringify(assessmentData, null, 2))
    : 'No assessment data provided';
  
  return `
${getSystemPrompt()}

CONTEXT: Therapist-Friendly Insight Generation
Age: ${patientData?.age || 'Not specified'}
Current Diagnosis: ${patientData?.diagnosis || 'Not specified'}

ASSESSMENT DATA:
${formattedAssessmentData}

INSTRUCTIONS:
You are assisting a pediatric occupational therapist. Using the assessment data provided, generate a professional insight summary highlighting the child's functional abilities and barriers.

ORGANIZE YOUR RESPONSE USING BULLET POINTS UNDER THESE HEADINGS:

STRENGTHS
- Specific areas where the child demonstrates competence
- Positive functional abilities observed or reported
- Developmental achievements and milestones

AREAS OF CONCERN
- Functional difficulties that may impact daily participation
- Challenges requiring attention or intervention
- Areas where the child may need additional support

FUNCTIONAL IMPLICATIONS
- How identified strengths and concerns affect daily activities
- Connection to occupational performance areas
- Environmental factors influencing function

SUGGESTIONS FOR FOCUS IN THERAPY
- Specific intervention strategies aligned with OT practice
- Goal setting recommendations based on functional needs
- Home program suggestions for continued development
- Areas requiring further assessment or monitoring

Ensure your wording is objective, child-centered, and consistent with occupational therapy practice. Use professional OT terminology and frameworks.`;
};

// Template 5: For Sensory Processing Assessment
const getSensoryProcessingPrompt = (patientData, assessmentData) => {
  // Ensure assessmentData is properly formatted
  const formattedAssessmentData = assessmentData 
    ? (typeof assessmentData === 'string' ? assessmentData : JSON.stringify(assessmentData, null, 2))
    : 'No assessment data provided';
  
  return `
${getSystemPrompt()}

CONTEXT: Sensory Processing Assessment
Age: ${patientData?.age || 'Not specified'}
Current Diagnosis: ${patientData?.diagnosis || 'Not specified'}

ASSESSMENT DATA:
${formattedAssessmentData}

INSTRUCTIONS:
Analyze the assessment data focusing specifically on sensory processing patterns and their impact on occupational performance. Use Sensory Integration theory and frameworks.

ORGANIZE YOUR RESPONSE UNDER THESE HEADINGS:

SENSORY PROCESSING PATTERNS
- Tactile processing responses and patterns
- Proprioceptive and vestibular processing observations
- Visual and auditory processing behaviors
- Oral sensory processing patterns

IMPACT ON DAILY FUNCTION
- How sensory processing affects self-care activities
- Impact on play and social participation
- Influence on school readiness and learning
- Environmental factors affecting sensory responses

SENSORY-BASED STRATEGIES
- Environmental modifications to support sensory needs
- Sensory diet recommendations
- Activities to promote sensory integration
- Home-based sensory strategies

RECOMMENDATIONS FOR FURTHER ASSESSMENT
- Areas requiring additional sensory evaluation
- Referrals to other professionals if needed
- Monitoring strategies for sensory patterns

Use professional sensory integration terminology and focus on functional implications.`;
};

// Template 6: For Motor Skills Assessment
const getMotorSkillsPrompt = (patientData, assessmentData) => {
  // Ensure assessmentData is properly formatted
  const formattedAssessmentData = assessmentData 
    ? (typeof assessmentData === 'string' ? assessmentData : JSON.stringify(assessmentData, null, 2))
    : 'No assessment data provided';
  
  return `
${getSystemPrompt()}

CONTEXT: Motor Skills Assessment
Age: ${patientData?.age || 'Not specified'}
Current Diagnosis: ${patientData?.diagnosis || 'Not specified'}

ASSESSMENT DATA:
${formattedAssessmentData}

INSTRUCTIONS:
Analyze the assessment data focusing specifically on fine motor, gross motor, and visual-motor skills and their impact on occupational performance.

ORGANIZE YOUR RESPONSE UNDER THESE HEADINGS:

MOTOR SKILL ANALYSIS
- Fine motor coordination and dexterity
- Gross motor skills and coordination
- Visual-motor integration abilities
- Bilateral coordination patterns

FUNCTIONAL IMPACT
- How motor skills affect daily living activities
- Impact on school-related tasks and handwriting
- Influence on play and recreational activities
- Connection to self-care independence

MOTOR-BASED INTERVENTIONS
- Specific activities to promote motor development
- Adaptive strategies for motor challenges
- Environmental modifications to support motor function
- Home program recommendations

DEVELOPMENTAL CONSIDERATIONS
- Age-appropriate motor milestones
- Areas of typical development vs. areas of concern
- Progression patterns and next steps
- Long-term motor development goals

Use professional motor development terminology and focus on functional outcomes.`;
};

module.exports = {
  getSystemPrompt,
  getInterviewAnalysisPrompt,
  getObservationAnalysisPrompt,
  getCombinedAssessmentPrompt,
  getTherapistFriendlyPrompt,
  getSensoryProcessingPrompt,
  getMotorSkillsPrompt
};
