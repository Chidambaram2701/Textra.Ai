import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Role, Message } from '../types';
import { User, Bot, Copy, Check, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

// Separate component for code blocks to handle copy state efficiently
const CodeBlock = ({ language, children }: { language: string | undefined, children: string }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="my-4 rounded-md overflow-hidden border border-gray-200 dark:border-gray-500/20 bg-gray-50 dark:bg-black/30">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-500/10 border-b border-gray-200 dark:border-gray-500/20 text-xs text-gray-600 dark:text-gray-200">
        <span className="font-medium lowercase text-gray-500 dark:text-gray-400">{language || 'code'}</span>
        <button 
          onClick={onCopy} 
          className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy code'}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto bg-white dark:bg-black/10 text-gray-800 dark:text-gray-100">
        <code className="text-sm font-mono leading-relaxed !bg-transparent whitespace-pre">
          {children}
        </code>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [messageCopied, setMessageCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className={`w-full border-b border-black/5 dark:border-white/5 animate-fade-in-up ${
      isUser ? 'bg-transparent' : 'bg-gray-50 dark:bg-[#444654]'
    }`}>
      <div className="max-w-3xl mx-auto flex gap-4 p-4 md:py-8 lg:px-6">
        
        {/* Avatar */}
        <div className="flex-shrink-0 flex flex-col relative">
          <div className={`w-8 h-8 rounded-sm flex items-center justify-center shadow-sm ${
            isUser ? 'bg-indigo-500' : 'bg-primary-500'
          } ${!isUser && message.isStreaming ? 'animate-pulse' : ''}`}>
            {isUser ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 overflow-hidden min-w-0">
          {/* Header (Mobile mostly) */}
          <div className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-1 opacity-90 select-none">
            {isUser ? 'You' : 'Textra AI'}
          </div>

          {/* Image Attachment (if any) */}
          {message.image && (
            <div className="mb-4 mt-2">
              <img 
                src={message.image} 
                alt="Attachment" 
                className="max-w-full md:max-w-sm rounded-lg border border-black/10 dark:border-white/10 shadow-md"
                loading="lazy"
              />
            </div>
          )}

          {/* Markdown Content */}
          {message.content && (
            <div className={`prose dark:prose-invert max-w-none text-[15px] md:text-base leading-7 text-gray-800 dark:text-gray-100 ${message.error ? 'text-red-500 dark:text-red-400' : ''}`}>
               {message.error ? (
                 <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-lg">
                   <AlertCircle className="w-5 h-5 flex-shrink-0" />
                   <span>{message.content}</span>
                 </div>
               ) : (
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !String(children).includes('\n');
                        
                        return !isInline ? (
                          <CodeBlock language={match?.[1]} children={String(children).replace(/\n$/, '')} />
                        ) : (
                          <code className="bg-gray-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm text-gray-800 dark:text-white font-mono" {...props}>
                            {children}
                          </code>
                        );
                      },
                      ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                      h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-gray-200 dark:border-white/10">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-4">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-500 hover:text-primary-500 dark:hover:text-primary-400 underline decoration-primary-500/30 underline-offset-2 transition-colors">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {/* Append blinking cursor during streaming */}
                    {message.content + (message.isStreaming ? ' ' : '')}
                  </ReactMarkdown>
               )}
               {message.isStreaming && (
                  <span className="inline-block w-2.5 h-5 bg-gray-400 dark:bg-gray-200 ml-1 animate-blink align-middle" />
               )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {!message.isStreaming && !message.error && message.content && (
            <div className="flex-shrink-0 flex flex-col items-end opacity-0 hover:opacity-100 transition-opacity">
               <button
                  onClick={handleCopyMessage}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  title="Copy message"
               >
                  {messageCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
               </button>
            </div>
        )}
      </div>
    </div>
  );
};

// Use memo to optimize performance
export default memo(MessageBubble);