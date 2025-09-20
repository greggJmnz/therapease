import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  Edit,
  Trash2,
  Star,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

const UltraModernCalendar = ({ 
  events = [], 
  onEventClick, 
  onDateClick,
  onAddEvent,
  view = 'month',
  className = '',
  showQuickActions = false,
  showSearch = false,
  showFilters = false
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1)); // Set to January 2025
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState(view);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showEventModal, setShowEventModal] = useState(false);

  // Calendar navigation
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }, []);

  // Calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    while (currentDateObj <= lastDay || days.length < 42) {
      days.push(new Date(currentDateObj));
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.extendedProps?.patient && event.extendedProps.patient.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.extendedProps?.therapist && event.extendedProps.therapist.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(event => event.priority === filterPriority);
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.extendedProps?.type === filterType);
    }
    
    return filtered;
  }, [events, searchTerm, filterPriority, filterType]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date) => {
    const eventsForDate = filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      const isMatch = eventDate.toDateString() === date.toDateString();
      return isMatch;
    });
    
    return eventsForDate;
  }, [filteredEvents]);

  // Check if date is today
  const isToday = useCallback((date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  // Check if date is current month
  const isCurrentMonth = useCallback((date) => {
    return date.getMonth() === currentDate.getMonth();
  }, [currentDate]);

  // Format date for display
  const formatDate = useCallback((date) => {
    return date.getDate();
  }, []);

  // Get month name
  const getMonthName = useCallback(() => {
    return currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  }, [currentDate]);

  // Event priority colors and styles
  const getEventStyles = useCallback((priority = 'medium', type = 'default') => {
    // Therapy-specific color coding (matching the sample calendar)
    const therapyTypeStyles = {
      'sensory-assessment': {
        bg: 'bg-green-200',
        border: 'border-green-300',
        text: 'text-green-900',
        shadow: 'shadow-sm',
        icon: User
      },
      'fine-motor-skills': {
        bg: 'bg-pink-200',
        border: 'border-pink-300',
        text: 'text-pink-900',
        shadow: 'shadow-sm',
        icon: Clock
      },
      'coordination-training': {
        bg: 'bg-yellow-200',
        border: 'border-yellow-300',
        text: 'text-yellow-900',
        shadow: 'shadow-sm',
        icon: Star
      },
      'social-play-therapy': {
        bg: 'bg-pink-200',
        border: 'border-pink-300',
        text: 'text-pink-900',
        shadow: 'shadow-sm',
        icon: User
      },
      'writing-grip-training': {
        bg: 'bg-pink-200',
        border: 'border-pink-300',
        text: 'text-pink-900',
        shadow: 'shadow-sm',
        icon: Clock
      },
      'sensory-evaluation': {
        bg: 'bg-yellow-200',
        border: 'border-yellow-300',
        text: 'text-yellow-900',
        shadow: 'shadow-sm',
        icon: User
      },
      'balance-training': {
        bg: 'bg-green-200',
        border: 'border-green-300',
        text: 'text-green-900',
        shadow: 'shadow-sm',
        icon: Star
      },
      'handwriting-grip': {
        bg: 'bg-pink-200',
        border: 'border-pink-300',
        text: 'text-pink-900',
        shadow: 'shadow-sm',
        icon: Clock
      },
      'motor-skills-evaluation': {
        bg: 'bg-yellow-200',
        border: 'border-yellow-300',
        text: 'text-yellow-900',
        shadow: 'shadow-sm',
        icon: User
      },
      // Fallback styles for other types
      session: {
        bg: 'bg-blue-200',
        border: 'border-blue-300',
        text: 'text-blue-900',
        shadow: 'shadow-sm',
        icon: Clock
      },
      assessment: {
        bg: 'bg-emerald-200',
        border: 'border-emerald-300',
        text: 'text-emerald-900',
        shadow: 'shadow-sm',
        icon: User
      },
      consultation: {
        bg: 'bg-orange-200',
        border: 'border-orange-300',
        text: 'text-orange-900',
        shadow: 'shadow-sm',
        icon: CalendarIcon
      },
      training: {
        bg: 'bg-yellow-200',
        border: 'border-yellow-300',
        text: 'text-yellow-900',
        shadow: 'shadow-sm',
        icon: Star
      },
      default: {
        bg: 'bg-gray-200',
        border: 'border-gray-300',
        text: 'text-gray-900',
        shadow: 'shadow-sm',
        icon: CalendarIcon
      }
    };

    const result = therapyTypeStyles[type] || therapyTypeStyles.default;
    return result;
  }, []);

  // Handle event click
  const handleEventClick = useCallback((event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setShowEventModal(true);
    onEventClick?.(event);
  }, [onEventClick]);

  // Handle date click
  const handleDateClick = useCallback((date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  }, [onDateClick]);

  // Quick stats
  const quickStats = useMemo(() => ({
    total: filteredEvents.length,
    today: filteredEvents.filter(e => isToday(new Date(e.start))).length,
    upcoming: filteredEvents.filter(e => new Date(e.start) > new Date()).length,
    highPriority: filteredEvents.filter(e => e.priority === 'high').length
  }), [filteredEvents, isToday]);

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{getMonthName()}</h2>
              <p className="text-blue-100 text-sm">Manage your schedule efficiently</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 font-medium backdrop-blur-sm text-sm"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold mb-1">{quickStats.total}</div>
            <div className="text-blue-100 text-xs">Total Events</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold mb-1">{quickStats.today}</div>
            <div className="text-blue-100 text-xs">Today</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold mb-1">{quickStats.upcoming}</div>
            <div className="text-blue-100 text-xs">Upcoming</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold mb-1">{quickStats.highPriority}</div>
            <div className="text-blue-100 text-xs">High Priority</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      {(showSearch || showFilters || showQuickActions) && (
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="flex gap-3 flex-1">
              {showSearch && (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search events, patients, therapists..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                  />
                </div>
              )}
              
              {showFilters && (
                <div className="flex gap-2">
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                  
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="sensory-assessment">Sensory Assessment</option>
                    <option value="fine-motor-skills">Fine Motor Skills</option>
                    <option value="coordination-training">Coordination Training</option>
                    <option value="social-play-therapy">Social / Play Therapy</option>
                    <option value="writing-grip-training">Writing Grip Training</option>
                    <option value="sensory-evaluation">Sensory Evaluation</option>
                    <option value="balance-training">Balance Training</option>
                    <option value="handwriting-grip">Handwriting and Grip</option>
                    <option value="motor-skills-evaluation">Motor Skills Evaluation</option>
                    <option value="session">General Session</option>
                    <option value="assessment">General Assessment</option>
                    <option value="consultation">Consultation</option>
                    <option value="training">General Training</option>
                  </select>
                </div>
              )}
            </div>
            
            {showQuickActions && (
              <div className="flex gap-2">
                <button
                  onClick={() => onAddEvent?.()}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  Add Event
                </button>
                
                <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`p-1.5 rounded transition-all ${
                      viewMode === 'month' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid3X3 size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-all ${
                      viewMode === 'list' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);
            const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`
                  min-h-[100px] p-2 border border-gray-100 rounded-lg cursor-pointer transition-all duration-200
                  ${isCurrentMonthDay ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'}
                  ${isTodayDate ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50' : ''}
                  ${isSelected ? 'ring-2 ring-purple-500 ring-offset-1 bg-purple-50' : ''}
                  hover:shadow-md hover:scale-[1.01]
                `}
              >
                {/* Date Number */}
                <div className={`
                  text-xs font-medium mb-2 text-right
                  ${isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'}
                  ${isTodayDate ? 'text-blue-600 font-bold' : ''}
                `}>
                  {formatDate(date)}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event, eventIndex) => {
                    const eventStyles = getEventStyles(event.priority, event.extendedProps?.type);
                    const eventTime = new Date(event.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                    
                    return (
                      <div
                        key={eventIndex}
                        onClick={(e) => handleEventClick(event, e)}
                        className={`
                          p-1.5 rounded text-xs cursor-pointer transition-all duration-200 border
                          ${eventStyles.bg} ${eventStyles.border} ${eventStyles.text}
                          hover:opacity-80 hover:scale-105 ${eventStyles.shadow}
                        `}
                      >
                        <div className="font-semibold text-xs mb-0.5">{eventTime}</div>
                        <div className="font-medium leading-tight text-xs">{event.title}</div>
                      </div>
                    );
                  })}

                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 text-center py-0.5 bg-gray-100 rounded">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="border-t border-gray-100 p-6 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Events for {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {getEventsForDate(selectedDate).length > 0 ? (
              getEventsForDate(selectedDate).map((event, index) => {
                const eventStyles = getEventStyles(event.priority, event.extendedProps?.type);
                const EventIcon = eventStyles.icon;
                
                return (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-3 h-3 rounded-full ${eventStyles.bg}`}></div>
                          <h4 className="font-semibold text-gray-900 text-lg">{event.title}</h4>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${eventStyles.bg} text-white`}>
                            {event.priority} priority
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            <span>
                              {new Date(event.start).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                              {event.end && ` - ${new Date(event.end).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}`}
                            </span>
                          </div>

                          {event.extendedProps?.room && (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} />
                              <span>{event.extendedProps.room}</span>
                            </div>
                          )}

                          {event.extendedProps?.therapist && (
                            <div className="flex items-center gap-2">
                              <User size={14} />
                              <span>{event.extendedProps.therapist}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CalendarIcon size={64} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No events scheduled</p>
                <p className="text-sm">Click the "Add Event" button to schedule something</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Event Details</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 text-xl mb-3">
                    {selectedEvent.title}
                  </h4>
                  <div className="flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedEvent.priority === 'high' ? 'bg-red-100 text-red-700' :
                      selectedEvent.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedEvent.priority} priority
                    </div>
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                      {selectedEvent.extendedProps?.type || 'Event'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Time</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedEvent.start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                          {selectedEvent.end && ` - ${new Date(selectedEvent.end).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedEvent.start).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedEvent.extendedProps?.room && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium text-gray-900">{selectedEvent.extendedProps.room}</p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.extendedProps?.therapist && (
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Therapist</p>
                          <p className="font-medium text-gray-900">{selectedEvent.extendedProps.therapist}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex gap-3">
                    <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors font-medium">
                      Edit Event
                    </button>
                    <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UltraModernCalendar;
