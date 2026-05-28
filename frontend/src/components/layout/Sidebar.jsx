import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, MessageSquare, Settings, Users, Building2, ChevronDown, Check, ArrowRight, FileText, Trash2, Globe, Shield, Users2, X, Loader, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { tenantService } from '../../services/tenantService';

const Sidebar = () => {
  const { user, tenant, login } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [workspaceCode, setWorkspaceCode] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinedWorkspaces, setJoinedWorkspaces] = useState([]);
  const [personalWorkspace, setPersonalWorkspace] = useState(null);
  const navigate = useNavigate();

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const handleOpenMembersModal = async () => {
    const activeTenantId = tenant?.id || tenant?._id;
    if (!activeTenantId) return;

    setShowMembersModal(true);
    setLoadingMembers(true);
    try {
      const data = await tenantService.getTenantMembers(activeTenantId);
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to load workspace members', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const userId = user?.id || user?._id || 'guest';
  const personalTenantKey = `personalTenant_${userId}`;
  const joinedWorkspacesKey = `joinedWorkspaces_${userId}`;

  // Load and sync joined workspaces history and personal workspace
  useEffect(() => {
    if (!userId) return;

    // 1. Load personal workspace
    const storedPersonal = localStorage.getItem(personalTenantKey);
    let personal = null;
    if (storedPersonal) {
      try {
        personal = JSON.parse(storedPersonal);
        setPersonalWorkspace(personal);
      } catch (e) {
        console.error('Failed to parse personal workspace');
      }
    } else if (tenant) {
      // Fallback: Set current tenant as personal if nothing is stored yet
      const activeId = tenant.id || tenant._id;
      if (activeId) {
        const personalData = { id: activeId, name: tenant.name };
        localStorage.setItem(personalTenantKey, JSON.stringify(personalData));
        setPersonalWorkspace(personalData);
      }
    }

    // 2. Load joined workspaces
    const storedList = localStorage.getItem(joinedWorkspacesKey);
    let list = [];
    if (storedList) {
      try {
        const parsed = JSON.parse(storedList);
        if (Array.isArray(parsed)) {
          list = parsed;
        }
      } catch (e) {
        list = [];
      }
    }
    
    // Auto-append active workspace to list if not present
    if (tenant) {
      const activeId = tenant.id || tenant._id;
      if (activeId && Array.isArray(list) && !list.some(item => item && (item.id || item._id) === activeId)) {
        list.push({
          id: activeId,
          name: tenant.name
        });
        localStorage.setItem(joinedWorkspacesKey, JSON.stringify(list));
      }
    }
    
    setJoinedWorkspaces(Array.isArray(list) ? list : []);
  }, [tenant, userId]);

  const handleSwitchWorkspace = async (e) => {
    e.preventDefault();
    if (!workspaceCode.trim()) return;
    setLoading(true);
    setError('');

    try {
      const data = await authService.switchWorkspace(workspaceCode.trim());
      
      // Append new workspace to history list
      const activeId = data.tenant.id || data.tenant._id;
      let updatedList = [...joinedWorkspaces];
      if (!updatedList.some(item => (item.id || item._id) === activeId)) {
        updatedList.push({
          id: activeId,
          name: data.tenant.name
        });
        localStorage.setItem(joinedWorkspacesKey, JSON.stringify(updatedList));
      }

      // Update global Auth Context
      login(data.token, data.user, data.tenant);
      setWorkspaceCode('');
      setShowSwitcher(false);
      
      // Navigate to dashboard and refresh state
      navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch workspace. Ensure the invite code is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = async (targetId) => {
    setLoading(true);
    setError('');

    try {
      const data = await authService.switchWorkspace(targetId);
      login(data.token, data.user, data.tenant);
      setShowSwitcher(false);
      
      // Navigate and reload
      navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      setError('Failed to switch to selected workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSharedWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setLoading(true);
    setError('');

    try {
      const newTenant = await tenantService.createTenant({ name: newWorkspaceName.trim() });
      const newTenantId = newTenant.id || newTenant._id;

      if (!newTenantId) {
        throw new Error('Failed to create new collaborative workspace.');
      }

      const data = await authService.switchWorkspace(newTenantId);
      
      let updatedList = [...joinedWorkspaces];
      if (!updatedList.some(item => (item.id || item._id) === newTenantId)) {
        updatedList.push({
          id: newTenantId,
          name: data.tenant.name
        });
        localStorage.setItem(joinedWorkspacesKey, JSON.stringify(updatedList));
      }

      login(data.token, data.user, data.tenant);
      setNewWorkspaceName('');
      setShowSwitcher(false);

      navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create workspace.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromHistory = (targetId, e) => {
    e.stopPropagation();
    const updated = joinedWorkspaces.filter(item => (item.id || item._id) !== targetId);
    setJoinedWorkspaces(updated);
    localStorage.setItem(joinedWorkspacesKey, JSON.stringify(updated));
  };

  const currentTenantId = tenant?.id || tenant?._id;
  const personalTenantId = personalWorkspace?.id || personalWorkspace?._id;

  // Filter out personal workspace from joined collaborative history list
  const collaborativeWorkspaces = joinedWorkspaces.filter(item => {
    const id = item.id || item._id;
    return id !== personalTenantId;
  });

  return (
    <aside className="w-68 bg-brand-panel border-r border-brand-border flex flex-col">
      {/* Workspace Header & Selector */}
      <div className="border-b border-brand-border p-4">
        <div 
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="flex items-center justify-between p-2 hover:bg-brand-hover rounded-sm cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 truncate">
            <div className="w-8 h-8 rounded-sm bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent flex-shrink-0">
              <Building2 size={16} />
            </div>
            <div className="text-sm tracking-wider font-semibold text-brand-text truncate">
              {tenant?.name || 'Workspace'}
            </div>
          </div>
          <ChevronDown size={14} className={`text-brand-muted transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
        </div>

        {/* Switcher Form Drawer */}
        {showSwitcher && (
          <div className="mt-4 p-3 bg-brand-bg/50 border border-brand-border rounded-sm space-y-4">
            
            {/* 1. Private Personal Workspace Section */}
            {personalWorkspace && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider flex items-center gap-1"><Shield size={10} /> Private Space</span>
                <div
                  onClick={() => currentTenantId !== personalTenantId && handleQuickSwitch(personalTenantId)}
                  className={`p-2 rounded-sm flex items-center justify-between text-xs transition-all ${
                    currentTenantId === personalTenantId
                      ? 'bg-brand-hover/80 border border-brand-accent/30 text-brand-accent cursor-default font-medium' 
                      : 'hover:bg-brand-hover text-brand-text cursor-pointer border border-transparent'
                  }`}
                >
                  <span className="truncate">{personalWorkspace.name || "Personal Workspace"}</span>
                  {currentTenantId === personalTenantId && <Check size={12} className="text-brand-accent shrink-0" />}
                </div>
              </div>
            )}

            {/* 2. Collaborative Workspaces History Section */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider flex items-center gap-1"><Users2 size={10} /> Shared Spaces</span>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {collaborativeWorkspaces.length === 0 ? (
                  <p className="text-[10px] text-brand-muted italic px-2 py-1">No shared workspaces linked yet.</p>
                ) : (
                  collaborativeWorkspaces.map(item => {
                    const id = item.id || item._id;
                    const isActive = id === currentTenantId;
                    return (
                      <div
                        key={id}
                        onClick={() => !isActive && handleQuickSwitch(id)}
                        className={`p-2 rounded-sm flex items-center justify-between text-xs transition-colors group ${
                          isActive 
                            ? 'bg-brand-hover/80 border border-brand-accent/30 text-brand-accent cursor-default font-medium' 
                            : 'hover:bg-brand-hover text-brand-text cursor-pointer border border-transparent'
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">{item.name}</span>
                        <div className="flex items-center gap-1.5">
                          {isActive && <Check size={12} className="text-brand-accent shrink-0" />}
                          {!isActive && (
                            <button
                              onClick={(e) => handleRemoveFromHistory(id, e)}
                              className="p-0.5 hover:bg-brand-hover text-brand-muted hover:text-red-400 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from switcher list"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Input Form Section */}
            <div className="pt-3 border-t border-brand-border/40 space-y-2">
              <span className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider block">Link Another Workspace</span>
              <form onSubmit={handleSwitchWorkspace} className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={workspaceCode}
                    onChange={(e) => setWorkspaceCode(e.target.value)}
                    placeholder="Enter Invite Code"
                    className="w-full bg-brand-panel border border-brand-border text-xs text-brand-text rounded-sm py-2 px-2 pr-8 focus:outline-none focus:border-brand-accent transition-colors font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading || !workspaceCode.trim()}
                    className="absolute right-1.5 p-1 text-brand-muted hover:text-brand-accent transition-colors disabled:opacity-50"
                    title="Switch workspace"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            </div>

            {/* 4. Create Workspace Section */}
            <div className="pt-3 border-t border-brand-border/40 space-y-2">
              <span className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider block">Create Shared Workspace</span>
              <form onSubmit={handleCreateSharedWorkspace} className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Workspace Name"
                    className="w-full bg-brand-panel border border-brand-border text-xs text-brand-text rounded-sm py-2 px-2 pr-8 focus:outline-none focus:border-brand-accent transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newWorkspaceName.trim()}
                    className="absolute right-1.5 p-1 text-brand-muted hover:text-brand-accent transition-colors disabled:opacity-50"
                    title="Create workspace"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </form>
            </div>
            {error && <p className="text-[10px] text-red-400 leading-snug">{error}</p>}
            <p className="text-[9px] text-brand-muted leading-relaxed">
              Teammates can copy their workspace invite code in the top bar to share.
            </p>
          </div>
        )}
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto">
        <div className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2 px-2 mt-2">Intelligence Base</div>
        
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${isActive ? 'bg-brand-hover text-brand-text' : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover/50'}`
          }
        >
          <LayoutDashboard size={18} />
          <span className="font-medium text-sm">Dashboard</span>
        </NavLink>
        
        <NavLink 
          to="/workspace" 
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${isActive ? 'bg-brand-hover text-brand-text' : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover/50'}`
          }
        >
          <MessageSquare size={18} />
          <span className="font-medium text-sm">Chat Workspace</span>
        </NavLink>

        <NavLink 
          to="/library" 
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${isActive ? 'bg-brand-hover text-brand-text' : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover/50'}`
          }
        >
          <FileText size={18} />
          <span className="font-medium text-sm">Document Library</span>
        </NavLink>

        <div className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2 px-2 mt-6">Organization</div>

        <NavLink 
          to="/upload" 
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${isActive ? 'bg-brand-hover text-brand-text' : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover/50'}`
          }
        >
          <UploadCloud size={18} />
          <span className="font-medium text-sm">Ingest Documents</span>
        </NavLink>
        
        <button 
          className="flex items-center gap-3 px-3 py-2 rounded-sm transition-colors text-brand-muted hover:text-brand-text hover:bg-brand-hover/50 text-left w-full"
          onClick={handleOpenMembersModal}
        >
          <Users size={18} />
          <span className="font-medium text-sm">Team Members</span>
        </button>
      </nav>
      
      {/* Workspace Settings Footer */}
      <div className="p-4 border-t border-brand-border">
        <NavLink 
          to="/settings" 
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${isActive ? 'bg-brand-hover text-brand-text' : 'text-brand-muted hover:text-brand-text hover:bg-brand-hover/50'}`
          }
        >
          <Settings size={18} />
          <span className="font-medium text-sm">Workspace Settings</span>
        </NavLink>
      </div>

      {/* Team Members Modal Overlay */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-panel border border-brand-border rounded-sm w-full max-w-md flex flex-col p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowMembersModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-brand-hover text-brand-muted hover:text-brand-text rounded-sm transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-light text-brand-text mb-1">Team Members</h3>
            <p className="text-xs text-brand-muted mb-6">Users who have joined {tenant?.name || 'this workspace'}.</p>

            {loadingMembers ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-brand-muted">
                <Loader size={24} className="animate-spin text-brand-accent" />
                <span className="text-xs">Fetching registry...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-72 space-y-3 mb-6 pr-1">
                {members.length === 0 ? (
                  <p className="text-xs text-brand-muted italic text-center py-6">No users cataloged.</p>
                ) : (
                  members.map(member => (
                    <div key={member.id} className="p-3 border border-brand-border/40 rounded-sm bg-brand-bg/20 flex items-center justify-between">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-sm bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent text-xs font-semibold shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-brand-text truncate">{member.name}</p>
                          <p className="text-[10px] text-brand-muted truncate">{member.email}</p>
                        </div>
                      </div>
                      {((user?.role === 'owner' && member.role !== 'owner') || 
                        (user?.role === 'admin' && member.role !== 'owner' && member.role !== 'admin' && member.id !== userId)) ? (
                        <select
                          value={member.role || 'member'}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            const activeTenantId = tenant?.id || tenant?._id;
                            try {
                              await tenantService.updateMemberRole(activeTenantId, member.id, newRole);
                              // Dynamically re-fetch members list to keep state in sync
                              const data = await tenantService.getTenantMembers(activeTenantId);
                              setMembers(data || []);
                            } catch (err) {
                              alert(err.response?.data?.message || 'Failed to update member role.');
                            }
                          }}
                          className="bg-brand-panel border border-brand-border text-brand-text text-[11px] font-semibold rounded-sm p-1.5 focus:outline-none focus:border-brand-accent cursor-pointer"
                        >
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                          <option value="viewer">viewer</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                          member.role === 'admin' || member.role === 'owner'
                            ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/30' 
                            : 'bg-brand-panel text-brand-muted border-brand-border'
                        }`}>
                          {member.role || 'member'}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Quick Share Code */}
            <div className="p-3 bg-brand-bg/40 border border-brand-border rounded-sm flex items-center justify-between">
              <div className="truncate pr-3">
                <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Invite Code</p>
                <p className="text-xs font-mono text-brand-text truncate mt-0.5">{tenant?.id || tenant?._id || 'N/A'}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tenant?.id || tenant?._id || '');
                  alert('Invite code copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-brand-panel hover:bg-brand-hover border border-brand-border text-brand-accent hover:text-brand-text text-[11px] font-semibold rounded-sm transition-all"
              >
                Copy Code
              </button>
            </div>

            <div className="pt-4 border-t border-brand-border/50 mt-6 flex items-center justify-end">
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-5 py-2 bg-brand-text text-brand-bg hover:bg-white text-xs font-semibold rounded-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
