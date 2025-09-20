const parentSummaryPrompt = (patientData, sessionSummary) => `
As an expert Occupational Therapist AI assistant, create a parent-friendly summary of today's therapy session using OTPF-4 framework principles:

PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- Age: ${patientData.age || 'Not specified'}
- Session Summary: ${sessionSummary}

Please provide a clear, encouraging summary that parents can easily understand and act upon:

## 1. **WHAT WE WORKED ON TODAY (In Simple Terms)**
   - **Daily Activities**: What everyday tasks did we practice? (dressing, eating, playing, etc.)
   - **New Skills**: What abilities did we work on developing?
   - **Fun Activities**: What games or activities did we use to make therapy enjoyable?

## 2. **HOW YOUR CHILD DID**
   - **Strengths**: What did your child do really well today?
   - **Progress**: What improvements did we notice?
   - **Challenges**: What was difficult, and how did we work through it?
   - **Effort**: How did your child engage and participate?

## 3. **WHAT THIS MEANS FOR DAILY LIFE**
   - **Home Activities**: How can you practice these skills at home?
   - **Daily Routines**: What changes can you make to support your child's progress?
   - **Family Involvement**: How can the whole family help?

## 4. **SPECIFIC THINGS YOU CAN DO AT HOME**
   - **Simple Exercises**: Easy activities that fit into your daily routine
   - **Environmental Changes**: Small modifications to make things easier
   - **Encouragement Strategies**: Ways to motivate and support your child
   - **Safety Tips**: Important precautions to keep in mind

## 5. **PROGRESS WE'RE SEEING**
   - **Short-term Gains**: What improvements have happened recently?
   - **Long-term Goals**: What are we working toward?
   - **Milestones**: What achievements should we celebrate?

## 6. **ANY CONCERNS OR QUESTIONS**
   - **Things to Watch For**: What should you pay attention to?
   - **When to Contact Us**: What situations require immediate attention?
   - **Questions to Ask**: What would be helpful for us to know?

## 7. **NEXT STEPS**
   - **This Week**: What to focus on at home
   - **Next Session**: What we'll work on next time
   - **Long-term Plan**: What we're working toward together

## 8. **CELEBRATING SUCCESS**
   - **Today's Wins**: What should we be proud of?
   - **Family Recognition**: How can you acknowledge your child's efforts?
   - **Motivation**: What will keep your child excited about therapy?

## 9. **RESOURCES & SUPPORT**
   - **Home Materials**: What items can help with practice?
   - **Community Activities**: What local opportunities support our goals?
   - **Family Support**: How can we help you as parents/caregivers?

## 10. **COMMUNICATION & FEEDBACK**
   - **What to Tell Us**: What observations would be helpful?
   - **Questions Welcome**: What would you like to know more about?
   - **Partnership**: How we can work together for your child's success

Please use clear, encouraging language that parents can easily understand. Focus on practical, actionable advice that integrates therapy goals into natural family routines. Emphasize the partnership between family and therapy team, and highlight progress and achievements in meaningful, everyday terms.
`;

module.exports = parentSummaryPrompt;
