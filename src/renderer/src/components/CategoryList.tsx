import React from 'react';

interface CategoryListProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}) => {
  // カテゴリが未定義や空の場合のフォールバック
  const displayCategories = categories && categories.length > 0 
    ? categories 
    : ['すべて', 'スマイリーと感情', '人物とボディ', '動物と自然', '食べ物と飲み物', '旅行と場所', '活動', 'オブジェクト', '記号', 'フラグ'];

  return (
    <div className="category-list p-2 overflow-y-auto overflow-x-auto md:overflow-x-hidden">
      <h2 className="text-sm font-semibold mb-2 px-2 text-gray-500 dark:text-gray-400">カテゴリ</h2>
      <ul className="space-y-1 md:space-y-1 flex flex-row md:flex-col flex-nowrap md:flex-wrap pb-2 md:pb-0">
        {displayCategories.map(category => (
          <li key={category} className="category-list-item flex-shrink-0 md:flex-shrink px-1 md:px-0">
            <button
              className={`px-3 py-1.5 rounded-md text-sm w-full text-left transition-colors whitespace-nowrap
                ${selectedCategory === category 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              onClick={() => onSelectCategory(category)}
            >
              {category}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryList;