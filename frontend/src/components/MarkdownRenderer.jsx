import React from 'react';

const MarkdownRenderer = ({ content }) => {
  const renderMarkdown = (text) => {
    if (!text) return '';
    
    // Split by lines
    const lines = text.split('\n');
    const elements = [];
    
    lines.forEach((line, index) => {
      // Skip empty lines
      if (line.trim() === '') {
        elements.push(<br key={`br-${index}`} />);
        return;
      }
      
      // Handle headers (##)
      if (line.startsWith('## ')) {
        const headerText = line.replace('## ', '');
        elements.push(
          <h2 key={index} className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">
            {renderInlineMarkdown(headerText)}
          </h2>
        );
        return;
      }
      
      // Handle headers (###)
      if (line.startsWith('### ')) {
        const headerText = line.replace('### ', '');
        elements.push(
          <h3 key={index} className="text-lg font-semibold mt-3 mb-2 text-gray-800 dark:text-gray-100">
            {renderInlineMarkdown(headerText)}
          </h3>
        );
        return;
      }
      
      // Handle bullet points (*, -, •)
      if (line.match(/^[*\-•]\s+/)) {
        const bulletText = line.replace(/^[*\-•]\s+/, '');
        elements.push(
          <div key={index} className="flex items-start space-x-2 ml-2 my-1">
            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
            <span className="flex-1">{renderInlineMarkdown(bulletText)}</span>
          </div>
        );
        return;
      }
      
      // Regular paragraph
      elements.push(
        <p key={index} className="my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
    
    return elements;
  };
  
  const renderInlineMarkdown = (text) => {
    const parts = [];
    let currentIndex = 0;
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }
      
      const matchedText = match[0];
      
      // Bold (**text**)
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        const boldText = matchedText.slice(2, -2);
        parts.push(
          <strong key={match.index} className="font-bold text-gray-900 dark:text-white">
            {boldText}
          </strong>
        );
      }
      // Italic (*text*)
      else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        const italicText = matchedText.slice(1, -1);
        parts.push(
          <em key={match.index} className="italic">
            {italicText}
          </em>
        );
      }
      // Code (`text`)
      else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
        const codeText = matchedText.slice(1, -1);
        parts.push(
          <code key={match.index} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-blue-600 dark:text-blue-400">
            {codeText}
          </code>
        );
      }
      
      currentIndex = match.index + matchedText.length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };
  
  return (
    <div className="markdown-content">
      {renderMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;
