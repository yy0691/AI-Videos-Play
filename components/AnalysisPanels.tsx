import React, { useState } from 'react';
import { Video, Analysis, APIConfig, AnalysisType } from '../types';
import { analyzeVideoWithGemini } from '../services/geminiService';
import { analysisDB } from '../services/dbService';
import { parseTimestampToSeconds } from '../utils/helpers';
import MarkdownRenderer from './MarkdownRenderer';

interface PanelProps {
  video: Video;
  analyses: Analysis[];
  apiConfig: APIConfig | null;
  onAnalysesChange: (videoId: string) => void;
  onShowSettings: () => void;
}

const analysisPrompts: Omit<Record<AnalysisType, string>, 'chat'> = {
  summary: "Provide a concise summary of this video. Highlight the main points and key takeaways. Format the output using Markdown.",
  'key-info': "Analyze this video and extract key information as a list of events. For each event, provide a timestamp at the start of the line in the exact format [HH:MM:SS]. Format the entire output as a Markdown list.",
  topics: "Identify the main topics and themes discussed or shown in this video. List them as Markdown bullet points with a brief explanation for each.",
};

const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
];

const AnalysisContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="p-3 h-full">{children}</div>
);

const GenerateButton: React.FC<{ onGenerate: () => void; extraContent?: React.ReactNode }> = ({ onGenerate, extraContent }) => (
    <div className="flex flex-col items-center justify-center h-full text-center">
        {extraContent}
        <button onClick={onGenerate} className="bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-all">
          Generate
        </button>
    </div>
);

const LoadingIndicator: React.FC<{ text: string }> = ({ text }) => (
     <div className="flex flex-col items-center justify-center h-full space-y-2 text-center">
        <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm text-gray-500">{text}</p>
    </div>
);

const APIKeyCTA: React.FC<{ onShowSettings: () => void, feature: string }> = ({ onShowSettings, feature }) => (
     <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-sm text-gray-500 mb-4">Please set your Gemini API key in settings to generate {feature}.</p>
        <button onClick={onShowSettings} className="bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-all text-sm">
            Go to Settings
        </button>
    </div>
);

const ResultDisplay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-gray-700 text-sm leading-relaxed p-1">
        {typeof children === 'string' ? <MarkdownRenderer content={children} /> : children}
    </div>
);


const useAnalysis = (type: AnalysisType, { video, analyses, apiConfig, onAnalysesChange, onShowSettings }: PanelProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const analysis = analyses.find(a => a.type === type);
    const hasApiKey = !!apiConfig?.geminiApiKey;

    const handleGenerate = async (prompt: string) => {
        if (!hasApiKey) {
            onShowSettings();
            return;
        }
        setIsLoading(true);
        try {
            const result = await analyzeVideoWithGemini(apiConfig.geminiApiKey, video.file, prompt);
            const newAnalysis: Analysis = {
                id: `${video.id}-${type}-${new Date().getTime()}`,
                videoId: video.id,
                type,
                prompt,
                result,
                createdAt: new Date().toISOString(),
            };
            await analysisDB.put(newAnalysis);
            onAnalysesChange(video.id);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return { isLoading, analysis, hasApiKey, handleGenerate };
};

export const SummaryPanel: React.FC<PanelProps> = (props) => {
    const { isLoading, analysis, hasApiKey, handleGenerate } = useAnalysis('summary', props);
    const [language, setLanguage] = useState('en');

    const generate = () => {
        const langName = languages.find(l => l.code === language)?.name || 'English';
        const prompt = `${analysisPrompts.summary} Please provide the output in ${langName}.`;
        handleGenerate(prompt);
    };

    return (
        <AnalysisContainer>
            {isLoading && <LoadingIndicator text="Generating summary..."/>}
            {!isLoading && analysis && <ResultDisplay>{analysis.result}</ResultDisplay>}
            {!isLoading && !analysis && hasApiKey && 
                <GenerateButton 
                    onGenerate={generate}
                    extraContent={
                        <div className="mb-4">
                             <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-gray-200 border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                            </select>
                        </div>
                    }
                />}
            {!isLoading && !analysis && !hasApiKey && <APIKeyCTA onShowSettings={props.onShowSettings} feature="summaries" />}
        </AnalysisContainer>
    );
}

export const KeyInfoPanel: React.FC<PanelProps & {onSeekTo: (time: number) => void}> = (props) => {
    const { isLoading, analysis, hasApiKey, handleGenerate } = useAnalysis('key-info', props);
    
    const renderResultWithTimestamps = (text: string) => {
        const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
        const parts = text.split(timestampRegex);

        return parts.map((part, index) => {
            if (index % 2 === 1) { // This is a timestamp
                const timeInSeconds = parseTimestampToSeconds(part);
                return (
                    <button key={index} onClick={() => props.onSeekTo(timeInSeconds)} className="bg-indigo-100 text-indigo-700 font-mono font-semibold px-1.5 py-0.5 rounded-md text-xs hover:bg-indigo-200 transition mx-1">
                        {part}
                    </button>
                );
            }
             // Render the text part as markdown
            return <MarkdownRenderer key={index} content={part} />;
        });
    };

    return (
        <AnalysisContainer>
            {isLoading && <LoadingIndicator text="Extracting key info..."/>}
            {!isLoading && analysis && <div className="text-gray-700 text-sm leading-relaxed p-1">{renderResultWithTimestamps(analysis.result)}</div>}
            {!isLoading && !analysis && hasApiKey && <GenerateButton onGenerate={() => handleGenerate(analysisPrompts['key-info'])} />}
            {!isLoading && !analysis && !hasApiKey && <APIKeyCTA onShowSettings={props.onShowSettings} feature="key information" />}
        </AnalysisContainer>
    );
}

export const TopicsPanel: React.FC<PanelProps> = (props) => {
    const { isLoading, analysis, hasApiKey, handleGenerate } = useAnalysis('topics', props);
    return (
        <AnalysisContainer>
            {isLoading && <LoadingIndicator text="Identifying topics..."/>}
            {!isLoading && analysis && <ResultDisplay>{analysis.result}</ResultDisplay>}
            {!isLoading && !analysis && hasApiKey && <GenerateButton onGenerate={() => handleGenerate(analysisPrompts.topics)} />}
            {!isLoading && !analysis && !hasApiKey && <APIKeyCTA onShowSettings={props.onShowSettings} feature="topics" />}
        </AnalysisContainer>
    );
};