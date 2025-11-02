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
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);
  }, []);

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

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('csv')) return '📊';
    if (type.includes('sheet') || type.includes('excel')) return '📈';
    return '📝';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>;
      case 'completed':
        return <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-sm">✓</span></div>;
      case 'error':
        return <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-sm">!</span></div>;
      default:
        return null;
    }
  };

  const totalSize = files.reduce((acc, file) => acc + file.file.size, 0);

  return (
    <div className={`min-h-screen h-full overflow-y-auto p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className={`text-5xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'}`}>
            Study Guide Builder
          </h1>
          <p className={`text-xl max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Upload your documents to create a personalized RAG system for quizzes, summaries, and Q&A.
          </p>
        </div>

        <div
          className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 ${isDragOver ? 'border-blue-500 scale-105' : 'border-gray-400'} ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-12 text-center">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-300 ${isDragOver ? (theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100 scale-110') : (theme === 'dark' ? 'bg-gray-700' : 'bg-gradient-to-br from-blue-100 to-purple-100')}`}>
              <span className="text-4xl">{isDragOver ? '📥' : '☁️'}</span>
            </div>
            <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {isDragOver ? 'Drop your files here!' : 'Drag & Drop Files Here'}
            </h3>
            <p className={`mb-8 text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              or click to browse and select files
            </p>
            <button
              onClick={handleUploadClick}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              📤 Choose Files
            </button>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <span className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium">PDF</span>
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">CSV</span>
              <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">Excel</span>
              <span className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">Text</span>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <>
            <div className={`mt-8 p-6 rounded-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
              <h2 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Selected Files</h2>
              <div className="grid gap-4">
                {files.map((fileData) => (
                  <div key={fileData.id} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-gray-600' : (fileData.file.type.includes('pdf') ? 'bg-red-100' : 'bg-blue-100')}`}>
                          <span className="text-2xl">{getFileIcon(fileData.file.type)}</span>
                        </div>
                        <div>
                          <p className={`font-medium truncate max-w-xs ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                            {fileData.file.name}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(fileData.status)}
                        <button
                          onClick={() => deleteFile(fileData.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <button
                onClick={uploadFiles}
                disabled={files.some(f => f.status === 'uploading')}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🚀 Process and Upload Files
              </button>
            </div>
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
