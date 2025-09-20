// Assessment Templates Service
// Provides pre-built templates for common OT assessments

export const assessmentTemplates = {
  // Fine Motor Skills Assessment Template
  fineMotor: {
    id: 'fine-motor',
    name: 'Fine Motor Skills Assessment',
    type: 'Comprehensive',
    category: 'Fine Motor',
    description: 'Comprehensive assessment of fine motor skills including hand-eye coordination, dexterity, and precision.',
    areas: [
      { name: 'Hand-Eye Coordination', score: '', maxScore: 100 },
      { name: 'Finger Dexterity', score: '', maxScore: 100 },
      { name: 'Grip Strength', score: '', maxScore: 100 },
      { name: 'Precision Movements', score: '', maxScore: 100 },
      { name: 'Bilateral Coordination', score: '', maxScore: 100 },
      { name: 'Visual Motor Integration', score: '', maxScore: 100 }
    ],
    recommendations: [
      'Implement fine motor strengthening exercises',
      'Practice precision tasks with various materials',
      'Work on hand-eye coordination activities',
      'Develop bilateral coordination skills'
    ],
    summary: 'Standardized fine motor skills assessment covering key areas of hand function and coordination.',
    aiInsights: 'This template follows OTPF-4 standards for fine motor assessment and provides comprehensive coverage of essential fine motor skills.'
  },

  // Gross Motor Skills Assessment Template
  grossMotor: {
    id: 'gross-motor',
    name: 'Gross Motor Skills Assessment',
    type: 'Comprehensive',
    category: 'Gross Motor',
    description: 'Assessment of gross motor skills including balance, coordination, and movement patterns.',
    areas: [
      { name: 'Balance', score: '', maxScore: 100 },
      { name: 'Coordination', score: '', maxScore: 100 },
      { name: 'Strength', score: '', maxScore: 100 },
      { name: 'Endurance', score: '', maxScore: 100 },
      { name: 'Movement Patterns', score: '', maxScore: 100 },
      { name: 'Postural Control', score: '', maxScore: 100 }
    ],
    recommendations: [
      'Implement balance training exercises',
      'Work on coordination activities',
      'Develop strength and endurance',
      'Practice proper movement patterns'
    ],
    summary: 'Comprehensive gross motor skills assessment covering fundamental movement abilities.',
    aiInsights: 'This template aligns with OTPF-4 gross motor assessment standards and covers essential movement skills.'
  },

  // Sensory Processing Assessment Template
  sensory: {
    id: 'sensory',
    name: 'Sensory Processing Assessment',
    type: 'Comprehensive',
    category: 'Sensory',
    description: 'Assessment of sensory processing abilities including tactile, auditory, visual, and proprioceptive processing.',
    areas: [
      { name: 'Tactile Processing', score: '', maxScore: 100 },
      { name: 'Auditory Processing', score: '', maxScore: 100 },
      { name: 'Visual Processing', score: '', maxScore: 100 },
      { name: 'Proprioceptive Processing', score: '', maxScore: 100 },
      { name: 'Vestibular Processing', score: '', maxScore: 100 },
      { name: 'Sensory Modulation', score: '', maxScore: 100 }
    ],
    recommendations: [
      'Implement sensory integration activities',
      'Provide appropriate sensory input',
      'Work on sensory modulation skills',
      'Develop adaptive responses to sensory stimuli'
    ],
    summary: 'Comprehensive sensory processing assessment covering all major sensory systems.',
    aiInsights: 'This template follows sensory integration theory and OTPF-4 standards for sensory assessment.'
  },

  // ADL Assessment Template
  adl: {
    id: 'adl',
    name: 'Activities of Daily Living Assessment',
    type: 'Comprehensive',
    category: 'ADL',
    description: 'Assessment of basic and instrumental activities of daily living.',
    areas: [
      { name: 'Personal Hygiene', score: '', maxScore: 100 },
      { name: 'Dressing', score: '', maxScore: 100 },
      { name: 'Eating', score: '', maxScore: 100 },
      { name: 'Mobility', score: '', maxScore: 100 },
      { name: 'Communication', score: '', maxScore: 100 },
      { name: 'Home Management', score: '', maxScore: 100 }
    ],
    recommendations: [
      'Implement ADL training programs',
      'Provide adaptive equipment as needed',
      'Work on independence in daily tasks',
      'Develop compensatory strategies'
    ],
    summary: 'Comprehensive ADL assessment covering essential daily living skills.',
    aiInsights: 'This template follows OTPF-4 ADL assessment standards and covers fundamental daily living activities.'
  },

  // Cognitive Assessment Template
  cognitive: {
    id: 'cognitive',
    name: 'Cognitive Skills Assessment',
    type: 'Comprehensive',
    category: 'Cognitive',
    description: 'Assessment of cognitive abilities including memory, attention, problem-solving, and executive function.',
    areas: [
      { name: 'Memory', score: '', maxScore: 100 },
      { name: 'Attention', score: '', maxScore: 100 },
      { name: 'Problem Solving', score: '', maxScore: 100 },
      { name: 'Executive Function', score: '', maxScore: 100 },
      { name: 'Processing Speed', score: '', maxScore: 100 },
      { name: 'Visual Perception', score: '', maxScore: 100 }
    ],
    recommendations: [
      'Implement cognitive training exercises',
      'Work on memory strategies',
      'Develop problem-solving skills',
      'Practice attention and focus activities'
    ],
    summary: 'Comprehensive cognitive assessment covering essential thinking and reasoning skills.',
    aiInsights: 'This template aligns with cognitive assessment standards and covers key cognitive domains.'
  },

  // Social Skills Assessment Template
  social: {
    id: 'social',
    name: 'Social Skills Assessment',
    type: 'Comprehensive',
    category: 'Social Skills',
    description: 'Assessment of social interaction skills, communication, and peer relationships.',
    areas: [
      { name: 'Social Interaction', score: '', maxScore: 100 },
      { name: 'Communication', score: '', maxScore: 100 },
      { name: 'Peer Relationships', score: '', maxScore: 100 },
      { name: 'Emotional Regulation', score: '', maxScore: 100 },
      { name: 'Conflict Resolution', score: '', maxScore: 100 },
      { name: 'Social Awareness', score: '', maxScore: 100 }
    ],
    recommendations: [
      'Implement social skills training',
      'Practice communication skills',
      'Work on emotional regulation',
      'Develop conflict resolution strategies'
    ],
    summary: 'Comprehensive social skills assessment covering essential social interaction abilities.',
    aiInsights: 'This template follows social skills assessment standards and covers key social interaction domains.'
  },

  // Pediatric Screening Template
  pediatricScreening: {
    id: 'pediatric-screening',
    name: 'Pediatric Developmental Screening',
    type: 'Screening',
    category: 'Pediatric',
    description: 'Quick screening assessment for pediatric developmental milestones.',
    areas: [
      { name: 'Motor Development', score: '', maxScore: 100 },
      { name: 'Language Development', score: '', maxScore: 100 },
      { name: 'Social Development', score: '', maxScore: 100 },
      { name: 'Cognitive Development', score: '', maxScore: 100 }
    ],
    recommendations: [
      'Monitor developmental progress',
      'Provide age-appropriate activities',
      'Refer for comprehensive evaluation if needed',
      'Implement early intervention strategies'
    ],
    summary: 'Quick screening assessment for pediatric developmental milestones.',
    aiInsights: 'This template follows pediatric screening standards and provides quick developmental assessment.'
  },

  // Geriatric Assessment Template
  geriatric: {
    id: 'geriatric',
    name: 'Geriatric Functional Assessment',
    type: 'Comprehensive',
    category: 'Geriatric',
    description: 'Comprehensive assessment for older adults focusing on functional abilities and safety.',
    areas: [
      { name: 'Functional Mobility', score: '', maxScore: 100 },
      { name: 'Balance and Fall Risk', score: '', maxScore: 100 },
      { name: 'ADL Performance', score: '', maxScore: 100 },
      { name: 'Cognitive Function', score: '', maxScore: 100 },
      { name: 'Safety Awareness', score: '', maxScore: 100 },
      { name: 'Home Safety', score: '', maxScore: 100 }
    ],
    recommendations: [
      'Implement fall prevention strategies',
      'Provide home safety modifications',
      'Work on functional independence',
      'Develop compensatory strategies'
    ],
    summary: 'Comprehensive geriatric assessment focusing on functional abilities and safety.',
    aiInsights: 'This template follows geriatric assessment standards and addresses key safety and functional concerns.'
  }
};

// Get all available templates
export const getAllTemplates = () => {
  return Object.values(assessmentTemplates);
};

// Get template by ID
export const getTemplateById = (templateId) => {
  return assessmentTemplates[templateId];
};

// Get templates by category
export const getTemplatesByCategory = (category) => {
  return Object.values(assessmentTemplates).filter(template => 
    template.category === category
  );
};

// Get templates by type
export const getTemplatesByType = (type) => {
  return Object.values(assessmentTemplates).filter(template => 
    template.type === type
  );
};

// Search templates
export const searchTemplates = (searchTerm) => {
  const term = searchTerm.toLowerCase();
  return Object.values(assessmentTemplates).filter(template => 
    template.name.toLowerCase().includes(term) ||
    template.description.toLowerCase().includes(term) ||
    template.category.toLowerCase().includes(term)
  );
};

// Apply template to create assessment data
export const applyTemplate = (templateId, patientId, customizations = {}) => {
  const template = getTemplateById(templateId);
  if (!template) return null;

  return {
    patientId,
    title: customizations.title || template.name,
    type: customizations.type || template.type,
    category: customizations.category || template.category,
    areas: template.areas.map(area => ({ ...area })),
    recommendations: [...template.recommendations],
    summary: customizations.summary || template.summary,
    aiInsights: customizations.aiInsights || template.aiInsights,
    status: 'scheduled',
    date: new Date().toISOString().split('T')[0]
  };
};

// Get template categories
export const getTemplateCategories = () => {
  const categories = [...new Set(Object.values(assessmentTemplates).map(t => t.category))];
  return categories.sort();
};

// Get template types
export const getTemplateTypes = () => {
  const types = [...new Set(Object.values(assessmentTemplates).map(t => t.type))];
  return types.sort();
};

