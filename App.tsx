import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import VideoDetail from './components/VideoDetail';
import WelcomeScreen from './components/WelcomeScreen';
import { Video, Subtitles, Analysis, Note } from './types';
import { videoDB, subtitleDB, analysisDB, noteDB, appDB } from './services/dbService';
import { getVideoMetadata } from './utils/helpers';

const App: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [subtitles, setSubtitles] = useState<Record<string, Subtitles>>({});
  const [analyses, setAnalyses] = useState<Record<string, Analysis[]>>({});
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const loadData = useCallback(async () => {
    try {
        const loadedVideos = await videoDB.getAll();
        
        // Sort videos by importedAt date, newest first
        loadedVideos.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

        setVideos(loadedVideos);
        
        if (loadedVideos.length > 0 && !selectedVideoId) {
            setSelectedVideoId(loadedVideos[0].id);
        } else if (loadedVideos.length === 0) {
            setSelectedVideoId(null);
        }
    } catch(err) {
        handleError(err, "Failed to load initial data.");
    }
  }, [selectedVideoId]);
  
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/ exhaustive-deps
  }, []);

  const loadDataForVideo = useCallback(async (videoId: string) => {
    if (!videoId) return;
    try {
        const [videoSubtitles, videoAnalyses, videoNote] = await Promise.all([
            subtitleDB.get(videoId),
            analysisDB.getByVideoId(videoId),
            noteDB.get(videoId)
        ]);

        if (videoSubtitles) {
            setSubtitles(prev => ({...prev, [videoId]: videoSubtitles}));
        }
        if (videoNote) {
            setNotes(prev => ({...prev, [videoId]: videoNote}));
        }
        setAnalyses(prev => ({...prev, [videoId]: videoAnalyses || []}));
    } catch(err) {
        handleError(err, `Failed to load data for video ${videoId}.`);
    }
  }, []);

  useEffect(() => {
    if (selectedVideoId) {
        loadDataForVideo(selectedVideoId);
    }
  }, [selectedVideoId, loadDataForVideo]);

  const handleError = (err: unknown, defaultMessage: string) => {
    const message = err instanceof Error ? err.message : defaultMessage;
    setError(message);
    setTimeout(() => setError(null), 5000);
  }

  const handleImportVideo = async (file: File, folderPath?: string) => {
    try {
      const metadata = await getVideoMetadata(file);
      const newVideo: Video = {
        id: `${folderPath ? folderPath + '/' : ''}${file.name}-${file.lastModified}`,
        file,
        name: file.name,
        folderPath,
        ...metadata,
        importedAt: new Date().toISOString(),
      };
      if (videos.some(v => v.id === newVideo.id)) {
        console.warn(`Video "${newVideo.name}" from "${folderPath}" already imported.`);
        // Optionally, select the existing video
        setSelectedVideoId(newVideo.id);
        return;
      }
      await videoDB.put(newVideo);
      setVideos(prev => {
          const updated = [newVideo, ...prev];
          updated.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
          return updated;
      });
      setSelectedVideoId(newVideo.id);
    } catch (err) {
      handleError(err, `Failed to import video: ${file.name}`);
    }
  };

  const handleImportFolderSelection = async (files: FileList) => {
    if (!files || files.length === 0) {
      return;
    }
  
    try {
      // Create a list of all videos to be imported to process them.
      const videosToImport: { file: File; folderPath: string }[] = [];
      for (const file of Array.from(files)) {
        if (file.type.startsWith('video/')) {
          const relativePath = (file as any).webkitRelativePath || file.name;
          const folderPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
          videosToImport.push({ file, folderPath });
        }
      }
      
      if (videosToImport.length === 0) {
        handleError(new Error("No video files found in the selected folder."), "No videos found.");
        return;
      }
      
      // Using a for...of loop to import sequentially and wait for each one
      for (const { file, folderPath } of videosToImport) {
        await handleImportVideo(file, folderPath);
      }
  
    } catch (err) {
      handleError(err, "An error occurred while importing the folder.");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm('Are you sure you want to delete this video and all its associated data? This action cannot be undone.')) {
        try {
            await appDB.deleteVideo(videoId);
            const remainingVideos = videos.filter(v => v.id !== videoId);
            setVideos(remainingVideos);
            if (selectedVideoId === videoId) {
                // Select the first remaining video, or null if none are left
                setSelectedVideoId(remainingVideos.length > 0 ? remainingVideos[0].id : null);
            }
        } catch (err) {
            handleError(err, "Failed to delete video.");
        }
    }
  };
  
  const selectedVideo = videos.find(v => v.id === selectedVideoId);

  return (
    <div className="h-screen w-screen flex font-sans">
      {error && (
        <div className="absolute top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {videos.length > 0 && selectedVideo ? (
         <>
            <Sidebar
                videos={videos}
                selectedVideoId={selectedVideoId}
                onSelectVideo={setSelectedVideoId}
                onImportVideo={(file) => handleImportVideo(file)}
                onImportFolderSelection={handleImportFolderSelection}
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(prev => !prev)}
            />
            <main className="flex-1 flex flex-col overflow-hidden">
                <VideoDetail 
                    video={selectedVideo} 
                    subtitles={subtitles[selectedVideo.id] || null}
                    analyses={analyses[selectedVideo.id] || []}
                    note={notes[selectedVideo.id] || null}
                    onAnalysesChange={loadDataForVideo}
                    onSubtitlesChange={loadDataForVideo}
                    onDeleteVideo={handleDeleteVideo}
                />
            </main>
         </>
      ) : (
          <WelcomeScreen onImportVideo={(file) => handleImportVideo(file)} onImportFolderSelection={handleImportFolderSelection} />
      )}
    </div>
  );
};

export default App;