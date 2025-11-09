import React, { useState, useRef, useEffect } from "react";

// Chatbot — talks to server /api/chat which proxies to Gemini (AI Studio)
export default function Chatbot({ position = "bottom-right" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, from: "bot", text: "Hi! I can help with the board or tasks. Ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const idRef = useRef(2);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  function pushMessage(from, text) {
    const id = idRef.current++;
    setMessages((m) => [...m, { id, from, text }]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    pushMessage("user", text);
    setInput("");

    try {
      setTyping(true);
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        pushMessage("bot", `Error: ${t || res.status}`);
        setTyping(false);
        return;
      }
      const j = await res.json();
      const reply = j?.reply ?? "(no reply)";
      pushMessage("bot", reply);
    } catch (err) {
      pushMessage("bot", `Chat failed: ${err.message || err}`);
    } finally {
      setTyping(false);
    }
  }

  const containerPos =
    position === "bottom-left"
      ? "left-6 bottom-6"
      : position === "top-right"
      ? "right-6 top-6"
      : "right-6 bottom-6";

  return (
    <div className={`fixed z-50 ${containerPos} w-[320px]`} style={{ maxWidth: "90vw" }}>
      {open && (
        <div className="mb-2 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-3 py-2 bg-sky-600 text-white font-semibold">Victor E. Bull</div>
          <div ref={listRef} className="h-48 overflow-auto p-3 text-sm bg-white">
            {messages.map((m) => (
              <div key={m.id} className={`mb-2 flex ${m.from === "bot" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${m.from === "bot" ? "bg-slate-100 text-slate-800" : "bg-sky-600 text-white"}`}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="mb-2 flex justify-start">
                <div className="max-w-[60%] rounded-lg px-3 py-2 bg-slate-100 text-slate-800">
                  <div>...</div>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the board..."
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none"
              />
              <button className="rounded-md bg-sky-600 px-3 py-2 text-white text-sm font-semibold">Send</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full bg-sky-600 text-white w-12 h-12 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          title="Open chat"
        >
          💬
        </button>
      </div>
    </div>
  );
}
