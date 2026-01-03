import React from 'react';
import { Platform, GeneratedContent, ContentFormat } from '../types';
import { HeartIcon, CommentIcon, ShareIcon } from './Icons';

interface PreviewCardProps {
  platform: Platform;
  format: ContentFormat;
  content: GeneratedContent | null;
  loading: boolean;
  loadingMessage?: string;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ platform, format, content, loading, loadingMessage }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full min-h-[400px] flex flex-col items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-white via-slate-50 to-white opacity-80 z-0"></div>
        <div className="z-10 flex flex-col items-center">
           <div className="w-16 h-16 border-4 border-spark-light/30 border-t-spark rounded-full animate-spin mb-6"></div>
           <h3 className="text-gray-900 font-semibold text-lg mb-2 animate-pulse">Creating Magic</h3>
           <p className="text-gray-500 text-sm">{loadingMessage || "Generating content..."}</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 backdrop-blur-sm">
        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-50 to-purple-50 rounded-full flex items-center justify-center mb-6 text-spark shadow-inner">
           <span className="text-4xl">🎨</span>
        </div>
        <h3 className="text-gray-900 font-semibold text-xl mb-3">Canvas Empty</h3>
        <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
          Choose <strong>{format}</strong> mode to generate high-quality content tailored for {platform}.
        </p>
      </div>
    );
  }

  const { caption, hashtags, imageUrl, videoUrl } = content;
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Common footer for social posts
  const SocialFooter = () => (
    <div className="flex justify-between text-gray-800 mt-2">
      <div className="flex gap-4">
        <HeartIcon className="w-6 h-6" />
        <CommentIcon className="w-6 h-6" />
        <ShareIcon className="w-6 h-6" />
      </div>
    </div>
  );

  const UserHeader = () => (
    <div className="p-3 flex items-center justify-between border-b border-gray-50/50">
      <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
            <div className="w-full h-full bg-white rounded-full border-2 border-transparent overflow-hidden">
               <div className="w-full h-full bg-gray-200" />
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-900">spark_creator</span>
      </div>
      <span className="text-gray-400 text-xs">•••</span>
    </div>
  );

  // Render logic based on Platform
  const renderContent = () => {
    switch (platform) {
      case Platform.Twitter:
        return (
          <div className="p-5 bg-white min-h-full">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="font-bold text-gray-900">Spark Creator</span>
                  <span className="text-gray-500 text-sm">@spark_ai · 1m</span>
                </div>
                <p className="text-gray-900 text-[15px] whitespace-pre-wrap mb-3 leading-relaxed">{caption}</p>
                <p className="text-blue-500 text-[15px] mb-3">{hashtags.join(' ')}</p>
                
                {/* Visual Preview */}
                <div className="mt-2 mb-3 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  {videoUrl ? (
                    <video src={videoUrl} controls autoPlay muted loop className="w-full h-auto max-h-[400px] object-cover" />
                  ) : imageUrl ? (
                    <img src={imageUrl} alt="Generated" className="w-full h-auto object-cover max-h-[300px]" />
                  ) : null}
                </div>
                
                <div className="flex justify-between text-gray-500 max-w-xs mt-2">
                  <CommentIcon className="w-5 h-5" />
                  <HeartIcon className="w-5 h-5" />
                  <ShareIcon className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        );

      case Platform.LinkedIn:
        return (
          <div className="bg-white min-h-full flex flex-col">
             <div className="p-4 flex items-center gap-3 border-b border-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <div className="flex flex-col">
                   <span className="text-sm font-semibold text-gray-800">Spark Creator</span>
                   <span className="text-xs text-gray-500">AI Content Specialist • 1m • 🌐</span>
                </div>
             </div>
             <div className="p-4 pb-2 flex-1">
                <p className="text-sm text-gray-800 whitespace-pre-wrap mb-4 leading-relaxed">{caption}</p>
                <p className="text-sm text-blue-600 font-medium mb-4">{hashtags.join(' ')}</p>
             </div>
             
             {/* Visual Preview */}
             {(imageUrl || videoUrl) && (
                <div className="w-full bg-gray-100 overflow-hidden border-y border-gray-100">
                   {videoUrl ? (
                      <video src={videoUrl} controls className="w-full max-h-[400px] object-cover" />
                   ) : (
                      <img src={imageUrl} alt="Content" className="w-full h-auto object-cover max-h-[400px]" />
                   )}
                </div>
             )}

             <div className="bg-gray-50 px-4 py-3 mt-auto border-t border-gray-100 flex justify-around text-gray-500">
                <span className="text-xs font-medium flex gap-1.5 items-center hover:bg-gray-50 px-2 py-1 rounded cursor-pointer"><HeartIcon className="w-4 h-4"/> Like</span>
                <span className="text-xs font-medium flex gap-1.5 items-center hover:bg-gray-50 px-2 py-1 rounded cursor-pointer"><CommentIcon className="w-4 h-4"/> Comment</span>
                <span className="text-xs font-medium flex gap-1.5 items-center hover:bg-gray-50 px-2 py-1 rounded cursor-pointer"><ShareIcon className="w-4 h-4"/> Share</span>
             </div>
          </div>
        );

      default: // Instagram, TikTok, General
        return (
          <div className="bg-white min-h-full flex flex-col">
            <UserHeader />
            
            {/* Visual Area */}
            <div className="relative w-full bg-gray-50 flex items-center justify-center overflow-hidden min-h-[300px]">
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                  controls
                  className="w-full h-full object-cover max-h-[500px]" 
                />
              ) : imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Generated" 
                  className="w-full h-full object-cover animate-fade-in"
                />
              ) : (
                 <div className="text-gray-300 flex flex-col items-center p-12">
                   <span className="text-4xl mb-3 opacity-50">🖼️</span>
                   <span className="text-sm font-medium">Visual Content</span>
                 </div>
              )}
            </div>

            <div className="p-4">
               <SocialFooter />
               <div className="mt-3">
                 <p className="text-sm text-gray-900 mb-1 leading-relaxed">
                   <span className="font-semibold mr-2">spark_creator</span>
                   <span className="whitespace-pre-wrap">{caption}</span>
                 </p>
                 <p className="text-sm text-blue-800 mb-2 font-medium">{hashtags.join(' ')}</p>
                 <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-2">{currentDate}</p>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200/60 overflow-hidden h-full transition-all duration-300 ring-1 ring-slate-100">
      {renderContent()}
    </div>
  );
};

export default PreviewCard;