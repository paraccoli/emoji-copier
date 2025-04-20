import React, { useEffect, useState } from 'react';
import { Emoji } from '../api';
import { apiClient } from '../api';

interface RecentEmojisProps {
  onEmojiClick: (emoji: Emoji) => void;
}

const RecentEmojis: React.FC<RecentEmojisProps> = ({ onEmojiClick }) => {
  const [recentEmojis, setRecentEmojis] = useState<Emoji[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadRecentEmojis = async () => {
    setLoading(true);
    try {
      const emojis = await apiClient.getRecentEmojis(10);
      setRecentEmojis(emojis);
    } catch (error) {
      console.error('最近使用した絵文字の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentEmojis();
  }, []);

  const handleRemoveFromHistory = async (emoji: Emoji, event: React.MouseEvent) => {
    event.stopPropagation(); // 絵文字のクリックイベントが発火しないようにする
    try {
      const success = await apiClient.removeFromHistory(emoji.id);
      if (success) {
        // UIから削除したアイテムを除外
        setRecentEmojis(current => current.filter(e => e.id !== emoji.id));
      }
    } catch (error) {
      console.error('履歴削除エラー:', error);
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm('最近使用した絵文字の履歴を全て削除しますか？')) {
      try {
        const success = await apiClient.clearHistory();
        if (success) {
          setRecentEmojis([]);
        }
      } catch (error) {
        console.error('履歴全削除エラー:', error);
      }
    }
  };

  // 履歴がない場合
  if (!loading && recentEmojis.length === 0) {
    return null;
  }

  return (
    <div className="recent-emojis-container p-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">最近使用した絵文字</h3>
        {recentEmojis.length > 0 && (
          <button 
            onClick={handleClearAllHistory}
            className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            履歴をクリア
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="flex space-x-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {recentEmojis.map(emoji => (
            <div 
              key={`recent-${emoji.id}`}
              className="recent-emoji-item relative group"
            >
              <button
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                onClick={() => onEmojiClick(emoji)}
                title={emoji.short_name}
              >
                {emoji.unicode}
              </button>
              <button 
                className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleRemoveFromHistory(emoji, e)}
                title="履歴から削除"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentEmojis;