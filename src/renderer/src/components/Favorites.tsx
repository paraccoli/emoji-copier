import React, { useEffect, useState } from 'react';
import { Emoji } from '../api';
import EmojiGrid from './EmojiGrid';

interface FavoritesProps {
  onEmojiClick: (emoji: Emoji) => void;
  onToggleFavorite: (emoji: Emoji) => void;
}

const Favorites: React.FC<FavoritesProps> = ({
  onEmojiClick,
  onToggleFavorite
}) => {
  const [favorites, setFavorites] = useState<Emoji[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // お気に入り絵文字を取得
  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      // @ts-ignore - グローバルに宣言された window.api を使用
      const data = await window.api.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('お気に入り取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // コンポーネントのマウント時にお気に入りを取得
  useEffect(() => {
    loadFavorites();
  }, []);
  
  // お気に入り切り替え処理
  const handleToggleFavorite = async (emoji: Emoji) => {
    try {
      // @ts-ignore - グローバルに宣言された window.api を使用
      await window.api.removeFavorite(emoji.id);
      // お気に入りリストから削除する
      setFavorites(prevFavorites => 
        prevFavorites.filter(fav => fav.id !== emoji.id)
      );
      
      // 親コンポーネントにも通知
      onToggleFavorite(emoji);
    } catch (error) {
      console.error('お気に入り削除エラー:', error);
    }
  };
  
  return (
    <div className="favorites-container h-full">
      <div className="favorites-header p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold">お気に入り</h2>
      </div>
      
      <div className="favorites-content h-full overflow-y-auto">
        <EmojiGrid
          emojis={favorites}
          onEmojiClick={onEmojiClick}
          onToggleFavorite={handleToggleFavorite}
          isLoading={isLoading}
          emptyMessage="お気に入りの絵文字がありません"
        />
      </div>
    </div>
  );
};

export default Favorites;