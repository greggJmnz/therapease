import React from 'react';
import { patientAPI } from '../../services/api';
import ProfileForm from '../../components/Profile/ProfileForm';

const PatientProfile = () => {
  return <ProfileForm userRole="patient" apiService={patientAPI} />;
};

export default PatientProfile;