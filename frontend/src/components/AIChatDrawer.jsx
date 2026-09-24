import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Minimize2,
  Maximize2,
  Trash2
} from "lucide-react";

export default function AIChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Namaste! I am your **AI School Assessment & Analytics Assistant**. Ask me anything about student marks, rankings, attendance alerts, or FLN Mission Buniyad levels.",
      data: null,
      recommendations: [
        "Who has attendance below 75%?",
        "Who are the class toppers?",
        "Which students are at risk?",
        "Tell me about Naksh (Roll 1)"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    // Add user message
    const userMsg = { sender: "user", text: query };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await api.post("/chat/message", {
        message: query,
        class_section_id: 1
      });

      if (res.data.status === "success") {
        const resp = res.data.response;
        setMessages(prev => [
          ...prev,
          {
            sender: "ai",
            text: resp.reply,
            intent: resp.intent,
            dataType: resp.data_type,
            data: resp.data,
            recommendations: resp.recommendations || []
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: "ai",
          text: "I encountered an issue processing your query. Please make sure the backend server is running and try again.",
          data: null,
          recommendations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        sender: "ai",
        text: "Chat cleared. What else would you like to explore about Class III-A?",
        data: null,
        recommendations: [
          "Who has attendance below 75%?",
          "Who are the class toppers?",
          "Which students are at risk?"
        ]
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      {/* Floating Toggle Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xl shadow-slate-900/20 hover:scale-105 transition-all duration-200 group border border-slate-800"
        >
          <div className="relative">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          </div>
          <span className="tracking-wide">AI Assistant</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`bg-white border border-slate-200 rounded-2xl shadow-2xl transition-all duration-300 flex flex-col overflow-hidden ${
            isMinimized
              ? "w-80 h-14"
              : "w-[92vw] sm:w-[420px] h-[560px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  AI Education Assistant
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">Class III-A Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Clear Chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/50">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.sender === "user" ? "items-end" : "items-start"
                    } space-y-1.5`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      {m.sender === "user" ? (
                        <>
                          <span>You</span>
                          <User className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">AI Assistant</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed ${
                        m.sender === "user"
                          ? "bg-emerald-600 text-white rounded-br-none shadow-sm"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-xs"
                      }`}
                    >
                      <div className="whitespace-pre-line">{m.text}</div>

                      {/* Structured Data Table */}
                      {m.dataType === "TABLE" && Array.isArray(m.data) && (
                        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
                          <table className="w-full text-left text-[11px]">
                            <tbody className="divide-y divide-slate-200">
                              {m.data.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-100/60">
                                  {Object.values(row).map((val, cIdx) => (
                                    <td key={cIdx} className="py-1.5 px-2 font-medium text-slate-700">
                                      {String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* KPI Chips */}
                      {m.dataType === "METRICS" && Array.isArray(m.data) && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {m.data.map((kpi, kIdx) => (
                            <div key={kIdx} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-500 block font-medium">{kpi.metric}</span>
                              <span className="font-bold text-slate-900 text-xs mt-0.5 block">{kpi.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recommendations */}
                      {m.recommendations && m.recommendations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-emerald-600" /> Recommended Queries:
                          </span>
                          {m.recommendations.map((rec, rIdx) => (
                            <button
                              key={rIdx}
                              onClick={() => handleSend(rec)}
                              className="text-left w-full text-[10px] text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70 p-1 rounded transition block font-medium"
                            >
                              • {rec}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Bot className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span className="animate-pulse">Analyzing classroom database...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about marks, attendance, FLN..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || loading}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
