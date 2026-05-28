import React from 'react';
import { LogOut, User, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TopBar = () => {
  const { user, tenant, logout } = useAuth();

  const handleCopyInvite = () => {
    // In a real app, this would be a proper invite link or code generator
    // For now, we'll just copy the tenantId which acts as the invite code
    if (tenant?.id || tenant?._id) {
      navigator.clipboard.writeText(tenant.id || tenant._id);
      alert('Invite code copied to clipboard!');
    } else if (user?.tenantId) {
      navigator.clipboard.writeText(user.tenantId);
      alert('Invite code copied to clipboard!');
    }
  };

  return (
    <header className="h-16 bg-brand-bg border-b border-brand-border flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-brand-muted uppercase tracking-wider hidden md:block">
          Shared Organizational Knowledge Base
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button 
          onClick={handleCopyInvite}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand-accent border border-brand-accent/30 rounded-sm hover:bg-brand-accent/10 transition-colors"
        >
          <LinkIcon size={14} />
          Copy Invite Code
        </button>

        <div className="h-6 w-px bg-brand-border hidden md:block"></div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-panel border border-brand-border flex items-center justify-center text-brand-accent">
            <User size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-brand-text leading-tight">{user?.name || 'User'}</span>
            <span className="text-[10px] text-brand-muted uppercase tracking-wider">{user?.role || 'Admin'}</span>
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="text-brand-muted hover:text-brand-text transition-colors p-2"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
