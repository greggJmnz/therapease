import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Brain, TrendingUp, Lightbulb, Target, Clock, User, FileText, Save, Plus, Trash2, Eye, Download, BookOpen, Edit3, X, Activity, Users, AlertTriangle } from 'lucide-react';
import { therapistAPI, aiAPI } from '../../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import ConfirmationModal from '../../components/ConfirmationModal';

const AIInsights = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [insights, setInsights] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [generatedPDFs, setGeneratedPDFs] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState(null);
  
  // New state for interview questions and observations
  const [interviewQuestions, setInterviewQuestions] = useState([
    { id: 1, question: '', answer: '' }
  ]);
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New state for assessment history modal
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  // New state for AI insights view modal
  const [selectedAIInsight, setSelectedAIInsight] = useState(null);
  const [showAIInsightModal, setShowAIInsightModal] = useState(false);

  // Template management state
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showTemplateList, setShowTemplateList] = useState(false);

  // Get therapist ID from token
  const getTherapistId = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    return null;
  };

  // Fetch patients data from API
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useQuery(
    'therapistPatients',
    () => therapistAPI.getPatients(getTherapistId()),
    {
      enabled: !!getTherapistId(),
      onError: (error) => {
        toast.error('Failed to load patients data');
        console.error('Error fetching patients:', error);
      }
    }
  );

  useEffect(() => {
    // Transform API data to match component expectations (double nesting)
    if (patientsData?.data?.data?.patients) {
      const transformedPatients = patientsData.data.data.patients.map(patient => ({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        age: patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'N/A',
        diagnosis: patient.diagnosis || 'Not specified'
      }));
      setPatients(transformedPatients);
    }
  }, [patientsData]);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load generated PDFs history on component mount
  useEffect(() => {
    loadGeneratedPDFs();
  }, []);

  // Load generated PDFs when patient changes
  useEffect(() => {
    if (selectedPatient) {
      loadPatientPDFsFromDatabase();
    } else {
      setAssessmentHistory([]);
    }
  }, [selectedPatient]);

  // Load saved assessment data when patient changes
  useEffect(() => {
    if (selectedPatient) {
      const savedData = localStorage.getItem(`assessment_${selectedPatient}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.interviewQuestions && parsed.interviewQuestions.length > 0) {
            setInterviewQuestions(parsed.interviewQuestions);
          }
          if (parsed.observations) {
            setObservations(parsed.observations);
          }
        } catch (error) {
          console.error('Error loading saved assessment data:', error);
        }
      } else {
        // Reset to default state for new patient
        setInterviewQuestions([{ id: 1, question: '', answer: '' }]);
        setObservations('');
      }
    }
  }, [selectedPatient]);

  // Interview questions management
  const addInterviewQuestion = () => {
    const newId = Math.max(...interviewQuestions.map(q => q.id), 0) + 1;
    setInterviewQuestions([...interviewQuestions, { id: newId, question: '', answer: '' }]);
  };

  const removeInterviewQuestion = (id) => {
    if (interviewQuestions.length > 1) {
      setInterviewQuestions(interviewQuestions.filter(q => q.id !== id));
    }
  };

  const updateInterviewQuestion = (id, field, value) => {
    setInterviewQuestions(interviewQuestions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // Load sample questions for common assessments
  const loadSampleQuestions = () => {
    const sampleQuestions = [
      { id: 1, question: 'Can you tell me about your daily routine?', answer: 'Patient describes a structured morning routine including breakfast, getting dressed, and preparing for school. Reports difficulty with time management and organization.' },
      { id: 2, question: 'What activities do you enjoy doing?', answer: 'Enjoys playing with building blocks, drawing, and outdoor activities. Shows particular interest in puzzles and creative play.' },
      { id: 3, question: 'Are there any activities that are difficult for you?', answer: 'Struggles with fine motor tasks like buttoning clothes and using scissors. Also finds it challenging to sit still for extended periods.' },
      { id: 4, question: 'How do you feel about your current abilities?', answer: 'Expresses frustration with tasks that require precise hand movements. Shows awareness of difficulties but maintains positive attitude overall.' },
      { id: 5, question: 'What would you like to improve or work on?', answer: 'Wants to improve handwriting, be more independent with self-care tasks, and participate more in group activities at school.' },
      { id: 6, question: 'How do you handle changes in your routine?', answer: 'Becomes anxious with unexpected changes. Needs advance notice and preparation to adapt to new situations or activities.' },
      { id: 7, question: 'What helps you feel calm and focused?', answer: 'Responds well to deep pressure activities, quiet spaces, and structured activities. Music and movement also help with regulation.' },
      { id: 8, question: 'How do you communicate your needs?', answer: 'Uses a combination of words, gestures, and sometimes becomes frustrated when not understood. Working on using more descriptive language.' },
      { id: 9, question: 'What sensory experiences do you find challenging?', answer: 'Sensitive to loud noises, certain textures of clothing, and bright lights. Prefers soft, comfortable fabrics and dim lighting.' },
      { id: 10, question: 'How do you interact with peers?', answer: 'Enjoys playing with 1-2 close friends but finds large groups overwhelming. Sometimes needs adult support to initiate social interactions.' },
      { id: 11, question: 'What are your favorite learning activities?', answer: 'Prefers hands-on, visual learning activities. Enjoys science experiments, art projects, and interactive games over worksheets.' },
      { id: 12, question: 'How do you handle frustration?', answer: 'May become tearful or withdraw when frustrated. Working on using words to express feelings and asking for help when needed.' },
      { id: 13, question: 'What self-care tasks can you do independently?', answer: 'Can brush teeth with reminders, wash hands, and get dressed with some assistance. Still working on tying shoes and managing buttons.' },
      { id: 14, question: 'How is your attention and focus?', answer: 'Can focus for 10-15 minutes on preferred activities but struggles to maintain attention during less interesting tasks or in noisy environments.' },
      { id: 15, question: 'What physical activities do you enjoy?', answer: 'Loves swimming, playground activities, and bike riding. Shows good gross motor skills but needs work on balance and coordination.' },
      { id: 16, question: 'How do you sleep at night?', answer: 'Generally sleeps well but may wake up if routine is disrupted. Sometimes needs help settling down before bed.' },
      { id: 17, question: 'What foods do you prefer?', answer: 'Prefers soft, familiar foods. Avoids certain textures and temperatures. Working on expanding food variety gradually.' },
      { id: 18, question: 'How do you handle transitions between activities?', answer: 'Needs visual cues and countdown warnings before transitions. May resist moving from preferred to non-preferred activities.' },
      { id: 19, question: 'What makes you feel proud of yourself?', answer: 'Feels proud when completing puzzles, helping others, and learning new skills. Enjoys positive reinforcement and praise.' },
      { id: 20, question: 'What goals would you like to work on together?', answer: 'Wants to improve handwriting, be more independent with dressing, and make more friends at school. Open to trying new activities.' }
    ];
    setInterviewQuestions(sampleQuestions);
    
    // Also load sample observations
    const sampleObservations = `CLINICAL OBSERVATIONS:

MOTOR SKILLS:
- Demonstrates age-appropriate gross motor skills during playground activities
- Shows difficulty with fine motor precision tasks (handwriting, cutting, buttoning)
- Grip strength appears adequate but lacks refined finger control
- Bilateral coordination is developing but needs improvement
- Balance and postural control are within normal limits

SENSORY PROCESSING:
- Shows sensitivity to auditory input (covers ears during loud noises)
- Tactile defensiveness noted with certain clothing textures
- Seeks proprioceptive input through jumping and climbing activities
- Visual processing appears intact with good eye tracking
- May be overstimulated in busy, noisy environments

ATTENTION AND COGNITION:
- Sustained attention varies based on task interest and environmental factors
- Shows good problem-solving skills with hands-on activities
- Working memory appears adequate for age level
- May need frequent breaks during structured activities
- Responds well to visual and kinesthetic learning approaches

SOCIAL-EMOTIONAL:
- Demonstrates appropriate social awareness and empathy
- May need support with social initiation and group participation
- Shows good emotional regulation with adult support
- Expresses needs and wants clearly most of the time
- Building positive relationships with peers and adults

COMMUNICATION:
- Speech and language development appears age-appropriate
- Uses varied vocabulary and sentence structures
- May need clarification or repetition of complex instructions
- Non-verbal communication is effective and appropriate
- Shows good listening skills when engaged in preferred activities

BEHAVIORAL OBSERVATIONS:
- Generally cooperative and willing to try new activities
- May become frustrated with challenging tasks but responds well to encouragement
- Shows good self-awareness of strengths and areas for improvement
- Demonstrates appropriate boundaries and safety awareness
- Engages well in structured, predictable activities

RECOMMENDATIONS FOR INTERVENTION:
- Focus on fine motor skill development through engaging, play-based activities
- Implement sensory strategies to support attention and regulation
- Provide visual supports and clear expectations for transitions
- Encourage social participation through structured group activities
- Build on strengths while addressing areas of need in a supportive manner`;
    
    setObservations(sampleObservations);
    toast.success('Sample questions with answers and observation notes loaded successfully!');
  };


  // Clear all assessment data
  const clearAssessmentData = () => {
    setInterviewQuestions([{ id: 1, question: '', answer: '' }]);
    setObservations('');
    toast.success('Assessment data cleared');
  };

  // Template management functions
  const loadTemplates = () => {
    try {
      const savedTemplates = localStorage.getItem(`question_templates_${getTherapistId()}`);
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const hasQuestions = interviewQuestions.some(q => q.question.trim() !== '');
    if (!hasQuestions) {
      toast.error('Please add at least one question to save as template');
      return;
    }

    const newTemplate = {
      id: Date.now(),
      name: templateName.trim(),
      questions: interviewQuestions.filter(q => q.question.trim() !== ''),
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = editingTemplate 
      ? templates.map(t => t.id === editingTemplate.id ? newTemplate : t)
      : [...templates, newTemplate];

    setTemplates(updatedTemplates);
    localStorage.setItem(`question_templates_${getTherapistId()}`, JSON.stringify(updatedTemplates));
    
    setTemplateName('');
    setEditingTemplate(null);
    setShowTemplateModal(false);
    toast.success(editingTemplate ? 'Template updated successfully!' : 'Template saved successfully!');
  };

  const loadTemplate = (template) => {
    const templateQuestions = template.questions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      answer: ''
    }));
    setInterviewQuestions(templateQuestions);
    setShowTemplateList(false);
    toast.success(`Template "${template.name}" loaded successfully!`);
  };

  const deleteTemplate = (templateId) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    localStorage.setItem(`question_templates_${getTherapistId()}`, JSON.stringify(updatedTemplates));
    toast.success('Template deleted successfully!');
  };

  const editTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setShowTemplateModal(true);
  };

  const openTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setShowTemplateModal(true);
  };

  const closeTemplateModal = () => {
    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateName('');
  };

  // PDF Helper Functions for Consistent Formatting
  const addPageHeader = (pdf, title, subtitle) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 5; // Minimal margin
    
    // Header background
    pdf.setFillColor(5, 150, 105);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    // Company name with compact spacing
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('THERAPEASE', margin, 12);
    
    // Report title with compact spacing
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(title, margin, 20);
    
    // Subtitle with compact formatting
    if (subtitle) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text(subtitle, margin, 24);
    }
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    
    return 30; // Return starting Y position with minimal space
  };

  const addSectionHeader = (pdf, title, yPosition, margin) => {
    // Check for page break before adding header
    yPosition = checkPageBreak(pdf, yPosition, margin);
    
    // Add minimal space before section header
    yPosition += 3;
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(5, 150, 105); // Green color for section headers
    pdf.text(title, margin, yPosition, { align: 'left' });
    
    // Add underline with compact styling
    yPosition += 2;
    pdf.setDrawColor(5, 150, 105);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, margin + 80, yPosition);
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    
    return yPosition + 6; // Reduced to 2 lines spacing after headers (6pt = ~2 lines at 9pt font)
  };

  const addSubsectionHeader = (pdf, title, yPosition, margin) => {
    // Check for page break before adding subsection header
    yPosition = checkPageBreak(pdf, yPosition, margin);
    
    // Add minimal space before subsection header
    yPosition += 2;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(60, 60, 60); // Dark gray for subsection headers
    pdf.text(title, margin, yPosition, { align: 'left' });
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    
    return yPosition + 6; // Reduced spacing after subsection headers
  };

  const addContent = (pdf, text, yPosition, margin, maxWidth, fontSize = 9) => {
    // Add minimal space before content
    yPosition += 2;
    
    // Clean the text to remove markdown formatting
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown **text**
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown *text*
      .replace(/#{1,6}\s*/g, '') // Remove markdown headers # ## ###
      .replace(/`(.*?)`/g, '$1') // Remove code markdown `text`
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url)
      .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but keep newlines)
      .trim();
    
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40); // Dark gray for better readability
    
    // Improved text splitting with better word wrapping
    const lines = pdf.splitTextToSize(cleanText, maxWidth - 5); // Add small buffer to prevent edge truncation
    
    // Add each line with compact spacing and better text handling
    lines.forEach((line, index) => {
      // Check if we need a new page before adding content
      yPosition = checkPageBreak(pdf, yPosition, margin);
      
      // Ensure line fits within page width and handle long words
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        // Use left alignment for better readability and to prevent truncation
        pdf.text(trimmedLine, margin, yPosition, { align: 'left' });
        yPosition += 3.5; // Reduced line spacing for compact layout
      }
    });
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    
    return yPosition + 4; // Minimal space after content
  };

  const addBulletList = (pdf, items, yPosition, margin, maxWidth, fontSize = 9) => {
    // Add minimal space before bullet list
    yPosition += 2;
    
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40, 40, 40); // Dark gray for better readability
    
    items.forEach((item, index) => {
      // Check for page break before each bullet item
      yPosition = checkPageBreak(pdf, yPosition, margin);
      
      // Clean the item text to remove markdown formatting
      const cleanItem = item
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown **text**
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown *text*
        .replace(/#{1,6}\s*/g, '') // Remove markdown headers
        .replace(/`(.*?)`/g, '$1') // Remove code markdown
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
        .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
        .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but keep newlines)
        .trim();
      
      const bulletText = `• ${cleanItem}`;
      // Improved text splitting with better word wrapping and buffer to prevent truncation
      const lines = pdf.splitTextToSize(bulletText, maxWidth - 5);
      
      // Add each line with compact spacing and better text handling
      lines.forEach((line, lineIndex) => {
        // Check if we need a new page before adding content
        yPosition = checkPageBreak(pdf, yPosition, margin);
        
        // Ensure line fits within page width and handle long words
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          // Use left alignment for better readability and to prevent truncation
          pdf.text(trimmedLine, margin, yPosition, { align: 'left' });
          yPosition += 3.5; // Reduced line spacing for compact layout
        }
      });
      
      yPosition += 3; // Minimal space between bullet items
    });
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    
    return yPosition + 4; // Minimal space after list
  };

  const addPageNumber = (pdf, pageNum, totalPages) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5; // Minimal margin
    
    // Add a subtle line above page number
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 25, pageHeight - 8);
    
    // Add generation timestamp only on the last page
    if (pageNum === totalPages) {
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generated by TherapEase AI Insights`, margin, pageHeight - 8);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, pageHeight - 5);
    }
  };

  const addAIDisclaimer = (pdf, yPosition, margin, contentWidth) => {
    // Check if we need a new page for the disclaimer
    yPosition = checkPageBreak(pdf, yPosition + 30, margin);
    
    // Add disclaimer section header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(5, 150, 105); // Green color for header
    pdf.text('IMPORTANT DISCLAIMER', margin, yPosition);
    yPosition += 8;
    
    // Add underline
    pdf.setDrawColor(5, 150, 105);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, margin + 80, yPosition);
    yPosition += 10;
    
    // Disclaimer text
    const disclaimerText = `The AI-generated insights contained in this report are intended for informational and decision-support purposes only. These insights should NOT be used directly for patient treatment without proper clinical evaluation and professional judgment.

The AI insights can be used to:
• Support clinical decision-making processes
• Assist in creating initial evaluation documentation
• Provide suggestions for treatment plan development
• Offer additional perspectives for consideration

IMPORTANT: These AI-generated insights provide a basis for decision-making; however, the final assessment and treatment plan must depend on the therapist's professional judgment, clinical expertise, and comprehensive patient evaluation.

The therapist retains full responsibility for all clinical decisions and patient care.`;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    // Split disclaimer text into lines with proper wrapping
    const lines = pdf.splitTextToSize(disclaimerText, contentWidth - 10);
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        pdf.text(trimmedLine, margin, yPosition, { align: 'left' });
        yPosition += 3.5;
      }
    });
    
    yPosition += 10; // Extra space after disclaimer
    
    return yPosition;
  };

  const checkPageBreak = (pdf, yPosition, margin, requiredSpace = 15) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Improved page break logic with better space management
    if (yPosition + requiredSpace > pageHeight - 25) {
      pdf.addPage();
      return 30; // Start new page with minimal margin
    }
    return yPosition;
  };

  // Well-Structured PDF Generation Functions
  const generateWellStructuredAssessmentPDF = (assessment) => {
    try {
      console.log('Starting well-structured PDF generation for AI assessment:', assessment);
      const patient = patients.find(p => p.id === parseInt(selectedPatient));
      console.log('Found patient:', patient);
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // Increased margin to prevent text cutoff
      const contentWidth = pageWidth - (margin * 2) - 10; // Additional buffer to prevent truncation
      
      // Page 1: Header and Patient Information
      let yPosition = addPageHeader(pdf, 'AI Assessment Report', `Assessment Date: ${assessment.date || 'N/A'}`);
      
      // 1. PATIENT INFORMATION
      yPosition = addSectionHeader(pdf, '1. PATIENT INFORMATION', yPosition, margin);
      
      if (patient) {
        // Create a structured table for patient information
        const patientData = [
          ['Patient Name:', String(patient.name || 'N/A')],
          ['Age:', String(patient.age || 'N/A')],
          ['Diagnosis:', String(patient.diagnosis || 'N/A')],
          ['Assessment Date:', String(assessment.date || 'N/A')],
          ['Assessment Type:', String(assessment.type || 'N/A')],
          ['AI Score:', `${String(assessment.score || 0)}%`]
        ];
        
        // Add patient information in a clean table format
        patientData.forEach(([label, value], index) => {
          yPosition = checkPageBreak(pdf, yPosition, margin);
          
          // Add minimal space before each data item
          yPosition += 1;
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(5, 150, 105); // Green color for labels
          pdf.text(label, margin + 5, yPosition);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(40, 40, 40); // Dark gray for values
          const lines = pdf.splitTextToSize(value, contentWidth - 40);
          
          // Add each line with compact spacing and justification
          lines.forEach((line, lineIndex) => {
            yPosition = checkPageBreak(pdf, yPosition, margin);
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            pdf.text(trimmedLine, margin + 35, yPosition, { align: 'left' });
            yPosition += 3.5; // Reduced line spacing
          }
          });
          
          // Reset text color
          pdf.setTextColor(0, 0, 0);
          
          yPosition += 4; // Minimal space between items
        });
      }
      
      yPosition += 10;
      
      // 2. ASSESSMENT SUMMARY
      yPosition = checkPageBreak(pdf, yPosition, margin);
      yPosition = addSectionHeader(pdf, '2. ASSESSMENT SUMMARY', yPosition, margin);
      
      const summaryText = assessment.summary ? String(assessment.summary) : 'No summary available';
      yPosition = addContent(pdf, summaryText, yPosition, margin, contentWidth - 15);
      
      // 3. AI-IDENTIFIED AREAS OF CONCERN
      if (assessment.details && assessment.details.areas && assessment.details.areas.length > 0) {
        yPosition = checkPageBreak(pdf, yPosition, margin);
        yPosition = addSectionHeader(pdf, '3. AI-IDENTIFIED AREAS OF CONCERN', yPosition, margin);
        yPosition = addBulletList(pdf, assessment.details.areas, yPosition, margin + 10, contentWidth - 30);
      }
      
      // 4. AI-GENERATED RECOMMENDATIONS
      if (assessment.details && assessment.details.recommendations && assessment.details.recommendations.length > 0) {
        yPosition = checkPageBreak(pdf, yPosition, margin);
        yPosition = addSectionHeader(pdf, '4. AI-GENERATED RECOMMENDATIONS', yPosition, margin);
        yPosition = addBulletList(pdf, assessment.details.recommendations, yPosition, margin + 10, contentWidth - 30);
      }
      
      // Add AI Disclaimer
      yPosition = addAIDisclaimer(pdf, yPosition, margin, contentWidth);
      
      // Add page numbers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageNumber(pdf, i, totalPages);
      }
      
      // Generate filename
      const patientName = patient.name.replace(/\s+/g, '_');
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '_');
      const filename = `${patientName}_AI_Assessment_${date}.pdf`;
      
      console.log('Saving PDF with filename:', filename);
      pdf.save(filename);
      
      console.log('PDF saved successfully');
      toast.success('AI Assessment PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };

  // Helper functions for comprehensive AI content transformation in PDF generation
  const parseAIInsightContentForPDF = (content) => {
    // Clean and normalize the content
    const cleanedContent = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown **text**
      .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown *text*
      .replace(/#{1,6}\s*/g, '') // Remove markdown headers # ## ###
      .replace(/`(.*?)`/g, '$1') // Remove code markdown `text`
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url)
      .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but keep newlines)
      .trim();

    const sections = [];
    const lines = cleanedContent.split('\n');
    let currentSection = null;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Check if this is a main heading (ALL CAPS)
      if (/^[A-Z][A-Z\s]+$/.test(trimmedLine)) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        // Start new section
        currentSection = {
          type: 'main_heading',
          title: trimmedLine,
          content: [],
          subsections: []
        };
      }
      // Check if this is a subsection heading (Title Case with colon)
      else if (/^[A-Z][a-z\s]+:$/.test(trimmedLine)) {
        if (currentSection) {
          currentSection.subsections.push({
            type: 'subsection_heading',
            title: trimmedLine.replace(':', ''),
            content: []
          });
        }
      }
      // Check if this is a bullet point
      else if (trimmedLine.startsWith('- ')) {
        const bulletContent = trimmedLine.substring(2);
        if (currentSection && currentSection.subsections.length > 0) {
          // Add to last subsection
          const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
          lastSubsection.content.push({
            type: 'bullet_point',
            text: bulletContent
          });
        } else if (currentSection) {
          // Add to main section
          currentSection.content.push({
            type: 'bullet_point',
            text: bulletContent
          });
        }
      }
      // Check if this is a numbered item
      else if (/^\d+\.\s/.test(trimmedLine)) {
        const numberedContent = trimmedLine.replace(/^\d+\.\s/, '');
        if (currentSection && currentSection.subsections.length > 0) {
          const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
          lastSubsection.content.push({
            type: 'numbered_item',
            text: numberedContent
          });
        } else if (currentSection) {
          currentSection.content.push({
            type: 'numbered_item',
            text: numberedContent
          });
        }
      }
      // Regular paragraph content
      else {
        if (currentSection && currentSection.subsections.length > 0) {
          const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
          lastSubsection.content.push({
            type: 'paragraph',
            text: trimmedLine
          });
        } else if (currentSection) {
          currentSection.content.push({
            type: 'paragraph',
            text: trimmedLine
          });
        }
      }
    });

    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const formatStructuredSectionForPDF = (pdf, section, yPosition, margin, contentWidth) => {
    if (!section) return yPosition;

    // Add main heading with professional styling and reduced spacing
    yPosition = checkPageBreak(pdf, yPosition + 15, margin);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(5, 150, 105); // Professional green
    pdf.text(section.title, margin, yPosition);
    yPosition += 6; // Reduced spacing after heading
    
    // Add underline
    pdf.setDrawColor(5, 150, 105);
    pdf.setLineWidth(0.6);
    pdf.line(margin, yPosition, margin + 100, yPosition);
    yPosition += 12;
    
    // Add main section content
    if (section.content && section.content.length > 0) {
      section.content.forEach(item => {
        yPosition = formatContentItemForPDF(pdf, item, yPosition, margin, contentWidth);
      });
    }

    // Add subsections
    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach(subsection => {
        yPosition = checkPageBreak(pdf, yPosition + 12, margin);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(subsection.title, margin + 5, yPosition);
        yPosition += 6;
        
        if (subsection.content && subsection.content.length > 0) {
          subsection.content.forEach(item => {
            yPosition = formatContentItemForPDF(pdf, item, yPosition, margin, contentWidth);
          });
        }
      });
    }

    // Add spacing after section
    return yPosition + 10;
  };

  const formatContentItemForPDF = (pdf, item, yPosition, margin, contentWidth) => {
    if (!item) return yPosition;

    switch (item.type) {
      case 'bullet_point':
        yPosition = checkPageBreak(pdf, yPosition + 6, margin);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        // Improved text splitting for bullet points
        const bulletText = `• ${item.text}`;
        const bulletLines = pdf.splitTextToSize(bulletText, contentWidth - 15);
        bulletLines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            pdf.text(trimmedLine, margin + 10, yPosition, { align: 'left' });
            yPosition += 3.5;
          }
        });
        return yPosition + 2;

      case 'numbered_item':
        yPosition = checkPageBreak(pdf, yPosition + 6, margin);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        // Improved text splitting for numbered items
        const numberedText = `• ${item.text}`;
        const numberedLines = pdf.splitTextToSize(numberedText, contentWidth - 15);
        numberedLines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            pdf.text(trimmedLine, margin + 10, yPosition, { align: 'left' });
            yPosition += 3.5;
          }
        });
        return yPosition + 2;

      case 'paragraph':
        yPosition = checkPageBreak(pdf, yPosition + 8, margin);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        // Improved text splitting with better word wrapping
        const textLines = pdf.splitTextToSize(item.text, contentWidth - 20);
        textLines.forEach(line => {
          yPosition = checkPageBreak(pdf, yPosition + 4, margin);
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            pdf.text(trimmedLine, margin + 8, yPosition, { align: 'left' });
            yPosition += 3.5;
          }
        });
        return yPosition + 2;

      default:
        // Fallback for unknown types
        yPosition = checkPageBreak(pdf, yPosition + 6, margin);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        // Improved text splitting for fallback
        const fallbackLines = pdf.splitTextToSize(item.text || '', contentWidth - 20);
        fallbackLines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            pdf.text(trimmedLine, margin + 8, yPosition, { align: 'left' });
            yPosition += 3.5;
          }
        });
        return yPosition + 2;
    }
  };

  // PDF Generation Functions - For AI-Generated Assessment Results
  const generateAssessmentPDF = (assessment) => {
    try {
      console.log('Starting PDF generation for AI assessment:', assessment);
      const patient = patients.find(p => p.id === parseInt(selectedPatient));
      console.log('Found patient:', patient);
      
      const pdf = new jsPDF();
      console.log('jsPDF instance created successfully');
      
      let yPosition = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15; // Increased margin for better readability
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper function to check page break
      const checkPageBreak = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Helper function to add section header
      const addSectionHeader = (text, fontSize = 16) => {
        checkPageBreak(20);
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(5, 150, 105);
        pdf.text(text, margin, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 6;
        
        // Add underline
        pdf.setDrawColor(5, 150, 105);
        pdf.setLineWidth(0.8);
        pdf.line(margin, yPosition, margin + 120, yPosition);
        yPosition += 6; // Reduced to 2 lines spacing after headers
      };

      // Helper function to add content with proper formatting
      const addContent = (text, fontSize = 12, indent = 0) => {
        if (!text) return;
        
        checkPageBreak(15);
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        // Improved text splitting with better word wrapping
        const lines = pdf.splitTextToSize(text, contentWidth - indent - 5);
        lines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            pdf.text(trimmedLine, margin + indent, yPosition, { align: 'left' });
            yPosition += (fontSize * 0.4) + 1;
          }
        });
        yPosition += 4;
      };

      // Helper function to add bullet list
      const addBulletList = (items, fontSize = 11, indent = 10) => {
        if (!items || items.length === 0) return;
        
        items.forEach(item => {
          checkPageBreak(10);
          pdf.setFontSize(fontSize);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          
          // Improved text splitting for bullet items
          const bulletText = `• ${item}`;
          const lines = pdf.splitTextToSize(bulletText, contentWidth - indent - 5);
          lines.forEach((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length > 0) {
              pdf.text(trimmedLine, margin + indent, yPosition, { align: 'left' });
              yPosition += 4;
            }
          });
          yPosition += 2;
        });
        yPosition += 3;
      };
      
      // Header with improved styling
      pdf.setFillColor(5, 150, 105);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('THERAPEASE', margin, 25);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text('AI Assessment Report', margin, 35);
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPosition = 55;
      
      // Patient Information Section with better formatting
      addSectionHeader('PATIENT INFORMATION', 18);
      
      if (patient) {
        const patientInfo = [
          { label: 'Patient Name:', value: patient.name || 'N/A' },
          { label: 'Age:', value: patient.age || 'N/A' },
          { label: 'Diagnosis:', value: patient.diagnosis || 'N/A' },
          { label: 'Assessment Date:', value: assessment.date || 'N/A' },
          { label: 'Assessment Type:', value: assessment.type || 'N/A' },
          { label: 'AI Score:', value: `${assessment.score || 0}%` }
        ];

        patientInfo.forEach((info, index) => {
          checkPageBreak(15);
          pdf.setFontSize(13);
          pdf.setFont('helvetica', 'bold');
          pdf.text(info.label, margin, yPosition);
          
          pdf.setFont('helvetica', 'normal');
          // Improved text splitting for patient information
          const valueLines = pdf.splitTextToSize(info.value, 95);
          valueLines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.length > 0) {
              pdf.text(trimmedLine, margin + 50, yPosition, { align: 'left' });
              yPosition += 4;
            }
          });
          yPosition += 4;
        });
      }
      
      yPosition += 10;
      
      // AI Assessment Summary with better formatting
      addSectionHeader('AI ASSESSMENT SUMMARY', 18);
      
      const summaryText = assessment.summary ? String(assessment.summary) : 'No summary available';
      addContent(summaryText, 12);
      
      // Areas of Concern (AI Identified) with better formatting
      if (assessment.details && assessment.details.areas && assessment.details.areas.length > 0) {
        addSectionHeader('AI-IDENTIFIED AREAS OF CONCERN', 18);
        addBulletList(assessment.details.areas, 12, 10);
      }
      
      // AI Recommendations with better formatting
      if (assessment.details && assessment.details.recommendations && assessment.details.recommendations.length > 0) {
        addSectionHeader('AI-GENERATED RECOMMENDATIONS', 18);
        addBulletList(assessment.details.recommendations, 12, 10);
      }
      
      // Add AI Disclaimer (needs local helper function since this uses local checkPageBreak)
      checkPageBreak(30);
      
      // Add disclaimer section header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105); // Green color for header
      pdf.text('IMPORTANT DISCLAIMER', margin, yPosition);
      yPosition += 8;
      
      // Add underline
      pdf.setDrawColor(5, 150, 105);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, margin + 80, yPosition);
      yPosition += 10;
      
      // Disclaimer text
      const disclaimerText = `The AI-generated insights contained in this report are intended for informational and decision-support purposes only. These insights should NOT be used directly for patient treatment without proper clinical evaluation and professional judgment.

The AI insights can be used to:
• Support clinical decision-making processes
• Assist in creating initial evaluation documentation
• Provide suggestions for treatment plan development
• Offer additional perspectives for consideration

IMPORTANT: These AI-generated insights provide a basis for decision-making; however, the final assessment and treatment plan must depend on the therapist's professional judgment, clinical expertise, and comprehensive patient evaluation.

The therapist retains full responsibility for all clinical decisions and patient care.`;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      // Split disclaimer text into lines with proper wrapping
      const disclaimerLines = pdf.splitTextToSize(disclaimerText, contentWidth - 10);
      disclaimerLines.forEach(line => {
        checkPageBreak(5);
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          pdf.text(trimmedLine, margin, yPosition);
          yPosition += 3.5;
        }
      });
      
      yPosition += 10; // Extra space after disclaimer
      
      // Footer with better styling
      const footerY = pageHeight - 20;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Generated by TherapEase AI Insights', margin, footerY);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - margin - 100, footerY);
      
      // Generate filename
      const patientName = patient ? patient.name.replace(/\s+/g, '_') : 'Patient';
      const assessmentType = assessment.type.replace(/\s+/g, '_');
      const date = assessment.date.replace(/-/g, '_');
      const filename = `${patientName}_AI_Assessment_${assessmentType}_${date}.pdf`;
      
      // Save the PDF
      pdf.save(filename);
      
      toast.success('AI Assessment PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const generateWellStructuredCurrentAssessmentPDF = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    const patient = patients.find(p => p.id === parseInt(selectedPatient));
    if (!patient) {
      toast.error('Patient not found');
      return;
    }

    if (insights.length === 0) {
      toast.error('No AI insights available to generate PDF. Please generate insights first.');
      return;
    }

    try {
      console.log('Starting well-structured current AI insights PDF generation');
      console.log('Patient:', patient);
      console.log('Insights:', insights);

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // Increased margin to prevent text cutoff
      const contentWidth = pageWidth - (margin * 2) - 10; // Additional buffer to prevent truncation

      // Page 1: Header and Patient Information
      let yPosition = addPageHeader(pdf, 'Current AI Insights Report', `Generated: ${new Date().toLocaleDateString()}`);

      // 1. PATIENT INFORMATION
      yPosition = addSectionHeader(pdf, '1. PATIENT INFORMATION', yPosition, margin);

      const patientData = [
        ['Patient Name:', String(patient.name || 'N/A')],
        ['Age:', String(patient.age || 'N/A')],
        ['Diagnosis:', String(patient.diagnosis || 'N/A')],
        ['Report Date:', new Date().toLocaleDateString()]
      ];

      patientData.forEach(([label, value], index) => {
        yPosition = checkPageBreak(pdf, yPosition, margin);
        
        // Add minimal space before each data item
        yPosition += 1;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(5, 150, 105); // Green color for labels
        pdf.text(label, margin + 5, yPosition);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40); // Dark gray for values
        const lines = pdf.splitTextToSize(value, contentWidth - 40);
        
        // Add each line with compact spacing and better text handling
        lines.forEach((line, lineIndex) => {
          yPosition = checkPageBreak(pdf, yPosition, margin);
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            pdf.text(trimmedLine, margin + 35, yPosition, { align: 'left' });
            yPosition += 3.5; // Reduced line spacing
          }
        });
        
        // Reset text color
        pdf.setTextColor(0, 0, 0);
        
        yPosition += 4; // Minimal space between items
      });

      yPosition += 10;

      // 2. AI-GENERATED INSIGHTS
      yPosition = checkPageBreak(pdf, yPosition, margin);
      yPosition = addSectionHeader(pdf, '2. AI-GENERATED INSIGHTS', yPosition, margin);

      insights.forEach((insight, index) => {
        yPosition = checkPageBreak(pdf, yPosition, margin);
        
        // Insight title
        yPosition = addSubsectionHeader(pdf, `${index + 1}. ${insight.title}`, yPosition, margin);
        
        // Confidence level with compact formatting
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Confidence Level: ${Math.round(insight.confidence * 100)}%`, margin + 5, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 6;
        
        // Transform and format AI insight content with professional styling
        if (insight.content) {
          // Use the same comprehensive transformation system
          const structuredContent = parseAIInsightContentForPDF(insight.content);
          structuredContent.forEach(section => {
            yPosition = formatStructuredSectionForPDF(pdf, section, yPosition, margin + 5, contentWidth - 10);
          });
        } else {
          yPosition = addContent(pdf, 'No content available for this insight.', yPosition, margin + 5, contentWidth - 10);
        }
        
        // Recommendations
        if (insight.recommendations && insight.recommendations.length > 0) {
          yPosition = addSubsectionHeader(pdf, 'Recommendations:', yPosition, margin + 5);
          yPosition = addBulletList(pdf, insight.recommendations, yPosition, margin + 10, contentWidth - 15);
        }
        
        yPosition += 10; // Space between insights
      });

      // Add AI Disclaimer
      yPosition = addAIDisclaimer(pdf, yPosition, margin, contentWidth);

      // Add page numbers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageNumber(pdf, i, totalPages);
      }

      // Generate filename
      const patientName = patient.name.replace(/\s+/g, '_');
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '_');
      const filename = `${patientName}_AI_Insights_${date}.pdf`;

      console.log('Saving PDF with filename:', filename);
      pdf.save(filename);

      console.log('PDF saved successfully');
      toast.success('AI Insights PDF downloaded successfully!');

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };


  const generateCurrentAssessmentPDF = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    const patient = patients.find(p => p.id === parseInt(selectedPatient));
    if (!patient) {
      toast.error('Patient not found');
      return;
    }

    if (insights.length === 0) {
      toast.error('No AI insights available to generate PDF. Please generate insights first.');
      return;
    }

    try {
      console.log('Starting current AI insights PDF generation');
      console.log('Patient:', patient);
      console.log('Insights:', insights);
      
      const pdf = new jsPDF();
      console.log('jsPDF instance created successfully');
      
      let yPosition = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15; // Increased margin for better readability
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper function to check page break
      const checkPageBreak = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Helper function to add section header
      const addSectionHeader = (text, fontSize = 16) => {
        checkPageBreak(20);
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(5, 150, 105);
        pdf.text(text, margin, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 6;
        
        // Add underline
        pdf.setDrawColor(5, 150, 105);
        pdf.setLineWidth(0.8);
        pdf.line(margin, yPosition, margin + 120, yPosition);
        yPosition += 6; // Reduced to 2 lines spacing after headers
      };

      // Helper function to add subsection header
      const addSubsectionHeader = (text, fontSize = 14) => {
        checkPageBreak(20);
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(text, margin, yPosition);
        yPosition += 6;
      };

      // Helper function to add content with proper formatting
      const addContent = (text, fontSize = 12, indent = 0) => {
        if (!text) return;
        
        checkPageBreak(15);
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        // Improved text splitting with better word wrapping
        const lines = pdf.splitTextToSize(text, contentWidth - indent - 5);
        lines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (trimmedLine.length > 0) {
            pdf.text(trimmedLine, margin + indent, yPosition, { align: 'left' });
            yPosition += (fontSize * 0.4) + 1;
          }
        });
        yPosition += 4;
      };

      // Helper function to add bullet list
      const addBulletList = (items, fontSize = 11, indent = 10) => {
        if (!items || items.length === 0) return;
        
        items.forEach(item => {
          checkPageBreak(10);
          pdf.setFontSize(fontSize);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          
          // Improved text splitting for bullet items
          const bulletText = `• ${item}`;
          const lines = pdf.splitTextToSize(bulletText, contentWidth - indent - 5);
          lines.forEach((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length > 0) {
              pdf.text(trimmedLine, margin + indent, yPosition, { align: 'left' });
              yPosition += 4;
            }
          });
          yPosition += 2;
        });
        yPosition += 3;
      };
      
      // Header with improved styling
      pdf.setFillColor(5, 150, 105);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('THERAPEASE', margin, 25);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text('AI Assessment Report', margin, 35);
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPosition = 55;
      
      // Patient Information Section with better formatting
      addSectionHeader('PATIENT INFORMATION', 18);
      
      // Patient details in a more organized layout
      const patientInfo = [
        { label: 'Patient Name:', value: patient.name || 'N/A' },
        { label: 'Age:', value: patient.age || 'N/A' },
        { label: 'Diagnosis:', value: patient.diagnosis || 'N/A' },
        { label: 'Report Date:', value: new Date().toLocaleDateString() }
      ];

      patientInfo.forEach((info, index) => {
        checkPageBreak(15);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text(info.label, margin, yPosition);
        
        pdf.setFont('helvetica', 'normal');
        const valueLines = pdf.splitTextToSize(info.value, 100);
        pdf.text(valueLines, margin + 50, yPosition);
        yPosition += (valueLines.length * 5) + 8;
      });
      
      yPosition += 10;
      
      // Comprehensive AI content transformation and formatting system
      const transformAndFormatInsightContent = (content) => {
        if (!content) return;
        
        // Step 1: Parse and structure the AI content
        const structuredContent = parseAIInsightContent(content);
        
        // Step 2: Apply professional formatting to each section
        structuredContent.forEach(section => {
          formatStructuredSection(section);
        });
      };

      // Parse AI insight content into structured format
      const parseAIInsightContent = (content) => {
        // Clean and normalize the content
        const cleanedContent = content
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown **text**
          .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown *text*
          .replace(/#{1,6}\s*/g, '') // Remove markdown headers # ## ###
          .replace(/`(.*?)`/g, '$1') // Remove code markdown `text`
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url)
          .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
          .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but keep newlines)
          .trim();

        const sections = [];
        const lines = cleanedContent.split('\n');
        let currentSection = null;

        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          // Check if this is a main heading (ALL CAPS)
          if (/^[A-Z][A-Z\s]+$/.test(trimmedLine)) {
            // Save previous section if exists
            if (currentSection) {
              sections.push(currentSection);
            }
            // Start new section
            currentSection = {
              type: 'main_heading',
              title: trimmedLine,
              content: [],
              subsections: []
            };
          }
          // Check if this is a subsection heading (Title Case with colon)
          else if (/^[A-Z][a-z\s]+:$/.test(trimmedLine)) {
            if (currentSection) {
              currentSection.subsections.push({
                type: 'subsection_heading',
                title: trimmedLine.replace(':', ''),
                content: []
              });
            }
          }
          // Check if this is a bullet point
          else if (trimmedLine.startsWith('- ')) {
            const bulletContent = trimmedLine.substring(2);
            if (currentSection && currentSection.subsections.length > 0) {
              // Add to last subsection
              const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
              lastSubsection.content.push({
                type: 'bullet_point',
                text: bulletContent
              });
            } else if (currentSection) {
              // Add to main section
              currentSection.content.push({
                type: 'bullet_point',
                text: bulletContent
              });
            }
          }
          // Check if this is a numbered item
          else if (/^\d+\.\s/.test(trimmedLine)) {
            const numberedContent = trimmedLine.replace(/^\d+\.\s/, '');
            if (currentSection && currentSection.subsections.length > 0) {
              const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
              lastSubsection.content.push({
                type: 'numbered_item',
                text: numberedContent
              });
            } else if (currentSection) {
              currentSection.content.push({
                type: 'numbered_item',
                text: numberedContent
              });
            }
          }
          // Regular paragraph content
          else {
            if (currentSection && currentSection.subsections.length > 0) {
              const lastSubsection = currentSection.subsections[currentSection.subsections.length - 1];
              lastSubsection.content.push({
                type: 'paragraph',
                text: trimmedLine
              });
            } else if (currentSection) {
              currentSection.content.push({
                type: 'paragraph',
                text: trimmedLine
              });
            }
          }
        });

        // Add the last section
        if (currentSection) {
          sections.push(currentSection);
        }

        return sections;
      };

      // Format structured section with professional styling
      const formatStructuredSection = (section) => {
        if (!section) return;

        // Add main heading with professional styling
        checkPageBreak(20);
        addMainHeading(section.title);
        
        // Add main section content
        if (section.content && section.content.length > 0) {
          section.content.forEach(item => {
            formatContentItem(item);
          });
        }

        // Add subsections
        if (section.subsections && section.subsections.length > 0) {
          section.subsections.forEach(subsection => {
            checkPageBreak(15);
            addSubsectionHeading(subsection.title);
            
            if (subsection.content && subsection.content.length > 0) {
              subsection.content.forEach(item => {
                formatContentItem(item);
              });
            }
          });
        }

        // Add spacing after section
        yPosition += 6; // Reduced to 2 lines spacing after headers
      };

      // Add main heading with consistent styling
      const addMainHeading = (title) => {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(5, 150, 105); // Professional green
        pdf.text(title, margin, yPosition);
        yPosition += 10;
        
        // Add underline
        pdf.setDrawColor(5, 150, 105);
        pdf.setLineWidth(0.8);
        pdf.line(margin, yPosition, margin + 120, yPosition);
        yPosition += 6; // Reduced to 2 lines spacing after headers
      };

      // Add subsection heading with consistent styling
      const addSubsectionHeading = (title) => {
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(title, margin + 5, yPosition);
        yPosition += 6;
      };

      // Format individual content items
      const formatContentItem = (item) => {
        if (!item) return;

        switch (item.type) {
          case 'bullet_point':
            checkPageBreak(8);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            
            // Improved text splitting for bullet points
            const bulletText = `• ${item.text}`;
            const bulletLines = pdf.splitTextToSize(bulletText, contentWidth - 20);
            bulletLines.forEach(line => {
              const trimmedLine = line.trim();
              if (trimmedLine.length > 0) {
                pdf.text(trimmedLine, margin + 15, yPosition, { align: 'left' });
                yPosition += 4;
              }
            });
            yPosition += 2;
            break;

          case 'numbered_item':
            checkPageBreak(8);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            
            // Improved text splitting for numbered items
            const numberedText = `• ${item.text}`;
            const numberedLines = pdf.splitTextToSize(numberedText, contentWidth - 20);
            numberedLines.forEach(line => {
              const trimmedLine = line.trim();
              if (trimmedLine.length > 0) {
                pdf.text(trimmedLine, margin + 15, yPosition, { align: 'left' });
                yPosition += 4;
              }
            });
            yPosition += 2;
            break;

          case 'paragraph':
            checkPageBreak(10);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            
            // Improved text splitting with better word wrapping
            const textLines = pdf.splitTextToSize(item.text, contentWidth - 25);
            textLines.forEach(line => {
              const trimmedLine = line.trim();
              if (trimmedLine.length > 0) {
                pdf.text(trimmedLine, margin + 10, yPosition, { align: 'left' });
                yPosition += 4;
              }
            });
            yPosition += 2;
            break;

          default:
            // Fallback for unknown types
            checkPageBreak(8);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            pdf.text(item.text || '', margin + 10, yPosition);
            yPosition += 6;
        }
      };

      // Format section content with proper spacing and bullet points
      const formatSectionContent = (text) => {
        if (!text) return;
        
        // Further clean the text to remove any remaining markdown
        const cleanText = text
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown **text**
          .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown *text*
          .replace(/#{1,6}\s*/g, '') // Remove markdown headers
          .replace(/`(.*?)`/g, '$1') // Remove code markdown
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
          .replace(/\n\s*\n/g, '\n') // Remove multiple line breaks
          .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but keep newlines)
          .trim();
        
        // Split into lines and process each
        const lines = cleanText.split('\n');
        
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) {
            // Empty line - add spacing
            yPosition += 4;
            return;
          }
          
          if (trimmedLine.startsWith('- ')) {
            // Bullet point
            checkPageBreak(8);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            pdf.text(`• ${trimmedLine.substring(2)}`, margin + 10, yPosition);
            yPosition += 6;
          } else if (trimmedLine.includes(':')) {
            // Label-value pair (e.g., "Strengths:", "Challenges:")
            const [label, value] = trimmedLine.split(':', 2);
            checkPageBreak(8);
            
            // Label
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(`${label.trim()}:`, margin + 5, yPosition);
            
            // Value
            if (value && value.trim()) {
              pdf.setFont('helvetica', 'normal');
              const valueLines = pdf.splitTextToSize(value.trim(), contentWidth - 25);
              valueLines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine.length > 0) {
                  pdf.text(trimmedLine, margin + 15, yPosition, { align: 'left' });
                  yPosition += 4;
                }
              });
              yPosition += 2;
            } else {
              yPosition += 6;
            }
          } else {
            // Regular paragraph
            checkPageBreak(10);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            
            // Improved text splitting with better word wrapping
            const textLines = pdf.splitTextToSize(trimmedLine, contentWidth - 15);
            textLines.forEach(line => {
              const trimmedLine = line.trim();
              if (trimmedLine.length > 0) {
                pdf.text(trimmedLine, margin + 5, yPosition, { align: 'left' });
                yPosition += 4;
              }
            });
            yPosition += 2;
          }
        });
        
        // Add spacing after section
        yPosition += 6;
      };

      // AI Insights Section with improved formatting
      addSectionHeader('AI-GENERATED INSIGHTS', 18);
      
      // Process insights with better formatting
      insights.forEach((insight, index) => {
        // Insight title with better styling
        addSubsectionHeader(`${index + 1}. ${insight.title || 'Assessment Insight'}`, 15);
        
        // Confidence level with better visibility
        checkPageBreak(10);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Confidence Level: ${Math.round((insight.confidence || 0.8) * 100)}%`, margin, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 6;
        
        // Enhanced insight content transformation and formatting
        if (insight.content) {
          // Transform and format the AI-generated content
          transformAndFormatInsightContent(insight.content);
        } else {
          addContent('No content available for this insight.', 12);
        }
        
        // Recommendations with better formatting
        if (insight.recommendations && insight.recommendations.length > 0) {
          addSubsectionHeader('Recommendations:', 13);
          addBulletList(insight.recommendations, 11, 10);
        }
        
        yPosition += 6; // Reduced to 2 lines spacing after headers // Space between insights
      });
      
      // Add AI Disclaimer (needs local helper function since this uses local checkPageBreak)
      checkPageBreak(30);
      
      // Add disclaimer section header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105); // Green color for header
      pdf.text('IMPORTANT DISCLAIMER', margin, yPosition);
      yPosition += 8;
      
      // Add underline
      pdf.setDrawColor(5, 150, 105);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, margin + 80, yPosition);
      yPosition += 10;
      
      // Disclaimer text
      const disclaimerText = `The AI-generated insights contained in this report are intended for informational and decision-support purposes only. These insights should NOT be used directly for patient treatment without proper clinical evaluation and professional judgment.

The AI insights can be used to:
• Support clinical decision-making processes
• Assist in creating initial evaluation documentation
• Provide suggestions for treatment plan development
• Offer additional perspectives for consideration

IMPORTANT: These AI-generated insights provide a basis for decision-making; however, the final assessment and treatment plan must depend on the therapist's professional judgment, clinical expertise, and comprehensive patient evaluation.

The therapist retains full responsibility for all clinical decisions and patient care.`;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      // Split disclaimer text into lines with proper wrapping
      const disclaimerLines = pdf.splitTextToSize(disclaimerText, contentWidth - 10);
      disclaimerLines.forEach(line => {
        checkPageBreak(5);
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          pdf.text(trimmedLine, margin, yPosition);
          yPosition += 3.5;
        }
      });
      
      yPosition += 10; // Extra space after disclaimer
      
      // Footer with better styling
      const footerY = pageHeight - 20;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Generated by TherapEase AI Insights', margin, footerY);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - margin - 100, footerY);
      
      // Generate filename
      const patientName = patient.name.replace(/\s+/g, '_');
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '_');
      const filename = `${patientName}_AI_Insights_${date}.pdf`;
      
      console.log('Saving PDF with filename:', filename);
      
      // Save the PDF
      pdf.save(filename);
      
      console.log('PDF saved successfully');
      toast.success('AI Insights PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };


  // Save interview questions and observations
  const saveAssessmentData = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    setIsSaving(true);
    
    try {
      // Save to API
      const assessmentData = {
        patientId: selectedPatient,
        interviewQuestions: interviewQuestions.filter(q => q.question.trim() !== ''),
        observations: observations.trim(),
        timestamp: new Date().toISOString()
      };
      
      // For now, save to localStorage (replace with API call when backend is ready)
      localStorage.setItem(`assessment_${selectedPatient}`, JSON.stringify(assessmentData));
      
      toast.success('Assessment data saved successfully!');
    } catch (error) {
      toast.error('Failed to save assessment data');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to parse AI response into structured insights
  const parseAIResponse = (aiResponse, patientName) => {
    try {
      // Split the response into sections based on headers
      const sections = aiResponse.split(/\*\*(.*?)\*\*:/g);
      const insights = [];
      
      // Define the expected sections
      const sectionTypes = [
        { key: 'assessment-summary', title: 'Assessment Summary' },
        { key: 'functional-analysis', title: 'Functional Analysis' },
        { key: 'clinical-insights', title: 'Clinical Insights' },
        { key: 'treatment-recommendations', title: 'Treatment Recommendations' }
      ];
      
      let currentSection = null;
      let currentContent = '';
      let currentRecommendations = [];
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        
        if (i % 2 === 1) { // This is a header
          // Save previous section if exists
          if (currentSection && currentContent) {
            insights.push({
              id: Date.now() + insights.length,
              type: currentSection.key,
              title: currentSection.title,
              content: currentContent.trim(),
              confidence: 0.85 + Math.random() * 0.1, // Random confidence between 0.85-0.95
              recommendations: currentRecommendations,
              timestamp: new Date().toISOString()
            });
          }
          
          // Find matching section type
          currentSection = sectionTypes.find(s => 
            section.toLowerCase().includes(s.title.toLowerCase()) ||
            section.toLowerCase().includes(s.key.replace('-', ' '))
          );
          
          if (currentSection) {
            currentContent = '';
            currentRecommendations = [];
          }
        } else if (currentSection) { // This is content
          currentContent += section;
          
          // Extract recommendations if present
          const recMatches = section.match(/[-•]\s*(.+)/g);
          if (recMatches) {
            currentRecommendations = recMatches.map(rec => rec.replace(/^[-•]\s*/, ''));
          }
        }
      }
      
      // Add the last section
      if (currentSection && currentContent) {
        insights.push({
          id: Date.now() + insights.length,
          type: currentSection.key,
          title: currentSection.title,
          content: currentContent.trim(),
          confidence: 0.85 + Math.random() * 0.1,
          recommendations: currentRecommendations,
          timestamp: new Date().toISOString()
        });
      }
      
      // If no structured sections found, create a single insight
      if (insights.length === 0) {
        insights.push({
          id: Date.now(),
          type: 'assessment-summary',
          title: 'AI Assessment Analysis',
          content: aiResponse,
          confidence: 0.85,
          recommendations: ['Review the analysis with the clinical team', 'Consider additional assessments if needed'],
          timestamp: new Date().toISOString()
        });
      }
      
      return insights;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Fallback to a single insight
      return [{
        id: Date.now(),
        type: 'assessment-summary',
        title: 'AI Assessment Analysis',
        content: aiResponse,
        confidence: 0.85,
        recommendations: ['Review the analysis with the clinical team'],
        timestamp: new Date().toISOString()
      }];
    }
  };

  // Helper function to calculate assessment score based on insights
  const calculateAssessmentScore = (insights) => {
    if (!insights || insights.length === 0) return 75;
    
    // Calculate average confidence and convert to percentage
    const avgConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length;
    const baseScore = Math.round(avgConfidence * 100);
    
    // Add some variation based on number of insights
    const insightBonus = Math.min(insights.length * 2, 10);
    
    return Math.min(baseScore + insightBonus, 100);
  };

  // Load all generated PDFs from localStorage
  const loadGeneratedPDFs = () => {
    try {
      const savedPDFs = localStorage.getItem('generatedPDFs');
      if (savedPDFs) {
        const parsedPDFs = JSON.parse(savedPDFs);
        // Ensure all PDFs have proper structure
        const validPDFs = parsedPDFs.filter(pdf => 
          pdf && 
          pdf.id && 
          pdf.patientId && 
          pdf.filename && 
          pdf.generatedAt
        ).map(pdf => ({
          ...pdf,
          assessmentData: {
            questions: pdf.assessmentData?.questions || [],
            observations: pdf.assessmentData?.observations || ''
          },
          model: pdf.model || 'gpt-4.1',
          score: pdf.score || 0,
          usage: pdf.usage || null
        }));
        setGeneratedPDFs(validPDFs);
      }
    } catch (error) {
      console.error('Error loading generated PDFs:', error);
      // Clear corrupted data
      localStorage.removeItem('generatedPDFs');
      setGeneratedPDFs([]);
    }
  };

  // Load PDFs for specific patient
  const loadPatientPDFs = () => {
    if (!selectedPatient) return;
    
    const patientPDFs = generatedPDFs
      .filter(pdf => pdf && pdf.patientId === selectedPatient)
      .map(pdf => ({
        ...pdf,
        assessmentData: {
          questions: pdf.assessmentData?.questions || [],
          observations: pdf.assessmentData?.observations || ''
        },
        model: pdf.model || 'gpt-4.1',
        score: pdf.score || 0,
        usage: pdf.usage || null
      }));
    setAssessmentHistory(patientPDFs);
  };

  // Load PDF records from database for selected patient
  const loadPatientPDFsFromDatabase = async () => {
    if (!selectedPatient) return;
    
    try {
      const response = await therapistAPI.getPDFRecords(selectedPatient);
      if (response.data.success) {
        const pdfRecords = response.data.data || [];
        setAssessmentHistory(pdfRecords);
      } else {
        console.error('Failed to load PDF records:', response.data.error);
        setAssessmentHistory([]);
      }
    } catch (error) {
      console.error('Error loading PDF records from database:', error);
      setAssessmentHistory([]);
    }
  };

  // Save generated PDF to history (database)
  const savePDFToHistory = async (pdfData, insightsData = null) => {
    if (!selectedPatient) {
      console.error('No patient selected for saving PDF');
      return;
    }

    const therapistId = getTherapistId();
    if (!therapistId) {
      console.error('No therapist ID found');
      return;
    }

    // Use provided insights data or fall back to current state
    const insightsToSave = insightsData || insights;

    const pdfRecord = {
      patientId: parseInt(selectedPatient),
      therapistId: parseInt(therapistId),
      filename: pdfData.filename,
      type: pdfData.type || 'AI Insights',
      insights: insightsToSave.length > 0 ? insightsToSave : [],
      assessmentData: {
        questions: interviewQuestions ? interviewQuestions.filter(q => q.question.trim() !== '') : [],
        observations: observations ? observations.trim() : '',
        summary: pdfData.summary || ''
      },
      model: pdfData.model || 'gpt-4.1',
      score: pdfData.score || 0,
      usage: pdfData.usage || null
    };

    try {
      const response = await therapistAPI.savePDFRecord(pdfRecord);
      if (response.data.success) {
        console.log('PDF record saved to database successfully');
        // Refresh the assessment history from database
        await loadPatientPDFsFromDatabase();
      } else {
        console.error('Failed to save PDF record:', response.data.error);
        toast.error('Failed to save PDF record to database');
      }
    } catch (error) {
      console.error('Error saving PDF to database:', error);
      toast.error('Failed to save PDF record to database');
    }
  };

  // Download PDF from history
  const downloadPDFFromHistory = (pdfRecord) => {
    if (pdfRecord.type === 'AI Insights') {
      generatePDFFromStoredData(pdfRecord);
    } else {
      // Handle other PDF types if needed
      toast.info('PDF regeneration not available for this type');
    }
  };

  // Helper function to format date without year
  const formatDateWithoutYear = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Helper function to clean model name (remove date suffix)
  const cleanModelName = (modelName) => {
    if (!modelName) return 'GPT-4';
    // Remove date patterns like "-2025-04-14" from model names
    return modelName.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  };

  // Delete PDF record from history
  const deletePDFRecord = async (pdfRecord) => {
    if (!pdfRecord || !pdfRecord.id) {
      toast.error('Invalid record to delete');
      return;
    }

    setPdfToDelete(pdfRecord);
    setShowDeleteModal(true);
  };

  const confirmDeletePDF = async () => {
    if (!pdfToDelete) return;

    try {
      // Call API to delete the record
      const response = await therapistAPI.deletePDFRecord(pdfToDelete.id);
      
      if (response.data.success) {
        toast.success('AI assessment record deleted successfully');
        // Refresh the assessment history
        if (selectedPatient) {
          await loadPatientPDFsFromDatabase();
        }
        setShowDeleteModal(false);
        setPdfToDelete(null);
      } else {
        toast.error(response.data.error || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting PDF record:', error);
      toast.error('Failed to delete record. Please try again.');
    }
  };

  // Generate PDF from stored AI insights data
  const generatePDFFromStoredData = (pdfRecord) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Assessment Insights Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Patient Information
      const patient = patients.find(p => p.id === parseInt(selectedPatient));
      if (patient) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Patient Information', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${patient.name}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Age: ${patient.age}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Diagnosis: ${patient.diagnosis}`, 20, yPosition);
        yPosition += 6;
        doc.text(`Assessment Date: ${formatDateWithoutYear(pdfRecord.generatedAt)}`, 20, yPosition);
        yPosition += 6;
        doc.text(`AI Model: ${cleanModelName(pdfRecord.model)}`, 20, yPosition);
        yPosition += 15;
      }

      // AI-Generated Insights
      if (pdfRecord.insights && pdfRecord.insights.length > 0) {
        const content = pdfRecord.insights[0]?.content || '';
        
        // Assessment Summary
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Assessment Summary', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const summaryMatch = content.match(/ASSESSMENT SUMMARY([\s\S]*?)(?=FUNCTIONAL ANALYSIS|$)/i);
        if (summaryMatch) {
          const summaryText = summaryMatch[1].trim();
          const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 40);
          doc.text(summaryLines, 20, yPosition);
          yPosition += summaryLines.length * 4 + 10;
        }

        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }

        // Functional Analysis
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Functional Analysis', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const functionalMatch = content.match(/FUNCTIONAL ANALYSIS([\s\S]*?)(?=CLINICAL INSIGHTS|TREATMENT RECOMMENDATIONS|$)/i);
        if (functionalMatch) {
          const functionalText = functionalMatch[1].trim();
          const functionalLines = doc.splitTextToSize(functionalText, pageWidth - 40);
          doc.text(functionalLines, 20, yPosition);
          yPosition += functionalLines.length * 4 + 10;
        }

        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }

        // Clinical Insights
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Clinical Insights', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const clinicalMatch = content.match(/CLINICAL INSIGHTS([\s\S]*?)(?=TREATMENT RECOMMENDATIONS|$)/i);
        if (clinicalMatch) {
          const clinicalText = clinicalMatch[1].trim();
          const clinicalLines = doc.splitTextToSize(clinicalText, pageWidth - 40);
          doc.text(clinicalLines, 20, yPosition);
          yPosition += clinicalLines.length * 4 + 10;
        }

        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }

        // Treatment Recommendations
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Treatment Recommendations', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const treatmentMatch = content.match(/TREATMENT RECOMMENDATIONS([\s\S]*?)(?=These recommendations are intended|$)/i);
        if (treatmentMatch) {
          const treatmentText = treatmentMatch[1].trim();
          const treatmentLines = doc.splitTextToSize(treatmentText, pageWidth - 40);
          doc.text(treatmentLines, 20, yPosition);
          yPosition += treatmentLines.length * 4 + 10;
        }
      }

      // Disclaimer
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red color
      doc.text('Important Disclaimer', 20, yPosition);
      yPosition += 8;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0); // Black color
      const disclaimerText = "The AI-generated insights contained in this report are intended for informational and decision-support purposes only. These insights should NOT be used directly for patient treatment without proper clinical evaluation and professional judgment. The therapist retains full responsibility for all clinical decisions and patient care.";
      const disclaimerLines = doc.splitTextToSize(disclaimerText, pageWidth - 40);
      doc.text(disclaimerLines, 20, yPosition);

      // Save the PDF
      const filename = pdfRecord.filename || `AI_Insights_${patient?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      toast.success('AI Insights PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF from stored data:', error);
      toast.error('Failed to generate PDF from stored data');
    }
  };

  const generateInsights = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    // Check if we have assessment data
    const hasQuestions = interviewQuestions.some(q => q.question.trim() !== '');
    const hasObservations = observations.trim() !== '';
    
    if (!hasQuestions && !hasObservations) {
      toast.error('Please add interview questions and/or observations before generating insights');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Get patient data
      const patient = patients.find(p => p.id === parseInt(selectedPatient));
      
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Prepare assessment data for API call
      const assessmentData = {
        interviewQuestions: interviewQuestions.filter(q => q.question.trim() !== ''),
        observations: observations.trim()
      };

      const patientData = {
        firstName: patient.name.split(' ')[0],
        lastName: patient.name.split(' ').slice(1).join(' '),
        age: patient.age,
        diagnosis: patient.diagnosis,
        therapyGoals: patient.therapyGoals || 'Not specified'
      };

      // Call the AI API using aiAPI (matching other API calls)
      const response = await aiAPI.analyzeAssessment({
          patientData,
          assessmentData
      });

      const result = response.data;
      
      if (result.success) {
        // Parse the AI response and convert to insights format
        const aiResponse = result.data.insights;
        
        // Extract insights from the AI response
        const newInsights = parseAIResponse(aiResponse, patient.name);
        
        setInsights(newInsights);
        toast.success('AI insights generated successfully using GPT-4.1!');
        
        // Save complete record to history
        const pdfData = {
          filename: `${patient.name.replace(/\s+/g, '_')}_AI_Insights_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.pdf`,
          type: 'AI Insights',
          model: result.data.model || 'gpt-4.1',
          score: calculateAssessmentScore(newInsights),
          usage: result.data.usage
        };
        
        await savePDFToHistory(pdfData, newInsights);
        
      } else {
        throw new Error(result.message || 'Failed to generate insights');
      }
      
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error(`Failed to generate insights: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'assessment-summary':
        return <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />;
      case 'functional-analysis':
        return <Activity className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />;
      case 'clinical-insights':
        return <Brain className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600" />;
      case 'treatment-recommendations':
        return <Target className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />;
      case 'assessment-analysis':
        return <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />;
      case 'treatment-planning':
        return <Target className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />;
      case 'progress-monitoring':
        return <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />;
      case 'family-guidance':
        return <Users className="h-4 w-4 sm:h-6 sm:w-6 text-pink-600" />;
      case 'progress-analysis':
        return <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />;
      case 'treatment-suggestions':
        return <Target className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />;
      case 'home-program':
        return <Lightbulb className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-600" />;
      default:
        return <Brain className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'assessment-summary':
        return 'bg-purple-50 border-purple-200';
      case 'functional-analysis':
        return 'bg-blue-50 border-blue-200';
      case 'clinical-insights':
        return 'bg-indigo-50 border-indigo-200';
      case 'treatment-recommendations':
        return 'bg-green-50 border-green-200';
      case 'assessment-analysis':
        return 'bg-purple-50 border-purple-200';
      case 'treatment-planning':
        return 'bg-green-50 border-green-200';
      case 'progress-monitoring':
        return 'bg-orange-50 border-orange-200';
      case 'family-guidance':
        return 'bg-pink-50 border-pink-200';
      case 'progress-analysis':
        return 'bg-blue-50 border-blue-200';
      case 'treatment-suggestions':
        return 'bg-green-50 border-green-200';
      case 'home-program':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-purple-50 border-purple-200';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="space-y-4 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Modern AI-Themed Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                    <Brain className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <span className="truncate">AI Insights</span>
                </h1>
                <p className="mt-2 sm:mt-3 text-sm text-white/90">
                  Create assessments and get AI-powered analysis for your patients
                </p>
                <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm text-white font-medium">AI Service Active</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                    <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-300" />
                    <span className="text-xs sm:text-sm text-white font-medium">GPT-4 Powered</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 w-full sm:w-auto">
                {patientsLoading ? (
                  <div className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
                    <span className="text-white font-medium text-sm sm:text-base">Loading patients...</span>
                  </div>
                ) : patientsError ? (
                  <div className="px-3 sm:px-4 py-2 sm:py-3 bg-red-500/20 rounded-xl backdrop-blur-sm">
                    <span className="text-red-100 font-medium text-sm sm:text-base">Failed to load patients</span>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 sm:min-w-[280px]">
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                      Select Patient
                    </label>
                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-white/30 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-white/50 focus:border-white/50 bg-white/10 backdrop-blur-sm text-white placeholder-white/70"
                    >
                      <option value="" className="text-gray-900">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id} className="text-gray-900">
                          {patient.name} - {patient.diagnosis}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Assessment Creation Section */}
        {selectedPatient && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold text-white">Create Assessment</h2>
                    <p className="text-sm sm:text-base text-white/90">Build comprehensive patient assessments for AI analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {interviewQuestions.some(q => q.question.trim() !== '') || observations.trim() !== '' ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl backdrop-blur-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-medium">Assessment Ready</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-white font-medium">No Data Yet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 sm:p-8 mb-8">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-lg font-semibold text-blue-900 mb-3">Assessment Instructions</h3>
                    <ul className="text-sm sm:text-base text-blue-800 space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        Add interview questions to gather patient information
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        Record patient responses in the answer fields
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        Write detailed observations about patient behavior and abilities
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        Save your assessment data before generating AI insights
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
          
              <div className="space-y-8 sm:space-y-10 lg:space-y-12">
                {/* Modern Interview Questions Panel */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-900 to-emerald-900 px-8 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-white">Interview Questions</h3>
                          <p className="text-sm sm:text-base text-white/90">Add questions and record patient responses</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span className="text-white font-medium">
                          {interviewQuestions.filter(q => q.question.trim() !== '').length} questions
                        </span>
                      </div>
                    </div>
                  </div>
              
                  <div className="p-6 sm:p-8 lg:p-10">
                    <div className="space-y-6 sm:space-y-8 max-h-96 overflow-y-auto pr-2">
                      {interviewQuestions.map((item, index) => (
                        <div key={item.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-lg">
                                {index + 1}
                              </span>
                              <span className="text-sm sm:text-lg font-semibold text-gray-800">Question {index + 1}</span>
                            </div>
                            {interviewQuestions.length > 1 && (
                              <button
                                onClick={() => removeInterviewQuestion(item.id)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                                title="Remove question"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                          <div className="space-y-3 sm:space-y-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Question</label>
                              <input
                                type="text"
                                value={item.question}
                                onChange={(e) => updateInterviewQuestion(item.id, 'question', e.target.value)}
                                placeholder="Enter your question here..."
                                className="w-full border border-gray-300 rounded-xl px-4 sm:px-4 py-3 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Patient Response</label>
                              <textarea
                                value={item.answer}
                                onChange={(e) => updateInterviewQuestion(item.id, 'answer', e.target.value)}
                                placeholder="Record the patient's response..."
                                className="w-full border border-gray-300 rounded-xl px-4 sm:px-4 py-3 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                
                    {/* Modern Question Management Buttons */}
                    <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <button
                          onClick={addInterviewQuestion}
                          className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-500 border border-green-500 rounded-xl text-white hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl touch-target"
                        >
                          <Plus size={18} className="mr-2" />
                          Add Question
                        </button>
                        <button
                          onClick={loadSampleQuestions}
                          className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-cyan-500 border border-blue-500 rounded-xl text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl touch-target"
                        >
                          <FileText size={18} className="mr-2" />
                          Load Sample
                        </button>
                        <button
                          onClick={openTemplateModal}
                          className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-500 border border-indigo-500 rounded-xl text-white hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl touch-target"
                        >
                          <Save size={18} className="mr-2" />
                          Save Template
                        </button>
                        <button
                          onClick={() => setShowTemplateList(true)}
                          className="flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-500 to-gray-600 border border-gray-500 rounded-xl text-white hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl touch-target"
                        >
                          <BookOpen size={18} className="mr-2" />
                          <span className="hidden sm:inline">Load Template ({templates.length})</span>
                          <span className="sm:hidden">Load ({templates.length})</span>
                        </button>
                      </div>
                    </div>
              </div>
            </div>

                {/* Modern Observations Panel */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-900 to-cyan-900 px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">Clinical Observations</h3>
                        <p className="text-sm sm:text-base text-white/90">Record detailed observations about patient behavior and abilities</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8 lg:p-10">
                    <div className="space-y-6 sm:space-y-8">
                      <div>
                        <label className="block text-sm sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">
                          Observation Notes
                        </label>
                        <textarea
                          value={observations}
                          onChange={(e) => setObservations(e.target.value)}
                          placeholder="Record detailed observations about patient behavior, abilities, responses, and any notable patterns or concerns..."
                          className="w-full h-60 sm:h-80 border border-gray-300 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 bg-white shadow-sm hover:border-gray-400"
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs sm:text-base text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-gray-200">
                        <span className="font-medium">Include behavioral patterns, motor skills, attention span, communication abilities, and any concerns</span>
                        <span className="font-bold text-blue-600">{observations.length} characters</span>
                      </div>
                    </div>
                  </div>
                </div>
          </div>

              {/* Modern Action Buttons */}
              <div className="mt-10 sm:mt-12 pt-8 sm:pt-10 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
                  <button
                    onClick={saveAssessmentData}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border border-transparent text-xs sm:text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-target"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-3" />
                        Save Assessment
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={generateInsights}
                    disabled={isGenerating}
                    className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border border-transparent text-xs sm:text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-target"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="h-5 w-5 mr-3" />
                        <span className="hidden sm:inline">Generate AI Insights</span>
                        <span className="sm:hidden">Generate</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearAssessmentData}
                    className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 touch-target"
                  >
                    <Trash2 className="h-5 w-5 mr-3" />
                    Clear
                  </button>

                  <button
                    onClick={generateWellStructuredCurrentAssessmentPDF}
                    disabled={insights.length === 0 || !selectedPatient}
                    className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-target"
                    title={insights.length === 0 ? "Generate insights first to download PDF" : !selectedPatient ? "Select a patient first" : "Download AI Insights PDF"}
                  >
                    <Download className="h-5 w-5 mr-3" />
                    <span className="hidden sm:inline">Download AI Insights PDF</span>
                    <span className="sm:hidden">Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Modern Assessment Summary */}
              {(interviewQuestions.some(q => q.question.trim() !== '') || observations.trim() !== '') && (
                <div className="hidden sm:block mt-10 sm:mt-12 p-8 sm:p-10 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                  <h4 className="text-sm sm:text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    Assessment Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-sm">
                    <div className="flex items-center justify-between p-5 sm:p-6 bg-white rounded-xl border border-gray-200">
                      <span className="font-semibold text-gray-700">Questions:</span>
                      <span className="text-gray-600 font-medium">
                        {interviewQuestions.filter(q => q.question.trim() !== '').length} questions added
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-5 sm:p-6 bg-white rounded-xl border border-gray-200">
                      <span className="font-semibold text-gray-700">Observations:</span>
                      <span className="text-gray-600 font-medium">
                        {observations.trim() ? `${observations.length} characters` : 'None recorded'}
                      </span>
                    </div>
                    <div className="md:col-span-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-green-800">Ready for AI Analysis:</span>
                        <span className="text-green-700 font-medium">
                          ✓ Assessment data is complete and ready for AI insights generation
                        </span>
                      </div>
                    </div>
                    <div className="md:col-span-2 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${interviewQuestions.some(q => q.question.trim() !== '') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {interviewQuestions.some(q => q.question.trim() !== '') ? '✓ Questions' : '○ Questions'}
                        </span>
                        <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${observations.trim() !== '' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {observations.trim() !== '' ? '✓ Observations' : '○ Observations'}
                        </span>
                        <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${interviewQuestions.some(q => q.question.trim() !== '') && observations.trim() !== '' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                          {interviewQuestions.some(q => q.question.trim() !== '') && observations.trim() !== '' ? '✓ Complete' : '○ Incomplete'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Modern AI Service Status */}
        <div className="hidden sm:block bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-2xl font-bold text-white">AI Service Status</h3>
                <p className="text-white/90 mt-1">
                  GPT-4 powered analysis is available and ready to provide insights
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-xl backdrop-blur-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium">Online</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Lightbulb className="h-4 w-4 text-yellow-300" />
                  <span className="text-white font-medium">GPT-4</span>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Modern Assessment Ready Message */}
        {insights.length === 0 && !isGenerating && selectedPatient && (
          <div className="hidden sm:block bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3">Ready to Generate AI Insights</h3>
              <p className="text-sm sm:text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Create an assessment with interview questions and observations, then generate AI-powered insights. 
                Generated insights will be available for download as PDF reports.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>AI-Powered Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>PDF Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Smart Recommendations</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern AI Assessment History */}
        {selectedPatient && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 px-4 sm:px-8 py-4 sm:py-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-white truncate">AI Assessment History</h2>
                  <p className="text-white/90 mt-1 text-sm sm:text-base hidden sm:block">Previously generated AI assessments and insights for this patient</p>
                  <p className="text-white/90 mt-1 text-xs sm:hidden">AI assessments and insights for this patient</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-8">
          
              {assessmentHistory && assessmentHistory.length > 0 ? (
                <div className="space-y-4">
                  {assessmentHistory.map((pdfRecord) => (
                    pdfRecord && (
                    <div key={pdfRecord.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-200">
                      {/* Mobile-first responsive layout */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Content section */}
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {pdfRecord.filename}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              {pdfRecord.type} • Generated {formatDateWithoutYear(pdfRecord.generatedAt)}
                            </p>
                            {/* Responsive metadata - stack on mobile, flex on larger screens */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                              {pdfRecord.assessmentData?.questions?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                  {pdfRecord.assessmentData.questions.length} questions
                                </span>
                              )}
                              {pdfRecord.assessmentData?.observations?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                  {pdfRecord.assessmentData.observations.length} chars
                                </span>
                              )}
                              {pdfRecord.model && (
                                <span className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                                  {cleanModelName(pdfRecord.model).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Buttons section - responsive layout */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              setSelectedAIInsight(pdfRecord);
                              setShowAIInsightModal(true);
                            }}
                            className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-3 border border-transparent shadow-sm text-xs sm:text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 flex-1 sm:flex-none"
                            title="View AI Insights"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden xs:inline">View</span>
                            <span className="xs:hidden">View</span>
                          </button>
                          <button
                            onClick={() => downloadPDFFromHistory(pdfRecord)}
                            className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-3 border border-transparent shadow-sm text-xs sm:text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 flex-1 sm:flex-none"
                            title="Download PDF"
                          >
                            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden xs:inline">Download</span>
                            <span className="xs:hidden">Download</span>
                          </button>
                          <button
                            onClick={() => deletePDFRecord(pdfRecord)}
                            className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-3 border border-transparent shadow-sm text-xs sm:text-sm font-semibold rounded-xl text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 flex-1 sm:flex-none"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden xs:inline">Delete</span>
                            <span className="xs:hidden">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No AI assessments yet</h3>
                  <p className="text-gray-600">
                    Generate AI insights to create assessment history for this patient.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modern No Patient Selected Message */}
        {!selectedPatient && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3">Select a Patient to Begin</h3>
              <p className="text-sm sm:text-lg text-gray-600 mb-8 max-w-md mx-auto">
                Choose a patient from the dropdown above to create assessments and generate AI insights.
              </p>
            </div>
          </div>
        )}

        {/* Modern Loading State */}
        {selectedPatient && isGenerating && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3">Generating AI Insights</h3>
              <p className="text-sm sm:text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Analyzing assessment data and generating personalized recommendations...
              </p>
              <div className="max-w-md mx-auto">
                <div className="bg-gray-200 rounded-full h-3 mb-4">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <p className="text-sm text-gray-500">Processing interview responses and observations...</p>
              </div>
            </div>
          </div>
        )}

        {/* Modern How It Works Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-white" />
              How AI Insights Work
            </h2>
            <p className="text-white/90 mt-2">Understanding the AI-powered assessment process</p>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2">Create Assessment</h3>
                <p className="text-sm text-gray-600">
                  Add interview questions and record observations about the patient
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2">AI Analysis</h3>
                <p className="text-sm text-gray-600">
                  AI analyzes the assessment data to identify patterns and insights
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <Lightbulb className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2">Smart Recommendations</h3>
                <p className="text-sm text-gray-600">
                  Get evidence-based treatment suggestions and progress insights
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Recent Activity */}
        {insights.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
                <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                Recent AI Activity
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {insights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-lg font-semibold text-gray-900 truncate">{insight.title}</p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                        Generated for {patients.find(p => p.id === parseInt(selectedPatient))?.name}
                      </p>
                      <div className="mt-1 sm:mt-2 flex items-center text-xs sm:text-sm text-gray-500">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {new Date(insight.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assessment History Modal */}
      {showAssessmentModal && selectedAssessment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 border w-2/3 max-w-md mx-auto rounded-lg shadow-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">{selectedAssessment.type}</h3>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Date:</p>
                <p className="text-sm text-gray-700">{selectedAssessment.date}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Status:</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedAssessment.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedAssessment.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Score:</p>
                <p className="text-sm text-gray-700">{selectedAssessment.score}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Summary:</p>
                <p className="text-sm text-gray-700">{selectedAssessment.summary}</p>
              </div>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Areas of Concern:</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {selectedAssessment.details.areas.map((area, index) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations:</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {selectedAssessment.details.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Save Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Save Template'}
                </h3>
                <button
                  onClick={closeTemplateModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeTemplateModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template List Modal */}
      {showTemplateList && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900">Load Template</h3>
                <button
                  onClick={() => setShowTemplateList(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500">No templates saved yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create your first template by saving current questions</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-500">
                          {template.questions.length} questions • {formatDateWithoutYear(template.createdAt)}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => loadTemplate(template)}
                          className="p-1 text-indigo-600 hover:text-indigo-800"
                          title="Load template"
                        >
                          <BookOpen size={16} />
                        </button>
                        <button
                          onClick={() => editTemplate(template)}
                          className="p-1 text-gray-600 hover:text-gray-800"
                          title="Edit template"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Delete template"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Insights View Modal */}
      {showAIInsightModal && selectedAIInsight && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-2 sm:top-4 mx-auto p-4 sm:p-6 border w-11/12 max-w-6xl shadow-lg rounded-lg bg-white">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">AI Assessment Insights</h3>
                <p className="text-gray-600 mt-1 text-sm sm:text-base truncate">{selectedAIInsight.filename}</p>
              </div>
              <button
                onClick={() => setShowAIInsightModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-8">
              {/* Patient Information Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                <h4 className="text-sm sm:text-xl font-semibold text-blue-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  Patient Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">Patient Name</p>
                    <p className="text-xs sm:text-lg font-semibold text-gray-900 truncate">
                      {patients.find(p => p.id === parseInt(selectedPatient))?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">Age</p>
                    <p className="text-xs sm:text-lg font-semibold text-gray-900">
                      {patients.find(p => p.id === parseInt(selectedPatient))?.age || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">Diagnosis</p>
                    <p className="text-xs sm:text-lg font-semibold text-gray-900 truncate">
                      {patients.find(p => p.id === parseInt(selectedPatient))?.diagnosis || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">Assessment Date</p>
                    <p className="text-xs sm:text-lg font-semibold text-gray-900">
                      {formatDateWithoutYear(selectedAIInsight.generatedAt)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">AI Model</p>
                    <p className="text-xs sm:text-lg font-semibold text-gray-900">
                      {cleanModelName(selectedAIInsight.model)}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI-Generated Insights Sections */}
              <div className="space-y-6">
                <h4 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI-Generated Insights
                </h4>

                {/* Assessment Summary */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h5 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    Assessment Summary
                  </h5>
                  <div className="prose max-w-none">
                    {selectedAIInsight.insights && selectedAIInsight.insights.length > 0 ? (
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {(() => {
                          const content = selectedAIInsight.insights[0]?.content || '';
                          const summaryMatch = content.match(/ASSESSMENT SUMMARY([\s\S]*?)(?=FUNCTIONAL ANALYSIS|$)/i);
                          return summaryMatch ? summaryMatch[1].trim() : 'No assessment summary available.';
                        })()}
                      </div>
                    ) : (
                      <p className="text-gray-700 leading-relaxed">
                        No AI-generated assessment summary available for this record.
                      </p>
                    )}
                  </div>
                </div>

                {/* Functional Analysis */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h5 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Functional Analysis
                  </h5>
                  <div className="prose max-w-none">
                    {selectedAIInsight.insights && selectedAIInsight.insights.length > 0 ? (
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {(() => {
                          const content = selectedAIInsight.insights[0]?.content || '';
                          // Extract Functional Analysis section
                          const functionalAnalysisMatch = content.match(/FUNCTIONAL ANALYSIS([\s\S]*?)(?=CLINICAL INSIGHTS|TREATMENT RECOMMENDATIONS|$)/i);
                          return functionalAnalysisMatch ? functionalAnalysisMatch[1].trim() : 'No functional analysis available.';
                        })()}
                      </div>
                    ) : (
                      <p className="text-gray-700 leading-relaxed">
                        No AI-generated functional analysis available for this record.
                      </p>
                    )}
                  </div>
                </div>

                {/* Clinical Insights */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h5 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    Clinical Insights
                  </h5>
                  <div className="prose max-w-none">
                    {selectedAIInsight.insights && selectedAIInsight.insights.length > 0 ? (
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {(() => {
                          const content = selectedAIInsight.insights[0]?.content || '';
                          // Extract Clinical Insights section
                          const clinicalInsightsMatch = content.match(/CLINICAL INSIGHTS([\s\S]*?)(?=TREATMENT RECOMMENDATIONS|$)/i);
                          return clinicalInsightsMatch ? clinicalInsightsMatch[1].trim() : 'No clinical insights available.';
                        })()}
                      </div>
                    ) : (
                      <p className="text-gray-700 leading-relaxed">
                        No AI-generated clinical insights available for this record.
                      </p>
                    )}
                  </div>
                </div>

                {/* Treatment Recommendations */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h5 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Treatment Recommendations
                  </h5>
                  <div className="prose max-w-none">
                    {selectedAIInsight.insights && selectedAIInsight.insights.length > 0 ? (
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {(() => {
                          const content = selectedAIInsight.insights[0]?.content || '';
                          // Extract Treatment Recommendations section
                          const treatmentMatch = content.match(/TREATMENT RECOMMENDATIONS([\s\S]*?)(?=These recommendations are intended|$)/i);
                          return treatmentMatch ? treatmentMatch[1].trim() : 'No treatment recommendations available.';
                        })()}
                      </div>
                    ) : (
                      <p className="text-gray-700 leading-relaxed">
                        No AI-generated treatment recommendations available for this record.
                      </p>
                    )}
                  </div>
                </div>

                {/* Original Assessment Data */}
                {selectedAIInsight.assessmentData && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h5 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                      Original Assessment Data
                    </h5>
                    <div className="space-y-6">
                      {/* Interview Questions */}
                      {selectedAIInsight.assessmentData.questions && selectedAIInsight.assessmentData.questions.length > 0 && (
                        <div>
                          <h6 className="font-medium text-gray-800 mb-3">Interview Questions & Responses:</h6>
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {selectedAIInsight.assessmentData.questions.map((q, index) => (
                              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="font-medium text-gray-800 mb-2">Q{index + 1}: {q.question}</p>
                                <p className="text-gray-700 text-sm">{q.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Clinical Observations */}
                      {selectedAIInsight.assessmentData.observations && (
                        <div>
                          <h6 className="font-medium text-gray-800 mb-3">Clinical Observations:</h6>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-gray-700 whitespace-pre-line text-sm">
                              {selectedAIInsight.assessmentData.observations}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Important Disclaimer */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h5 className="text-sm sm:text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Important Disclaimer
                </h5>
                <div className="space-y-3 text-red-800">
                  <p className="font-medium">The AI-generated insights contained in this report are intended for informational and decision-support purposes only.</p>
                  <p>These insights should <strong>NOT</strong> be used directly for patient treatment without proper clinical evaluation and professional judgment.</p>
                  <div className="bg-white border border-red-200 rounded-lg p-4 mt-4">
                    <h6 className="font-semibold text-red-900 mb-2">The AI insights can be used to:</h6>
                    <ul className="list-disc list-inside space-y-1 text-red-700">
                      <li>Support clinical decision-making processes</li>
                      <li>Assist in creating initial evaluation documentation</li>
                      <li>Provide suggestions for treatment plan development</li>
                      <li>Offer additional perspectives for consideration</li>
                    </ul>
                  </div>
                  <div className="bg-red-100 border border-red-300 rounded-lg p-4 mt-4">
                    <p className="font-semibold text-red-900">
                      IMPORTANT: These AI-generated insights provide a basis for decision-making; however, the final assessment and treatment plan must depend on the therapist's professional judgment, clinical expertise, and comprehensive patient evaluation.
                    </p>
                    <p className="text-red-800 mt-2">
                      The therapist retains full responsibility for all clinical decisions and patient care.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowAIInsightModal(false)}
                className="px-6 py-3 border border-transparent rounded-lg text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  downloadPDFFromHistory(selectedAIInsight);
                  setShowAIInsightModal(false);
                }}
                className="px-6 py-3 border border-transparent rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPdfToDelete(null);
        }}
        onConfirm={confirmDeletePDF}
        title="Delete AI Assessment Record"
        message={pdfToDelete ? `Are you sure you want to delete this AI assessment record?\n\n"${pdfToDelete.filename}"\n\nThis action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default AIInsights;
