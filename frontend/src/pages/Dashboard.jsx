import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { conversationService } from '../services/conversationService';
import { MessageSquare, Clock, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { tenant } = useAuth();
  const [recentConversations, setRecentConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!tenant) return;
      try {
        setLoading(true);
        const data = await conversationService.getConversations();
        setRecentConversations((data.conversations || []).slice(0, 5)); // Just take top 5 for dashboard
      } catch (err) {
        console.error('Failed to fetch conversations', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConversations();
  }, [tenant]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-light tracking-tight mb-8">Workspace Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Quick Action Cards */}
        <div className="bg-brand-panel p-6 border border-brand-border rounded-sm hover:border-brand-accent/50 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-brand-bg flex items-center justify-center text-brand-accent mb-4 group-hover:bg-brand-accent group-hover:text-brand-bg transition-colors">
            <FileText size={20} />
          </div>
          <h3 className="text-lg font-medium text-brand-text mb-2">Upload Document</h3>
          <p className="text-sm text-brand-muted mb-4">Ingest new knowledge into your workspace.</p>
          <Link to="/upload" className="text-sm text-brand-accent flex items-center gap-2 group-hover:underline">
            Go to Upload <ArrowRight size={14} />
          </Link>
        </div>
        
        <div className="bg-brand-panel p-6 border border-brand-border rounded-sm hover:border-brand-accent/50 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-brand-bg flex items-center justify-center text-brand-accent mb-4 group-hover:bg-brand-accent group-hover:text-brand-bg transition-colors">
            <MessageSquare size={20} />
          </div>
          <h3 className="text-lg font-medium text-brand-text mb-2">Start Chat</h3>
          <p className="text-sm text-brand-muted mb-4">Engage with your uploaded documents.</p>
          <Link to="/workspace" className="text-sm text-brand-accent flex items-center gap-2 group-hover:underline">
            Open Workspace <ArrowRight size={14} />
          </Link>
        </div>
        
        <div className="bg-brand-panel p-6 border border-brand-border rounded-sm">
          <h3 className="text-lg font-medium text-brand-text mb-2">System Status</h3>
          <p className="text-sm text-brand-muted mb-4">All services are operating nominally.</p>
          <div className="flex items-center gap-2 text-sm text-green-500/80">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Online
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-light tracking-tight mb-6 flex items-center gap-3">
        <Clock size={20} className="text-brand-muted" />
        Recent Intelligence
      </h2>
      
      <div className="bg-brand-panel border border-brand-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-brand-muted">Loading history...</div>
        ) : recentConversations.length === 0 ? (
          <div className="p-8 text-center text-brand-muted flex flex-col items-center">
            <MessageSquare size={32} className="mb-4 opacity-50" />
            <p>No conversations found.</p>
            <Link to="/upload" className="text-brand-accent hover:underline mt-2">Upload a document to start</Link>
          </div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {recentConversations.map((conv) => (
              <li key={conv._id || conv.id} className="p-4 hover:bg-brand-hover transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-sm bg-brand-bg flex items-center justify-center text-brand-muted">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-brand-text truncate max-w-xs sm:max-w-md font-serif" title={conv.title || (conv.documents && conv.documents.length > 0 ? conv.documents.map(d => d.title).join(', ') : 'Intelligence Session')}>
                      {conv.title || (conv.documents && conv.documents.length > 0 
                        ? `${conv.documents[0].title}${conv.documents.length > 1 ? ` (+${conv.documents.length - 1} more)` : ''}`
                        : 'Intelligence Session')}
                    </h4>
                    <p className="text-xs text-brand-muted mt-1">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link 
                  to={`/workspace/${conv._id || conv.id}`}
                  className="px-4 py-2 text-xs font-medium border border-brand-border text-brand-text rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:border-brand-accent hover:text-brand-accent"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
