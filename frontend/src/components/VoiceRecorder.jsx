import React, { useState, useRef, useEffect } from 'react';
import MicRecorder from 'mic-recorder-to-mp3';

const VoiceRecorder = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize the recorder
    recorderRef.current = new MicRecorder({
      bitRate: 128,
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  const startRecording = async () => {
    try {
      await recorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 120) { // 2 minutes max
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Please allow microphone access to record audio');
    }
  };
  
  const stopRecording = async () => {
    if (isRecording) {
      try {
        const [buffer] = await recorderRef.current.stop().getMp3();
        const file = new File(buffer, 'voice-message.mp3', {
          type: 'audio/mpeg',
          lastModified: Date.now()
        });
        setAudioBlob(file);
        setIsRecording(false);
        clearInterval(timerRef.current);
      } catch (error) {
        console.error("Failed to stop recording:", error);
        // Handle error, maybe show a notification to the user
      }
    }
  };
  
  const cancelRecording = () => {
    if (isRecording) {
      stopRecording(); // Stop recording first
    }
    setAudioBlob(null);
    setRecordingTime(0);
  };
  
  const sendRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };
  
  const playPreview = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };
  
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!isRecording && !audioBlob) {
    return (
      <button
        onClick={startRecording}
        disabled={disabled}
        className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Record voice message"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
        </svg>
      </button>
    );
  }
  
  if (isRecording) {
    return (
      <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl animate-pulse-soft">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-semibold text-sm">Recording</span>
        </div>
        
        <div className="flex-1 flex items-center justify-center space-x-1">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-white rounded-full animate-wave"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
        
        <span className="text-white font-mono text-sm">{formatTime(recordingTime)}</span>
        
        <button
          onClick={stopRecording}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-sm font-semibold"
        >
          ⏹ Stop
        </button>
      </div>
    );
  }
  
  if (audioBlob) {
    return (
      <div className="flex items-center space-x-3 px-4 py-3 bg-blue-50 rounded-2xl border-2 border-blue-200">
        <button
          onClick={playPreview}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center hover:from-blue-700 hover:to-blue-800 transition"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        <audio
          ref={audioRef}
          src={URL.createObjectURL(audioBlob)}
          onEnded={() => setIsPlaying(false)}
        />
        
        <span className="text-sm text-gray-600">{formatTime(recordingTime)}</span>
        
        <div className="flex-1"></div>
        
        <button
          onClick={cancelRecording}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition text-sm font-semibold"
        >
          ❌ Cancel
        </button>
        
        <button
          onClick={sendRecording}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition text-sm font-semibold"
        >
          ✅ Send
        </button>
      </div>
    );
  }
};

export default VoiceRecorder;
