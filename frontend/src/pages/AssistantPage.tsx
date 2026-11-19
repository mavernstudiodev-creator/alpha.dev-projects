import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, MessageSquarePlus, Send } from 'lucide-react';
import { apiService, AssistantConversation, AssistantMessage } from '../services/api';
import { DocumentListItem } from '../types';

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  return text.split(tokenPattern).filter(Boolean).map((token, index) => {
    if (token.startsWith('**') || token.startsWith('__')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`')) return <code key={index} className="rounded bg-white/70 px-1 py-0.5 font-mono text-[0.92em]">{token.slice(1, -1)}</code>;
    if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) return <em key={index}>{token.slice(1, -1)}</em>;
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="font-semibold underline">{link[1]}</a>;
    return <React.Fragment key={index}>{token}</React.Fragment>;
  });
};

const AssistantMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const normalized = content
    .replace(/\\([\\`*_{}[\]()#+.!|>-])/g, '$1')
    .replace(/\\\r?\n/g, '\n')
    .replace(/\r/g, '');
  const lines = normalized.split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const className = level === 1 ? 'text-base font-extrabold' : level === 2 ? 'text-sm font-bold' : 'text-sm font-semibold';
      blocks.push(React.createElement(`h${level}`, { key: index, className }, renderInlineMarkdown(heading[2])));
      index += 1;
      continue;
    }
    if (/^(---+|\*\*\*+|___+)$/.test(line)) {
      blocks.push(<hr key={index} className="border-sage-border" />);
      index += 1;
      continue;
    }
    const isTableRow = (value: string) => /^\s*\|.+\|\s*$/.test(value);
    const tableSeparator = (value: string) => isTableRow(value) && value.trim().replace(/^\||\|$/g, '').split('|').every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell));
    if (index + 1 < lines.length && isTableRow(lines[index]) && tableSeparator(lines[index + 1])) {
      const cells = (value: string) => value.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      const headers = cells(lines[index]);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="overflow-x-auto rounded-xl border border-sage-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-white/70"><tr>{headers.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-sage-border px-3 py-2 font-bold">{renderInlineMarkdown(cell)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className={rowIndex % 2 ? 'bg-white/50' : ''}>{headers.map((_, cellIndex) => <td key={cellIndex} className="border-b border-sage-border/70 px-3 py-2">{renderInlineMarkdown(row[cellIndex] || '')}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^[-*+]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const ordered = /^\d+[.)]\s+/.test(line);
      const items: React.ReactNode[] = [];
      while (index < lines.length && (ordered ? /^\s*\d+[.)]\s+/.test(lines[index]) : /^\s*[-*+]\s+/.test(lines[index]))) {
        const item = lines[index].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '');
        items.push(<li key={index}>{renderInlineMarkdown(item)}</li>);
        index += 1;
      }
      blocks.push(ordered
        ? <ol key={`list-${index}`} className="list-decimal space-y-1 pl-5">{items}</ol>
        : <ul key={`list-${index}`} className="list-disc space-y-1 pl-5">{items}</ul>);
      continue;
    }
    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4}\s+|[-*+]\s+|\d+[.)]\s+|---+$)/.test(lines[index].trim()) &&
      !(isTableRow(lines[index]) && index + 1 < lines.length && tableSeparator(lines[index + 1]))
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`p-${index}`}>{paragraph.map((part, partIndex) => <React.Fragment key={partIndex}>{partIndex > 0 && <br />}{renderInlineMarkdown(part)}</React.Fragment>)}</p>);
  }

  return <div className="space-y-3">{blocks}</div>;
};

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
  const selectedDocument = useMemo(() => readyDocuments.find((doc) => doc.id === documentId), [readyDocuments, documentId]);

  useEffect(() => {
    apiService.getDocuments().then(setDocuments).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setConversations([]);
    apiService.listConversations(documentId || undefined)
      .then((items) => {
        if (!cancelled) setConversations(items.filter((item) => (item.document_id || '') === documentId));
      })
      .catch(() => { if (!cancelled) setConversations([]); });
    return () => { cancelled = true; };
  }, [documentId]);

  const startConversation = async (selectedDocumentId = documentId) => {
    setIsLoading(true);
    setError('');
    try {
      const title = readyDocuments.find((doc) => doc.id === selectedDocumentId)?.filename;
      const conversation = await apiService.createConversation(selectedDocumentId || undefined, title ? `Audit: ${title}` : undefined);
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
        const conversation = await apiService.createConversation(documentId || undefined, selectedDocument ? `Audit: ${selectedDocument.filename}` : undefined);
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
        <div className="border-b border-sage-border px-4 py-2 text-xs text-forest-text-secondary" role="status">
          {selectedDocument
            ? <>This conversation uses <strong className="text-forest-text">{selectedDocument.filename}</strong> only. Select another document to start a separate conversation.</>
            : 'General research mode is not tied to an uploaded file. Select a document above for file-specific answers.'}
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
              {message.role === 'assistant' ? <AssistantMarkdown content={message.content} /> : <p className="whitespace-pre-wrap">{message.content}</p>}
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
