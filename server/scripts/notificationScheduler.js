const cron = require('node-cron');
const { getRow, getAll } = require('../config/database');
const notificationController = require('../controllers/notificationController');

// Schedule appointment reminders to run daily at 9:00 AM
const scheduleAppointmentReminders = () => {
  console.log('🕘 Starting appointment reminder scheduler...');
  
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running daily appointment reminder check...');
    
    try {
      // Get all appointments scheduled for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      
      const appointmentsSql = `
        SELECT 
          a.id,
          a.appointmentDate,
          a.startTime,
          a.type,
          p.userId as patientUserId,
          CONCAT(u.firstName, ' ', u.lastName) as patientName,
          CONCAT(t.firstName, ' ', t.lastName) as therapistName
        FROM appointments a
        JOIN patients p ON a.patientId = p.id
        JOIN users u ON p.userId = u.id
        JOIN users t ON a.therapistId = t.id
        WHERE a.appointmentDate = ? AND a.status = 'scheduled'
      `;
      
      const appointments = await getAll(appointmentsSql, [tomorrowDate]);
      
      console.log(`📅 Found ${appointments.length} appointments for tomorrow (${tomorrowDate})`);
      
      // Send reminder notifications for each appointment
      for (const appointment of appointments) {
        try {
          await notificationController.createAppointmentReminderForPatient(appointment.id);
          console.log(`✅ Sent reminder for appointment ${appointment.id} - ${appointment.patientName}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder for appointment ${appointment.id}:`, error);
        }
      }
      
      console.log(`🎉 Completed appointment reminder check for ${appointments.length} appointments`);
      
    } catch (error) {
      console.error('❌ Error in appointment reminder scheduler:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust timezone as needed
  });
  
  console.log('✅ Appointment reminder scheduler started (daily at 9:00 AM)');
};

// Schedule exercise reminders to run daily at 8:00 AM
const scheduleExerciseReminders = () => {
  console.log('🏃 Starting exercise reminder scheduler...');
  
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('💪 Running daily exercise reminder check...');
    
    try {
      // Get all exercises that are due today or overdue
      const today = new Date().toISOString().split('T')[0];
      
      const exercisesSql = `
        SELECT 
          he.id,
          he.title,
          he.dueDate,
          p.userId as patientUserId,
          CONCAT(u.firstName, ' ', u.lastName) as patientName,
          CONCAT(t.firstName, ' ', t.lastName) as therapistName
        FROM home_exercises he
        JOIN patients p ON he.patientId = p.id
        JOIN users u ON p.userId = u.id
        JOIN users t ON he.therapistId = t.id
        WHERE he.dueDate <= ? AND he.status != 'completed'
      `;
      
      const exercises = await getAll(exercisesSql, [today]);
      
      console.log(`🏃 Found ${exercises.length} exercises due today or overdue`);
      
      // Send reminder notifications for each exercise
      for (const exercise of exercises) {
        try {
          const title = 'Exercise Reminder';
          const dueDateText = exercise.dueDate ? 
            ` (due by ${new Date(exercise.dueDate).toLocaleDateString()})` : '';
          const message = `Don't forget to complete your exercise: "${exercise.title}"${dueDateText}. Your therapist ${exercise.therapistName} is tracking your progress!`;
          
          await notificationController.createNotification(
            exercise.patientUserId,
            title,
            message,
            'exercise_reminder',
            { relatedId: exercise.id, priority: 'medium' }
          );
          
          console.log(`✅ Sent exercise reminder for ${exercise.id} - ${exercise.patientName}`);
        } catch (error) {
          console.error(`❌ Failed to send exercise reminder for ${exercise.id}:`, error);
        }
      }
      
      console.log(`🎉 Completed exercise reminder check for ${exercises.length} exercises`);
      
    } catch (error) {
      console.error('❌ Error in exercise reminder scheduler:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust timezone as needed
  });
  
  console.log('✅ Exercise reminder scheduler started (daily at 8:00 AM)');
};

// Initialize all schedulers
const initializeNotificationSchedulers = () => {
  console.log('🚀 Initializing notification schedulers...');
  
  scheduleAppointmentReminders();
  scheduleExerciseReminders();
  
  console.log('✅ All notification schedulers initialized');
};

module.exports = {
  scheduleAppointmentReminders,
  scheduleExerciseReminders,
  initializeNotificationSchedulers
};
