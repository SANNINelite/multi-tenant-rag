import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Database, Eye, Trash2, ArrowUpRight, Plus, Check, Loader, MessageSquare, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { documentService } from '../services/documentService';
import { conversationService } from '../services/conversationService';

const Library = () => {
  const { tenant } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab states: 'all' | 'recent' | 'unused' | 'used'
  const [activeTab, setActiveTab] = useState('all');
  
  // Attach dropdown visibility states
  const [activeAttachDocId, setActiveAttachDocId] = useState(null);
  const [attachingDocId, setAttachingDocId] = useState(null);

  useEffect(() => {
    const tenantId = tenant?.id || tenant?._id;
    if (tenantId) {
      fetchLibraryData(tenantId);
    }
  }, [tenant]);

  const fetchLibraryData = async (tenantId) => {
    try {
      setLoading(true);
      setError('');
      
      const tId = tenantId || tenant?.id || tenant?._id;
      // 1. Fetch tenant documents
      const docs = await documentService.getTenantDocuments(tId);
      
      // 2. Fetch conversations to check links and display selectors
      const convsData = await conversationService.getConversations();
      const convsList = convsData.conversations || [];
      
      setDocuments(docs || []);
      setConversations(convsList);
    } catch (err) {
      console.error('Failed to load document library:', err);
      setError('Failed to load document library assets.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action will erase all associated RAG vectors.`)) {
      return;
    }

    try {
      const tId = tenant?.id || tenant?._id;
      await documentService.deleteDocument(tId, docId);
      // Update local state
      setDocuments(prev => prev.filter(d => (d._id || d.id) !== docId));
      fetchLibraryData(tId); // refresh links
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document.');
    }
  };

  const handleStartChatWithDoc = async (docId) => {
    try {
      const conv = await conversationService.createConversation([docId]);
      navigate(`/workspace/${conv.conversation?._id || conv.conversation?.id}`);
    } catch (err) {
      console.error('Failed to launch chat:', err);
      alert('Failed to initialize conversation.');
    }
  };

  const handleAttachToConversation = async (docId, conversationId) => {
    setAttachingDocId(docId);
    try {
      await conversationService.addDocumentsToConversation(conversationId, [docId]);
      setActiveAttachDocId(null);
      alert('Successfully attached document to conversation.');
      fetchLibraryData(); // refresh mappings
    } catch (err) {
      console.error('Failed to attach document:', err);
      alert('Failed to attach document.');
    } finally {
      setAttachingDocId(null);
    }
  };

  // Helper to check which conversations are linked to a document
  const getLinkedConversations = (docId) => {
    return conversations.filter(c => 
      (c.documents || []).some(d => (d._id || d.id) === docId)
    );
  };

  // Filter logic based on active tab
  const getFilteredDocuments = () => {
    switch (activeTab) {
      case 'recent':
        // Sort by date desc and take top 4
        return [...documents]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 4);
      case 'unused':
        // Not linked to any conversation
        return documents.filter(d => getLinkedConversations(d._id || d.id).length === 0);
      case 'used':
        // Linked to 1 or more conversations
        return documents.filter(d => getLinkedConversations(d._id || d.id).length > 0);
      default:
        return documents;
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-brand-muted">Loading document library...</div>;
  }

  const filteredDocs = getFilteredDocuments();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight mb-2">Document Library</h1>
          <p className="text-brand-muted text-sm">Review, catalog, and bind your ingested knowledge assets inside <span className="text-brand-accent italic font-semibold">{tenant?.name}</span>.</p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-3 bg-brand-text text-brand-bg text-sm font-semibold rounded-sm hover:bg-white transition-all flex items-center gap-2 self-start md:self-auto shadow-md"
        >
          <Plus size={16} /> Ingest Knowledge
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-sm">
          {error}
        </div>
      )}

      {/* Tabs Switcher - Editorial style */}
      <div className="flex border-b border-brand-border/30 gap-6">
        {[
          { id: 'all', label: 'All Uploaded' },
          { id: 'recent', label: 'Recent Uploads' },
          { id: 'unused', label: 'Unused Documents' },
          { id: 'used', label: 'Used In Conversations' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === tab.id 
                ? 'text-brand-accent' 
                : 'text-brand-muted hover:text-brand-text'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent"></span>
            )}
          </button>
        ))}
      </div>

      {/* Document Inventory Grid */}
      {filteredDocs.length === 0 ? (
        <div className="py-20 text-center border border-brand-border/40 bg-brand-panel/20 rounded-sm flex flex-col items-center">
          <FileText size={48} className="text-brand-muted/40 mb-4 animate-pulse" />
          <h3 className="text-lg font-light text-brand-text mb-2">No documents cataloged</h3>
          <p className="text-brand-muted text-sm max-w-md">No assets found matching the selected filter category. Ingest new PDFs to initialize your knowledge base.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map(doc => {
            const id = doc._id || doc.id;
            const linkedConvs = getLinkedConversations(id);
            const isAttachOpen = activeAttachDocId === id;
            
            return (
              <div 
                key={id}
                className="bg-brand-panel border border-brand-border rounded-sm p-6 flex flex-col justify-between hover:border-brand-accent/40 transition-colors group relative"
              >
                <div>
                  {/* Title and Icon */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-sm bg-brand-bg border border-brand-border flex items-center justify-center text-brand-accent flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-brand-text truncate group-hover:text-brand-accent transition-colors" title={doc.title}>
                        {doc.title}
                      </h3>
                      <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">
                        PDF Context
                      </p>
                    </div>
                  </div>

                  {/* Metadata Stats */}
                  <div className="space-y-2 border-t border-b border-brand-border/40 py-3 my-4 text-xs">
                    <div className="flex items-center justify-between text-brand-muted">
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> Uploaded</span>
                      <span className="text-brand-text">{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-brand-muted">
                      <span className="flex items-center gap-1.5"><Briefcase size={12} /> Workspace</span>
                      <span className="text-brand-text truncate max-w-[120px]">{tenant?.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-brand-muted">
                      <span className="flex items-center gap-1.5"><MessageSquare size={12} /> Attached Chats</span>
                      <span className="text-brand-text">{linkedConvs.length} chat{linkedConvs.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Linked chats display */}
                  {linkedConvs.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider block mb-1.5">Active inside chats:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                        {linkedConvs.map(c => (
                          <span 
                            key={c._id || c.id} 
                            onClick={() => navigate(`/workspace/${c._id || c.id}`)}
                            className="text-[9px] bg-brand-bg border border-brand-border text-brand-accent hover:border-brand-accent px-2 py-0.5 rounded-full cursor-pointer transition-colors max-w-[100px] truncate"
                          >
                            {c.documents?.map(d => d.title).join(', ') || 'Chat'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Drawer/Controls */}
                <div className="space-y-3 pt-3 border-t border-brand-border/30">
                  
                  {isAttachOpen ? (
                    <div className="bg-brand-bg/50 border border-brand-border p-2.5 rounded-sm space-y-2">
                      <span className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider block">Bind to chat session</span>
                      
                      {conversations.length === 0 ? (
                        <p className="text-[10px] text-brand-muted italic">No active conversations. Start one first.</p>
                      ) : (
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                          {conversations
                            // filter out already attached
                            .filter(c => !linkedConvs.some(lc => (lc._id || lc.id) === (c._id || c.id)))
                            .map(c => {
                              const cId = c._id || c.id;
                              return (
                                <button
                                  key={cId}
                                  onClick={() => handleAttachToConversation(id, cId)}
                                  disabled={attachingDocId === id}
                                  className="w-full text-left text-[10px] hover:text-brand-accent p-1 border-b border-brand-border/30 truncate block"
                                >
                                  {c.documents?.map(d => d.title).join(', ') || 'Open Chat'}
                                </button>
                              );
                            })
                          }
                          {conversations.filter(c => !linkedConvs.some(lc => (lc._id || lc.id) === (c._id || c.id))).length === 0 && (
                            <p className="text-[10px] text-brand-muted italic">Already bound to all active chat sessions.</p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => setActiveAttachDocId(null)}
                        className="text-[9px] text-brand-muted hover:text-brand-text font-medium block mt-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      
                      <button
                        onClick={() => handleStartChatWithDoc(id)}
                        className="flex-1 flex items-center gap-1.5 justify-center py-2 bg-brand-bg border border-brand-border hover:border-brand-accent hover:text-brand-accent text-xs font-semibold text-brand-text rounded-sm transition-all"
                        title="Start Chat with PDF"
                      >
                        <ArrowUpRight size={13} /> Chat Context
                      </button>

                      <button
                        onClick={() => setActiveAttachDocId(id)}
                        className="px-3 py-2 bg-brand-bg border border-brand-border hover:border-brand-accent text-xs font-semibold text-brand-text rounded-sm transition-colors"
                        title="Attach to Conversation"
                      >
                        <Plus size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteDocument(id, doc.title)}
                        className="px-3 py-2 bg-brand-bg border border-brand-border hover:border-red-500/20 hover:text-red-400 text-brand-muted rounded-sm transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 size={13} />
                      </button>

                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default Library;
