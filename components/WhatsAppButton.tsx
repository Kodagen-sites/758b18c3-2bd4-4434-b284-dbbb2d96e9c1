"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

export function WhatsAppButton({
  phone,
  greeting,
  businessName = "Support",
}: {
  phone: string;
  greeting: string;
  businessName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const digits = phone.replace(/\D/g, "");

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  function sendToWhatsApp() {
    const text = message.trim() || greeting;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
    setMessage("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendToWhatsApp();
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Chat popup */}
      {open && (
        <div
          className="w-[320px] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ background: "#f0f2f5", maxHeight: "420px" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: "#075e54" }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
              style={{ background: "#25D366" }}
            >
              <svg viewBox="0 0 32 32" fill="white" className="w-6 h-6" aria-hidden>
                <path d="M16.004 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.347.627 4.56 1.72 6.48L2.667 29.333l7.04-1.693A13.27 13.27 0 0 0 16.004 29.333C23.36 29.333 29.333 23.36 29.333 16S23.36 2.667 16.004 2.667zm0 24a11.6 11.6 0 0 1-5.947-1.627l-.427-.253-4.16 1.013 1.04-3.92-.28-.44A11.6 11.6 0 0 1 4.667 16c0-6.24 5.094-11.333 11.337-11.333S27.333 9.76 27.333 16 22.24 26.667 16.004 26.667zm6.253-8.493c-.347-.174-2.04-1.013-2.36-1.12-.32-.12-.547-.174-.773.174-.227.347-.88 1.12-1.08 1.347-.2.213-.4.24-.747.08-.347-.174-1.467-.547-2.787-1.733-1.027-.92-1.72-2.067-1.92-2.413-.2-.347-.02-.533.147-.707.147-.147.347-.373.52-.56.174-.187.227-.32.347-.533.12-.213.06-.4-.027-.573-.093-.174-.773-1.853-1.053-2.547-.28-.68-.56-.573-.773-.587h-.653c-.227 0-.6.08-.92.4-.307.32-1.2 1.173-1.2 2.853s1.227 3.307 1.4 3.533c.174.227 2.413 3.68 5.84 5.16.813.347 1.453.56 1.947.72.813.26 1.56.227 2.147.133.653-.107 2.04-.84 2.333-1.64.28-.8.28-1.493.2-1.64-.08-.147-.307-.227-.653-.4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate">{businessName}</p>
              <p className="text-green-200 text-[11px] mt-0.5">Typically replies instantly</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-white/70 hover:text-white transition p-1 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat body */}
          <div
            className="flex-1 px-4 py-5 overflow-y-auto"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5ddd5' /%3E%3C/svg%3E")`,
            }}
          >
            {/* Business greeting bubble */}
            <div className="flex items-end gap-2 mb-2">
              <div
                className="max-w-[85%] bg-white rounded-[16px] rounded-tl-sm px-3.5 py-2.5 shadow-sm"
              >
                <p className="text-[13px] text-gray-800 leading-snug">{greeting}</p>
                <p className="text-[10px] text-gray-400 text-right mt-1">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="flex items-end gap-2 px-3 py-2.5 bg-white border-t border-gray-200">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type a message…"
              className="flex-1 resize-none rounded-full px-4 py-2 text-[13px] text-gray-800 outline-none leading-snug"
              style={{
                background: "#f0f2f5",
                maxHeight: "80px",
                overflowY: "auto",
              }}
            />
            <button
              onClick={sendToWhatsApp}
              aria-label="Send message"
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95"
              style={{ background: "#25D366" }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close WhatsApp chat" : "Chat on WhatsApp"}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
        style={{
          background: "#25D366",
          boxShadow: "0 4px 16px rgba(37,211,102,0.45)",
        }}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <svg viewBox="0 0 32 32" fill="white" className="w-7 h-7" aria-hidden>
            <path d="M16.004 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.347.627 4.56 1.72 6.48L2.667 29.333l7.04-1.693A13.27 13.27 0 0 0 16.004 29.333C23.36 29.333 29.333 23.36 29.333 16S23.36 2.667 16.004 2.667zm0 24a11.6 11.6 0 0 1-5.947-1.627l-.427-.253-4.16 1.013 1.04-3.92-.28-.44A11.6 11.6 0 0 1 4.667 16c0-6.24 5.094-11.333 11.337-11.333S27.333 9.76 27.333 16 22.24 26.667 16.004 26.667zm6.253-8.493c-.347-.174-2.04-1.013-2.36-1.12-.32-.12-.547-.174-.773.174-.227.347-.88 1.12-1.08 1.347-.2.213-.4.24-.747.08-.347-.174-1.467-.547-2.787-1.733-1.027-.92-1.72-2.067-1.92-2.413-.2-.347-.02-.533.147-.707.147-.147.347-.373.52-.56.174-.187.227-.32.347-.533.12-.213.06-.4-.027-.573-.093-.174-.773-1.853-1.053-2.547-.28-.68-.56-.573-.773-.587h-.653c-.227 0-.6.08-.92.4-.307.32-1.2 1.173-1.2 2.853s1.227 3.307 1.4 3.533c.174.227 2.413 3.68 5.84 5.16.813.347 1.453.56 1.947.72.813.26 1.56.227 2.147.133.653-.107 2.04-.84 2.333-1.64.28-.8.28-1.493.2-1.64-.08-.147-.307-.227-.653-.4z" />
          </svg>
        )}
      </button>
    </div>
  );
}
