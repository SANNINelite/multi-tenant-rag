import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, MessageSquare, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { documentService } from '../services/documentService';
import { conversationService } from '../services/conversationService';

const UploadPage = () => {
  const { tenant } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [documentId, setDocumentId] = useState(null);

  // Document history states
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (tenant?.id) {
      fetchWorkspaceDocuments();
    }
  }, [tenant]);

  const fetchWorkspaceDocuments = async () => {
    try {
      setLoadingDocs(true);
      const docs = await documentService.getTenantDocuments(tenant.id);
      setDocuments(docs || []);
    } catch (err) {
      console.error('Failed to load workspace documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(20);
    setError(null);

    try {
      const data = await documentService.uploadDocument(file);
      setProgress(100);
      setSuccess(true);
      
      const docId = data.document._id || data.document.id;
      setDocumentId(docId);
      
      // Auto select the newly uploaded doc
      setSelectedDocIds((prev) => [...prev, docId]);
      
      // Refresh list
      await fetchWorkspaceDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleSelectDoc = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSelectAllDocs = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d._id || d.id));
    }
  };

  const handleDeleteDoc = async (docId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document? This will erase all its associated vector embeddings.')) {
      return;
    }

    try {
      await documentService.deleteDocument(tenant.id, docId);
      // Remove from selections
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
      // Refresh list
      await fetchWorkspaceDocuments();
    } catch (err) {
      setError('Failed to delete document.');
    }
  };

  const handleStartChatWithSelected = async () => {
    if (selectedDocIds.length === 0) return;
    try {
      const conv = await conversationService.createConversation(selectedDocIds);
      navigate(`/workspace/${conv.conversation?._id || conv.conversation?.id}`);
    } catch (err) {
      setError('Failed to initialize workspace conversation.');
    }
  };

  const handleStartChat = async () => {
    if (!documentId) return;
    try {
      const conv = await conversationService.createConversation([documentId]);
      navigate(`/workspace/${conv.conversation?._id || conv.conversation?.id}`);
    } catch (err) {
      setError('Failed to initialize conversation.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight mb-2">Ingestion & Document Center</h1>
        <p className="text-brand-muted">Ingest new PDFs to generate vector knowledge, or select multiple documents to start a workspace chat.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload Panel */}
        <div className="bg-brand-panel border border-brand-border rounded-sm p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-light text-brand-text mb-4">Ingest Knowledge</h2>
            {!success ? (
              <>
                <div 
                  className={`border-2 border-dashed rounded-sm flex flex-col items-center justify-center p-12 transition-colors cursor-pointer ${
                    dragActive ? 'border-brand-accent bg-brand-hover' : 'border-brand-border bg-brand-bg hover:border-brand-muted'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <input 
                    ref={inputRef}
                    type="file" 
                    accept=".pdf" 
                    onChange={handleChange} 
                    className="hidden" 
                  />
                  
                  <Upload size={48} className={`mb-6 ${dragActive ? 'text-brand-accent' : 'text-brand-muted'}`} />
                  <p className="text-lg font-medium text-brand-text mb-2">Drag and drop your PDF here</p>
                  <p className="text-sm text-brand-muted">or click to browse files</p>
                </div>
                
                {error && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm rounded-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                
                {file && (
                  <div className="mt-6 p-4 border border-brand-border rounded-sm bg-brand-bg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="text-brand-accent shrink-0" size={20} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-brand-text truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-brand-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpload();
                      }}
                      disabled={uploading}
                      className="px-6 py-2 bg-brand-text text-brand-bg text-sm font-medium rounded-sm hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {uploading ? `Processing...` : 'Upload & Process'}
                    </button>
                  </div>
                )}
                
                {uploading && (
                  <div className="mt-4">
                    <div className="h-1 w-full bg-brand-bg overflow-hidden rounded-full">
                      <div 
                        className="h-full bg-brand-accent transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-brand-bg/50 border border-brand-border">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 mb-6">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-light text-brand-text mb-2">PDF Ingested</h3>
                <p className="text-brand-muted text-sm mb-8">Generated vector embeddings for complete semantic search scoping.</p>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setFile(null);
                      setSuccess(false);
                      setDocumentId(null);
                    }}
                    className="px-6 py-3 border border-brand-border text-brand-text text-sm font-medium rounded-sm hover:border-brand-muted transition-colors"
                  >
                    Upload Another
                  </button>
                  <button 
                    onClick={handleStartChat}
                    className="px-6 py-3 bg-brand-accent text-brand-bg text-sm font-medium rounded-sm hover:bg-brand-accent-hover transition-colors"
                  >
                    Open Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Documents List */}
        <div className="bg-brand-panel border border-brand-border rounded-sm p-6 sm:p-8 flex flex-col justify-between h-[450px]">
          <div className="overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-brand-text">Workspace Assets ({documents.length})</h2>
              {documents.length > 0 && (
                <button 
                  onClick={handleSelectAllDocs}
                  className="text-xs text-brand-accent hover:underline font-medium"
                >
                  {selectedDocIds.length === documents.length ? 'Clear Selection' : 'Select All'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {loadingDocs ? (
                <div className="h-full flex items-center justify-center text-brand-muted text-sm">Loading intelligence assets...</div>
              ) : documents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-brand-muted opacity-65 p-6 border border-brand-border/40 bg-brand-bg/20">
                  <FileText size={32} className="mb-3" />
                  <p className="text-sm">No documents uploaded yet in this workspace.</p>
                </div>
              ) : (
                documents.map((doc) => {
                  const id = doc._id || doc.id;
                  const isChecked = selectedDocIds.includes(id);
                  return (
                    <div 
                      key={id}
                      onClick={() => handleToggleSelectDoc(id)}
                      className={`p-4 border rounded-sm flex items-center justify-between cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-brand-hover/60 border-brand-accent/50' 
                          : 'bg-brand-bg/50 border-brand-border hover:border-brand-border/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled by outer div click
                          className="rounded-sm accent-brand-accent w-4 h-4 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-brand-text truncate" title={doc.title}>{doc.title}</p>
                          <p className="text-xs text-brand-muted mt-1">{new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteDoc(id, e)}
                        className="p-2 hover:bg-brand-hover rounded-sm text-brand-muted hover:text-red-400 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {selectedDocIds.length > 0 && (
            <div className="pt-4 border-t border-brand-border/50 mt-4 flex items-center justify-between">
              <span className="text-xs text-brand-muted font-medium">
                {selectedDocIds.length} PDF{selectedDocIds.length > 1 ? 's' : ''} Selected
              </span>
              <button
                onClick={handleStartChatWithSelected}
                className="px-6 py-3 bg-brand-accent text-brand-bg text-sm font-semibold rounded-sm hover:bg-brand-accent-hover transition-all flex items-center gap-2 shadow-lg shadow-brand-accent/15"
              >
                <MessageSquare size={16} /> Start Chat Session
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UploadPage;
