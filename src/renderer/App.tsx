import React, { useEffect } from 'react';
import { useStore } from './store';
import FileInput from './components/FileInput';
import ProcessingOptions from './components/ProcessingOptions';
import ProcessButton from './components/ProcessButton';
import ProgressDisplay from './components/ProgressDisplay';
import ResultsDisplay from './components/ResultsDisplay';
import './App.css';

const App: React.FC = () => {
  const { isProcessing, updateProgress } = useStore();

  useEffect(() => {
    // Listen for processing progress updates from main process
    if (window.electronAPI) {
      window.electronAPI.onProcessingProgress((progress) => {
        updateProgress(progress);
      });

      return () => {
        window.electronAPI.removeProcessingProgressListener();
      };
    }
  }, [updateProgress]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎨 Apnger</h1>
        <p>Multi-Platform Emote Converter</p>
      </header>

      <main className="app-main">
        <div className="card">
          <h2>1. Select Video</h2>
          <FileInput />
        </div>

        <div className="card">
          <h2>2. Configure Options</h2>
          <ProcessingOptions />
        </div>

        <div className="card">
          <h2>3. Export Emotes</h2>
          <ProcessButton />
        </div>

        {isProcessing && (
          <div className="card">
            <h2>Processing...</h2>
            <ProgressDisplay />
          </div>
        )}

        <ResultsDisplay />
      </main>

      <footer className="app-footer">
        <p>Supports Twitch, Discord Stickers, Discord Emotes, and 7TV</p>
      </footer>
    </div>
  );
};

export default App;
