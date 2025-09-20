# Patient Dashboard

This is the main patient dashboard component for TherapEase, providing a comprehensive interface for patients to view their profile, daily notes, schedule, progress tracking, and manage their therapy-related information.

## Features

### 1. Patient Profile
- **Profile Card**: Displays patient information including name, role, contact details
- **Profile Picture**: Circular profile image with patient details
- **Edit Profile**: Quick access to update personal information
- **Contact Information**: Email, phone, and address display

### 2. Daily Notes
- **Session Information**: Date and session duration display
- **Session Summary**: Detailed description of the therapy session
- **Activities Performed**: List of activities with duration tracking
- **Performance Observations**: Therapist's observations and notes
- **Assessment Summary**: Overall assessment and progress notes
- **Therapist Information**: Name of the assigned therapist
- **Reply Section**: Input field for patient responses with attachment option
- **Action Buttons**: Okay and Cancel functionality

### 3. Notifications
- **Appointment Alerts**: New appointment assignments and updates
- **Daily Notes Updates**: Notifications when therapist uploads new notes
- **Assessment Reminders**: Scheduled assessment notifications
- **Date Display**: Clear date formatting for each notification

### 4. Schedule Management
- **Interactive Calendar**: FullCalendar integration for appointment viewing
- **Color-coded Events**: Different colors for different therapy types
- **Multiple Views**: Month, week, and day views available
- **Event Details**: Therapy session information and scheduled times
- **Navigation**: Easy month-to-month navigation

### 5. Progress Report
- **File Management**: View uploaded progress report files
- **File Types**: Support for various document formats
- **File Actions**: Menu options for each file (view, download, etc.)
- **Organized Display**: Clean list format with file icons

### 6. Progress Tracking
- **Treatment Plans**: Individual treatment plan management
- **Plan Details**: Date and main objective input fields
- **Objectives Table**: Structured format for specific objectives and remarks
- **Checkbox System**: Track completion status of objectives
- **Expandable Rows**: Space for additional objectives

## Navigation

The sidebar provides easy access to all sections:
- **Patient**: Personal profile and information
- **Daily Notes**: Session notes and therapist observations
- **Notifications**: System alerts and updates
- **Schedule**: Calendar view and appointment management
- **Progress Report**: File management and document access
- **Progress Tracking**: Treatment plan progress and objectives

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
import { PatientDashboard } from './pages/Patient';

function App() {
  return (
    <div className="App">
      <PatientDashboard />
    </div>
  );
}
```

## Image Assets

The component expects the following images in the `/public/images/` directory:
- `mainlogo1.png` - Primary logo element
- `mainlogo2.png` - Secondary logo element
- `patientLogo.png` - Patient management icon
- `notifLogo.png` - Notifications icon
- `schedLogo.png` - Schedule icon
- `settingsLogo.png` - Settings icon
- `helpcenterLogo.png` - Help center icon

## Styling

The component uses a custom CSS file (`PatientDashboard.css`) with:
- Responsive design for mobile and desktop
- Consistent color scheme (primary: #1a8754)
- Modern card-based layout
- Hover effects and transitions
- Mobile-first responsive breakpoints

## State Management

The component uses React hooks for state management:
- `activeSection`: Controls which main section is displayed
- Local data arrays for notifications, progress files, and treatment plans
- Sample data for daily notes and calendar events

## Customization

To customize the patient dashboard:
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
import { PatientDashboard } from './pages/Patient';

function App() {
  return <PatientDashboard />;
}
```

### With Custom Styling
```jsx
import { PatientDashboard } from './pages/Patient';
import './custom-patient-styles.css';

function App() {
  return (
    <div className="custom-patient-wrapper">
      <PatientDashboard />
    </div>
  );
}
```

## Data Structure

The component includes sample data structures for:
- Calendar events with therapy session details
- Patient information and demographics
- Daily notes with session details
- Notification messages and updates
- Progress report files
- Treatment plan objectives

## Responsive Features

- Mobile-first design approach
- Collapsible sidebar on small screens
- Adaptive table layouts for mobile devices
- Touch-friendly interface elements
- Optimized spacing for different screen sizes

## Key Components

### Daily Notes Card
- Comprehensive session information display
- Structured content with clear sections
- Professional formatting for medical notes

### Reply Section
- Input field for patient responses
- Attachment functionality for images
- Action buttons for submission

### Progress Tracking Table
- Structured objectives management
- Checkbox system for completion tracking
- Expandable rows for additional content

### File Management
- Clean file display with icons
- Action menus for file operations
- Organized list format

## Accessibility Features

- Semantic HTML structure
- Proper heading hierarchy
- Keyboard navigation support
- Screen reader friendly
- High contrast color scheme
- Clear visual indicators
