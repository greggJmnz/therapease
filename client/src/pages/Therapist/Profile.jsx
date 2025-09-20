import React from 'react';
import { therapistAPI } from '../../services/api';
import ProfileForm from '../../components/Profile/ProfileForm';

const TherapistProfile = () => {
  return <ProfileForm userRole="therapist" apiService={therapistAPI} />;
};

export default TherapistProfile;