'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { regenerateCopy, acceptCopyAlternative } from '@/app/admin/_actions/regenerate-copy';

type Alternative = { alternative: string; reasoning: string };
type ChatSession = {
  id: string;
  user_request: string;
  ai_response: string;
  was_accepted: boolean;
  accepted_alternative: string | null;
  created_at: string;
};

type Props = {
  tenantId: string;
  copyKey: string;
  label: string;
  description: string;
  example: string;
  currentValue: string | null;
  voiceFamily: string;
  businessName: string;
  industry: string;
  chatHistory: ChatSession[];
};

export default function CopyEditorChat({
  tenantId,
  copyKey,
  label,
  description,
  example,
  currentValue,
  voiceFamily,
  businessName,
  industry,
  chatHistory,
}: Props) {
  const router = useRouter();
  const [request, setRequest] = useState('');
  const [thinking, setThinking] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualValue, setManualValue] = useState('');
  
  async function handleGenerate() {
    if (!request.trim()) return;
    setThinking(true);
    setError(null);
    setAlternatives([]);
    
    try {
      const result = await regenerateCopy({
        tenantId,
        copyKey,
        userRequest: request,
      });
      
      if (result.success) {
        setAlternatives(result.alternatives);
        setSessionId(result.sessionId);
      } else {
        setError(result.error ?? 'Could not generate. Try rephrasing your request.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setThinking(false);
    }
  }
  
  async function handleAccept(alt: Alternative) {
    if (!sessionId) return;
    
    try {
      const result = await acceptCopyAlternative({
        tenantId,
        sessionId,
        alternative: alt.alternative,
      });
      
      if (result.success) {
        router.push('/admin/content/copy');
        router.refresh();
      } else {
        setError(result.error ?? 'Could not save. Try again.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    }
  }
  
  async function handleSaveManual() {
    if (!manualValue.trim()) return;
    
    try {
      const result = await acceptCopyAlternative({
        tenantId,
        sessionId: null,
        alternative: manualValue,
        manual: true,
        copyKey,
      });
      
      if (result.success) {
        router.push('/admin/content/copy');
        router.refresh();
      }
    } catch {
      setError('Could not save manual edit.');
    }
  }
  
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <Link href="/admin/content/copy" className="text-sm text-neutral-500 hover:text-neutral-800 mb-3 inline-block">
          ← Voice & Copy
        </Link>
        <h1 className="text-3xl font-display mb-2">{label}</h1>
        <p className="text-neutral-600">{description}</p>
        {example && (
          <div className="mt-2 text-sm text-neutral-400 italic">Example in your voice: "{example}"</div>
        )}
      </div>
      
      {/* Current value */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">Current</h2>
        {currentValue ? (
          <div className="p-6 bg-white border-l-4 border-brand-accent rounded-r-lg">
            <div className="text-lg font-display italic">"{currentValue}"</div>
          </div>
        ) : (
          <div className="p-6 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg text-neutral-500 italic">
            Not set yet. Use the AI editor below to write the first version.
          </div>
        )}
      </section>
      
      {/* AI editor */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">Edit with AI</h2>
        
        <div className="p-6 bg-white border border-neutral-200 rounded-xl">
          <label className="block">
            <span className="block text-sm font-medium mb-2">What would you like to change?</span>
            <textarea
              value={request}
              onChange={e => setRequest(e.target.value)}
              placeholder="e.g. Make it warmer and less formal. Maybe mention that we serve guests arriving on the late train."
              className="input w-full min-h-[100px]"
              disabled={thinking}
            />
          </label>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              The AI follows your <strong>{voiceFamily}</strong> voice rules and won't suggest claim-word copy.
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={thinking || !request.trim()}
              className="px-5 py-2 bg-brand-accent text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {thinking ? 'Thinking...' : 'Generate alternatives'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}
      </section>
      
      {/* Alternatives */}
      {alternatives.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">
            Alternatives — pick one
          </h2>
          <div className="space-y-3">
            {alternatives.map((alt, i) => (
              <div
                key={i}
                className="p-6 bg-white border border-neutral-200 rounded-xl hover:border-neutral-400 transition"
              >
                <div className="text-lg font-display mb-2">"{alt.alternative}"</div>
                <div className="text-sm text-neutral-500 mb-4">{alt.reasoning}</div>
                <button
                  type="button"
                  onClick={() => handleAccept(alt)}
                  className="px-4 py-2 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Use this one
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Manual edit (advanced/escape hatch) */}
      <section className="mb-10">
        <button
          type="button"
          onClick={() => setShowManual(!showManual)}
          className="text-sm text-neutral-500 hover:text-neutral-800 underline"
        >
          {showManual ? 'Hide' : 'Show'} manual edit
        </button>
        
        {showManual && (
          <div className="mt-3 p-6 bg-white border border-neutral-200 rounded-xl">
            <p className="text-sm text-neutral-600 mb-3">
              Write your own copy directly. We'll save it as-is. We trust you, but the voice rules
              won't be enforced this way.
            </p>
            <textarea
              value={manualValue}
              onChange={e => setManualValue(e.target.value)}
              placeholder={currentValue ?? 'Write your version here'}
              className="input w-full min-h-[100px]"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={!manualValue.trim()}
                className="px-4 py-2 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
              >
                Save manual edit
              </button>
            </div>
          </div>
        )}
      </section>
      
      {/* History */}
      {chatHistory.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-neutral-500 hover:text-neutral-800 underline"
          >
            {showHistory ? 'Hide' : `Show ${chatHistory.length} previous`} edits
          </button>
          
          {showHistory && (
            <div className="mt-3 space-y-3">
              {chatHistory.map(session => (
                <div
                  key={session.id}
                  className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                >
                  <div className="text-neutral-500 mb-1">
                    {formatRelativeTime(session.created_at)} — you asked:
                  </div>
                  <div className="italic text-neutral-700 mb-2">"{session.user_request}"</div>
                  {session.was_accepted && session.accepted_alternative && (
                    <div className="text-green-700 text-xs">
                      Accepted: "{session.accepted_alternative}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffHr = Math.floor((now.getTime() - date.getTime()) / 3600000);
  if (diffHr < 1) return 'just now';
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}
