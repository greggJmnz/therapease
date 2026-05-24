const { runQuery, getRow, getAll } = require('../config/database');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryUploadService');

let progressReportsColumnsCache = null;

const getProgressReportsColumns = async () => {
  if (progressReportsColumnsCache) {
    return progressReportsColumnsCache;
  }

  try {
    const columns = await getAll('SHOW COLUMNS FROM progress_reports');
    progressReportsColumnsCache = new Set(columns.map((column) => column.Field));
  } catch (error) {
    console.error('Failed to inspect progress_reports schema:', error.message);
    progressReportsColumnsCache = new Set();
  }

  return progressReportsColumnsCache;
};

// Upload progress report
const uploadProgressReport = async (req, res) => {
  try {
    const { patientId, title, description } = req.body;
    const therapistUserId = req.user.id;
    
    // Get the actual therapist ID from the therapists table
    const therapist = await getRow('SELECT id FROM therapists WHERE userId = ?', [therapistUserId]);
    if (!therapist) {
      return res.status(404).json({ 
        success: false, 
        error: 'Therapist not found' 
      });
    }
    const therapistId = therapist.id;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    if (!patientId || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Patient ID and title are required' 
      });
    }
    
    // Verify that the therapist has access to this patient
    const patientCheck = await getRow(`
      SELECT p.id 
      FROM patients p 
      LEFT JOIN patient_therapist_assignments pta ON p.id = pta.patientId
      WHERE p.id = ? AND (p.therapistId = ? OR p.therapistId = ? OR pta.therapistId = ?)
    `, [patientId, therapistUserId, therapistId, therapistId]);
    
    if (!patientCheck) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have access to this patient' 
      });
    }
    
    const uploadedFile = await uploadBufferToCloudinary({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: 'progress-reports',
      resourceType: 'auto'
    });

    const filePath = uploadedFile.url;
    const publicId = uploadedFile.publicId;
    const resourceType = uploadedFile.resourceType;
    const fileName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const originalFileName = req.file.originalname;
    const fileSize = uploadedFile.bytes || req.file.size;
    const mimeType = req.file.mimetype;
    const reportDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format

    const progressReportsColumns = await getProgressReportsColumns();
    const hasColumn = (columnName) => progressReportsColumns.has(columnName);

    const insertColumns = ['patientId', 'therapistId'];
    const insertValues = [patientId, therapistId];

    if (hasColumn('reportDate')) {
      insertColumns.push('reportDate');
      insertValues.push(reportDate);
    }

    if (hasColumn('title')) {
      insertColumns.push('title');
      insertValues.push(title);
    }

    if (hasColumn('description')) {
      insertColumns.push('description');
      insertValues.push(description || null);
    }

    if (hasColumn('fileName')) {
      insertColumns.push('fileName');
      insertValues.push(fileName);
    }

    if (hasColumn('originalFileName')) {
      insertColumns.push('originalFileName');
      insertValues.push(originalFileName);
    }

    if (hasColumn('filePath')) {
      insertColumns.push('filePath');
      insertValues.push(filePath);
    }

    if (hasColumn('publicId')) {
      insertColumns.push('publicId');
      insertValues.push(publicId);
    }

    if (hasColumn('resourceType')) {
      insertColumns.push('resourceType');
      insertValues.push(resourceType);
    }

    if (hasColumn('fileSize')) {
      insertColumns.push('fileSize');
      insertValues.push(fileSize);
    }

    if (hasColumn('mimeType')) {
      insertColumns.push('mimeType');
      insertValues.push(mimeType);
    }

    if (hasColumn('uploadedAt')) {
      insertColumns.push('uploadedAt');
      insertValues.push(new Date());
    }

    const insertSql = `
      INSERT INTO progress_reports (${insertColumns.join(', ')})
      VALUES (${insertColumns.map(() => '?').join(', ')})
    `;

    const result = await runQuery(insertSql, insertValues);
    
    // Get patient and therapist information for notification
    const patientInfo = await getRow(`
      SELECT u.id as userId, CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `, [patientId]);
    
    const therapistInfo = await getRow(`
      SELECT CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM therapists t
      JOIN users u ON t.userId = u.id
      WHERE t.id = ?
    `, [therapistId]);
    
    // Create notification for patient
    try {
      if (patientInfo) {
        const notificationTitle = 'New Progress Report Available';
        const notificationMessage = `Your therapist ${therapistInfo?.therapistName || 'Smith'} has uploaded a new progress report: "${title}". You can view and download it from your progress tracking section.`;
        
        // Create notification directly
        const notificationSql = `
          INSERT INTO notifications (userId, title, message, type, relatedId)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        const notificationResult = await runQuery(notificationSql, [
          patientInfo.userId,
          notificationTitle,
          notificationMessage,
          'progress_report',
          result.insertId
        ]);
        
        console.log('✅ Notification created for patient with ID:', notificationResult.insertId);
      } else {
        console.log('⚠️ No patient info found for patientId:', patientId);
      }
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      // Don't fail the upload if notification creation fails
    }
    
    res.json({
      success: true,
      message: 'Progress report uploaded successfully',
      data: {
        id: result.insertId,
        fileName: originalFileName,
        fileSize: fileSize,
        uploadedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Upload progress report error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload progress report' 
    });
  }
};

// Get progress reports for a patient (therapist view)
const getProgressReports = async (req, res) => {
  try {
    const { patientId } = req.params;
    const therapistUserId = req.user.id;
    
    // Get the actual therapist ID from the therapists table
    const therapist = await getRow('SELECT id FROM therapists WHERE userId = ?', [therapistUserId]);
    if (!therapist) {
      return res.status(404).json({ 
        success: false, 
        error: 'Therapist not found' 
      });
    }
    const therapistId = therapist.id;
    
    // Verify that the therapist has access to this patient
    const patientCheck = await getRow(`
      SELECT p.id 
      FROM patients p 
      LEFT JOIN patient_therapist_assignments pta ON p.id = pta.patientId
      WHERE p.id = ? AND (p.therapistId = ? OR p.therapistId = ? OR pta.therapistId = ?)
    `, [patientId, therapistUserId, therapistId, therapistId]);
    
    if (!patientCheck) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have access to this patient' 
      });
    }
    
    const sql = `
      SELECT 
        pr.id,
        pr.title,
        pr.description,
        pr.originalFileName,
        pr.filePath,
        pr.fileSize,
        pr.mimeType,
        pr.uploadedAt,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM progress_reports pr
      JOIN therapists t ON pr.therapistId = t.id
      JOIN users u ON t.userId = u.id
      WHERE pr.patientId = ?
      ORDER BY pr.uploadedAt DESC
    `;
    
    const reports = await getAll(sql, [patientId]);
    
    res.json({
      success: true,
      data: {
        reports: reports,
        total: reports.length
      }
    });
    
  } catch (error) {
    console.error('Get progress reports error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch progress reports' 
    });
  }
};

// Get progress reports for current patient (patient view)
const getMyProgressReports = async (req, res) => {
  try {
    const patientUserId = req.user.id;
    
    // Get patient ID from user ID
    const patient = await getRow('SELECT id FROM patients WHERE userId = ?', [patientUserId]);
    
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        error: 'Patient not found' 
      });
    }
    
    const sql = `
      SELECT 
        pr.id,
        pr.title,
        pr.description,
        pr.originalFileName,
        pr.filePath,
        pr.fileSize,
        pr.mimeType,
        pr.uploadedAt,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM progress_reports pr
      JOIN therapists t ON pr.therapistId = t.id
      JOIN users u ON t.userId = u.id
      WHERE pr.patientId = ?
      ORDER BY pr.uploadedAt DESC
    `;
    
    const reports = await getAll(sql, [patient.id]);
    
    res.json({
      success: true,
      data: {
        reports: reports,
        total: reports.length
      }
    });
    
  } catch (error) {
    console.error('Get my progress reports error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch progress reports' 
    });
  }
};

// Download progress report
const downloadProgressReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let sql;
    let params;
    
    if (userRole === 'therapist') {
      // Therapist can download reports for their patients
      sql = `
        SELECT pr.*, p.userId as patientUserId
        FROM progress_reports pr
        JOIN patients p ON pr.patientId = p.id
        JOIN therapists t ON pr.therapistId = t.id
        WHERE pr.id = ? AND t.userId = ?
      `;
      params = [reportId, userId];
    } else if (userRole === 'patient') {
      // Patient can download their own reports
      sql = `
        SELECT pr.*, p.userId as patientUserId
        FROM progress_reports pr
        JOIN patients p ON pr.patientId = p.id
        WHERE pr.id = ? AND p.userId = ?
      `;
      params = [reportId, userId];
    } else {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }
    
    const report = await getRow(sql, params);
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'Progress report not found' 
      });
    }
    
    const isRemoteFile = report.filePath?.startsWith('http://') || report.filePath?.startsWith('https://');

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${report.originalFileName}"`);
    res.setHeader('Content-Type', report.mimeType);
    if (report.fileSize) {
      res.setHeader('Content-Length', report.fileSize);
    }

    let fileStream;
    if (isRemoteFile) {
      const remoteResponse = await fetch(report.filePath);
      if (!remoteResponse.ok || !remoteResponse.body) {
        return res.status(404).json({
          success: false,
          error: 'File not found in storage'
        });
      }

      fileStream = Readable.fromWeb(remoteResponse.body);
    } else {
      // Check if file exists
      if (!fs.existsSync(report.filePath)) {
        return res.status(404).json({ 
          success: false, 
          error: 'File not found on server' 
        });
      }

      fileStream = fs.createReadStream(report.filePath);
    }
    
    // Handle stream errors
    fileStream.on('error', (streamError) => {
      // Only log if response hasn't been sent
      if (!res.headersSent) {
        console.error('File stream error:', streamError);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to read file' 
        });
      } else {
        // Response already sent, just log the error
        console.error('File stream error after response sent:', streamError.message);
      }
      // Clean up the stream
      if (!fileStream.destroyed) {
        fileStream.destroy();
      }
    });
    
    // Handle client disconnection
    req.on('close', () => {
      if (!fileStream.destroyed) {
        fileStream.destroy();
      }
    });
    
    // Handle response errors
    res.on('error', (resError) => {
      console.error('Response error during file download:', resError);
      if (!fileStream.destroyed) {
        fileStream.destroy();
      }
    });
    
    // Pipe the stream to response
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download progress report error:', error);
    // Only send error if response hasn't been sent
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to download progress report' 
      });
    }
  }
};

// Delete progress report
const deleteProgressReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const therapistUserId = req.user.id; // This is the user ID from the token
    
    // Get the actual therapist ID from the therapists table
    const therapist = await getRow('SELECT id FROM therapists WHERE userId = ?', [therapistUserId]);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        error: 'Therapist not found'
      });
    }
    const therapistId = therapist.id; // This is the actual therapist ID
    
    // Get report details
    const report = await getRow(`
      SELECT pr.*, t.userId
      FROM progress_reports pr
      JOIN therapists t ON pr.therapistId = t.id
      WHERE pr.id = ? AND t.userId = ?
    `, [reportId, therapistUserId]);
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'Progress report not found' 
      });
    }
    
    // Delete file from Cloudinary when available
    if (report.publicId) {
      await deleteFromCloudinary(report.publicId, report.resourceType || 'raw');
    } else if (report.filePath?.startsWith('http://') || report.filePath?.startsWith('https://')) {
      console.log('ℹ️ Remote progress report file has no publicId; skipping storage deletion');
    } else if (fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }
    
    // Delete record from database
    await runQuery('DELETE FROM progress_reports WHERE id = ?', [reportId]);
    
    res.json({
      success: true,
      message: 'Progress report deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete progress report error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete progress report' 
    });
  }
};

module.exports = {
  uploadProgressReport,
  getProgressReports,
  getMyProgressReports,
  downloadProgressReport,
  deleteProgressReport
};
