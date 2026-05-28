import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { tenantService } from '../services/tenantService';
import AuthLayout from '../components/layout/AuthLayout';

const Join = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // 1. Create a new Personal Workspace for the user
      const personalOrgName = `${name || 'User'}'s Personal Workspace`;
      const personalTenantData = await tenantService.createTenant({ name: personalOrgName });
      
      const personalTenantId = personalTenantData._id || personalTenantData.id;
      if (!personalTenantId) {
        throw new Error('Failed to create personal workspace');
      }

      // 2. Sign up user under their personal workspace
      const authData = await authService.signup({
        name,
        email,
        password,
        tenantId: personalTenantId
      });
      
      const userId = authData.user.id || authData.user._id;

      // 3. Store Personal Workspace metadata in localStorage as their "Private Space"
      const personalTenantInfo = {
        id: personalTenantId,
        name: personalTenantData.name || personalOrgName
      };
      localStorage.setItem(`personalTenant_${userId}`, JSON.stringify(personalTenantInfo));

      // 4. Temporarily write signup token to local storage so that switchWorkspace request can authorize correctly
      localStorage.setItem('token', authData.token);

      // 5. Join/Switch to the existing shared workspace
      const switchData = await authService.switchWorkspace(inviteCode.trim());
      
      const sharedTenantData = switchData.tenant || { id: inviteCode.trim(), name: "Shared Workspace" };

      // 6. Record joined workspace in their collaborative shared workspaces list
      const joinedData = {
        id: sharedTenantData.id || sharedTenantData._id || inviteCode.trim(),
        name: sharedTenantData.name || "Shared Workspace"
      };
      localStorage.setItem(`joinedWorkspaces_${userId}`, JSON.stringify([joinedData]));

      // 7. Login with active shared workspace session
      login(switchData.token, switchData.user, sharedTenantData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to join workspace. Ensure your invite code is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Join your team's intelligence hub."
      subtitle="Access shared organizational memory, chat with context, and collaborate seamlessly."
    >
      <div className="bg-brand-panel p-8 sm:p-10 border border-brand-border rounded-sm shadow-2xl">
        <h2 className="text-2xl font-light text-brand-text mb-2">Join Workspace</h2>
        <p className="text-sm text-brand-muted mb-8">Enter your invite code to access the organization.</p>
        
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-center text-red-400 text-sm rounded-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2">Invite Code</label>
            <input 
              type="text" 
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border p-3 text-brand-text focus:outline-none focus:border-brand-accent transition-colors font-mono tracking-widest"
              placeholder="e.g. org-12345"
            />
            <p className="text-xs text-brand-muted mt-2">Ask your workspace admin for the unique invite code.</p>
          </div>
          <div className="pt-4 border-t border-brand-border/50">
            <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2">Your Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border p-3 text-brand-text focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2">Your Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border p-3 text-brand-text focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border p-3 text-brand-text focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-text text-brand-bg font-medium py-4 rounded-sm hover:bg-white transition-colors disabled:opacity-50 mt-6 shadow-lg"
          >
            {loading ? 'Authenticating...' : 'Access Workspace'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-brand-muted flex flex-col gap-2">
          <div>
            Already a member? <Link to="/login" className="text-brand-text font-medium hover:text-brand-accent transition-colors">Sign in</Link>
          </div>
          <div>
            Want your own workspace? <Link to="/signup" className="text-brand-text font-medium hover:text-brand-accent transition-colors">Create one</Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Join;
