import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import AuthLayout from '../components/layout/AuthLayout';

const Login = () => {
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
      const authData = await authService.login({ email, password });
      
      // Pass the backend-supplied real tenant details, falling back if not present.
      const tenantData = authData.tenant || { id: authData.user.tenantId, name: "Workspace" };
      
      // Keep track of personal tenant fallback
      const key = `personalTenant_${authData.user.id || authData.user._id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(tenantData));
      }
      
      login(authData.token, authData.user, tenantData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Access your workspace."
      subtitle="Log in to engage with your organization's collective intelligence."
    >
      <div className="bg-brand-panel p-8 sm:p-10 border border-brand-border rounded-sm shadow-2xl">
        <h2 className="text-2xl font-light text-brand-text mb-8">Authenticate</h2>
        
        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-center text-red-400 text-sm rounded-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2">Email Address</label>
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
            className="w-full bg-brand-text text-brand-bg font-medium py-4 rounded-sm hover:bg-white transition-colors disabled:opacity-50 mt-6 shadow-lg shadow-brand-text/10"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-brand-muted">
          New to Multi-Tenant RAG? <Link to="/signup" className="text-brand-text font-medium hover:text-brand-accent transition-colors">Create Workspace</Link>
          <span className="mx-2">•</span>
          <Link to="/join" className="text-brand-text font-medium hover:text-brand-accent transition-colors">Join Existing</Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
