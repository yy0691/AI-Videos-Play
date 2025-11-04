import React, { useState, useEffect, useRef } from 'react';
import { Video, Subtitles, APIConfig, ChatMessage } from '../types';
import { generateChatResponse } from '../services/geminiService';
import { Content } from '@google/genai';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatPanelProps {
  video: Video;
  subtitles: Subtitles | null;
  apiConfig: APIConfig | null;
  onShowSettings: () => void;
  screenshotDataUrl: string | null;
  onClearScreenshot: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ video, subtitles, apiConfig, onShowSettings, screenshotDataUrl, onClearScreenshot }) => {
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
    if (!currentMessage.trim() || isLoading || !apiConfig?.geminiApiKey) return;

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
            apiConfig.geminiApiKey,
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

  if (!apiConfig?.geminiApiKey) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-sm text-gray-500 mb-4">Please set your Gemini API key in settings to enable the chat.</p>
            <button onClick={onShowSettings} className="bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-all text-sm">
                Go to Settings
            </button>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-2">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {history.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
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
                 <div className="max-w-xs rounded-2xl px-4 py-3 bg-gray-200 text-gray-800">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4">
        {screenshotDataUrl && (
            <div className="p-1 border border-gray-300 bg-white rounded-lg mb-2 relative inline-block">
                <img src={screenshotDataUrl} alt="Screenshot to send" className="w-20 h-20 object-cover rounded"/>
                <button
                    onClick={onClearScreenshot}
                    className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm leading-none hover:bg-black"
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
            className="flex-1 bg-gray-200 border-transparent rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
            />
            <button onClick={handleSendMessage} disabled={isLoading || !currentMessage.trim()} className="ml-2 bg-indigo-600 text-white rounded-lg p-2 disabled:bg-indigo-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all">
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