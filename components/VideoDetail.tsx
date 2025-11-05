import React, { useState, useEffect, useRef } from 'react';
import { Video, Subtitles, Analysis, AnalysisType, Note } from '../types';
import { parseSubtitleFile, formatTimestamp } from '../utils/helpers';
import { subtitleDB } from '../services/dbService';
import { SummaryPanel, KeyInfoPanel, TopicsPanel } from './AnalysisPanels';
import ChatPanel from './ChatPanel';
import NotesPanel from './NotesPanel';


interface VideoDetailProps {
  video: Video;
  subtitles: Subtitles | null;
  analyses: Analysis[];
  note: Note | null;
  onAnalysesChange: (videoId: string) => void;
  onSubtitlesChange: (videoId: string) => void;
  onDeleteVideo: (videoId: string) => void;
}

type TabType = AnalysisType | 'notes';

const VideoDetail: React.FC<VideoDetailProps> = ({ video, subtitles, analyses, note, onAnalysesChange, onSubtitlesChange, onDeleteVideo }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // State for new subtitle display settings
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
  const [subtitleFontSize, setSubtitleFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [subtitleBgOpacity, setSubtitleBgOpacity] = useState(10); // 0-100
  const activeSegmentRef = useRef<HTMLDivElement>(null);


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
  
  // Find the active subtitle segment and auto-scroll to it
  const activeSegmentIndex = subtitles?.segments.findIndex(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  ) ?? -1;

  useEffect(() => {
    if (activeSegmentRef.current) {
        activeSegmentRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }
  }, [activeSegmentIndex]);

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

  const TABS: TabType[] = ['summary', 'key-info', 'topics', 'chat', 'notes'];
  const fontSizeClasses = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' };

  return (
    <div className="flex-1 p-6 flex space-x-6 overflow-hidden h-full">
      {/* Video Player Section */}
      <div className="w-2/3 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-2xl font-semibold text-slate-800 truncate pr-4">{video.name}</h2>
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-black/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 backdrop-blur-lg bg-white/70 rounded-2xl shadow-lg z-10 border border-white/20 py-1">
                        <button
                            onClick={() => {
                                onDeleteVideo(video.id);
                                setIsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 flex items-center transition-colors"
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
        <div className="bg-black rounded-xl overflow-hidden aspect-video shadow-lg flex-shrink-0">
            {videoUrl && <video ref={videoRef} src={videoUrl} controls className="w-full h-full" onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}/>}
        </div>
         <div className="py-2 flex items-center justify-between">
            <p className="text-sm font-mono text-slate-500">{formatTimestamp(currentTime)} / {formatTimestamp(video.duration)}</p>
            <button onClick={handleScreenshot} className="flex items-center text-sm backdrop-blur-sm bg-white/50 hover:bg-white/80 border border-white/20 text-slate-800 font-medium py-1.5 px-3 rounded-xl transition shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture Frame
            </button>
        </div>
        {/* Enhanced Subtitle Section */}
        <div className="mt-2 backdrop-blur-sm bg-white/30 border border-white/20 p-4 rounded-2xl flex-grow flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h3 className="text-sm font-semibold text-slate-800">Subtitles</h3>
                <div className="flex items-center space-x-2">
                     <button
                        onClick={() => setShowSubtitleSettings(prev => !prev)}
                        className="text-xs backdrop-blur-sm bg-white/50 hover:bg-white/80 border border-white/20 text-slate-800 font-medium p-1.5 rounded-lg transition shadow-sm"
                        aria-label="Toggle subtitle style settings"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                        </svg>
                    </button>
                    <button
                        onClick={handleSubtitleImportClick}
                        className="text-xs backdrop-blur-sm bg-white/50 hover:bg-white/80 border border-white/20 text-slate-800 font-medium py-1 px-2 rounded-lg transition shadow-sm"
                    >
                        Import .srt/.vtt
                    </button>
                </div>
                <input
                    type="file"
                    ref={subtitleInputRef}
                    onChange={handleSubtitleFileChange}
                    className="hidden"
                    accept=".srt,.vtt"
                />
            </div>

            {showSubtitleSettings && (
                <div className="mb-2 p-3 bg-black/5 rounded-lg border border-white/20 text-slate-700 flex-shrink-0">
                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                            <label className="block text-xs font-medium mb-1">Font Size</label>
                            <div className="flex items-center space-x-1 bg-white/40 p-0.5 rounded-md">
                                {(['sm', 'base', 'lg'] as const).map(size => (
                                    <button key={size} onClick={() => setSubtitleFontSize(size)} className={`flex-1 text-xs rounded-md py-0.5 transition ${subtitleFontSize === size ? 'bg-slate-800 text-white shadow' : 'hover:bg-black/10'}`}>
                                        {size === 'sm' ? 'S' : size === 'base' ? 'M' : 'L'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="bg-opacity" className="block text-xs font-medium mb-1">Bg Opacity</label>
                            <input
                                id="bg-opacity"
                                type="range"
                                min="0" max="80" step="5"
                                value={subtitleBgOpacity}
                                onChange={e => setSubtitleBgOpacity(Number(e.target.value))}
                                className="w-full h-1 bg-white/50 rounded-lg appearance-none cursor-pointer accent-slate-800"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex-1 rounded-lg p-2 overflow-y-auto" style={{ backgroundColor: `rgba(0,0,0,${subtitleBgOpacity/100})` }}>
                {subtitles && subtitles.segments.length > 0 ? (
                    <div className="space-y-1">
                        {subtitles.segments.map((segment, index) => {
                            const isActive = activeSegmentIndex === index;
                            return (
                                <div
                                    key={`${segment.startTime}-${index}`}
                                    ref={isActive ? activeSegmentRef : null}
                                    onClick={() => handleSeekTo(segment.startTime)}
                                    className={`p-2 rounded-lg cursor-pointer transition-all duration-200 ${fontSizeClasses[subtitleFontSize]} ${
                                        isActive
                                            ? 'bg-white/90 text-slate-900 font-semibold shadow'
                                            : 'text-white/80 hover:bg-white/20'
                                    }`}
                                >
                                    <p>{segment.text}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-slate-200/80 text-sm">No subtitles loaded. Import a file to see them here.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Analysis & Notes Section */}
      <div className="w-1/3 flex flex-col h-full backdrop-blur-lg bg-white/40 rounded-2xl border border-white/30 shadow-lg">
        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-white/30 p-2">
          <nav className="flex space-x-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 capitalize text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-white/60 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:bg-white/30 hover:text-slate-800'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
            {activeTab === 'summary' && <SummaryPanel video={video} analyses={analyses} onAnalysesChange={() => onAnalysesChange(video.id)} />}
            {activeTab === 'key-info' && <KeyInfoPanel video={video} analyses={analyses} onAnalysesChange={() => onAnalysesChange(video.id)} onSeekTo={handleSeekTo} />}
            {activeTab === 'topics' && <TopicsPanel video={video} analyses={analyses} onAnalysesChange={() => onAnalysesChange(video.id)} />}
            {activeTab === 'chat' && <ChatPanel video={video} subtitles={subtitles} screenshotDataUrl={screenshotDataUrl} onClearScreenshot={() => setScreenshotDataUrl(null)} />}
            {activeTab === 'notes' && <NotesPanel video={video} note={note} />}
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;
