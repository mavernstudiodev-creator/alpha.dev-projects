import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, MessageSquarePlus, Send } from 'lucide-react';
import { apiService, AssistantConversation, AssistantMessage } from '../services/api';
import { DocumentListItem } from '../types';

export const AssistantPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const readyDocuments = useMemo(() => documents.filter((doc) => doc.status === 'completed'), [documents]);

  useEffect(() => {
    apiService.getDocuments().then(setDocuments).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    apiService.listConversations(documentId || undefined).then(setConversations).catch(() => setConversations([]));
  }, [documentId]);

  const startConversation = async (selectedDocumentId = documentId) => {
    setIsLoading(true);
    setError('');
    try {
      const conversation = await apiService.createConversation(selectedDocumentId || undefined);
      setDocumentId(selectedDocumentId);
      setConversationId(conversation.id);
      setMessages([]);
      setConversations((current) => [conversation, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start an assistant conversation.');
    } finally {
      setIsLoading(false);
    }
  };

  const openConversation = async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const conversation = await apiService.getConversation(id);
      setConversationId(conversation.id);
      setDocumentId(conversation.document_id || '');
      setMessages(conversation.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load conversation history.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = prompt.trim();
    if (!query || isSending) return;
    setError('');
    setIsSending(true);
    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const conversation = await apiService.createConversation(documentId || undefined);
        activeConversationId = conversation.id;
        setConversationId(activeConversationId);
        setConversations((current) => [conversation, ...current]);
      }
      const userMessage: AssistantMessage = { id: `local-user-${Date.now()}`, role: 'user', content: query };
      setMessages((current) => [...current, userMessage]);
      setPrompt('');
      const answer = await apiService.sendAssistantMessage(activeConversationId, query);
      setMessages((current) => [...current, {
        id: answer.message_id,
        role: 'assistant',
        content: answer.content,
        sources: answer.sources,
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assistant request failed.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <header className="border-b border-sage-border pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-text tracking-tight">Research Assistant</h2>
        <p className="text-sm text-forest-text-secondary mt-1">Ask evidence-grounded questions about a verification report or start a general research conversation.</p>
      </header>

      <section className="bg-white rounded-3xl border border-sage-border shadow-card overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 border-b border-sage-border bg-sage-subtle">
          <label className="flex items-center gap-3 text-xs font-bold text-forest-text">
            Ground answers in a document
            <select value={documentId} onChange={(event) => { setDocumentId(event.target.value); setConversationId(''); setMessages([]); }} className="max-w-[260px] rounded-xl border border-sage-border bg-white px-3 py-2 font-medium">
              <option value="">General research</option>
              {readyDocuments.map((doc) => <option value={doc.id} key={doc.id}>{doc.filename}</option>)}
            </select>
          </label>
          <button onClick={() => startConversation()} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-full border border-sage-border bg-white px-4 py-2 text-xs font-bold text-forest-text hover:bg-sage-mint disabled:opacity-50">
            <MessageSquarePlus size={14} /> New conversation
          </button>
        </div>
        {conversations.length > 0 && <div className="border-b border-sage-border px-4 py-2 flex items-center gap-3 text-xs"><label htmlFor="assistant-history" className="font-bold text-forest-text shrink-0">Recent conversations</label><select id="assistant-history" value={conversationId} onChange={(event) => void openConversation(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-sage-border bg-white px-3 py-2 text-forest-text"><option value="">Start a new conversation</option>{conversations.map((conversation) => <option value={conversation.id} key={conversation.id}>{conversation.title}</option>)}</select></div>}

        <div className="min-h-[360px] max-h-[58vh] overflow-y-auto p-4 sm:p-6 space-y-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center max-w-md mx-auto gap-3">
              <div className="w-12 h-12 rounded-2xl bg-sage-mint flex items-center justify-center text-forest-text"><Bot size={23} /></div>
              <h3 className="font-bold text-forest-text">Ask the CiteVerify assistant</h3>
              <p className="text-xs leading-relaxed text-forest-text-secondary">When a document is selected, the backend grounds the response in its claims, citations, and retrieved evidence. NVIDIA credentials stay on the server.</p>
              {readyDocuments.length === 0 && <p className="text-xs text-forest-text-muted">Upload and process a PDF to ask document-specific questions.</p>}
            </div>
          )}
          {messages.map((message) => (
            <article key={message.id} className={`max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed ${message.role === 'user' ? 'ml-auto bg-forest-text text-white' : 'bg-sage-subtle text-forest-text border border-sage-border'}`}>
              <div className="text-[10px] font-mono uppercase tracking-wider opacity-70 mb-1">{message.role === 'user' ? 'You' : 'CiteVerify assistant'}</div>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.sources?.length ? <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold">Evidence sources ({message.sources.length})</summary><pre className="mt-2 whitespace-pre-wrap break-words opacity-80">{JSON.stringify(message.sources, null, 2)}</pre></details> : null}
            </article>
          ))}
          {isSending && <p className="text-xs text-forest-text-muted animate-pulse">The assistant is preparing a grounded response…</p>}
          {error && <div role="alert" className="rounded-xl border border-verdict-contradictory-border bg-verdict-contradictory-bg px-4 py-3 text-xs text-verdict-contradictory">{error}</div>}
        </div>

        <form onSubmit={sendMessage} className="border-t border-sage-border p-3 sm:p-4 flex gap-2">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(event); } }} rows={2} placeholder="Ask about a claim, evidence passage, or research question…" className="flex-1 resize-y rounded-2xl border border-sage-border bg-white px-4 py-3 text-sm text-forest-text placeholder:text-forest-text-muted focus:outline-none focus:border-forest-text" />
          <button type="submit" disabled={isSending || !prompt.trim()} aria-label="Send message" className="self-end rounded-full btn-lime-gradient p-3 text-forest-text disabled:opacity-50"><Send size={17} /></button>
        </form>
      </section>
      {documentId && <Link to={`/documents/${documentId}`} className="text-xs font-bold text-forest-text hover:underline">Open selected verification report →</Link>}
    </div>
  );
};
