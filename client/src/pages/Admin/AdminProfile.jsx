import React from 'react';
import { adminAPI } from '../../services/api';
import ProfileForm from '../../components/Profile/ProfileForm';

const AdminProfile = () => {
  return <ProfileForm userRole="admin" apiService={adminAPI} />;
};

export default AdminProfile;