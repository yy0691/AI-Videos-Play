import React, { useRef, useMemo, useState } from 'react';
import { Video } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  videos: Video[];
  selectedVideoId: string | null;
  onSelectVideo: (id: string) => void;
  onImportFiles: (files: FileList) => void;
  onImportFolderSelection: (files: FileList) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
  onDeleteFolder: (folderPath: string) => void;
  isMobile?: boolean;
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


const Sidebar: React.FC<SidebarProps> = ({ videos, selectedVideoId, onSelectVideo, onImportFiles, onImportFolderSelection, isCollapsed, onToggle, onOpenSettings, onDeleteFolder, isMobile = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImportFiles(event.target.files);
      event.target.value = ''; // Allow re-selecting the same files
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
    setExpandedFolders(prev => ({ ...prev, [folderPath]: !(prev[folderPath] ?? true) }));
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
        if (a === '__root__') return 1; // Show root videos at the bottom
        if (b === '__root__') return -1;
        return a.localeCompare(b);
    });
  }, [groupedVideos]);
  
  const folderKeys = useMemo(() => sortedFolderKeys.filter(k => k !== '__root__'), [sortedFolderKeys]);

  const areAllFoldersExpanded = useMemo(() => {
    if (folderKeys.length === 0) return true;
    return folderKeys.every(key => expandedFolders[key] ?? true);
  }, [folderKeys, expandedFolders]);

  const handleToggleAllFolders = () => {
    const nextState = !areAllFoldersExpanded;
    setExpandedFolders(prev => {
        const newState = {...prev};
        folderKeys.forEach(key => {
            newState[key] = nextState;
        });
        return newState;
    });
  };


  return (
    <div className={`h-full flex flex-col backdrop-blur-lg bg-white/50 border-r border-white/30 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-80'}`}>
      <div className={`p-4 h-[65px] border-b border-white/30 flex items-center transition-all ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <h1 className="text-xl font-semibold text-slate-800">
            {isCollapsed ? '💡' : t('appName')}
        </h1>
        {!isCollapsed && (isMobile ? (
            <button onClick={onToggle} className="p-2 -mr-2 rounded-full text-slate-600 hover:bg-white/40" aria-label="Close menu">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        ) : (
             <p className="text-xs text-slate-500">{t('appNameDesc')}</p>
        ))}
      </div>
      <div className="p-4 space-y-2">
        <button
          onClick={handleImportClick}
          className="w-full h-10 px-4 py-2 inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors bg-slate-900 text-slate-50 hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm"
          title={isCollapsed ? t('importFile') : ''}
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
           </svg>
          <span className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'w-0 ml-0' : 'w-auto ml-2'}`}>
            {t('importFile')}
           </span>
        </button>
         <button
          onClick={handleImportFolderClick}
          className="w-full h-10 px-4 py-2 inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors bg-slate-800 text-slate-200 hover:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shadow-sm"
          title={isCollapsed ? t('importFolder') : ''}
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
           </svg>
          <span className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'w-0 ml-0' : 'w-auto ml-2'}`}>
            {t('importFolder')}
           </span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="video/mp4,video/webm,video/ogg,video/quicktime,.srt,.vtt"
          multiple
        />
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderChange}
          className="hidden"
          // @ts-ignore
          webkitdirectory=""
          multiple
        />
      </div>
      <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-2 mb-2">
            <p className={`text-xs font-semibold text-slate-400 uppercase tracking-wider transition-all ${isCollapsed ? 'text-center' : ''}`}>
                {isCollapsed ? t('library') : t('myLibrary')}
            </p>
            {!isCollapsed && folderKeys.length > 0 && (
                <button onClick={handleToggleAllFolders} title={areAllFoldersExpanded ? t('collapseAll') : t('expandAll')} className="text-slate-500 hover:text-slate-800 p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3.5 h-3.5 transition-transform duration-200 ${!areAllFoldersExpanded ? 'rotate-180' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                    </svg>
                </button>
            )}
        </div>
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
                        <div className="flex items-center group">
                            <button onClick={() => toggleFolder(folderKey)} className={`flex-1 flex items-center p-2 text-sm font-medium rounded-xl transition-colors text-slate-700 hover:bg-white/40 hover:text-slate-900 ${isCollapsed && 'justify-center'}`} title={isCollapsed ? folderKey : ''}>
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
                             {!isCollapsed && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteFolder(folderKey);
                                    }}
                                    className="p-1 mr-1 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    title={`${t('deleteFolder')} "${folderKey}"`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.033-2.134H8.71c-1.123 0-2.033.954-2.033 2.134v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </button>
                            )}
                        </div>
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
      
      <div className="mt-auto border-t border-white/30 p-3">
        {!isCollapsed && (
            <div className="px-1 pb-3 text-xs text-slate-500 space-y-2">
                <p dangerouslySetInnerHTML={{ __html: t('acknowledgement', 'https://github.com/SamuelZ12/TLDW') }} />
                <div className="flex items-center space-x-4">
                    <a href="https://www.luoyuanai.cn" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-600">{t('contactAuthor')}</a>
                    <a href="https://n1ddxc0sfaq.feishu.cn/share/base/form/shrcnf7gC1S58t8Av4x4eNxWSlh" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-600">{t('submitFeedback')}</a>
                </div>
            </div>
        )}
        <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2 justify-center' : 'justify-between'}`}>
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors"
              aria-label={t('settings')}
              title={t('settings')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
            {!isMobile && (
                <button
                    onClick={onToggle}
                    className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors"
                    aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
                    title={isCollapsed ? t('tooltipExpandSidebar') : t('tooltipCollapseSidebar')}
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="currentColor" className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                        <path d="M800 160a128 128 0 0 1 128 128v448a128 128 0 0 1-128 128H224a128 128 0 0 1-128-128V288a128 128 0 0 1 128-128h576zM352 224H224a64 64 0 0 0-64 64v448a64 64 0 0 0 64 64h128V224z m448 0H416v576h384a64 64 0 0 0 64-64V288a64 64 0 0 0-64-64zM288 480a32 32 0 0 1 0 64H224a32 32 0 0 1 0-64h64z m0-96a32 32 0 0 1 0 64H224a32 32 0 0 1 0-64h64z m0-96a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64h64z" />
                    </svg>
                </button>
            )}
        </div>
      </div>

    </div>
  );
};

export default Sidebar;