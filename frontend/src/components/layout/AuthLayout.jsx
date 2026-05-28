import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, title, subtitle, illustration }) => {
  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Left side: Branding / Value Prop */}
      <div className="hidden lg:flex w-1/2 bg-brand-panel border-r border-brand-border flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-accent/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10">
          <Link to="/" className="text-2xl tracking-wider font-semibold text-brand-accent">
            Multi-Tenant RAG
          </Link>
        </div>
        
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-light text-brand-text mb-6 leading-tight">
            {title || "A private AI operating system for elite teams."}
          </h1>
          <p className="text-lg text-brand-muted font-light leading-relaxed">
            {subtitle || "Collaborative intelligence, institutional memory, and secure contextual retrieval in one workspace."}
          </p>
        </div>
        
        <div className="relative z-10 text-xs tracking-widest text-brand-muted uppercase">
          Enterprise Grade • Multi-Tenant Architecture
        </div>
      </div>
      
      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-12 text-center">
            <Link to="/" className="text-2xl tracking-wider font-semibold text-brand-accent">
              Multi-Tenant RAG
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
