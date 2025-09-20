import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import ModernCard from './ModernCard';
import { cn } from '../utils/cn';

const StatCard = ({ title, value, change, icon: Icon, variant = 'default', className = '' }) => {
  const isPositive = change >= 0;
  
  const variantClasses = {
    default: 'from-[#10b981] to-[#2563eb]',
    success: 'from-[#10b981] to-[#059669]',
    warning: 'from-yellow-500 to-orange-600',
    danger: 'from-red-500 to-pink-600'
  };

  return (
    <ModernCard 
      variant="elevated" 
      className={cn('relative overflow-hidden', className)}
      hover={false}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== null && (
            <div className={cn(
              'flex items-center mt-2 text-sm font-medium',
              isPositive ? 'text-[#10b981]' : 'text-red-600'
            )}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-[20px] bg-gradient-to-br',
          variantClasses[variant]
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      {/* Animated background decoration */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-[#d1fae5] to-[#dbeafe] rounded-full opacity-20 animate-pulse" />
    </ModernCard>
  );
};

const QuickActionCard = ({ title, description, icon: Icon, onClick, variant = 'default' }) => {
  const variantClasses = {
    default: 'hover:from-[#dbeafe] hover:to-[#dbeafe] border-[#2563eb]/20',
    success: 'hover:from-[#d1fae5] hover:to-[#d1fae5] border-[#10b981]/20',
    warning: 'hover:from-yellow-50 hover:to-orange-50 border-yellow-200',
    danger: 'hover:from-red-50 hover:to-pink-50 border-red-200'
  };

  return (
    <ModernCard
      variant="subtle"
      className={cn(
        'cursor-pointer transition-all duration-300',
        'hover:scale-105 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]',
        variantClasses[variant]
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-[20px] bg-white shadow-sm">
          <Icon className="w-6 h-6 text-gray-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </ModernCard>
  );
};

const RecentActivityItem = ({ activity, time, type, status }) => {
  const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-[#10b981]', bg: 'bg-[#d1fae5]' },
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    urgent: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-3 p-3 rounded-[15px] hover:bg-gray-50 transition-colors duration-150">
      <div className={cn('p-2 rounded-full', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{activity}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
        {type}
      </span>
    </div>
  );
};

const ModernDashboard = ({ 
  stats = [],
  quickActions = [],
  recentActivities = [],
  className = '' 
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <ModernCard variant="elevated" className="h-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <QuickActionCard key={index} {...action} />
              ))}
            </div>
          </ModernCard>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <ModernCard variant="elevated" className="h-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentActivities.map((activity, index) => (
                <RecentActivityItem key={index} {...activity} />
              ))}
            </div>
          </ModernCard>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
