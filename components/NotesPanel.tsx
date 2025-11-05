import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Video, Note } from '../types';
import { noteDB } from '../services/dbService';

const useDebouncedCallback = (callback: (...args: any[]) => void, delay: number) => {
  // Fix: Explicitly initialize useRef with undefined to fix "Expected 1 arguments, but got 0" error.
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  return debouncedCallback;
};


interface NotesPanelProps {
  video: Video;
  note: Note | null;
}

const NotesPanel: React.FC<NotesPanelProps> = ({ video, note }) => {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'typing' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // This effect runs only when the video ID changes, setting the initial content from props.
  useEffect(() => {
    setContent(note?.content || '');
    setLastSaved(note ? new Date(note.updatedAt) : null);
    setStatus('idle');
  }, [video.id, note]);

  const saveNote = useCallback(async (newContent: string) => {
      setStatus('saving');
      try {
          const newNote: Note = {
            id: video.id,
            videoId: video.id,
            content: newContent,
            updatedAt: new Date().toISOString(),
          };
          await noteDB.put(newNote);
          setStatus('saved');
          setLastSaved(new Date(newNote.updatedAt));
      } catch (error) {
          console.error('Failed to save note:', error);
          setStatus('idle');
      }
  }, [video.id]);

  const debouncedSave = useDebouncedCallback(saveNote, 1000);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      setStatus('typing');
      debouncedSave(newContent);
  };
  
  const getStatusText = () => {
      switch (status) {
          case 'typing':
              return 'Typing...';
          case 'saving':
              return 'Saving...';
          case 'saved':
              return `All changes saved.`;
          case 'idle':
              return lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Ready to take notes.';
      }
  };

  return (
    <div className="flex flex-col h-full p-2">
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Write your notes here... Changes are saved automatically."
        className="flex-1 w-full bg-white/40 rounded-lg p-3 text-sm border border-white/20 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none backdrop-blur-sm"
        aria-label="Video notes"
      />
      <div className="mt-2 flex justify-end items-center">
        <p className="text-xs text-slate-500 italic">
          {getStatusText()}
        </p>
      </div>
    </div>
  );
};

export default NotesPanel;