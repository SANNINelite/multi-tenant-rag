import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import UploadPage from '../pages/Upload';
import Workspace from '../pages/Workspace';

import Join from '../pages/Join';
import Library from '../pages/Library';

import ProtectedRoute from './ProtectedRoute';
import PageLayout from '../components/layout/PageLayout';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/join" element={<Join />} />
      
      {/* Protected Routes wrapped in PageLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PageLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/workspace/:conversationId" element={<Workspace />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-light tracking-tight mb-8">Settings</h1>
              <div className="bg-brand-panel p-8 border border-brand-border text-brand-muted">
                Settings module initialization pending...
              </div>
            </div>
          } />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRouter;
