import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, MessageSquare, Mail, Volume2,
  Code, Settings, CreditCard, Mouse,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTimeTheme } from '../../hooks/useTimeTheme';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard', end: true },
  { to: '/dashboard/chatbot', icon: MessageSquare, label: 'Chatbot' },
  { to: '/dashboard/email', icon: Mail, label: 'Email Responder' },
  { to: '/dashboard/tts', icon: Volume2, label: 'Text-to-Speech' },
  { to: '/dashboard/uat', icon: Mouse, label: 'User Attention' },
  { to: '/dashboard/integrations', icon: Code, label: 'Integrations' },
  { to: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const theme = useTimeTheme();
  const isDark = theme === 'dark';

  const bg = isDark
    ? 'bg-gradient-to-b from-gray-950 via-gray-900 to-slate-950 border-white/10'
    : 'bg-gradient-to-b from-slate-50 via-white to-blue-50 border-gray-200';
  const activeItem = isDark
    ? 'bg-indigo-500/20 text-indigo-300 border-r-2 border-indigo-400'
    : 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600';
  const inactiveItem = isDark
    ? 'text-white/60 hover:bg-white/8 hover:text-white'
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

  return (
    <aside
      className={`
        relative flex-shrink-0 border-r min-h-screen
        transition-all duration-300
        ${bg}
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`
          absolute -right-4 top-5
          flex items-center justify-center
          w-8 h-8 rounded-full
          border-2 shadow-md
          z-10 cursor-pointer
          transition-all duration-200
          active:scale-90
          ${isDark
            ? 'bg-gray-800 border-gray-600 text-white/80 hover:bg-indigo-600 hover:border-indigo-400 hover:text-white'
            : 'bg-white border-gray-300 text-gray-500 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white'
          }
        `}
      >
        {collapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronLeft size={14} strokeWidth={2.5} />}
      </button>

      <nav className="p-3 space-y-1 pt-4">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg
               transition-all duration-200 cursor-pointer
               ${isActive ? activeItem : inactiveItem}
               ${collapsed ? 'justify-center' : ''}
              `
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <span className="font-medium text-sm truncate">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;