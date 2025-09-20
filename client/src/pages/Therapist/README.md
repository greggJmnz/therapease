# Therapist Dashboard

This is the main therapist dashboard component for TherapEase, providing a comprehensive interface for occupational therapists to manage their patients, conduct assessments, track progress, and manage their schedules.

## Features

### 1. Therapist Profile
- **Profile Card**: Displays therapist information including name, role, contact details
- **Edit Profile**: Quick access to update personal information
- **Contact Information**: Email, phone, and address display

### 2. Patient Management
- **Patient Information Card**: Shows selected patient details with profile picture
- **Patient Navigation Tabs**: Four main sections for patient management:
  - **Daily Notes**: Date input and text area for daily observations
  - **Assessment**: Assessment history and conduct new assessment functionality
  - **Progress Tracking**: Treatment plans with progress indicators
  - **Progress Report**: File upload for progress documentation

### 3. Daily Notes
- **Date Selection**: Calendar input for note date
- **Text Area**: Large text area for detailed notes
- **Action Buttons**: Upload and Cancel functionality

### 4. Assessment Management
- **Assessment History**: List of previous assessments with dates
- **Conduct Assessment**: Button to start new assessment
- **Numbered List**: Clear organization of assessment records

### 5. Progress Tracking
- **Treatment Plans**: Individual cards for each treatment plan
- **Progress Bars**: Visual representation of plan completion
- **Status Indicators**: Completed/Incomplete status display
- **Plan Details**: Date and description information

### 6. Progress Report
- **File Upload Interface**: Drag & drop or browse file functionality
- **Supported Formats**: JPEG, PNG, PDF, and MP4 up to 50MB
- **Upload Progress**: Real-time progress tracking with file information
- **Status Display**: Upload status and file details

### 7. Notifications
- **Appointment Alerts**: New appointment assignments
- **Date Display**: Clear date formatting for each notification
- **Message Content**: Detailed notification information

### 8. Schedule Management
- **Interactive Calendar**: FullCalendar integration for appointment scheduling
- **Color-coded Events**: Different colors for different therapy types
- **Multiple Views**: Month, week, and day views available
- **Event Details**: Therapy session information and times

## Navigation

The sidebar provides easy access to all sections:
- **Therapist**: Personal profile and information
- **Patients**: Patient management and records
- **Notifications**: Appointment alerts and system notifications
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
import { TherapistDashboard } from './pages/Therapist';

function App() {
  return (
    <div className="App">
      <TherapistDashboard />
    </div>
  );
}
```

## Image Assets

The component expects the following images in the `/public/images/` directory:
- `mainlogo1.png` - Primary logo element
- `mainlogo2.png` - Secondary logo element
- `adminLogo.png` - Therapist user icon
- `patientLogo.png` - Patient management icon
- `notifLogo.png` - Notifications icon
- `schedLogo.png` - Schedule icon
- `settingsLogo.png` - Settings icon
- `helpcenterLogo.png` - Help center icon

## Styling

The component uses a custom CSS file (`TherapistDashboard.css`) with:
- Responsive design for mobile and desktop
- Consistent color scheme (primary: #1a8754)
- Modern card-based layout
- Hover effects and transitions
- Mobile-first responsive breakpoints

## State Management

The component uses React hooks for state management:
- `activeSection`: Controls which main section is displayed
- `activeTab`: Controls which patient tab is active
- `selectedPatient`: Manages the currently selected patient
- Local data arrays for notifications, assessments, and treatment plans

## Customization

To customize the therapist dashboard:
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

## Usage Examples

### Basic Implementation
```jsx
import { TherapistDashboard } from './pages/Therapist';

function App() {
  return <TherapistDashboard />;
}
```

### With Custom Styling
```jsx
import { TherapistDashboard } from './pages/Therapist';
import './custom-therapist-styles.css';

function App() {
  return (
    <div className="custom-therapist-wrapper">
      <TherapistDashboard />
    </div>
  );
}
```

## Data Structure

The component includes sample data structures for:
- Calendar events with therapy session details
- Patient information and demographics
- Assessment history records
- Treatment plan progress tracking
- Notification messages and appointments

## Responsive Features

- Mobile-first design approach
- Collapsible sidebar on small screens
- Adaptive tab layouts for mobile devices
- Touch-friendly interface elements
- Optimized spacing for different screen sizes
