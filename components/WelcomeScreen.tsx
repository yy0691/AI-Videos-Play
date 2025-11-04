import React, { useRef, useState } from 'react';

interface WelcomeScreenProps {
  onImportVideo: (file: File) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onImportVideo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImportVideo(event.target.files[0]);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
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
        onImportVideo(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="max-w-lg w-full">
        <h1 className="text-5xl font-bold text-gray-800">TLDW</h1>
        <p className="text-gray-500 mt-2 mb-10">Too Long; Didn't Watch - Learn from long videos 10x faster</p>
        
        <div 
          className={`border-2 border-dashed rounded-xl p-10 transition-all duration-300 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50/50'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25z" />
          </svg>
          <p className="text-gray-600 mb-2">Drag & drop your video here</p>
          <p className="text-gray-400 text-sm mb-6">MP4, WebM, OGG, MOV</p>
          <button 
            onClick={handleImportClick}
            className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all"
          >
            Or Browse Local Files
          </button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
        />
        
        <div className="mt-8 bg-gray-100 p-6 rounded-lg text-left">
            <h3 className="font-semibold text-gray-800 mb-2">Jump to top insights immediately</h3>
            <p className="text-sm text-gray-600">Upload a local video. We'll generate summaries, key info, and topics for you. All processing is done locally on your machine for complete privacy.</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
