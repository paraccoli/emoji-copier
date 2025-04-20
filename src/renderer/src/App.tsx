import React, { useState, useEffect, useCallback } from 'react';
import { Emoji } from './api';
import { apiClient } from './api';
import SearchBar from './components/SearchBar';
import EmojiGrid from './components/EmojiGrid';
import CategoryList from './components/CategoryList';
import Favorites from './components/Favorites';
import TabNavigation, { TabType } from './components/TabNavigation';
import RecentEmojis from './components/RecentEmojis';
import ThemeToggle from './components/ThemeToggle'; // インポート追加
import { ThemeProvider } from './contexts/ThemeContext'; // インポート追加
import './styles/index.css';
import './styles/animations.css';
import './styles/emoji-grid.css';
import './styles/utils.css';

// アプリケーションのメインコンポーネント
const AppContent: React.FC = () => {  // 既存の状態管理コードをそのまま使用
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('すべて');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [categories, setCategories] = useState<string[]>([]);
  
  // 既存の関数をそのまま使用
  const loadEmojisByCategory = useCallback(async (category: string) => {
    if (category === selectedCategory) return;
    
    setIsLoading(true);
    setSelectedCategory(category);
    setSearchQuery('');

    try {
      const data = await (category === 'すべて' 
        ? apiClient.getEmojisByCategory(category)
        : apiClient.getEmojisByCategory(category));
      
      setEmojis(data);    } catch (error) {
      console.error(`カテゴリ '${category}' の絵文字読み込みエラー:`, error);
      showToastMessage('絵文字の読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      // 検索クエリが空の場合は、選択中のカテゴリの絵文字に戻す
      return loadEmojisByCategory(selectedCategory);
    }
    
    setIsLoading(true);
    
    try {
      const data = await apiClient.searchEmojis(query);
      setEmojis(data);    } catch (error) {
      console.error('絵文字検索エラー:', error);
      showToastMessage('絵文字の検索に失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [loadEmojisByCategory, selectedCategory]);

  // 絵文字クリック（コピー）処理
  const handleEmojiClick = async (emoji: Emoji) => {
    try {
      const success = await apiClient.copyEmoji(emoji.unicode, emoji.id);
        if (success) {
        showToastMessage(`${emoji.short_name}をコピーしました！`);
      } else {
        showToastMessage('コピーに失敗しました。再試行してください。', 'error');
      }    } catch (error) {
      console.error('絵文字コピーエラー:', error);
      showToastMessage('コピー中にエラーが発生しました', 'error');
    }
  };

  // お気に入り切り替え
  const handleToggleFavorite = async (emoji: Emoji) => {
    try {
      if (emoji.isFavorite) {
        // お気に入りから削除
        const success = await apiClient.removeFavorite(emoji.id);
        if (success) {
          // ローカル状態を更新
          setEmojis(prevEmojis => 
            prevEmojis.map(e => 
              e.id === emoji.id ? { ...e, isFavorite: false } : e
            )
          );
          showToastMessage(`${emoji.short_name}をお気に入りから削除しました`);
        }
      } else {
        // お気に入りに追加
        const success = await apiClient.addFavorite(emoji.id);
        if (success) {
          // ローカル状態を更新
          setEmojis(prevEmojis => 
            prevEmojis.map(e => 
              e.id === emoji.id ? { ...e, isFavorite: true } : e
            )
          );
          showToastMessage(`${emoji.short_name}をお気に入りに追加しました`);
        }
      }    } catch (error) {
      console.error('お気に入り切り替えエラー:', error);
      showToastMessage('操作に失敗しました。再試行してください。', 'error');
    }
  };

  // タブ切り替え
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    
    // 検索タブに切り替えたときは、現在のカテゴリの絵文字を表示
    if (tab === 'search' && activeTab !== 'search') {
      loadEmojisByCategory(selectedCategory);
    }
  };
  // トーストメッセージ表示
  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    // 3秒後にトーストを非表示
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
  // 初回レンダリング時にデータを読み込む
  useEffect(() => {
    // カテゴリリストを読み込む
    const loadCategories = async () => {
      try {
        const categoryList = await apiClient.getEmojiCategories();
        setCategories(categoryList);
      } catch (error) {
        console.error('カテゴリ一覧の読み込みに失敗しました:', error);
      }
    };
    
    loadCategories();
    loadEmojisByCategory('すべて');
  }, []);

  return (
    <div className="app-container">
      {/* ヘッダー */}
      <header className="app-header">
        <h1 className="text-xl font-bold">Emoji Copier</h1>
        <ThemeToggle /> {/* テーマ切り替えボタンを追加 */}
      </header>
      
      {/* 以下は既存のコンポーネント */}
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      
      <div className="app-content">
        {activeTab === 'search' && (
          <>            <div className="app-sidebar">
              <CategoryList 
                categories={categories}
                onSelectCategory={loadEmojisByCategory}
                selectedCategory={selectedCategory}
              />
            </div>
            
            <div className="app-main">
              <RecentEmojis onEmojiClick={handleEmojiClick} />
              
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <SearchBar
                  onSearch={handleSearch}
                  placeholder="絵文字を検索..."
                />
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <EmojiGrid
                  emojis={emojis}
                  onEmojiClick={handleEmojiClick}
                  onToggleFavorite={handleToggleFavorite}
                  isLoading={isLoading}
                  emptyMessage={
                    searchQuery 
                      ? `"${searchQuery}" に一致する絵文字が見つかりません` 
                      : '絵文字が見つかりません'
                  }
                />
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'favorites' && (
          <div className="flex-1">
            <Favorites 
              onEmojiClick={handleEmojiClick}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        )}
      </div>

      {/* トースト通知 */}
      {showToast && (
        <div className={`toast ${toastType === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

// ThemeProvider でラップした新しい App コンポーネント
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;