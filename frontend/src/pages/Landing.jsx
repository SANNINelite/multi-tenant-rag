import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Building } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full relative z-10">
        <div className="text-xl tracking-wider font-semibold text-brand-accent">
          Multi-Tenant RAG
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="px-5 py-2 text-sm font-medium text-brand-muted hover:text-brand-text transition-colors">
            Sign In
          </Link>
          <Link to="/signup" className="px-5 py-2 text-sm font-medium border border-brand-border rounded-sm hover:border-brand-accent transition-colors">
            Create Workspace
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-5xl mx-auto relative z-10 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-8">
            Organizational Memory. <br/>
            <span className="text-brand-muted">Elevated.</span>
          </h1>
          <p className="text-lg md:text-xl text-brand-muted font-light mb-12 max-w-2xl mx-auto leading-relaxed">
            A secure, multi-tenant AI RAG platform designed for elite teams. Share documents, build collective intelligence, and converse with context in a private workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Create Workspace Card */}
          <div className="group bg-brand-panel border border-brand-border rounded-sm p-8 hover:border-brand-accent/50 transition-all duration-300 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Building size={120} />
            </div>
            <div className="w-12 h-12 rounded-sm bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent mb-6">
              <Building size={24} />
            </div>
            <h2 className="text-2xl font-light mb-3">Create Workspace</h2>
            <p className="text-brand-muted mb-8 flex-1">
              Initialize a new isolated environment for your organization. Upload documents and invite your team to collaborate.
            </p>
            <Link to="/signup" className="inline-block text-center w-full px-6 py-4 bg-brand-accent text-brand-bg font-medium rounded-sm hover:bg-brand-accent-hover transition-colors shadow-lg shadow-brand-accent/10">
              Initialize Organization
            </Link>
          </div>

          {/* Join Workspace Card */}
          <div className="group bg-brand-panel border border-brand-border rounded-sm p-8 hover:border-brand-accent/50 transition-all duration-300 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={120} />
            </div>
            <div className="w-12 h-12 rounded-sm bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent mb-6">
              <Users size={24} />
            </div>
            <h2 className="text-2xl font-light mb-3">Join Workspace</h2>
            <p className="text-brand-muted mb-8 flex-1">
              Have an invite code? Join your team's existing workspace to access shared intelligence and documents.
            </p>
            <Link to="/join" className="inline-block text-center w-full px-6 py-4 bg-brand-bg border border-brand-border text-brand-text font-medium rounded-sm hover:border-brand-accent hover:text-brand-accent transition-colors">
              Enter Invite Code
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
