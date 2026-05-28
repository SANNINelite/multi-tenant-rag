import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { tenantService } from '../services/tenantService';
import AuthLayout from '../components/layout/AuthLayout';

const Signup = () => {
  const [tenantName, setTenantName] = useState('');
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
      // 1. Create Tenant (Workspace)
      const orgName = tenantName.trim() || `${name || 'User'}'s Personal Workspace`;
      const tenantData = await tenantService.createTenant({ name: orgName });
      
      // Handle the case where backend returns tenant directly or wrapped in data
      const tenantId = tenantData._id || tenantData.id;
      
      if (!tenantId) {
        throw new Error('Invalid response from workspace creation API');
      }
      
      // 2. Signup Admin User
      const authData = await authService.signup({
        name,
        email,
        password,
        tenantId
      });
      
      // 3. Login
      const personalTenantData = {
        id: tenantId,
        name: tenantData.name || orgName
      };
      localStorage.setItem(`personalTenant_${authData.user.id}`, JSON.stringify(personalTenantData));

      login(authData.token, authData.user, tenantData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to initialize workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Establish your organization's AI headquarters."
      subtitle="Create a secure workspace, ingest your institutional knowledge, and invite your team to collaborate."
    >
      <div className="bg-brand-panel p-8 sm:p-10 border border-brand-border rounded-sm shadow-2xl">
        <h2 className="text-2xl font-light text-brand-text mb-2">Initialize Workspace</h2>
        <p className="text-sm text-brand-muted mb-8">Set up your tenant and admin account.</p>
        
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-center text-red-400 text-sm rounded-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2">Organization Name</label>
            <input 
              type="text" 
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border p-3 text-brand-text focus:outline-none focus:border-brand-accent transition-colors"
              placeholder="e.g. Acme Corp (Optional)"
            />
          </div>
          <div className="pt-4 border-t border-brand-border/50">
            <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2">Admin Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border p-3 text-brand-text focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2">Admin Email</label>
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
            className="w-full bg-brand-accent text-brand-bg font-medium py-4 rounded-sm hover:bg-brand-accent-hover transition-colors disabled:opacity-50 mt-6 shadow-lg shadow-brand-accent/10"
          >
            {loading ? 'Initializing...' : 'Create Workspace'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-brand-muted">
          Looking to join a team? <Link to="/join" className="text-brand-text font-medium hover:text-brand-accent transition-colors">Enter Invite Code</Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Signup;
