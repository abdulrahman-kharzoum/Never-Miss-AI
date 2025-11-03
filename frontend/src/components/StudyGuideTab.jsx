import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabaseClient';
import io from 'socket.io-client';
import { useNotification } from '../context/NotificationContext';

// Allowed MIME types are declared once to avoid recreating on each render and to keep hooks dep arrays stable
const ALLOWED_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const StudyGuideTab = () => {
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const { theme } = useTheme();
  const { addNotification } = useNotification();

  const socket = useRef(null);

  useEffect(() => {
    socket.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

    socket.current.on('file_status_update', (data) => {
      console.log('File status update received:', data);
      setFiles(prevFiles =>
        prevFiles.map(file =>
          file.sessionId === data.sessionId
            ? { ...file, status: data.status, progress: data.progress || file.progress }
            : file
        )
      );

      // Use notification system instead of alert
      if (data) {
        const message = data.message || `Files for session ${data.sessionId} updated`;
        // Compose notification payload
        const notifData = {
          sessionId: data.sessionId,
          userId: data.userId,
          status: data.status,
          redirectUrl: data.redirectUrl || null,
          source: 'file_processing', // so bell counts only file processing notifications
        };

        // If completed with a redirectUrl, add a clickable notification to open chat
        if (data.status === 'completed' && data.redirectUrl) {
          addNotification(message, 'success', 10000, (d) => {
            try {
              localStorage.setItem('chatWebhookUrl', d.redirectUrl);
              window.open('/chat', '_blank');
            } catch (e) {
              console.error('Failed to open chat window', e);
            }
          }, notifData);
          console.log('New Chat Webhook URL (from n8n): ', data.redirectUrl);
        } else {
          // pending or other statuses
          addNotification(message, 'info', 10000, null, notifData);
        }
      }
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [addNotification]);

  const allowedTypes = ALLOWED_TYPES;

  const handleFiles = useCallback((newFiles) => {
    const arr = Array.from(newFiles);
    const validFiles = arr.filter(file => {
      // accept by MIME type or by extension fallback
      const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
      return (
        allowedTypes.includes(file.type) ||
        ['pdf', 'csv', 'xls', 'xlsx', 'txt', 'ppt', 'pptx'].includes(ext)
      );
    });

    const uploadedFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'preparing', // Start with 'preparing' status
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);

    // Simulate file preparation progress (reading file, validating, etc.)
    uploadedFiles.forEach((fileData, index) => {
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 15 + 5; // Random increment between 5-20%
        
        if (currentProgress >= 95) {
          currentProgress = 100;
          clearInterval(progressInterval);
          
          // Change status to 'ready' when preparation is complete
          setFiles(prev => 
            prev.map(f => 
              f.id === fileData.id 
                ? { ...f, progress: 100, status: 'ready' }
                : f
            )
          );
        } else {
          setFiles(prev => 
            prev.map(f => 
              f.id === fileData.id 
                ? { ...f, progress: Math.round(currentProgress) }
                : f
            )
          );
        }
      }, 200 + (index * 100)); // Stagger animation for multiple files
    });
  }, [allowedTypes]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const deleteFile = useCallback((id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const uploadFiles = async () => {
    const sessionId = `rag_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || localStorage.getItem('userId') || 'anonymous';
    if (!userId) {
      console.error('User not available');
      return;
    }

    setFiles(prevFiles => prevFiles.map(file => ({ ...file, status: 'uploading', progress: 0, sessionId })));

    const xhr = new XMLHttpRequest();
    const url = 'https://n8n.zentraid.com/webhook/RAG_upload_files';
    // const url = 'https://www.n8n.clikview.com/webhook/RAG_upload_files';
    const formData = new FormData();

    files.forEach((fileData, index) => {
      formData.append(`file_${index}`, fileData.file, fileData.file.name);
    });

    formData.append('userId', userId);
    formData.append('sessionId', sessionId);
    formData.append('metadata', JSON.stringify(files.map(f => ({ name: f.file.name, size: f.file.size, type: f.file.type }))));
    formData.append('action', 'upload_and_finalize'); // Indicate a combined action

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setFiles(prev => prev.map(f => ({ ...f, progress: percent }))); // Update all files with overall progress
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles(prev => prev.map(f => ({ ...f, status: 'completed', progress: 100 })));
        } else {
          setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
          console.error('Upload failed:', xhr.status, xhr.statusText, xhr.responseText);
        }
      }
    };

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${process.env.REACT_APP_N8N_API_KEY}`);
    xhr.timeout = 5 * 60 * 1000; // 5 minutes for the entire batch
    xhr.ontimeout = () => {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
      console.error('Upload timed out');
    };

    xhr.send(formData);
  };



  return (
    <div className={`min-h-screen h-full overflow-y-auto p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className={`text-4xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📚 Study Guide Builder
          </h1>
          <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Upload your documents to create a personalized RAG system for quizzes, summaries, and Q&A.
          </p>
        </div>

        {/* Upload Zone - Inspired by Dribbble Design */}
        <div
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
            isDragOver 
              ? (theme === 'dark' ? 'border-blue-400 bg-blue-900/20' : 'border-indigo-400 bg-indigo-50/50')
              : (theme === 'dark' ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-white')
          } backdrop-blur-sm`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-16 text-center">
            {/* Icon */}
            <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragOver 
                ? (theme === 'dark' ? 'bg-blue-500/20' : 'bg-indigo-100')
                : (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100')
            }`}>
              <svg className={`w-10 h-10 ${isDragOver ? 'text-indigo-500' : (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            {/* Text */}
            <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Drop your files here
            </h3>
            <p className={`text-base mb-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              or click the button below to browse
            </p>
            
            {/* Choose File Button with Enhanced Gradient Design */}
            <button
              onClick={handleUploadClick}
              className="group relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-110 hover:shadow-2xl shadow-xl overflow-hidden"
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              
              {/* Button content */}
              <div className="relative flex items-center justify-center space-x-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Choose Files</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            
            <p className={`text-sm mt-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="font-semibold">Supported formats:</span> PDF, CSV, TXT, DOCX • <span className="font-semibold">Max size:</span> 10MB per file
            </p>
          </div>
        </div>

        {/* File Cards - Dribbble Design Inspired */}
        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            {files.map((fileData) => (
              <div 
                key={fileData.id} 
                className={`rounded-2xl p-5 transition-all duration-300 ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                } shadow-lg hover:shadow-xl`}
              >
                <div className="flex items-center justify-between mb-4">
                  {/* Left: Icon + File Info */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* File Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      fileData.status === 'error' 
                        ? (theme === 'dark' ? 'bg-red-500/20' : 'bg-red-50')
                        : fileData.status === 'completed'
                        ? (theme === 'dark' ? 'bg-green-500/20' : 'bg-green-50')
                        : fileData.file.type.includes('pdf')
                        ? (theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-50')
                        : (theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50')
                    }`}>
                      <svg className={`w-6 h-6 ${
                        fileData.status === 'error' ? 'text-red-500' :
                        fileData.status === 'completed' ? 'text-green-500' :
                        fileData.file.type.includes('pdf') ? 'text-indigo-500' : 'text-blue-500'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    {/* File Name + Size */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {fileData.file.name}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(fileData.file.size / (1024 * 1024)).toFixed(2)}gb
                      </p>
                    </div>
                  </div>

                  {/* Right: Status + Actions */}
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {/* Status Indicator */}
                    {fileData.status === 'completed' && (
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    {fileData.status === 'error' && (
                      <button
                        onClick={() => uploadFiles()}
                        className={`text-sm font-medium flex items-center space-x-1 ${
                          theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-indigo-600 hover:text-indigo-700'
                        }`}
                      >
                        <span>Try Again</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}

                    {(fileData.status === 'preparing' || fileData.status === 'uploading') && (
                      <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {fileData.progress}%
                      </span>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => deleteFile(fileData.id)}
                      disabled={fileData.status === 'uploading' || fileData.status === 'preparing'}
                      className={`p-2 rounded-lg transition-colors ${
                        (fileData.status === 'uploading' || fileData.status === 'preparing')
                          ? 'opacity-50 cursor-not-allowed'
                          : theme === 'dark'
                          ? 'hover:bg-red-500/20 text-red-400'
                          : 'hover:bg-red-50 text-red-500'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {(fileData.status === 'preparing' || fileData.status === 'uploading') && (
                  <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div 
                      className={`h-full transition-all duration-300 ease-out ${
                        fileData.status === 'preparing' 
                          ? 'bg-gradient-to-r from-indigo-500 to-blue-500'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ width: `${fileData.progress}%` }}
                    />
                  </div>
                )}

                {/* Success Message */}
                {fileData.status === 'completed' && (
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    Upload Successful!
                  </p>
                )}

                {/* Error Message */}
                {fileData.status === 'error' && (
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    Upload failed! Please try again.
                  </p>
                )}

                {/* Ready State */}
                {fileData.status === 'ready' && (
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    Ready to upload
                  </p>
                )}
              </div>
            ))}

            {/* Upload Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={uploadFiles}
                disabled={files.some(f => f.status === 'uploading' || f.status === 'preparing')}
                className="group relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-110 hover:shadow-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                {/* Button content with icons */}
                <div className="relative flex items-center justify-center space-x-3">
                  {files.some(f => f.status === 'preparing') ? (
                    <>
                      <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Preparing Files...</span>
                    </>
                  ) : files.some(f => f.status === 'uploading') ? (
                    <>
                      <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Process and Upload Files</span>
                      <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.xls,.xlsx,.txt"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default StudyGuideTab;
