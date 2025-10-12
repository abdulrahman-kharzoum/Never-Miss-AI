import React, { useState } from 'react';

const PricingTab = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);

  const plans = [
    {
      name: 'FREE',
      price: 0,
      period: '/month',
      badge: 'Get Started',
      badgeColor: 'from-gray-500 to-gray-600',
      buttonText: 'Start Free',
      buttonStyle: 'outlined',
      features: [
        { text: '30 AI messages per day', included: true },
        { text: 'Full Gmail integration', included: true },
        { text: 'Basic calendar management', included: true },
        { text: 'Google Tasks integration', included: true },
        { text: 'Text-only responses', included: true },
        { text: 'Voice recording & AI responses', included: false },
        { text: 'Priority processing', included: false },
        { text: 'Productivity insights', included: false }
      ]
    },
    {
      name: 'PAID',
      price: 20,
      period: '/month',
      badge: 'Most Popular',
      badgeColor: 'from-purple-500 to-blue-600',
      popular: true,
      buttonText: 'Upgrade Now',
      buttonStyle: 'solid',
      features: [
        { text: '150 AI messages per day', included: true },
        { text: 'Full Gmail with priority support', included: true },
        { text: 'Advanced scheduling & conflict detection', included: true },
        { text: 'Full task management with AI suggestions', included: true },
        { text: 'Voice recording & AI voice responses', included: true },
        { text: 'Priority processing & faster responses', included: true },
        { text: 'Priority support', included: true },
        { text: 'Productivity insights', included: false }
      ]
    },
    {
      name: 'PRO',
      price: billingCycle === 'monthly' ? 100 : 100,
      period: billingCycle === 'monthly' ? '/year' : '/year',
      badge: 'Best Value',
      badgeColor: 'from-blue-600 to-cyan-600',
      buttonText: 'Go Pro',
      buttonStyle: 'premium',
      yearlyNote: true,
      features: [
        { text: 'UNLIMITED AI messages', included: true },
        { text: 'Unlimited Gmail operations', included: true },
        { text: 'Advanced scheduling with analytics', included: true },
        { text: 'Unlimited task management', included: true },
        { text: 'Unlimited voice conversations', included: true },
        { text: 'Priority support', included: true },
        { text: 'Productivity insights & reports', included: true },
        { text: 'Advanced analytics dashboard', included: true }
      ]
    }
  ];

  const faqs = [
    {
      question: 'Can I switch plans at any time?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.'
    },
    {
      question: 'What happens when I exceed my message limit?',
      answer: 'On the Free plan, you\'ll need to wait until the next day for your messages to reset. Paid and Pro plans have higher or unlimited messages.'
    },
    {
      question: 'How does the Fireflies integration work?',
      answer: 'Fireflies requires a separate subscription. Simply add your Fireflies API key in settings to enable automated meeting transcription and note-taking.'
    },
    {
      question: 'Is there a free trial for paid plans?',
      answer: 'Yes! We offer a 30-day money-back guarantee. Try any paid plan risk-free and get a full refund if you\'re not satisfied.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, and PayPal. All payments are processed securely.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Select the perfect plan for your productivity needs
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 transition-all duration-500 hover:scale-105 hover:shadow-3xl ${
                plan.popular ? 'border-4 border-purple-500 transform scale-105' : 'border border-gray-200 dark:border-gray-700'
              }`}
              style={{
                animation: `slideUp 0.6s ease-out ${index * 0.1}s both`
              }}
            >
              {/* Badge */}
              <div className={`inline-block bg-gradient-to-r ${plan.badgeColor} text-white text-sm font-bold px-4 py-1 rounded-full mb-4 ${plan.popular ? 'animate-pulse' : ''}`}>
                {plan.badge}
              </div>

              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                <span className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  ${plan.price}
                </span>
                <span className="text-gray-600 dark:text-gray-400 text-lg">
                  {plan.period}
                </span>
                {plan.yearlyNote && billingCycle === 'yearly' && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ($8.33/month)
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg
                      className={`w-6 h-6 mr-3 flex-shrink-0 ${
                        feature.included ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={feature.included ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}
                      />
                    </svg>
                    <span className={`text-sm ${feature.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600 line-through'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                  plan.buttonStyle === 'outlined'
                    ? 'border-2 border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    : plan.buttonStyle === 'solid'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-2xl'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-2xl'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Important Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-lg mb-16">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-500 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2">🔔 Fireflies Integration</h4>
              <p className="text-blue-800 dark:text-blue-200">
                Requires separate Fireflies subscription. Simply add your Fireflies API key in settings to enable automated meeting transcription and note-taking.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-8 mb-16">
          <div className="flex items-center bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-lg">
            <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Secure Payment</span>
          </div>
          <div className="flex items-center bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-lg">
            <svg className="w-6 h-6 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Cancel Anytime</span>
          </div>
          <div className="flex items-center bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-lg">
            <svg className="w-6 h-6 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="font-semibold text-gray-700 dark:text-gray-300">30-Day Guarantee</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-gray-800 dark:text-white pr-4">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-6 h-6 text-purple-600 flex-shrink-0 transition-transform duration-300 ${
                      openFaq === index ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    openFaq === index ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PricingTab;
