import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
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

const StudyOptions = ({ onOptionClick, theme }) => {
    const options = [
        { title: 'Generate Quizzes', description: 'Create practice quizzes from your materials.', icon: '❓' },
        { title: 'Generate Summaries', description: 'Get concise summaries of long documents.', icon: '📝' },
        { title: 'Create Flashcards', description: 'Generate flashcards for key concepts.', icon: '🃏' },
        { title: 'Ask Your Document', description: 'Chat with your document to find answers.', icon: '💬' }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {options.map(option => (
                <button 
                    key={option.title} 
                    onClick={() => onOptionClick(option.title)} 
                    className={`p-8 rounded-2xl text-left transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl ${
                        theme === 'dark' 
                        ? 'bg-gray-800 hover:bg-gray-700/50 border border-gray-700 hover:border-blue-500' 
                        : 'bg-white hover:bg-indigo-50/50 border border-gray-200 hover:border-indigo-300'
                    }`}
                >
                    <div className="text-5xl mb-5">{option.icon}</div>
                    <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{option.title}</h3>
                    <p className={`text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{option.description}</p>
                </button>
            ))}
        </div>
    );
};

const StudyGuideTab = ({ user }) => {
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showStudyOptions, setShowStudyOptions] = useState(true);
  const fileInputRef = useRef(null);
  const fileListRef = useRef(null);
  const { theme } = useTheme();
  const { addNotification } = useNotification();

  const socket = useRef(null);
  const processedSessionIds = useRef(new Set()); // Track which sessions have been completed to prevent duplicates

  useEffect(() => {
    // Load previously processed sessionIds from localStorage on mount
    try {
      const stored = localStorage.getItem('processedStudyGuideSessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        processedSessionIds.current = new Set(parsed);
      }
    } catch (e) {
      console.error('Failed to load processed sessions', e);
    }

    socket.current = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8011');

    if (user && user.uid) {
      socket.current.on('connect', () => {
        socket.current.emit('join', { userId: user.uid });
      });
    }

    socket.current.on('file_status_update', (data) => {
      setFiles(prevFiles =>
        prevFiles.map(file =>
          file.sessionId === data.sessionId
            ? { ...file, status: data.status, progress: data.progress || file.progress }
            : file
        )
      );

      if (data && data.status === 'completed') {
        // DEDUPLICATION: Skip if we've already processed this sessionId
        if (processedSessionIds.current.has(data.sessionId)) {
          return;
        }

        // Mark this sessionId as processed (in memory and localStorage)
        processedSessionIds.current.add(data.sessionId);
        try {
          const arr = Array.from(processedSessionIds.current);
          localStorage.setItem('processedStudyGuideSessions', JSON.stringify(arr));
        } catch (e) {
          console.error('Failed to save processed session', e);
        }

        // Get the first file name for dynamic title
        const firstFileName = files.length > 0 ? files[0].file.name : 'Document';
        // Remove file extension for cleaner title
        const cleanFileName = firstFileName.replace(/\.[^/.]+$/, '');
        const dynamicTitle = `Study Guide: ${cleanFileName}`;

        const message = data.message || `Files processing completed! Opening Study Guide Chat...`;
        // Compose notification payload
        const notifData = {
          sessionId: data.sessionId,
          userId: data.userId,
          status: data.status,
          redirectUrl: data.redirectUrl || null,
          source: 'study_guide',
        };

        // When completed with a redirectUrl, add a clickable notification AND auto-redirect
        if (data.redirectUrl) {
          // Store webhook URL and session info for Study Guide tab
          localStorage.setItem('chatWebhookUrl', data.redirectUrl);
          localStorage.setItem('studyGuideSessionId', data.sessionId);
          localStorage.setItem('studyGuideChatTitle', dynamicTitle);
          localStorage.setItem('autoOpenStudyGuide', 'true');
          
          // Add notification (still clickable if user wants to click)
          addNotification(message, 'success', 10000, (d) => {
            try {
              // Store the session ID for navigation
              localStorage.setItem('studyGuideSessionId', data.sessionId);
              localStorage.setItem('autoOpenStudyGuide', 'true');
              // Redirect to study guide tab (same window) - force reload to ensure auto-open logic runs
              window.location.hash = 'study_guide';
              window.location.reload();
            } catch (e) {
              console.error('Failed to open study guide', e);
            }
          }, notifData);
          
          
          // AUTO-REDIRECT: Open Study Guide Chat automatically without requiring user to click notification
          setTimeout(() => {
            window.location.hash = 'study_guide';
            // Force page reload to trigger auto-open logic in ChatInterfaceNew
            window.location.reload();
          }, 1500); // 1.5 second delay so user can see the notification first
        }
      }
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [addNotification, user]);

  const allowedTypes = ALLOWED_TYPES;

  const handleOptionClick = (optionTitle) => {
    setShowStudyOptions(false);
    setShowUpload(true);
    // Store the selected option for the session
    localStorage.setItem('studyGuideOption', optionTitle);
  };

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
      status: 'ready', // Files go directly to 'ready' - no auto-processing animation
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);

    // Auto-scroll to file list with smooth animation
    setTimeout(() => {
      if (fileListRef.current) {
        fileListRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
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
    setIsUploading(true);
    const sessionId = `rag_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    // Check Firebase user (user prop passed from ChatInterfaceNew)
    if (!user || !user.uid) {
      console.error('Authentication required. User must be logged in to upload files.');
      addNotification('Please log in to upload files', 'error', 5000);
      setIsUploading(false);
      return;
    }

    const userId = user.uid; // Use Firebase user.uid directly
    

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
        setIsUploading(false);
      }
    };

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${process.env.REACT_APP_N8N_API_KEY}`);
    xhr.timeout = 5 * 60 * 1000; // 5 minutes for the entire batch
    xhr.ontimeout = () => {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
      console.error('Upload timed out');
      setIsUploading(false);
    };

    xhr.send(formData);
  };



  return (
    <div className={`min-h-screen h-full overflow-y-auto p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50'}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mt-16 mb-10 text-center">
          <h1 className={`text-4xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            📚 Study Guide Builder
          </h1>
          <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {showStudyOptions 
              ? 'Choose how you want to study with your documents.' 
              : files.length === 0 && !showUpload 
              ? 'Select how you want to use your documents.' 
              : 'Upload your documents to create a personalized RAG system for quizzes, summaries, and Q&A.'}
          </p>
        </div>

        {showStudyOptions ? (
          <StudyOptions onOptionClick={handleOptionClick} theme={theme} />
        ) : files.length === 0 && !showUpload ? (
          <StudyOptions onOptionClick={handleOptionClick} theme={theme} />
        ) : (
          <>
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
              <div ref={fileListRef} className="mt-8 space-y-4">
                {files.map((fileData) => (
                  <div 
                    key={fileData.id} 
                    className={`rounded-2xl p-5 transition-all duration-300 ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                    } shadow-lg hover:shadow-xl ${
                      (fileData.status === 'preparing' || fileData.status === 'uploading') 
                        ? 'animate-pulse ring-2 ring-indigo-500/50' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      {/* Left: Icon + File Info */}
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {/* File Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                          fileData.status === 'error' 
                            ? (theme === 'dark' ? 'bg-red-500/20 animate-shake' : 'bg-red-50 animate-shake')
                            : fileData.status === 'completed'
                            ? (theme === 'dark' ? 'bg-green-500/20 scale-110' : 'bg-green-50 scale-110')
                            : (fileData.status === 'preparing' || fileData.status === 'uploading')
                            ? (fileData.file.type.includes('pdf')
                              ? (theme === 'dark' ? 'bg-indigo-500/20 animate-bounce' : 'bg-indigo-50 animate-bounce')
                              : (theme === 'dark' ? 'bg-blue-500/20 animate-bounce' : 'bg-blue-50 animate-bounce'))
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
                            {(fileData.file.size / (1024 * 1024)).toFixed(2)} MB
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
                          <div className="flex items-center space-x-2">
                            <div className="relative w-10 h-10">
                              {/* Spinning ring */}
                              <svg className="w-10 h-10 animate-spin" viewBox="0 0 50 50">
                                <circle 
                                  className={`${theme === 'dark' ? 'stroke-gray-700' : 'stroke-gray-200'}`}
                                  cx="25" cy="25" r="20" 
                                  fill="none" 
                                  strokeWidth="4"
                                />
                                <circle 
                                  className={`${
                                    fileData.status === 'preparing' 
                                      ? 'stroke-indigo-500' 
                                      : 'stroke-purple-500'
                                  }`}
                                  cx="25" cy="25" r="20" 
                                  fill="none" 
                                  strokeWidth="4"
                                  strokeDasharray="125.6"
                                  strokeDashoffset={125.6 - (125.6 * fileData.progress) / 100}
                                  strokeLinecap="round"
                                  transform="rotate(-90 25 25)"
                                />
                              </svg>
                              {/* Percentage in center */}
                              <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                {fileData.progress}
                              </span>
                            </div>
                          </div>
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
                      <div className={`h-2.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} relative`}>
                        <div 
                          className={`h-full transition-all duration-300 ease-out relative ${
                            fileData.status === 'preparing' 
                              ? 'bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600'
                              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                          }`}
                          style={{ width: `${fileData.progress}%` }}
                        >
                          {/* Animated shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                        </div>
                        {/* Pulsing glow effect */}
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-300 blur-sm ${
                            fileData.status === 'preparing' 
                              ? 'bg-gradient-to-r from-indigo-400 to-blue-400'
                              : 'bg-gradient-to-r from-indigo-400 to-purple-400'
                          } opacity-50 animate-pulse`}
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
                    disabled={files.some(f => f.status === 'uploading' || f.status === 'preparing') || isUploading}
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
          </>
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
