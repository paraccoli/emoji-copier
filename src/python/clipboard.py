"""
クリップボード操作のためのユーティリティスクリプト。
Electronアプリからの呼び出しを受けて、絵文字テキストをクリップボードにコピーする。
"""

import sys
import argparse
import platform
import logging
from typing import Optional

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('emoji-clipboard')

def setup_clipboard():
    """
    プラットフォームに適したクリップボードライブラリを選択・インポートする
    """
    system = platform.system()
    
    if system == 'Windows':
        try:
            import win32clipboard
            import win32con
            
            def copy_to_clipboard(text):
                win32clipboard.OpenClipboard()
                try:
                    win32clipboard.EmptyClipboard()
                    win32clipboard.SetClipboardText(text, win32con.CF_UNICODETEXT)
                finally:
                    win32clipboard.CloseClipboard()
            
            return copy_to_clipboard
        except ImportError:
            logger.warning("win32clipboardがインストールされていません。代替としてpyperclipを使用します。")
    
    # Windows以外、またはwin32clipboardがインポートできない場合は、pyperclipを使用
    try:
        import pyperclip
        return pyperclip.copy
    except ImportError:
        logger.error("クリップボードライブラリが利用できません。pyperclipをインストールしてください。")
        return None

def copy_to_clipboard(text: str) -> bool:
    """
    テキストをクリップボードにコピーする
    
    Args:
        text: クリップボードにコピーするテキスト
    
    Returns:
        bool: コピー成功の場合True、失敗の場合False
    """
    clipboard_func = setup_clipboard()
    
    if not clipboard_func:
        logger.error("クリップボード機能を初期化できませんでした。")
        return False
    
    try:
        clipboard_func(text)
        logger.info(f"テキスト「{text}」をクリップボードにコピーしました。")
        return True
    except Exception as e:
        logger.error(f"クリップボードコピー中にエラーが発生しました: {e}")
        return False

def get_from_clipboard() -> Optional[str]:
    """
    クリップボードからテキストを取得する
    
    Returns:
        Optional[str]: クリップボードの内容、エラーの場合はNone
    """
    system = platform.system()
    
    try:
        if system == 'Windows':
            try:
                import win32clipboard
                import win32con
                
                win32clipboard.OpenClipboard()
                try:
                    if win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
                        data = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
                        return data
                    else:
                        return None
                finally:
                    win32clipboard.CloseClipboard()
            except ImportError:
                logger.warning("win32clipboardがインストールされていません。代替としてpyperclipを使用します。")
                import pyperclip
                return pyperclip.paste()
        else:
            import pyperclip
            return pyperclip.paste()
    except Exception as e:
        logger.error(f"クリップボード取得中にエラーが発生しました: {e}")
        return None

def main():
    """
    コマンドラインからの実行時のエントリーポイント
    """
    parser = argparse.ArgumentParser(description='絵文字クリップボードユーティリティ')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--copy', help='指定したテキストをクリップボードにコピー')
    group.add_argument('--paste', action='store_true', help='クリップボードの内容を表示')
    parser.add_argument('--verbose', '-v', action='store_true', help='詳細なログ出力')
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    if args.copy:
        success = copy_to_clipboard(args.copy)
        sys.exit(0 if success else 1)
    elif args.paste:
        text = get_from_clipboard()
        if text:
            print(text)
            sys.exit(0)
        else:
            logger.error("クリップボードからテキストを取得できませんでした")
            sys.exit(1)

if __name__ == "__main__":
    main()