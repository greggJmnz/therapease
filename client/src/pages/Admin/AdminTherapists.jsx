import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  UserCheck,
  Star,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Key,
  Copy,
  CheckCircle,
  Briefcase,
  Shield,
  Users
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AdminTherapists = () => {
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [editingTherapist, setEditingTherapist] = useState(null);
  const [showGenerateAccountModal, setShowGenerateAccountModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [newTherapist, setNewTherapist] = useState({
    name: '',
    email: ''
  });

  // Fetch therapists data from API
  const { data: therapistsData, isLoading, error, refetch } = useQuery(
    'adminTherapists',
    adminAPI.getTherapists,
    {
      onError: (error) => {
        toast.error('Failed to load therapists data');
        console.error('Error fetching therapists:', error);
      }
    }
  );

  // Extract therapists from API response (admin API has double nesting)
  const therapists = (therapistsData?.data?.data?.users || [])
    .filter(user => user.role === 'therapist')
    .map(therapist => ({
      id: therapist.id,
      name: `${therapist.firstName} ${therapist.lastName}`,
      email: therapist.email,
      phone: therapist.phone || 'N/A',
      specialization: therapist.therapist?.specialization || 'Pediatric OT',
      licenseNumber: therapist.therapist?.licenseNumber || 'N/A',
      experience: therapist.therapist?.yearsOfExperience ? `${therapist.therapist.yearsOfExperience} years` : 'N/A',
      status: 'active',
      patientsCount: 0, // This would need to be calculated from patient assignments
      address: therapist.address || 'N/A',
      city: therapist.city || 'N/A',
      state: therapist.state || 'N/A',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face'
    }));


  // Loading and error states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading therapists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load therapists</div>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-[#10b981] text-white rounded-[25px] hover:bg-[#059669] transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleEdit = (therapist) => {
    setEditingTherapist({ ...therapist });
    setSelectedTherapist(null);
  };

  const handleSave = () => {
    if (editingTherapist) {
      // TODO: Implement API call to update therapist
      toast.success('Therapist updated successfully');
      setEditingTherapist(null);
      refetch(); // Refresh data from API
    }
  };

  const handleCancel = () => {
    setEditingTherapist(null);
  };

  const handleApprove = (therapistId) => {
    // TODO: Implement API call to approve therapist
    toast.success('Therapist approved successfully');
    refetch(); // Refresh data from API
  };

  const handleDelete = (therapistId) => {
    if (window.confirm('Are you sure you want to delete this therapist?')) {
      // TODO: Implement API call to delete therapist
      toast.success('Therapist deleted successfully');
      refetch(); // Refresh data from API
    }
  };

  const generateCredentials = () => {
    if (newTherapist.name && newTherapist.email) {
      // Generate a random password
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      
      const credentials = {
        email: newTherapist.email,
        password: password,
        name: newTherapist.name
      };
      
      setGeneratedCredentials(credentials);
      
      // Add therapist to the list with minimal information
      const therapist = {
        id: Date.now(),
        name: newTherapist.name,
        email: newTherapist.email,
        phone: '',
        specialization: '',
        licenseNumber: '',
        experience: '',
        status: 'pending',
        patientsCount: 0,
        address: '',
        city: '',
        state: '',
        image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face'
      };
      // TODO: Implement API call to create therapist
      toast.success('Therapist created successfully');
      refetch(); // Refresh data from API
    }
  };

  const handleInputChange = (field, value) => {
    if (editingTherapist) {
      setEditingTherapist(prev => ({ ...prev, [field]: value }));
    } else if (showGenerateAccountModal) {
      setNewTherapist(prev => ({ ...prev, [field]: value }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const closeGenerateModal = () => {
    setShowGenerateAccountModal(false);
    setGeneratedCredentials(null);
    setNewTherapist({
      name: '',
      email: ''
    });
  };

  return (
    <div className="therapists-section">
      <div className="section-header">
        <h2>Therapist Management</h2>
        <button className="btn-primary" onClick={() => setShowGenerateAccountModal(true)}>
          <Key size={16} />
          Generate Account
        </button>
      </div>

      <div className="therapists-grid">
        {therapists.map(therapist => (
          <div key={therapist.id} className="therapist-card">
            <div className="therapist-header">
              <img src={therapist.image} alt={therapist.name} className="therapist-avatar" />
              <div className="therapist-info">
                <h3>{therapist.name}</h3>
                <p className="specialization">
                  {therapist.specialization || 'Specialization not set'}
                </p>

              </div>
              <span className={`status-badge ${therapist.status}`}>
                {therapist.status}
              </span>
            </div>
            
            <div className="therapist-details">
              <div className="detail-item">
                <span className="label">License:</span>
                <span>{therapist.licenseNumber || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Experience:</span>
                <span>{therapist.experience || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Patients:</span>
                <span>{therapist.patientsCount}</span>
              </div>
            </div>

            <div className="therapist-actions">
              <button className="action-btn" onClick={() => setSelectedTherapist(therapist)}>
                <Eye size={16} />
                View
              </button>
              <button className="action-btn" onClick={() => handleEdit(therapist)}>
                <Edit size={16} />
                Edit
              </button>
              {therapist.status === 'pending' && (
                <button className="action-btn approve" onClick={() => handleApprove(therapist.id)}>
                  <UserCheck size={16} />
                  Approve
                </button>
              )}
              <button className="action-btn danger" onClick={() => handleDelete(therapist.id)}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Therapist Detail Modal */}
      {selectedTherapist && (
        <div className="modal-overlay" onClick={() => setSelectedTherapist(null)}>
          <div className="modal-content therapist-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Therapist Profile</h3>
              <button className="close-btn" onClick={() => setSelectedTherapist(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="therapist-detail-modern">
                {/* Header Section */}
                <div className="therapist-header">
                  <div className="avatar-container">
                    <img src={selectedTherapist.image} alt={selectedTherapist.name} className="therapist-avatar" />
                    <div className={`status-indicator ${selectedTherapist.status}`}></div>
                  </div>
                  <div className="therapist-basic-info">
                    <h2 className="therapist-name">{selectedTherapist.name}</h2>
                    <p className="therapist-specialization">{selectedTherapist.specialization || 'Specialization not set'}</p>
                    <div className="therapist-stats">
                      <div className="stat-item">
                        <UserCheck size={16} className="stat-icon" />
                        <span className="stat-value">{selectedTherapist.patientsCount}</span>
                        <span className="stat-label">Patients</span>
                      </div>
                      <div className="stat-item">
                        <Calendar size={16} className="stat-icon" />
                        <span className="stat-value">{selectedTherapist.experience}</span>
                        <span className="stat-label">Experience</span>
                      </div>
                      <div className="stat-item">
                        <Key size={16} className="stat-icon" />
                        <span className="stat-value">{selectedTherapist.licenseNumber || 'N/A'}</span>
                        <span className="stat-label">License</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="info-section">
                  <h4 className="section-title">
                    <Mail size={18} className="section-icon" />
                    Contact Information
                  </h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <Mail size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Email Address</span>
                        <span className="info-value">{selectedTherapist.email}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Phone size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Phone Number</span>
                        <span className="info-value">{selectedTherapist.phone || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <MapPin size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Location</span>
                        <span className="info-value">
                          {selectedTherapist.address ? `${selectedTherapist.city}, ${selectedTherapist.state}` : 'Not provided'}
                    </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div className="info-section">
                  <h4 className="section-title">
                    <Briefcase size={18} className="section-icon" />
                    Professional Details
                  </h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <Key size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">License Number</span>
                        <span className="info-value">{selectedTherapist.licenseNumber || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Calendar size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Years of Experience</span>
                        <span className="info-value">{selectedTherapist.experience || 'Not specified'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Users size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Current Patients</span>
                        <span className="info-value">{selectedTherapist.patientsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="info-section">
                  <h4 className="section-title">
                    <Shield size={18} className="section-icon" />
                    Account Status
                  </h4>
                  <div className="status-section">
                    <div className={`status-badge-modern ${selectedTherapist.status}`}>
                      <span className="status-dot"></span>
                      {selectedTherapist.status.charAt(0).toUpperCase() + selectedTherapist.status.slice(1)}
                    </div>
                    <p className="status-description">
                      {selectedTherapist.status === 'active' ? 'This therapist is currently active and can accept new patients.' :
                       selectedTherapist.status === 'pending' ? 'This therapist account is pending approval from administration.' :
                       'This therapist account is currently inactive.'}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                  <button className="action-btn" onClick={() => handleEdit(selectedTherapist)}>
                    <Edit size={16} />
                    Edit Profile
                  </button>
                  {selectedTherapist.status === 'pending' && (
                    <button className="action-btn approve" onClick={() => handleApprove(selectedTherapist.id)}>
                      <UserCheck size={16} />
                      Approve Account
                    </button>
                  )}
                  <button className="action-btn danger" onClick={() => handleDelete(selectedTherapist.id)}>
                    <Trash2 size={16} />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Therapist Modal */}
      {editingTherapist && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Therapist</h3>
              <button className="close-btn" onClick={handleCancel}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editingTherapist.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editingTherapist.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={editingTherapist.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Specialization</label>
                <input
                  type="text"
                  value={editingTherapist.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>License Number</label>
                <input
                  type="text"
                  value={editingTherapist.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Experience</label>
                <input
                  type="text"
                  value={editingTherapist.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingTherapist.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="form-select"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={editingTherapist.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={editingTherapist.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={editingTherapist.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
                <button className="btn-primary" onClick={handleSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Account Modal */}
      {showGenerateAccountModal && (
        <div className="modal-overlay" onClick={closeGenerateModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Therapist Account</h3>
              <button className="close-btn" onClick={closeGenerateModal}>×</button>
            </div>
            <div className="modal-body">
              {!generatedCredentials ? (
                <>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newTherapist.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="form-input"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={newTherapist.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="form-input"
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div className="info-note">
                    <p><strong>Note:</strong> Only name and email are required to generate an account. The therapist will complete their profile information after logging in.</p>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={closeGenerateModal}>Cancel</button>
                    <button className="btn-primary" onClick={generateCredentials}>
                      <Key size={16} />
                      Generate Account
                    </button>
                  </div>
                </>
              ) : (
                <div className="credentials-display">
                  <div className="success-message">
                    <CheckCircle size={48} className="success-icon" />
                    <h4>Account Generated Successfully!</h4>
                    <p>The therapist account has been created and added to the system.</p>
                  </div>
                  
                  <div className="credentials-box">
                    <h5>Login Credentials</h5>
                    <p><strong>Share these credentials with the therapist:</strong></p>
                    
                    <div className="credential-item">
                      <label>Email:</label>
                      <div className="credential-value">
                        <span>{generatedCredentials.email}</span>
                        <button 
                          className="copy-btn" 
                          onClick={() => copyToClipboard(generatedCredentials.email)}
                          title="Copy email"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="credential-item">
                      <label>Temporary Password:</label>
                      <div className="credential-value">
                        <span className="password-display">{generatedCredentials.password}</span>
                        <button 
                          className="copy-btn" 
                          onClick={() => copyToClipboard(generatedCredentials.password)}
                          title="Copy password"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="credential-note">
                      <p><strong>Important:</strong> The therapist should change their password upon first login.</p>
                      <p><strong>Next Steps:</strong> The therapist will complete their profile (specialization, license, experience, etc.) after logging in.</p>
                    </div>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="btn-primary" onClick={closeGenerateModal}>
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTherapists;
