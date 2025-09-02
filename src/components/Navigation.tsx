import React from 'react';
import { Home, Layers, Users, HelpCircle, User, Gift } from 'lucide-react';

export type Screen = 'main' | 'subscription' | 'support' | 'profile' | 'referrals';

interface NavigationProps {
  activeScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}

interface NavItem {
  id: Screen;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'main', icon: Home, label: 'Главная' },
  { id: 'subscription', icon: Layers, label: 'Тарифы' },
  { id: 'profile', icon: User, label: 'Профиль' },
  { id: 'referrals', icon: Gift, label: 'Рефералы' },
  { id: 'support', icon: HelpCircle, label: 'Поддержка' },
];

export const Navigation: React.FC<NavigationProps> = ({ activeScreen, onScreenChange }) => {
  const handleNavClick = (screenId: Screen) => {
    onScreenChange(screenId);
  };

  return (
    <div className="navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeScreen === item.id;
        
        return (
          <div
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            <Icon className="nav-icon" />
            <div className="nav-label">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
};