import React, { useState } from 'react';
import { Emoji } from '../api';
import EmojiItem from './EmojiItem';

interface EmojiGridProps {
  emojis: Emoji[];
  onEmojiClick: (emoji: Emoji) => void;
  onToggleFavorite: (emoji: Emoji) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

const EmojiGrid: React.FC<EmojiGridProps> = ({
  emojis,
  onEmojiClick,
  onToggleFavorite,
  isLoading = false,
  emptyMessage = '絵文字が見つかりません'
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // 絵文字クリック時の処理
  const handleEmojiClick = (emoji: Emoji) => {
    onEmojiClick(emoji);
    
    // コピー完了アニメーションのためにIDを保存
    setCopiedId(emoji.id);
    setTimeout(() => setCopiedId(null), 1000); // 1秒後にリセット
  };
    // ローディング表示
  if (isLoading) {
    return (
      <div className="emoji-grid p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...Array(12)].map((_, index) => (
          <div key={`skeleton-${index}`} className="emoji-skeleton flex flex-col items-center animate-pulse">
            <div className="bg-gray-200 rounded-md h-16 w-16 mb-2"></div>
            <div className="bg-gray-200 h-4 w-20 rounded-md"></div>
            <div className="bg-gray-200 h-3 w-16 rounded-md mt-1"></div>
          </div>
        ))}
      </div>
    );
  }
  
  // 絵文字が0件の場合
  if (emojis.length === 0) {
    return (
      <div className="emoji-grid-empty h-full flex flex-col items-center justify-center text-gray-500">
        <span className="text-5xl mb-4">🔍</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="emoji-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
      {emojis.map(emoji => (
        <EmojiItem
          key={emoji.id}
          emoji={emoji}
          onClick={() => handleEmojiClick(emoji)}
          onToggleFavorite={() => onToggleFavorite(emoji)}
          isJustCopied={emoji.id === copiedId}
        />
      ))}
    </div>
  );
};

export default EmojiGrid;