import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, FileText, Bot, User as UserIcon, Plus, Upload, X, Check, Loader, ChevronDown, Edit3, FolderOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { conversationService } from '../services/conversationService';
import { documentService } from '../services/documentService';
import { chatService } from '../services/chatService';

const Workspace = () => {
  const { tenant } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Attachment Modal / Drawer states
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [workspaceDocs, setWorkspaceDocs] = useState([]);
  const [selectedAttachDocIds, setSelectedAttachDocIds] = useState([]);
  const [attaching, setAttaching] = useState(false);
  
  // Dynamic upload states in Modal
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renamingLoading, setRenamingLoading] = useState(false);

  const handleRenameActiveConversation = async (e) => {
    e.preventDefault();
    if (!renameTitle.trim() || !activeConversation) return;

    setRenamingLoading(true);
    try {
      const activeId = activeConversation._id || activeConversation.id;
      const data = await conversationService.updateConversation(activeId, renameTitle.trim());
      
      setConversations(prev => prev.map(c => {
        const id = c._id || c.id;
        if (id === activeId) {
          return { ...c, title: data.conversation.title };
        }
        return c;
      }));
      
      setActiveConversation(prev => ({ ...prev, title: data.conversation.title }));
      setIsRenaming(false);
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    } finally {
      setRenamingLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id || tenant?._id) {
      fetchConversations();
    }
  }, [tenant]);

  useEffect(() => {
    if (conversations.length > 0) {
      if (conversationId) {
        const conv = conversations.find(c => (c._id || c.id) === conversationId);
        if (conv) {
          setActiveConversation(conv);
          setMessages(conv.messages || []);
          setRenameTitle(conv.title || '');
        }
      } else {
        // Auto select first if none specified
        const first = conversations[0];
        navigate(`/workspace/${first._id || first.id}`, { replace: true });
      }
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const fetchConversations = async () => {
    try {
      const data = await conversationService.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim() || sending || !activeConversation) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setSending(true);

    try {
      const data = await chatService.askQuestion(activeConversation._id || activeConversation.id, userMessage.content);
      
      const aiMessage = { role: 'assistant', content: data.answer };
      setMessages(prev => [...prev, aiMessage]);
      
      // Update local conversations tree so state persists
      setConversations(prev => prev.map(c => {
        const id = c._id || c.id;
        const activeId = activeConversation._id || activeConversation.id;
        if (id === activeId) {
          return { ...c, messages: [...c.messages || [], userMessage, aiMessage] };
        }
        return c;
      }));
      
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  // Attach Modal Logic
  const handleOpenAttachModal = async () => {
    if (!tenant?.id || !activeConversation) return;
    setShowAttachModal(true);
    setSelectedAttachDocIds([]);
    setUploadFile(null);
    setUploadError(null);
    
    try {
      // 1. Fetch all tenant documents
      const docs = await documentService.getTenantDocuments(tenant.id);
      
      // 2. Filter out documents already attached to this active conversation
      const activeDocIds = (activeConversation.documents || []).map(d => d._id || d.id);
      const availableDocs = docs.filter(d => !activeDocIds.includes(d._id || d.id));
      
      setWorkspaceDocs(availableDocs);
    } catch (err) {
      console.error('Failed to load workspace assets for attachment:', err);
    }
  };

  const handleToggleAttachSelect = (id) => {
    setSelectedAttachDocIds(prev =>
      prev.includes(id) ? prev.filter(dId => dId !== id) : [...prev, id]
    );
  };

  const handleAttachSelected = async () => {
    if (selectedAttachDocIds.length === 0 || !activeConversation) return;
    setAttaching(true);

    try {
      const activeId = activeConversation._id || activeConversation.id;
      const data = await conversationService.addDocumentsToConversation(activeId, selectedAttachDocIds);
      
      // Update local conversations state
      setConversations(prev => prev.map(c => {
        const id = c._id || c.id;
        if (id === activeId) {
          return data.conversation;
        }
        return c;
      }));
      
      setActiveConversation(data.conversation);
      setShowAttachModal(false);
    } catch (err) {
      console.error('Failed to attach documents:', err);
    } finally {
      setAttaching(false);
    }
  };

  // Direct Dynamic In-Chat Upload Logic
  const handleModalFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setUploadError('Only PDF files are supported.');
        setUploadFile(null);
        return;
      }
      setUploadError(null);
      setUploadFile(selectedFile);
    }
  };

  const handleModalUpload = async () => {
    if (!uploadFile || !activeConversation) return;
    setUploading(true);
    setUploadProgress(40);
    setUploadError(null);

    try {
      // 1. Upload file
      const uploadData = await documentService.uploadDocument(uploadFile);
      setUploadProgress(80);
      const newDocId = uploadData.document._id || uploadData.document.id;

      // 2. Attach newly uploaded document to the conversation
      const activeId = activeConversation._id || activeConversation.id;
      const data = await conversationService.addDocumentsToConversation(activeId, [newDocId]);

      // 3. Update local state
      setConversations(prev => prev.map(c => {
        const id = c._id || c.id;
        if (id === activeId) {
          return data.conversation;
        }
        return c;
      }));
      
      setActiveConversation(data.conversation);
      setShowAttachModal(false);
    } catch (err) {
      setUploadError('Failed to upload and attach PDF.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-brand-muted">Loading workspace...</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <FileText size={48} className="text-brand-muted mb-6" />
        <h2 className="text-2xl font-light text-brand-text mb-4">No Active Conversations</h2>
        <p className="text-brand-muted mb-8">Establish a context by uploading documents and starting a chat in the Upload Center.</p>
        <button 
          onClick={() => navigate('/upload')}
          className="px-6 py-3 bg-brand-text text-brand-bg text-sm font-medium rounded-sm hover:bg-white transition-colors"
        >
          Go to Document Center
        </button>
      </div>
    );
  }

  const activeDocTitles = (activeConversation?.documents || []).map(d => d.title).join(', ');

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-brand-bg border border-brand-border rounded-sm overflow-hidden shadow-xl relative">
      
      {/* Workspace Sidebar */}
      <div className="w-80 bg-brand-panel border-r border-brand-border flex flex-col">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-brand-muted uppercase tracking-wider">Conversations</h3>
          <button 
            onClick={() => navigate('/upload')}
            className="p-1 hover:bg-brand-hover rounded-sm text-brand-text transition-colors"
            title="New Chat Session"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => {
            const id = conv._id || conv.id;
            const isActive = id === conversationId;
            const docs = conv.documents || [];
            return (
              <button
                key={id}
                onClick={() => navigate(`/workspace/${id}`)}
                className={`w-full text-left p-4 border-b border-brand-border/50 transition-colors flex flex-col gap-2 ${
                  isActive ? 'bg-brand-hover border-l-2 border-l-brand-accent' : 'hover:bg-brand-hover/50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start gap-2 text-brand-text font-medium text-sm w-full">
                  <FileText size={15} className="text-brand-accent flex-shrink-0 mt-0.5" />
                  <div className="truncate flex-1">
                    <span className="truncate block font-semibold" title={conv.title || (docs.length > 0 ? docs.map(d => d.title).join(', ') : 'Intelligence Session')}>
                      {conv.title || (docs.length > 0 ? `${docs[0].title}${docs.length > 1 ? ` (+${docs.length - 1} more)` : ''}` : 'Intelligence Session')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-brand-muted w-full">
                  <span>{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                  <span>{new Date(conv.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-brand-bg relative">
        
        {/* Top Information Bar */}
        <div className="h-16 border-b border-brand-border flex items-center justify-between px-6 bg-brand-bg z-10">
          {/* Conversation Title & Rename Form */}
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
            <FolderOpen size={16} className="text-brand-accent shrink-0" />
            {isRenaming ? (
              <form onSubmit={handleRenameActiveConversation} className="flex items-center gap-2 max-w-sm w-full">
                <input
                  type="text"
                  required
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="bg-brand-panel border border-brand-accent text-xs font-semibold text-brand-text rounded-sm px-2.5 py-1 focus:outline-none w-full"
                  maxLength={50}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={renamingLoading || !renameTitle.trim()}
                  className="px-2 py-1 bg-brand-accent text-brand-bg text-[10px] font-bold rounded-sm hover:bg-brand-accent-hover transition-colors shrink-0"
                >
                  {renamingLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenaming(false);
                    setRenameTitle(activeConversation?.title || '');
                  }}
                  className="px-2 py-1 border border-brand-border text-brand-muted hover:text-brand-text text-[10px] font-bold rounded-sm transition-colors shrink-0"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 truncate">
                <h2 className="text-sm font-semibold text-brand-text truncate max-w-[200px] sm:max-w-xs md:max-w-sm font-serif">
                  {activeConversation?.title || (
                    activeConversation?.documents && activeConversation.documents.length > 0 
                      ? `${activeConversation.documents[0].title}${activeConversation.documents.length > 1 ? ` (+${activeConversation.documents.length - 1} more)` : ''}`
                      : 'Intelligence Session'
                  )}
                </h2>
                <button
                  onClick={() => {
                    setRenameTitle(activeConversation?.title || '');
                    setIsRenaming(true);
                  }}
                  className="p-1 hover:bg-brand-hover text-brand-muted hover:text-brand-accent rounded-sm transition-colors"
                  title="Rename Conversation"
                >
                  <Edit3 size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Active Context Dropdown & Actions */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Active Context Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowContextDropdown(!showContextDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-border hover:border-brand-accent rounded-sm text-xs font-semibold text-brand-text bg-brand-panel transition-all focus:outline-none"
                title="View active context PDFs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse shrink-0"></span>
                <span>Context: {activeConversation?.documents?.length || 0} PDF{activeConversation?.documents?.length !== 1 ? 's' : ''}</span>
                <ChevronDown size={12} className={`text-brand-muted transition-transform ${showContextDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showContextDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowContextDropdown(false)}></div>
                  
                  <div className="absolute right-0 mt-2 w-72 bg-brand-panel border border-brand-border rounded-sm shadow-2xl p-4 z-30 space-y-3">
                    <div className="text-[10px] font-bold text-brand-muted uppercase tracking-wider border-b border-brand-border/40 pb-1.5">
                      Active Context Documents
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {activeConversation?.documents && activeConversation.documents.length > 0 ? (
                        activeConversation.documents.map(doc => (
                          <div key={doc.id || doc._id} className="flex items-center gap-2 p-2 rounded-sm bg-brand-bg/40 border border-brand-border/20">
                            <FileText size={13} className="text-brand-accent shrink-0" />
                            <span className="text-[11px] text-brand-text truncate flex-1" title={doc.title}>
                              {doc.title}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-brand-muted italic py-2">No documents attached.</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-brand-border/40 flex items-center justify-end">
                      <button 
                        onClick={() => {
                          setShowContextDropdown(false);
                          handleOpenAttachModal();
                        }}
                        className="text-[10px] font-semibold text-brand-accent hover:underline flex items-center gap-1"
                      >
                        <Plus size={10} /> Attach more files
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleOpenAttachModal}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-border hover:border-brand-accent rounded-sm text-xs font-semibold text-brand-text bg-brand-panel transition-all"
              title="Attach PDFs to this conversation"
            >
              <Plus size={13} /> Add PDF
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-brand-muted opacity-50">
              <Bot size={48} className="mb-4" />
              <p className="text-sm">Context files mapped. Start querying.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center mt-1 ${
                  msg.role === 'user' ? 'bg-brand-panel text-brand-text border border-brand-border' : 'bg-brand-accent text-brand-bg'
                }`}>
                  {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                </div>
                <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block text-sm p-4 rounded-sm ${
                    msg.role === 'user' 
                      ? 'bg-brand-panel border border-brand-border text-brand-text' 
                      : 'bg-transparent text-brand-text border border-transparent'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-invert prose-brand max-w-none text-left prose-p:leading-relaxed prose-pre:bg-brand-panel prose-pre:border prose-pre:border-brand-border">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {sending && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center mt-1 bg-brand-accent text-brand-bg">
                <Bot size={16} />
              </div>
              <div className="flex-1">
                <div className="inline-block p-4 text-brand-muted text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-brand-bg border-t border-brand-border">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={sending || !activeConversation}
              placeholder="Query the active context documents..."
              className="w-full bg-brand-panel border border-brand-border text-brand-text rounded-sm py-4 pl-4 pr-16 focus:outline-none focus:border-brand-accent transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !query.trim() || !activeConversation}
              className="absolute right-2 p-2 text-brand-muted hover:text-brand-accent transition-colors disabled:opacity-50 disabled:hover:text-brand-muted"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="text-center mt-2 text-xs text-brand-muted">
            Multi-Tenant RAG AI can make mistakes. Verify critical intelligence.
          </div>
        </div>
      </div>

      {/* Attach/Upload PDF Modal Overlay */}
      {showAttachModal && (
        <div className="absolute inset-0 bg-brand-bg/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-panel border border-brand-border rounded-sm w-full max-w-xl max-h-[600px] flex flex-col p-6 shadow-2xl relative">
            
            <button 
              onClick={() => setShowAttachModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-brand-hover text-brand-muted hover:text-brand-text rounded-sm transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-light text-brand-text mb-4">Attach Documents</h3>

            {/* In-Modal Upload Area */}
            <div className="mb-6 p-4 border border-brand-border rounded-sm bg-brand-bg/40">
              <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-2">Upload new document</span>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="file"
                  accept=".pdf"
                  onChange={handleModalFileChange}
                  disabled={uploading}
                  className="text-xs text-brand-muted file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-brand-panel file:text-brand-text file:hover:bg-brand-hover file:cursor-pointer flex-1"
                />
                {uploadFile && (
                  <button
                    onClick={handleModalUpload}
                    disabled={uploading}
                    className="px-4 py-2 bg-brand-text text-brand-bg text-xs font-semibold rounded-sm hover:bg-white transition-colors flex items-center gap-1.5 justify-center"
                  >
                    {uploading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploading ? 'Processing...' : 'Upload & Attach'}
                  </button>
                )}
              </div>
              {uploadError && <p className="text-red-400 text-xs mt-2">{uploadError}</p>}
            </div>

            {/* Select Existing Area */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-[150px]">
              <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-2">Select existing documents</span>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {workspaceDocs.length === 0 ? (
                  <p className="text-xs text-brand-muted italic text-center py-6">All workspace assets are already attached to this chat session.</p>
                ) : (
                  workspaceDocs.map(doc => {
                    const id = doc._id || doc.id;
                    const isChecked = selectedAttachDocIds.includes(id);
                    return (
                      <div 
                        key={id}
                        onClick={() => handleToggleAttachSelect(id)}
                        className={`p-3 border rounded-sm flex items-center gap-3 cursor-pointer transition-all ${
                          isChecked ? 'bg-brand-hover border-brand-accent/50' : 'bg-brand-bg/30 border-brand-border/60 hover:border-brand-border'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-brand-accent shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-brand-text truncate" title={doc.title}>{doc.title}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-brand-border/50 mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAttachModal(false)}
                className="px-4 py-2 border border-brand-border text-brand-muted hover:text-brand-text text-xs font-semibold rounded-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAttachSelected}
                disabled={selectedAttachDocIds.length === 0 || attaching}
                className="px-6 py-2 bg-brand-accent text-brand-bg hover:bg-brand-accent-hover text-xs font-semibold rounded-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-brand-accent/10"
              >
                {attaching ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                Attach Chosen PDFs
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Workspace;
