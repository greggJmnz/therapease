# Admin Dashboard

This is the main admin dashboard component for TherapEase, providing a comprehensive interface for system administrators to manage patients, therapists, appointments, and schedules.

## Features

### 1. Dashboard Overview
- **Admin Profile Card**: Displays administrator information including name, role, contact details
- **Statistics Cards**: Shows total counts for patients, therapists, and appointments
- **Quick Access Links**: Direct links to detailed views

### 2. Patient Management
- **Patient Records Table**: Comprehensive list of all patients with search functionality
- **Patient Information**: Name, gender, date of birth, age, and assigned therapist
- **Bulk Operations**: Checkbox selection for multiple patient operations

### 3. Notifications
- **Appointment Booking Requests**: View and manage incoming appointment requests
- **Action Buttons**: Accept or add to waiting list functionality
- **Email Information**: Contact details for each notification

### 4. Appointments
- **Appointment List**: Current and upcoming appointments with patient details
- **Waiting List**: Patients waiting for available slots
- **Service Information**: Therapy type and scheduled times

### 5. Schedule Management
- **Interactive Calendar**: FullCalendar integration for appointment scheduling
- **Color-coded Events**: Different colors for different appointment types
- **Multiple Views**: Month, week, and day views available

## Navigation

The sidebar provides easy access to all sections:
- **Admin**: Dashboard overview and statistics
- **Patients**: Patient records and management
- **Notifications**: Appointment requests and alerts
- **Appointments**: Current appointments and waiting list
- **Schedule**: Calendar view and scheduling tools

## Dependencies

- React 18+
- FullCalendar 6.1.8
- CSS3 with modern browser support

## Installation

1. Install the required dependencies:
```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

2. Import and use the component:
```jsx
import { AdminDashboard } from './pages/Admin';

function App() {
  return (
    <div className="App">
      <AdminDashboard />
    </div>
  );
}
```

## Image Assets

The component expects the following images in the `/public/images/` directory:
- `mainlogo1.png` - Primary logo element
- `mainlogo2.png` - Secondary logo element
- `adminLogo.png` - Admin user icon
- `patientLogo.png` - Patient management icon
- `notifLogo.png` - Notifications icon
- `appointmentLogo.png` - Appointments icon
- `schedLogo.png` - Schedule icon
- `settingsLogo.png` - Settings icon
- `helpcenterLogo.png` - Help center icon
- `totalPatientLogo.png` - Patient statistics icon
- `totalTherapistLogo.png` - Therapist statistics icon
- `totalAppLogo.png` - Appointments statistics icon

## Styling

The component uses a custom CSS file (`AdminDashboard.css`) with:
- Responsive design for mobile and desktop
- Consistent color scheme (primary: #1a8754)
- Modern card-based layout
- Hover effects and transitions
- Mobile-first responsive breakpoints

## State Management

The component uses React hooks for state management:
- `activeSection`: Controls which section is currently displayed
- Local data arrays for patients, notifications, appointments, and waiting list
- Calendar events configuration for the schedule view

## Customization

To customize the dashboard:
1. Modify the data arrays in the component
2. Update the calendar events configuration
3. Adjust the color scheme in the CSS file
4. Add new sections by extending the `renderSection` function
5. Modify the navigation structure in the sidebar

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Lazy loading of calendar components
- Optimized re-renders with React hooks
- Efficient CSS with minimal repaints
- Responsive images and scalable layouts
