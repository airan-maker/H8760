/**
 * AI 채팅 인터페이스 컴포넌트
 */
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, SuggestedQuestion } from '../../types/analysis';
import { SUGGESTED_QUESTIONS } from '../../types/analysis';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSendMessage: (content: string) => void;
  onClearChat: () => void;
  disabled?: boolean;
}

export function ChatInterface({
  messages,
  loading,
  error,
  onSendMessage,
  onClearChat,
  disabled = false,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 메시지가 추가되면 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !loading && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleSuggestedQuestion = (question: SuggestedQuestion) => {
    if (!loading && !disabled) {
      onSendMessage(question.text);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-dark-100 flex flex-col h-[600px]">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-dark-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-dark-700">금융 자문 AI</h3>
            <p className="text-sm text-dark-400">Bankability 개선 방안을 질문하세요</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            className="text-dark-400 hover:text-dark-600 transition-colors"
            title="대화 초기화"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-dark-50 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-dark-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-dark-600 font-medium mb-2">금융 자문 AI에게 질문하세요</h4>
            <p className="text-dark-400 text-sm mb-6 max-w-xs">
              DSCR, 부채비율, Covenant, 리스크 완화 등 Bankability 개선 방안을 물어보세요
            </p>

            {/* 추천 질문 */}
            <div className="w-full max-w-md">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-3">추천 질문</p>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.slice(0, 4).map((question) => (
                  <button
                    key={question.id}
                    onClick={() => handleSuggestedQuestion(question)}
                    disabled={disabled}
                    className="w-full text-left p-3 bg-dark-50 hover:bg-hydrogen-50 rounded-xl text-sm text-dark-600 hover:text-hydrogen-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {question.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-hydrogen-500 text-white'
                      : 'bg-dark-50 text-dark-700'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-dark-700 prose-headings:font-semibold prose-h3:text-base prose-h4:text-sm prose-p:text-dark-600 prose-p:leading-relaxed prose-ul:text-dark-600 prose-ol:text-dark-600 prose-li:marker:text-hydrogen-500 prose-strong:text-dark-700 prose-code:bg-white prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-hydrogen-600 prose-code:before:content-none prose-code:after:content-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Tool 결과 표시 */}
                  {message.toolResults && message.toolResults.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dark-200">
                      <p className="text-xs text-dark-400 mb-2">계산 결과:</p>
                      {message.toolResults.map((tr, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-2 text-xs font-mono text-dark-600 overflow-x-auto">
                          <div className="text-dark-400 mb-1">{tr.tool}</div>
                          <pre>{JSON.stringify(tr.result, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  )}

                  <p
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-white/60' : 'text-dark-400'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* 로딩 인디케이터 */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-dark-50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-hydrogen-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-hydrogen-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-hydrogen-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-dark-100">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={disabled ? 'Bankability 분석을 먼저 시작하세요' : 'Bankability 관련 질문을 입력하세요...'}
            disabled={disabled || loading}
            className="flex-1 px-4 py-3 bg-dark-50 rounded-xl border border-transparent focus:border-hydrogen-300 focus:bg-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading || disabled}
            className="w-12 h-12 bg-gradient-to-r from-hydrogen-500 to-primary-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-hydrogen-500/25 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatInterface;
