import React, { useState, useEffect, useRef } from 'react';
import { Video, Subtitles, Analysis, AnalysisType, APIConfig, Note } from '../types';
import { parseSubtitleFile, formatTimestamp } from '../utils/helpers';
import { analysisDB, subtitleDB } from '../services/dbService';
import { SummaryPanel, KeyInfoPanel, TopicsPanel } from './AnalysisPanels';
import ChatPanel from './ChatPanel';
import NotesPanel from './NotesPanel';


interface VideoDetailProps {
  video: Video;
  subtitles: Subtitles | null;
  analyses: Analysis[];
  note: Note | null;
  apiConfig: APIConfig | null;
  onAnalysesChange: (videoId: string) => void;
  onSubtitlesChange: (videoId: string) => void;
  onShowSettings: () => void;
  onDeleteVideo: (videoId: string) => void;
}

type TabType = AnalysisType | 'notes';

const VideoDetail: React.FC<VideoDetailProps> = ({ video, subtitles, analyses, note, apiConfig, onAnalysesChange, onSubtitlesChange, onShowSettings, onDeleteVideo }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const url = URL.createObjectURL(video.file);
    setVideoUrl(url);
    setActiveTab('summary');
    setScreenshotDataUrl(null); // Clear screenshot for new video
    return () => URL.revokeObjectURL(url);
  }, [video]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleSeekTo = (time: number) => {
    if (videoRef.current) {
        videoRef.current.currentTime = time;
    }
  };

  const handleSubtitleImportClick = () => {
    subtitleInputRef.current?.click();
  };

  const handleScreenshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setScreenshotDataUrl(dataUrl);
        // Switch to chat tab automatically for a better UX
        setActiveTab('chat');
    }
  };

  const handleSubtitleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target?.result as string;
            const segments = parseSubtitleFile(file.name, content);
            const newSubtitles: Subtitles = {
                id: video.id,
                videoId: video.id,
                segments,
            };
            await subtitleDB.put(newSubtitles);
            onSubtitlesChange(video.id);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to parse subtitle file.');
        }
    };
    reader.readAsText(file);
  };
  
  const getActiveSubtitle = (): string => {
    if (!subtitles) return '';
    const activeSegment = subtitles.segments.find(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime
    );
    return activeSegment ? activeSegment.text : '';
  };

  const TABS: TabType[] = ['summary', 'key-info', 'topics', 'chat', 'notes'];

  return (
    <div className="flex-1 p-6 flex space-x-6 overflow-hidden h-full">
      {/* Video Player Section */}
      <div className="w-2/3 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-2xl font-semibold text-gray-800 truncate pr-4">{video.name}</h2>
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-100 py-1">
                        <button
                            onClick={() => {
                                onDeleteVideo(video.id);
                                setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                            </svg>
                            Delete Video
                        </button>
                    </div>
                )}
            </div>
        </div>
        <div className="bg-black rounded-lg overflow-hidden aspect-video shadow-lg flex-shrink-0">
            {videoUrl && <video ref={videoRef} src={videoUrl} controls className="w-full h-full" onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}/>}
        </div>
         <div className="py-2 flex items-center justify-between">
            <p className="text-sm font-mono text-gray-500">{formatTimestamp(currentTime)} / {formatTimestamp(video.duration)}</p>
            <button onClick={handleScreenshot} className="flex items-center text-sm bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-medium py-1.5 px-3 rounded-lg transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture Frame
            </button>
        </div>
        <div className="mt-2 bg-gray-100 p-4 rounded-lg flex-grow flex flex-col">
             <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h3 className="font-semibold text-gray-700">Subtitles</h3>
                <button onClick={handleSubtitleImportClick} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-md transition">Import File</button>
                <input type="file" ref={subtitleInputRef} onChange={handleSubtitleFileChange} className="hidden" accept=".srt,.vtt" />
            </div>
            <div className="h-24 bg-gray-200/50 rounded-md p-3 text-center text-gray-600 overflow-y-auto flex items-center justify-center flex-grow">
                <p>{getActiveSubtitle() || (subtitles ? '...' : 'No subtitles loaded.')}</p>
            </div>
        </div>
      </div>

      {/* Analysis Section */}
      <div className="w-1/3 bg-gray-100 rounded-lg flex flex-col p-1 h-full">
        <div className="flex border-b border-gray-200 p-2 space-x-1">
          {TABS.map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition flex-1 capitalize ${
                activeTab === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
        <div className="flex-1 p-1 overflow-y-auto">
          {activeTab === 'summary' && (
            <SummaryPanel video={video} apiConfig={apiConfig} analyses={analyses} onAnalysesChange={onAnalysesChange} onShowSettings={onShowSettings}/>
          )}
           {activeTab === 'key-info' && (
            <KeyInfoPanel video={video} apiConfig={apiConfig} analyses={analyses} onAnalysesChange={onAnalysesChange} onShowSettings={onShowSettings} onSeekTo={handleSeekTo} />
          )}
           {activeTab === 'topics' && (
            <TopicsPanel video={video} apiConfig={apiConfig} analyses={analyses} onAnalysesChange={onAnalysesChange} onShowSettings={onShowSettings}/>
          )}
          {activeTab === 'chat' && (
            <ChatPanel video={video} apiConfig={apiConfig} subtitles={subtitles} onShowSettings={onShowSettings} screenshotDataUrl={screenshotDataUrl} onClearScreenshot={() => setScreenshotDataUrl(null)}/>
          )}
          {activeTab === 'notes' && (
            <NotesPanel video={video} note={note} />
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;