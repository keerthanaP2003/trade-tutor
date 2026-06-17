import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, GraduationCap, Award, FileText, Lightbulb, Terminal, AlertCircle, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { UserProfile } from "../types";
import { subscribeAiChats, addAiChatMessageToDb, clearAiChatHistoryInDb } from "../firebaseService";

interface Message {
  role: "user" | "model";
  text: string;
  category?: string;
}

interface AiAssistantProps {
  userRef: UserProfile;
}

export default function AiAssistant({ userRef }: AiAssistantProps) {
  const [activeCategory, setActiveCategory] = useState<"study-assistant" | "resume-builder" | "career-advisor" | "project-generator" | "interview-prep">("study-assistant");
  const [dbMessages, setDbMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time sync with user's specific AI Chat sub-collection in Firestore
  useEffect(() => {
    const unsub = subscribeAiChats(userRef.id, (loaded) => {
      setDbMessages(loaded);
    });
    return () => unsub();
  }, [userRef.id]);

  // Filter messages by active operation category
  const filteredMessages = dbMessages.filter(m => m.category === activeCategory);

  const getIntroForCategory = (cat: string) => {
    switch (cat) {
      case "resume-builder":
        return "Welcome to the AI Resume Builder! Provide your current experience, projects, and target role so we can craft an outstanding professional resume.";
      case "career-advisor":
        return "Greetings! I am your AI Career Advisor. Let's map your professional aspirations, skill sets, and potential job pathways in the tech industry.";
      case "project-generator":
        return "Need inspiration? I am your AI Project Ideator. Tell me your preferred stack, complexity level, and area of interest to get a complete architectural blueprint.";
      case "interview-prep":
        return "Prepare to excel! I am your AI Interview Drill Coach. Let me know if you would like to run coding or system design exercises, and we will get started.";
      default:
        return "Hello! I am your server-side Google Gemini-powered Trade Tutor. Select one of the study or career paths on the left to activate optimized system parameters, then type your questions below!";
    }
  };

  const displayedMessages = filteredMessages.length > 0 ? filteredMessages : [
    {
      role: "model",
      text: getIntroForCategory(activeCategory)
    } as Message
  ];

  const categories = [
    { id: "study-assistant", label: "Study Assistant", desc: "Acing STEM courses", icon: GraduationCap },
    { id: "resume-builder", label: "Resume Builder", desc: "Tailoring Markdown resumes", icon: FileText },
    { id: "career-advisor", label: "Career Advisor", desc: "Mapping industry roles", icon: Award },
    { id: "project-generator", label: "Project Ideator", desc: "Full-stack architectural outlines", icon: Lightbulb },
    { id: "interview-prep", label: "Interview Prep", desc: "Technical coding & system drills", icon: Terminal }
  ];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setErrorMsg("");
    const userPrompt = input.trim();
    setInput("");
    
    // Write user prompt to cloud persistence
    await addAiChatMessageToDb(userRef.id, activeCategory, "user", userPrompt);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          category: activeCategory
        })
      });

      const data = await res.json();
      if (data.status === "success") {
        // Save model's reply in cloud database
        await addAiChatMessageToDb(userRef.id, activeCategory, "model", data.reply);
      } else {
        setErrorMsg(data.message || "Failed to prompt model. Verify server keys.");
        // Save fallback/error visual state in database so the thread contains feedback
        const errorTemplate = `⚠️ **API Error**: ${data.message || "Unspecified configuration issue."}\n\n*Please ensure you have configured your GEMINI_API_KEY in the Secrets menu to use active server routing.*`;
        await addAiChatMessageToDb(userRef.id, activeCategory, "model", errorTemplate);
      }
    } catch (err) {
      setErrorMsg("Network timeout while contacting backend server.");
      const errorTemplate = `⚠️ **Network Error**: Network timeout while contacting backend server.`;
      await addAiChatMessageToDb(userRef.id, activeCategory, "model", errorTemplate);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (confirm("Reset current conversation logs and clear your full AI history?")) {
      try {
        setLoading(true);
        await clearAiChatHistoryInDb(userRef.id);
      } catch (err) {
        console.error("Purging chat failed: ", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div id="ai-assistant-root" className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-140px)]">
      {/* Category selector panel */}
      <div className="lg:col-span-1 space-y-3">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <h3 className="font-sans font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI Operations
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal">
            Select a specialized module. It configures backend system constraints on Gemini for higher mathematical and professional utility.
          </p>
        </div>

        <div className="space-y-1">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as any);
                }}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition text-left cursor-pointer ${
                  isSelected 
                    ? "bg-indigo-600/10 text-white border-indigo-500/40 font-semibold" 
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:bg-slate-850"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                <div>
                  <div className="text-xs">{cat.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal truncate max-w-[150px]">{cat.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <button 
          onClick={handleClearChat}
          className="w-full py-2 bg-slate-950 text-slate-400 hover:text-red-400 hover:bg-red-500/5 text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-900 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Purge Chat History
        </button>
      </div>

      {/* Main chat terminal view */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl min-h-[500px]">
        {/* Terminal Header */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-mono text-slate-300">Model: gemini-3.5-flash</span>
          </div>

          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
            {activeCategory.replace("-", " ")}
          </span>
        </div>

        {/* Message output center */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4 max-h-[55vh]">
          {displayedMessages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Visual profile indicator */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser 
                    ? "bg-indigo-600 text-white" 
                    : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {isUser ? "ME" : "AI"}
                </div>

                <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                  isUser 
                    ? "bg-indigo-600 border-indigo-500/50 text-white rounded-tr-none" 
                    : "bg-slate-950 border-slate-850 text-slate-200 rounded-tl-none"
                }`}>
                  <div className="p-1 leading-relaxed whitespace-pre-wrap markdown-body prose prose-invert max-w-none text-slate-200">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 mr-auto items-center">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-bold">
                AI
              </div>
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-2xl rounded-tl-none font-mono text-[10px] text-slate-400 flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Tuning parameters and generating response...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Input Text Form */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800">
          <form onSubmit={handleSendMessage} className="flex gap-2.5">
            <input
              type="text"
              placeholder={`Ask Gemini customized query regarding your "${activeCategory.replace("-", " ")}"...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none transition"
              disabled={loading}
            />
            
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`px-4 py-3 rounded-xl flex items-center justify-center transition cursor-pointer ${
                loading || !input.trim() 
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-1 mt-2.5 text-[9px] text-slate-500">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            <span>Generates complete STEM blocks and resume templates server side. Securely sandboxed.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
