import React, { useState, useRef } from 'react';
import { AppState, Platform, Tone, Length, ContentFormat } from './types';
import { generateContent, streamGenerate } from './services/geminiService';
import PreviewCard from './components/PreviewCard';
import { SparkIcon, RefreshIcon, CopyIcon, CheckIcon } from './components/Icons';

function App() {
  const [state, setState] = useState<AppState>({
    prompt: '',
    platform: Platform.Instagram,
    tone: Tone.Casual,
    length: Length.Medium,
    format: ContentFormat.Caption,
    result: null,
    loading: false,
    loadingMessage: '',
    error: null,
  });

  const [copied, setCopied] = useState(false);
  const [editableResult, setEditableResult] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamOutput, setStreamOutput] = useState('');
  const [streamUsage, setStreamUsage] = useState<any>(null);

  const checkAndSelectKey = async () => {
    const win = window as any;
    if (win.aistudio) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        try {
          await win.aistudio.openSelectKey();
          // Small delay to allow environment to propagate key if needed
          await new Promise(r => setTimeout(r, 500));
          return true;
        } catch (e) {
          console.error("Key selection cancelled", e);
          return false;
        }
      }
      return true;
    }
    return true; // If not in the specific env, assume env vars are set
  };

  const handleGenerate = async () => {
    if (!state.prompt.trim()) return;

    // For Image (Post) and Video, strictly require a key selection if available
    if (state.format !== ContentFormat.Caption) {
      const keyReady = await checkAndSelectKey();
      if (!keyReady) {
        setState(prev => ({ ...prev, error: "API Key selection is required for high-quality generation." }));
        return;
      }
    }

    setState((prev) => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      result: null,
      loadingMessage: "Initializing..." 
    }));
    setEditableResult('');

    try {
      const data = await generateContent({
        prompt: state.prompt,
        platform: state.platform,
        tone: state.tone,
        length: state.length,
        format: state.format,
      }, (msg) => setState(prev => ({ ...prev, loadingMessage: msg })));
      
      setState((prev) => ({ ...prev, loading: false, result: data }));
      setEditableResult(`${data.caption}\n\n${data.hashtags.join(' ')}`);

      setTimeout(() => {
         if(window.innerWidth < 768) {
            resultRef.current?.scrollIntoView({ behavior: 'smooth' });
         }
      }, 100);

    } catch (err: any) {
      // Check for specific 404/Not Found which implies key issues
      if (err.message?.includes("Requested entity was not found")) {
        setState((prev) => ({ 
           ...prev, 
           loading: false, 
           error: "API Key issue detected. Please re-select your key." 
        }));
        // Prompt to select key again
        const win = window as any;
        if (win.aistudio) win.aistudio.openSelectKey();
      } else {
        setState((prev) => ({ ...prev, loading: false, error: err.message || "Something went wrong." }));
      }
    }
  };

  const handleStream = async () => {
    if (!state.prompt.trim()) return;
    setStreaming(true);
    setStreamOutput('');
    setStreamUsage(null);

    try {
      const stream = await streamGenerate(state.prompt, undefined, { includeUsage: true });
      for await (const chunk of (stream as any)) {
        const content = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.delta?.content;
        if (content) {
          setStreamOutput((prev) => prev + content);
          // print to stdout for dev-server terminal visibility
          try { process.stdout.write(content); } catch {};
        }
        if (chunk.usage) setStreamUsage(chunk.usage);
      }
    } catch (err: any) {
      console.error('Streaming error', err);
      setStreamOutput((prev) => prev + `\nStreaming error: ${err?.message || String(err)}`);
    } finally {
      setStreaming(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editableResult).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getUniquenessLevel = () => {
     if (!state.result) return null;
     const val = state.result.caption.length % 2; 
     return val === 0 ? "High" : "Very High";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-spark-light selection:text-white pb-20">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-spark to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-spark/20 ring-1 ring-white/50">
              <SparkIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              SparkCaption
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
               onClick={() => (window as any).aistudio?.openSelectKey()} 
               className="text-xs font-medium text-slate-500 hover:text-spark transition-colors hidden md:block"
            >
              API Settings
            </button>
            <div className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 uppercase tracking-wider">
              MVP v2.0
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-5 text-slate-800 flex items-center gap-2">
                Create content
                <span className="text-xs font-normal text-slate-400 ml-auto">Step 1 of 2</span>
              </h2>
              
              {/* Format Toggle */}
              <div className="bg-slate-100 p-1.5 rounded-xl flex mb-6 shadow-inner">
                {[ContentFormat.Caption, ContentFormat.Post, ContentFormat.Video].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setState(prev => ({ ...prev, format: fmt }))}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      state.format === fmt 
                        ? 'bg-white text-spark shadow-sm scale-[1.02]' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              {/* Prompt Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {state.format === ContentFormat.Caption ? "Describe your image" : 
                   state.format === ContentFormat.Video ? "Describe your video idea" : "Describe your post"}
                </label>
                <textarea
                  value={state.prompt}
                  onChange={(e) => setState(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder={state.format === ContentFormat.Caption 
                    ? "e.g., A photo of me drinking coffee in Paris..."
                    : state.format === ContentFormat.Video 
                    ? "e.g., A fast-paced montage of a road trip in California..."
                    : "e.g., 5 tips for productivity with a minimalist desk setup..."}
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-spark focus:border-spark transition-all resize-none text-slate-800 placeholder:text-slate-400 leading-relaxed"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Platform</label>
                  <select
                    value={state.platform}
                    onChange={(e) => setState(prev => ({ ...prev, platform: e.target.value as Platform }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-spark outline-none transition-all hover:border-slate-300"
                  >
                    {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tone</label>
                   <select
                    value={state.tone}
                    onChange={(e) => setState(prev => ({ ...prev, tone: e.target.value as Tone }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-spark outline-none transition-all hover:border-slate-300"
                  >
                    {Object.values(Tone).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleGenerate}
                disabled={state.loading || !state.prompt.trim()}
                className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg shadow-lg shadow-spark/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] ${
                  state.loading || !state.prompt.trim() 
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : 'bg-gradient-to-r from-spark to-spark-dark hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {state.loading ? (
                  <>
                    <RefreshIcon className="w-5 h-5 animate-spin" />
                    <span>{state.loadingMessage || 'Working...'}</span>
                  </>
                ) : (
                  <>
                    <SparkIcon className="w-5 h-5" />
                    <span>Generate {state.format}</span>
                  </>
                )}
              </button>

              {/* Stream Chat Button */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleStream}
                  disabled={streaming || !state.prompt.trim()}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${streaming || !state.prompt.trim() ? 'bg-slate-200 text-slate-400' : 'bg-white text-spark hover:shadow-sm'}`}
                >
                  {streaming ? 'Streaming...' : 'Stream Chat'}
                </button>
              </div>

              {streamOutput && (
                <div className="mt-3 p-3 bg-black/95 text-white rounded-lg font-mono text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {streamOutput}
                  {streamUsage && (
                    <div className="mt-2 text-xs text-gray-300">Reasoning tokens: {String(streamUsage.reasoningTokens || 'n/a')}</div>
                  )}
                </div>
              )}

              {state.error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3">
                  <span className="text-xl">⚠️</span> 
                  <div className="flex-1">
                    <p className="font-medium">Error</p>
                    <p className="text-red-500">{state.error}</p>
                    {state.error.includes("Key") && (
                       <button onClick={() => (window as any).aistudio?.openSelectKey()} className="text-red-700 underline mt-1 font-semibold">
                         Click here to select API Key
                       </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center text-xs text-slate-400 px-4">
               Using <strong>Gemini 3 Pro</strong> for images & <strong>Veo</strong> for video.
               <br/>Requires a valid Google Cloud Project API key.
            </div>
          </div>

          {/* Right Column: Preview & Result */}
          <div className="lg:col-span-7 space-y-6" ref={resultRef}>
            
            {/* Visual Preview */}
            <div className="h-[550px] md:h-[600px] transition-all">
              <PreviewCard 
                platform={state.platform} 
                format={state.format}
                content={state.result ? { ...state.result, caption: editableResult.split('\n\n#')[0] || state.result.caption } : null} 
                loading={state.loading} 
                loadingMessage={state.loadingMessage}
              />
            </div>

            {/* Results Actions Area */}
            {state.result && !state.loading && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-in-up">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <h3 className="font-semibold text-slate-800">Final Polish</h3>
                       <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                         Unique
                       </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={copyToClipboard}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy Text'}
                      </button>
                    </div>
                 </div>

                 <textarea
                    value={editableResult}
                    onChange={(e) => setEditableResult(e.target.value)}
                    className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-spark focus:border-spark outline-none transition-all text-slate-700 font-mono leading-relaxed resize-none"
                 />
                 
                 <div className="mt-4 flex gap-2 flex-wrap">
                    {state.result.emojis.map((emoji, idx) => (
                      <span key={idx} className="inline-flex items-center justify-center w-9 h-9 bg-white rounded-lg border border-slate-200 shadow-sm cursor-default select-none hover:scale-110 hover:border-spark transition-all text-xl">
                        {emoji}
                      </span>
                    ))}
                 </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;