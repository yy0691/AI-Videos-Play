import React, { useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useLanguage } from '../contexts/LanguageContext';

interface WelcomeScreenProps {
  onImportFiles: (files: FileList) => void;
  onImportFolderSelection: (files: FileList) => void;
  onLogin: () => void;
  onRegister: () => void;
  onOpenAccount?: () => void;
  currentUser?: User | null;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onImportFiles,
  onImportFolderSelection,
  onLogin,
  onRegister,
  onOpenAccount,
  currentUser,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImportFiles(event.target.files);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onImportFolderSelection(event.target.files);
      event.target.value = '';
    }
  };

  const handleImportFolderClick = () => {
    folderInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden bg-[#f6f8fc]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 right-[-10%] h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,_rgba(118,131,255,0.18)_0%,rgba(118,131,255,0)_70%)] blur-[120px]" />
        <div className="absolute -bottom-32 left-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,_rgba(97,181,255,0.16)_0%,rgba(97,181,255,0)_70%)] blur-[130px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-white/40" />
      </div>

      <div className="relative z-10 flex flex-col min-h-full items-center px-6 sm:px-8 lg:px-12 py-12">
        <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#5564f6] to-[#8aa1ff] shadow-lg shadow-[#5564f6]/20 flex items-center justify-center">
              <span className="text-lg font-semibold text-white tracking-wider">AI</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">InsightReel</p>
              <h1 className="text-2xl font-semibold text-slate-900">Video Intelligence Studio</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                onClick={() => onOpenAccount?.()}
                className="px-4 py-2 rounded-full border border-slate-300 text-sm font-medium text-slate-600 bg-white/80 backdrop-blur-lg hover:bg-white transition"
              >
                {currentUser.email || 'Account'}
              </button>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="px-4 py-2 rounded-full text-sm font-medium text-slate-600 border border-slate-300 bg-white/80 hover:bg-white transition"
                >
                  登录
                </button>
                <button
                  onClick={onRegister}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-[#5564f6] hover:bg-[#4654e1] transition shadow-md shadow-[#5564f6]/30"
                >
                  注册
                </button>
              </>
            )}
          </div>
        </header>

        <div className="w-full max-w-5xl mx-auto flex flex-col items-center pb-16 text-slate-900">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs uppercase tracking-[0.3em] text-slate-500 shadow-sm">
            ⚡ {t('welcomeBoxTitle')}
          </div>
          <h2 className="mt-6 text-center text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 leading-tight max-w-4xl">
            {t('welcomeTitle')}
          </h2>
          <p className="mt-5 text-lg md:text-xl text-slate-600 max-w-3xl leading-relaxed text-center">
            {t('welcomeSubtitle')}
          </p>

          <div
            className={`relative mt-12 w-full max-w-3xl group transition-all duration-500 ${isDragging ? 'scale-[1.01]' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div
              className={`absolute inset-0 rounded-[28px] bg-[radial-gradient(circle,_rgba(120,134,255,0.25)_0%,rgba(120,134,255,0)_65%)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${
                isDragging ? 'opacity-100' : ''
              }`}
              aria-hidden
            />
            <div
              className={`relative rounded-[26px] border border-slate-200 bg-white backdrop-blur-xl p-10 md:p-12 shadow-[0_25px_60px_rgba(85,100,246,0.12)] transition-all duration-300 ${
                isDragging
                  ? 'border-[#5564f6]/60 shadow-[0_25px_60px_rgba(85,100,246,0.2)]'
                  : 'hover:border-[#5564f6]/40 hover:shadow-[0_25px_60px_rgba(85,100,246,0.16)]'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center bg-[#eef2ff] text-[#4c5cf2] transition-transform duration-300 ${
                    isDragging ? 'scale-110 shadow-[0_0_35px_rgba(85,100,246,0.35)]' : 'group-hover:scale-110'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#4c5cf2]"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900 tracking-wide">
                  {t('dropTarget')}
                </h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                  {t('dropTargetHint')}
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
                  <button
                    onClick={handleImportClick}
                    className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#5564f6] text-white font-semibold shadow-md shadow-[#5564f6]/30 hover:bg-[#4654e1] transition"
                  >
                    {t('browseFile')}
                  </button>
                  <button
                    onClick={handleImportFolderClick}
                    className="w-full sm:w-auto px-7 py-3 rounded-full border border-slate-300 text-slate-600 font-medium bg-white/80 backdrop-blur hover:bg-white transition"
                  >
                    {t('importFolder')}
                  </button>
                </div>
              </div>
            </div>
          </div>

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

          <div className="mt-12 grid w-full gap-4 sm:grid-cols-3 text-left">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">多引擎</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">智能路由驱动的字幕、分析与翻译能力</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">批量</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">文件夹导入、多任务并发与进度可视化</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">云同步</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">自动同步字幕、分析与聊天记录至云端</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
