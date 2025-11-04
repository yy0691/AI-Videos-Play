import React, { useState, useEffect } from 'react';
import { APIConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: APIConfig) => void;
  initialConfig?: APIConfig;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (initialConfig) {
      setApiKey(initialConfig.geminiApiKey || '');
    }
  }, [initialConfig]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave({ geminiApiKey: apiKey });
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md transform transition-all duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">API Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div>
          <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-600 mb-2">
            Google Gemini API Key
          </label>
          <input
            type="password"
            id="geminiApiKey"
            name="geminiApiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-2 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
           <p className="text-xs text-gray-500 mt-2">
            Your key is stored securely in your browser's local database and never leaves your machine.
          </p>
        </div>
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;