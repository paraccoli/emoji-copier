import React, { useState } from 'react';
import { Emoji } from '../api';

interface EmojiItemProps {
  emoji: Emoji;
  onClick: (emoji: Emoji) => void;
  onToggleFavorite: (emoji: Emoji) => void;
  className?: string;
}

const EmojiItem: React.FC<EmojiItemProps> = ({
  emoji,
  onClick,
  onToggleFavorite,
  className = '',
}) => {
  const { unicode, short_name, isFavorite } = emoji;
  const [isHovering, setIsHovering] = useState(false);
  const [isJustCopied, setIsJustCopied] = useState(false);
  const [showZoom, setShowZoom] = useState(false);

  const handleClick = () => {
    onClick(emoji);
    setIsJustCopied(true);
    setTimeout(() => {
      setIsJustCopied(false);
    }, 1500);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(emoji);
  };

  // ズーム表示のためのマウスイベントハンドラを追加
  const handleMouseEnter = () => {
    setIsHovering(true);
    // 少し遅延させてからズーム表示を行う（ちらつき防止）
    const timer = setTimeout(() => {
      setShowZoom(true);
    }, 300);
    return () => clearTimeout(timer);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setShowZoom(false);
  };

  return (
    <div
      className={`emoji-item p-3 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 relative ${
        isJustCopied ? 'copy-animation' : ''
      } ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`絵文字: ${short_name}`}
      title={`${short_name} (クリックでコピー)`}
    >
      <div className="emoji-content flex flex-col items-center relative w-full">
        {/* お気に入りアイコン */}
        <button
          className={`absolute top-0.5 right-0.5 p-1 rounded-full transition-opacity ${
            isHovering || isFavorite ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
          title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            className={`w-4 h-4 ${
              isFavorite ? 'text-yellow-500' : 'text-gray-500'
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 18.75l-7.84-7.42a5.26 5.26 0 01-.13-7.4 5.21 5.21 0 017.39-.15L12 4.15l.58-.67a5.21 5.21 0 017.4.15 5.26 5.26 0 01-.13 7.4L12 18.75z"
            />
          </svg>
        </button>

        {/* 絵文字表示 */}
        <div className="emoji-symbol">
          {unicode}
        </div>
        
        {/* 絵文字名 */}
        <div className="emoji-name text-sm text-center truncate w-full">
          {short_name}
        </div>

        {/* コピー完了メッセージ */}
        {isJustCopied && (
          <div className="copied-indicator absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 dark:bg-gray-800 dark:bg-opacity-70 rounded-lg animate-pulse">
            <div className="flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600 mb-1">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
              </svg>
              <span className="text-green-600 font-semibold">コピー完了!</span>
            </div>
          </div>
        )}

        {/* ズーム表示（新機能） */}
        {showZoom && (
          <div className="emoji-zoom absolute z-20 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 transform -translate-x-1/2 -translate-y-full top-0 left-1/2 mt-[-20px]">
            <div className="text-7xl">{unicode}</div>
            <div className="text-center mt-2 font-medium">{short_name}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmojiItem;