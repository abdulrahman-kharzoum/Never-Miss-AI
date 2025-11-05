import React from 'react';

const AboutTab = () => {
  const features = [
    {
      icon: '📧',
      title: 'AI Email Management',
      description: 'Read, reply, and manage Gmail through natural conversation'
    },
    {
      icon: '📅',
      title: 'Smart Calendar',
      description: 'Create events, check availability, detect conflicts—all with AI'
    },
    {
      icon: '✅',
      title: 'Task Intelligence',
      description: 'Organize Google Tasks with AI suggestions and automation'
    },
    {
      icon: '🎓',
      title: 'University Guide',
      description: 'Course suggestions, program planning and resource recommendations for students'
    },
    {
      icon: '📚',
      title: 'Study Guide',
      description: 'Generate study plans, summaries and prioritized learning paths'
    },
    {
      icon: '📝',
      title: 'Quiz Creator',
      description: 'Auto-generate quizzes from course materials to test learning'
    },
    {
      icon: '📝',
      title: 'Meeting Notes',
      description: 'Automated transcription and meeting summaries (e.g. via Fireflies integration)'
    },
    {
      icon: '📄',
      title: 'Document Summaries',
      description: 'Summarize content from PDF, CSV and Excel files into concise notes'
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      description: 'Bank-level encryption for all your data'
    }
  ];

  const skills = [
    'Front-end Development (Flutter, React)',
    '3D Interactive Experiences',
    'AI Automation (N8N, 1+ years)',
    'Full-stack Integration',
    'Voice Processing Systems',
    'Security & Encryption'
  ];

  const stats = [
    { value: '30+', label: 'hours saved per month' },
    { value: 'Zero', label: 'missed meetings' },
    { value: '10x', label: 'faster email management' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 py-20 px-4">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="relative max-w-5xl mx-auto text-center animate-fade-in">
          <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">
            Nerver Miss AI
          </h1>
          <p className="text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            An AI assistant that keeps you on top of work, school, and life — from meetings to study material
          </p>
          <div className="mt-8 animate-bounce">
            <svg className="w-8 h-8 text-white/70 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Problem Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 mb-20 transform hover:scale-105 transition-all duration-500">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-6">
            The Problem
          </h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
            Managing emails, calendars, tasks, and meetings—we've all been there. Hours wasted browsing through emails, 
            missing important meetings, losing track of tasks. For Abdulrahman Kharzoum, a front-end and AI automation developer, 
            this wasn't just frustrating—it was stealing time from what mattered most.
          </p>
        </div>

        {/* Solution Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              Nerver Miss AI: Your AI-Powered Productivity Assistant
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              An intelligent platform that transforms how you manage your digital life
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transform hover:scale-105 hover:shadow-2xl transition-all duration-500"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                }}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Founder Section */}
        <div className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 rounded-3xl shadow-2xl overflow-hidden mb-20">
          <div className="grid md:grid-cols-2 gap-12 p-12">
            {/* Left Side - Image */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <div className="relative w-64 h-64 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-2xl">
                  AK
                </div>
              </div>
              <div className="mt-8 flex gap-4">
                <a
                  href="http://abdulrahmankharzoum.zentraid.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  🌐 Portfolio
                </a>
                <a
                  href="https://linkedin.com/in/abdulrahman-kharzoum-9040bb20a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  💼 LinkedIn
                </a>
                <a
                  href="https://github.com/abdulrahman-kharzoum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  💻 GitHub
                </a>
              </div>
            </div>

            {/* Right Side - Content */}
            <div className="flex flex-col justify-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                Meet Abdulrahman Kharzoum
              </h2>
              <p className="text-xl text-purple-600 dark:text-purple-400 font-semibold mb-6">
                Front-end Developer & AI Automation Specialist
              </p>

              <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                <p>
                  A year ago, I discovered AI automation and immediately fell in love with its potential. 
                  I saw a future where technology could handle the mundane, giving us time for what truly matters.
                </p>
                <p>
                  But I was living in the problem I wanted to solve. My inbox was overwhelming. My calendar was a mess. 
                  I was missing meetings. Hours disappeared into email management and task organization—time I could never get back.
                </p>
                <p>
                  I knew there had to be a better way. What if AI could read my emails, manage my calendar, 
                  and even attend meetings for me? What if I could control everything through simple conversation or voice commands?
                </p>
                <p className="font-semibold text-purple-600 dark:text-purple-400">
                  After months of development, combining my experience in React, Flutter, 3D development, 
                  and over a year of AI automation with N8N, Nerver Miss AI was born.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Co-Founder / Team Section - Aman */}
        <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-3xl shadow-2xl overflow-hidden mb-20">
          <div className="grid md:grid-cols-2 gap-12 p-12">
            {/* Left Side - Content */}
            <div className="flex flex-col justify-center order-2 md:order-1">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">
                Meet Aman Kharzoum
              </h2>
              <p className="text-xl text-blue-600 dark:text-blue-400 font-semibold mb-6">
                         Senior Software Engineer
                Mobile & Web Application Developer | AI Automation , Flutter, React Specialist
              </p>

              <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                <p>
                  Partnering on the NeverMiss AI vision, Aman focuses on crafting clear, delightful user
                  experiences and helping shape product flows that feel effortless.
                </p>
                <p>
                  From polishing interfaces to validating ideas quickly, Aman bridges design and engineering so
                  features land with clarity and speed.
                </p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">
                  Together, we’re building tools that save time and turn complex workflows into simple
                  conversations.
                </p>
              </div>
            </div>

            {/* Right Side - Image / Monogram */}
            <div className="flex flex-col items-center justify-center order-1 md:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <div className="relative w-64 h-64 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-2xl">
                  AM
                </div>
              </div>
              <div className="mt-8 flex gap-4">
                <a
                  href="https://amankharzoum.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  🌐 Portfolio
                </a>
                <a
                  href="https://www.linkedin.com/in/aman-kharzoum-36b3a7328/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  💼 LinkedIn
                </a>
                <a
                  href="https://github.com/Sereen-Kh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  💻 GitHub
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Expertise */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-8">
            Built with Expertise
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {skills.map((skill, index) => (
              <div
                key={index}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-semibold shadow-lg transform hover:scale-110 transition-all duration-300"
                style={{
                  animation: `fadeIn 0.6s ease-out ${index * 0.1}s both`
                }}
              >
                {skill}
              </div>
            ))}
          </div>
        </div>

        {/* Impact Section */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-3xl shadow-2xl p-12 mb-20 text-white">
          <h2 className="text-4xl font-bold text-center mb-6">
            The Impact
          </h2>
          <p className="text-xl text-center mb-12 max-w-3xl mx-auto opacity-90">
            Today, NeverMiss AI helps users reclaim their time. What once took hours now takes seconds. 
            Meetings are never missed. Emails are managed effortlessly. Tasks are organized intelligently. 
            All through the power of conversational AI.
          </p>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center transform hover:scale-110 transition-all duration-300"
              >
                <div className="text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-lg opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
            Ready to Never Miss Again?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who've transformed their productivity with AI
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
              Start Free
            </button>
            <button className="px-8 py-4 border-2 border-purple-600 text-purple-600 dark:text-purple-400 rounded-xl font-semibold text-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transform hover:scale-105 transition-all duration-300">
              View Pricing
            </button>
          </div>
        </div>

        {/* Connect Section */}
        <div className="mt-20 text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-8">
            Let's Connect
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="http://abdulrahmankharzoum.zentraid.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              🌐 Portfolio
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://linkedin.com/in/abdulrahman-kharzoum-9040bb20a"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              💼 LinkedIn
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://github.com/abdulrahman-kharzoum"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              💻 GitHub
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AboutTab;
