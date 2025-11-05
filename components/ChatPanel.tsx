import React, { useState, useEffect, useRef } from 'react';
import { Video, Subtitles, ChatMessage } from '../types';
import { generateChatResponse } from '../services/geminiService';
import { Content } from '@google/genai';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatPanelProps {
  video: Video;
  subtitles: Subtitles | null;
  screenshotDataUrl: string | null;
  onClearScreenshot: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ video, subtitles, screenshotDataUrl, onClearScreenshot }) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset history when video changes
  useEffect(() => {
    setHistory([]);
  }, [video.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);
  
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = { 
        role: 'user', 
        text: currentMessage,
        image: screenshotDataUrl || undefined,
    };
    
    // Update UI immediately
    setHistory(prev => [...prev, userMessage]);
    setCurrentMessage('');
    if (screenshotDataUrl) onClearScreenshot();
    setIsLoading(true);

    try {
        // Convert previous ChatMessage[] to Content[] for the API
        const apiHistory: Content[] = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }] // For simplicity, we don't re-send old images in history
        }));
        
        const subtitlesText = subtitles ? subtitles.segments.map(s => s.text).join(' ') : null;

        const responseText = await generateChatResponse(
            apiHistory,
            { text: userMessage.text, imageB64DataUrl: screenshotDataUrl || undefined },
            video.file,
            subtitlesText
        );
        
        const modelMessage: ChatMessage = { role: 'model', text: responseText };
        setHistory(prev => [...prev, modelMessage]);

    } catch (error) {
        console.error("Chat error:", error);
        const text = error instanceof Error ? `Error: ${error.message}` : "Sorry, I encountered an error. Please try again.";
        const errorMessage: ChatMessage = { role: 'model', text };
        setHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-2">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {history.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'backdrop-blur-sm bg-white/60 text-slate-800'}`}>
                {msg.role === 'user' && msg.image && (
                    <img src={msg.image} alt="user screenshot" className="w-full rounded-md mb-2 max-h-48 object-contain bg-black/20"/>
                )}
                {msg.role === 'model' ? (
                    <MarkdownRenderer content={msg.text} />
                ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                 <div className="max-w-xs rounded-2xl px-4 py-3 backdrop-blur-sm bg-white/60 text-slate-800">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4">
        {screenshotDataUrl && (
            <div className="p-1 border border-white/20 bg-white/50 rounded-lg mb-2 relative inline-block shadow-md">
                <img src={screenshotDataUrl} alt="Screenshot to send" className="w-20 h-20 object-cover rounded"/>
                <button
                    onClick={onClearScreenshot}
                    className="absolute -top-2 -right-2 bg-slate-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm leading-none hover:bg-black"
                    aria-label="Remove screenshot"
                >
                    &times;
                </button>
            </div>
        )}
        <div className="flex items-center">
            <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about the video..."
            className="flex-1 backdrop-blur-sm bg-white/30 border-white/20 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            disabled={isLoading}
            />
            <button onClick={handleSendMessage} disabled={isLoading || !currentMessage.trim()} className="ml-2 bg-slate-900 text-white rounded-lg p-2 disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-slate-900/90 transition-all shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;