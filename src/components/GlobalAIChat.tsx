import React, { useState, useRef, useEffect } from 'react';
import { Project, ChatMessage } from '../types';
import { Send, Bot, Search, FolderOpen, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { sendChatMessage, checkServerHealth } from '../utils/api';
import { generateId } from '../utils/storage';

interface GlobalAIChatProps {
  projects: Project[];
}

export const GlobalAIChat: React.FC<GlobalAIChatProps> = ({ projects }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const health = await checkServerHealth();
      setServerStatus(health.status === 'ok' && health.openai ? 'online' : 'offline');
      if (health.status !== 'ok' || !health.openai) {
        setError('OpenAI API-nyckel saknas eller servern är inte tillgänglig');
      }
    } catch (error) {
      setServerStatus('offline');
      setError('Kan inte ansluta till servern. Kontrollera att backend-servern körs på port 3001.');
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || serverStatus !== 'online') return;

    // Check if there are any projects or notes to analyze
    const hasProjects = projects.length > 0;
    const hasNotes = projects.some(project => project.notes.length > 0);

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError('');

    // If no projects or notes exist, provide fallback response
    if (!hasProjects || !hasNotes) {
      const fallbackMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Det finns inga sparade projekt eller anteckningar ännu som jag kan använda för att svara på din fråga. Skapa eller lägg till projekt för att börja spara information.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      setIsLoading(false);
      return;
    }
    try {
      const response = await sendChatMessage(userMessage.content, projects);
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setError('Kunde inte få svar från AI-assistenten. Kontrollera att servern körs och OpenAI API-nyckeln är konfigurerad.');
      
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Jag kan inte svara just nu. Kontrollera att servern körs och OpenAI API-nyckeln är konfigurerad.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exampleQuestions = [
    "Vad noterade vi om ventilationen i senaste projektet?",
    "Vilka problem hittades i alla inspektioner?",
    "Sammanfatta alla elektriska problem från alla projekt",
    "Hur många projekt har vi genomfört den här månaden?"
  ];

  if (serverStatus === 'checking') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Kontrollerar AI-tjänst...</p>
        </div>
      </div>
    );
  }

  if (serverStatus === 'offline') {
    return (
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center mr-3">
              <WifiOff className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI-Assistent</h1>
              <p className="text-sm text-red-600">Inte ansluten</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI-tjänsten är inte tillgänglig</h3>
            <p className="text-gray-500 mb-4 text-sm">
              {error || 'Kontrollera att servern körs och att OpenAI API-nyckeln är konfigurerad.'}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-medium text-gray-900 mb-2">Felsökning:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>1. Kontrollera att backend-servern körs (npm run dev)</li>
                <li>2. Verifiera att .env filen innehåller OPENAI_API_KEY</li>
                <li>3. Kontrollera att port 3001 är tillgänglig</li>
              </ul>
            </div>
            <button
              onClick={checkHealth}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Försök igen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center mr-3">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">AI-Assistent</h1>
              <div className="flex items-center">
                <Wifi className="w-4 h-4 text-green-600 mr-1" />
                <p className="text-sm text-green-600">Ansluten och redo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Global AI-assistent</h3>
            <p className="text-gray-500 mb-6">Ställ frågor om alla dina inspektionsprojekt. Jag kan söka igenom alla anteckningar och ge dig svar baserat på din data.</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <FolderOpen className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  {projects.length} projekt tillgängliga för analys
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {projects.reduce((sum, p) => sum + p.notes.length, 0) > 0 
                  ? `Totalt ${projects.reduce((sum, p) => sum + p.notes.length, 0)} anteckningar att söka igenom`
                  : 'Inga anteckningar att analysera ännu'
                }
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <p className="font-medium text-gray-700">Exempel på frågor:</p>
              <div className="space-y-2">
                {(projects.length > 0 && projects.some(p => p.notes.length > 0) ? exampleQuestions : [
                  "Skapa ditt första projekt för att börja använda AI-assistenten",
                  "Lägg till anteckningar i dina projekt för att få AI-analys",
                  "När du har data kan jag hjälpa dig analysera inspektioner",
                  "AI-assistenten fungerar bäst med flera projekt och anteckningar"
                ]).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => projects.length > 0 && projects.some(p => p.notes.length > 0) ? setInputValue(question) : undefined}
                    className={`block w-full text-left bg-white border border-gray-200 rounded-lg p-3 transition-colors text-gray-700 ${
                      projects.length > 0 && projects.some(p => p.notes.length > 0)
                        ? 'hover:border-purple-300 hover:bg-purple-50 cursor-pointer'
                        : 'cursor-default opacity-60'
                    }`}
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ställ en fråga om dina projekt..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center mr-3">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">AI-Assistent</h1>
            <div className="flex items-center">
              <Wifi className="w-4 h-4 text-green-600 mr-1" />
              <p className="text-sm text-green-600">Ansluten</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center mb-2">
                  <Bot className="w-4 h-4 mr-2" />
                  <span className="text-xs font-medium text-gray-600">AI-assistent</span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-purple-200' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-[85%]">
              <div className="flex items-center">
                <Bot className="w-4 h-4 mr-2" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ställ en fråga om dina projekt..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || serverStatus !== 'online'}
            className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};