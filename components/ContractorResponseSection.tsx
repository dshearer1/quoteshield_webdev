"use client";

import { useState, useRef, useEffect } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  message_text: string;
  created_at?: string;
};

const QUICK_PROMPTS = [
  "Did this reduce my risk?",
  "What should I ask next?",
  "Is this safe to move forward?",
  "Are there red flags here?",
] as const;

export function ContractorResponseSection({
  submissionId,
  initialMessages = [],
}: {
  submissionId: string;
  initialMessages?: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [questionsNote, setQuestionsNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [submissionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (copiedId) {
      const t = setTimeout(() => setCopiedId(null), 2000);
      return () => clearTimeout(t);
    }
  }, [copiedId]);

  async function sendMessage(messageText: string, appendQuestions = true) {
    const text = messageText.trim();
    if (text.length < 10) return;
    setError(null);
    const fullText = appendQuestions && questionsNote.trim() ? `${text}\n\nQuestions I asked: ${questionsNote.trim()}` : text;
    setMessages((m) => [...m, { id: `temp-${Date.now()}`, role: "user", message_text: fullText }]);
    setInputText("");
    if (appendQuestions) setQuestionsNote("");
    setLoading(true);
    try {
      const res = await fetch("/api/negotiation/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          messageText: text,
          homeownerQuestions: questionsNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setMessages((m) => m.filter((msg) => !msg.id.startsWith("temp-")));
        return;
      }
      setMessages((m) => [...m, { id: `new-${Date.now()}`, role: "assistant", message_text: data.message ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((m) => m.filter((msg) => !msg.id.startsWith("temp-")));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    sendMessage(inputText.trim());
  }

  function handleQuickPrompt(prompt: string) {
    sendMessage(prompt, false);
  }

  function copyReply(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => setCopiedId(id));
  }

  function markResolved(id: string) {
    setResolvedIds((s) => new Set(s).add(id));
  }

  const panel = (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 overflow-hidden min-h-[380px] max-h-[calc(100vh-12rem)] md:min-h-[420px]">
      <div className="shrink-0 border-b border-white/10 px-4 py-3 bg-white/5">
        <h2 className="text-base font-semibold text-white">Negotiation Assistant</h2>
        <p className="text-xs text-white/50 mt-0.5">Paste contractor replies and get quick guidance</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-white/50 text-center py-6 px-2">
            Paste what the contractor replied below, or use a quick question. Keep it short and actionable.
          </p>
        )}
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[70%] rounded-2xl rounded-br-md border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white">
                <p className="whitespace-pre-wrap">{msg.message_text}</p>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2.5 text-sm text-white/90">
                <p className="whitespace-pre-wrap leading-relaxed">{msg.message_text}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyReply(msg.id, msg.message_text)}
                    className="text-xs font-medium text-white/60 hover:text-white"
                  >
                    {copiedId === msg.id ? "Copied" : "Copy reply"}
                  </button>
                  <span className="text-white/30">·</span>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="text-xs font-medium text-white/60 hover:text-white"
                  >
                    Ask follow-up
                  </button>
                  <span className="text-white/30">·</span>
                  <button
                    type="button"
                    onClick={() => markResolved(msg.id)}
                    className="text-xs font-medium text-white/60 hover:text-white"
                  >
                    {resolvedIds.has(msg.id) ? "Resolved" : "Mark resolved"}
                  </button>
                </div>
              </div>
            </div>
          )
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-white/10 px-3 py-2.5 text-sm text-white/50">
              Thinking…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-white/10 p-3 bg-white/[0.03]">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label htmlFor="negotiation-input" className="sr-only">
              Paste contractor reply or ask a question
            </label>
            <textarea
              ref={inputRef}
              id="negotiation-input"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste what the contractor replied (email or text)"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />
            <p className="mt-1 text-xs text-white/50">
              We&apos;ll check what changed and what still needs clarification.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={loading}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/20 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="questions-note" className="sr-only">
              Questions you asked (optional)
            </label>
            <input
              id="questions-note"
              type="text"
              value={questionsNote}
              onChange={(e) => setQuestionsNote(e.target.value)}
              placeholder="Questions you asked (optional)"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />
          </div>
          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Get guidance"}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: always visible in sidebar */}
      <div className="hidden md:block">{panel}</div>

      {/* Mobile: bottom drawer with swipe-up */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col bg-neutral-950 border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-area-pb">
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="shrink-0 flex items-center justify-center py-2 touch-none"
          aria-expanded={mobileExpanded}
        >
          <span className="h-1 w-10 rounded-full bg-white/30" aria-hidden />
        </button>
        <div
          className="flex flex-col overflow-hidden transition-[height] duration-200 ease-out"
          style={{ height: mobileExpanded ? "min(70vh, 560px)" : "auto" }}
        >
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            {mobileExpanded ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && !loading && (
                  <p className="text-sm text-white/50 text-center py-4 px-2">
                    Paste a reply below or use a quick question.
                  </p>
                )}
                {messages.map((msg) =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[70%] rounded-2xl rounded-br-md border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white">
                        <p className="whitespace-pre-wrap">{msg.message_text}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2.5 text-sm text-white/90">
                        <p className="whitespace-pre-wrap">{msg.message_text}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyReply(msg.id, msg.message_text)}
                            className="text-xs font-medium text-white/60"
                          >
                            {copiedId === msg.id ? "Copied" : "Copy reply"}
                          </button>
                          <span className="text-white/30">·</span>
                          <button
                            type="button"
                            onClick={() => inputRef.current?.focus()}
                            className="text-xs font-medium text-white/60"
                          >
                            Ask follow-up
                          </button>
                          <span className="text-white/30">·</span>
                          <button
                            type="button"
                            onClick={() => markResolved(msg.id)}
                            className="text-xs font-medium text-white/60"
                          >
                            {resolvedIds.has(msg.id) ? "Resolved" : "Mark resolved"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white/10 px-3 py-2.5 text-sm text-white/50">
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : null}
            <div className="shrink-0 border-t border-white/10 p-3 bg-white/[0.03]">
              <form onSubmit={handleSubmit} className="space-y-2">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste what the contractor replied (email or text)"
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
                <p className="text-xs text-white/50">We&apos;ll check what changed and what still needs clarification.</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleQuickPrompt(p)}
                      disabled={loading}
                      className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white/90"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={questionsNote}
                  onChange={(e) => setQuestionsNote(e.target.value)}
                  placeholder="Questions you asked (optional)"
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
                {error && <p className="text-xs text-red-300">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="w-full rounded-xl bg-white py-2.5 text-sm font-medium text-black disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Get guidance"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Spacer on mobile so report content isn't hidden behind drawer */}
      <div className="md:hidden h-52 shrink-0" aria-hidden />
    </>
  );
}
