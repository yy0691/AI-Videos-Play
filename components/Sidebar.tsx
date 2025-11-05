import React, { useRef, useMemo, useState } from 'react';
import { Video } from '../types';

interface SidebarProps {
  videos: Video[];
  selectedVideoId: string | null;
  onSelectVideo: (id: string) => void;
  onImportVideo: (file: File) => void;
  onImportFolderSelection: (files: FileList) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}


const VideoItem: React.FC<{video: Video, selectedVideoId: string | null, onSelectVideo: (id: string) => void, isCollapsed: boolean}> = 
({ video, selectedVideoId, onSelectVideo, isCollapsed }) => (
    <a
        href="#"
        onClick={(e) => {
            e.preventDefault();
            onSelectVideo(video.id);
        }}
        className={`w-full flex items-center p-2 text-sm font-medium rounded-xl transition-colors ${
            selectedVideoId === video.id
            ? 'bg-white/60 text-slate-900 font-semibold shadow-sm'
            : 'text-slate-600 hover:bg-white/40 hover:text-slate-900'
        } ${isCollapsed && 'justify-center'}`}
        title={isCollapsed ? video.name : ''}
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
        <span className={`truncate overflow-hidden transition-all duration-200 ${isCollapsed ? 'w-0 ml-0' : 'w-auto ml-3'}`}>{video.name}</span>
    </a>
);


const Sidebar: React.FC<SidebarProps> = ({ videos, selectedVideoId, onSelectVideo, onImportVideo, onImportFolderSelection, isCollapsed, onToggle }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImportVideo(event.target.files[0]);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onImportFolderSelection(event.target.files);
      event.target.value = ''; // Allow re-selecting the same folder
    }
  };

  const handleImportFolderClick = () => {
    folderInputRef.current?.click();
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  const groupedVideos = useMemo(() => {
    const groups: Record<string, Video[]> = {
        '__root__': [] // For videos without a folder
    };
    videos.forEach(video => {
        const key = video.folderPath || '__root__';
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(video);
    });
     if (groups['__root__'].length === 0) {
        delete groups['__root__'];
    }
    return groups;
  }, [videos]);
  
  const sortedFolderKeys = useMemo(() => {
    return Object.keys(groupedVideos).sort((a, b) => {
        if (a === '__root__') return -1;
        if (b === '__root__') return 1;
        return a.localeCompare(b);
    });
  }, [groupedVideos]);


  return (
    <div className={`h-full flex flex-col backdrop-blur-lg bg-white/50 border-r border-white/30 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-80'}`}>
      <div className={`p-4 h-[65px] border-b border-white/30 flex items-center transition-all ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <h1 className="text-xl font-semibold text-slate-800">
            {isCollapsed ? 'T' : 'TLDW'}
        </h1>
        {!isCollapsed && (
             <p className="text-xs text-slate-500">Local Analyzer</p>
        )}
      </div>
      <div className="p-4 space-y-2">
        <button
          onClick={handleImportClick}
          className="w-full h-10 px-4 py-2 inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors bg-slate-900 text-slate-50 hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
           </svg>
          <span className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'w-0 ml-0' : 'w-auto ml-2'}`}>
            Import File
           </span>
        </button>
         <button
          onClick={handleImportFolderClick}
          className="w-full h-10 px-4 py-2 inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors bg-slate-800 text-slate-200 hover:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
           </svg>
          <span className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'w-0 ml-0' : 'w-auto ml-2'}`}>
            Import Folder
           </span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
        />
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderChange}
          className="hidden"
          webkitdirectory=""
          multiple
        />
      </div>
      <nav className="flex-1 px-4 overflow-y-auto">
        <p className={`text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2 transition-all ${isCollapsed ? 'text-center' : 'text-left'}`}>
            {isCollapsed ? 'LIB' : 'My Library'}
        </p>
        <ul className="space-y-1">
          {sortedFolderKeys.map(folderKey => {
                const folderVideos = groupedVideos[folderKey];
                if (folderKey === '__root__') {
                    return folderVideos.map(video => (
                        <li key={video.id}>
                            <VideoItem {...{video, selectedVideoId, onSelectVideo, isCollapsed}} />
                        </li>
                    ));
                }

                const isExpanded = expandedFolders[folderKey] ?? true; // Default to expanded
                
                return (
                    <li key={folderKey}>
                        <button onClick={() => toggleFolder(folderKey)} className={`w-full flex items-center p-2 text-sm font-medium rounded-xl transition-colors text-slate-700 hover:bg-white/40 hover:text-slate-900 ${isCollapsed && 'justify-center'}`} title={isCollapsed ? folderKey : ''}>
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                            </svg>
                            <span className={`truncate overflow-hidden transition-all duration-200 ${isCollapsed ? 'w-0 ml-0' : 'w-auto ml-3 flex-1 text-left'}`}>{folderKey}</span>
                            {!isCollapsed && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            )}
                        </button>
                        {isExpanded && !isCollapsed && (
                            <ul className="pl-4 mt-1 space-y-1">
                                {folderVideos.map(video => (
                                    <li key={video.id}>
                                       <VideoItem {...{video, selectedVideoId, onSelectVideo, isCollapsed}} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                );
            })}
        </ul>
      </nav>
      
      <div className="p-2 mt-auto border-t border-white/30">
        <button
          onClick={onToggle}
          className="w-full p-2 flex items-center justify-center rounded-xl text-slate-600 hover:bg-white/40 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
            {isCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
            )}
        </button>
      </div>

    </div>
  );
};

export default Sidebar;