import React, { useState, useEffect } from "react";
import { MessageSquare, Heart, Plus, Calendar, Trophy, RefreshCw, Layers } from "lucide-react";
import { ForumPost, UserProfile } from "../types";
import { subscribeForums, addForumPostToDb, likeForumPostInDb, createChatThreadInDb } from "../firebaseService";
import { auth } from "../firebase";

interface CommunityProps {
  userRef: UserProfile;
  onNavigate?: (tabId: string) => void;
}

export default function Community({ userRef, onNavigate }: CommunityProps) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleOpenDirectChat = async (targetId: string, targetName: string, targetAvatar: string, targetRole: string) => {
    try {
      await createChatThreadInDb(userRef, targetId, targetName, targetAvatar, targetRole);
      if (onNavigate) {
        onNavigate("chats");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to open secure chat thread.");
    }
  };

  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<"General" | "Discussions" | "Events" | "Hackathons">("Discussions");
  const [content, setContent] = useState("");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeForums((updated) => {
      setPosts(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      setErrorMsg("Title and Content are mandatory details.");
      return;
    }

    try {
      const newPost = {
        title,
        category: cat,
        content,
        authorId: userRef.id,
        authorName: userRef.name,
        authorAvatar: userRef.avatar,
        authorRole: userRef.role
      };
      await addForumPostToDb(newPost);
      setShowAddModal(false);
      setTitle("");
      setContent("");
    } catch (err) {
      setErrorMsg("Failed to connect with database.");
    }
  };

  const handleLike = async (id: string) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    let updatedLiked = [...(post.likedByUsers || [])];
    let likesCount = post.likes || 0;

    if (updatedLiked.includes(userId)) {
      updatedLiked = updatedLiked.filter(uid => uid !== userId);
      likesCount = Math.max(0, likesCount - 1);
    } else {
      updatedLiked.push(userId);
      likesCount += 1;
    }

    try {
      await likeForumPostInDb(id, updatedLiked, likesCount);
    } catch (err) {
      console.error(err);
    }
  };

  const hackathons = [
    { title: "MetroHacks AI Campus Summit", date: "June 25 - 27, 2026", prizePool: "$15,000", tracks: ["Campus utility", "Local commerce vectors"] },
    { title: "Prisma Cloud Architect Hackathon", date: "July 12 - 14, 2026", prizePool: "$25,000", tracks: ["DB Optimization", "Relational architecture scale"] }
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Campus Community & Forums
          </h2>
          <p className="text-xs text-slate-400">Share knowledge, coordinate hackathon details, examine local cheat sheets, and vote on events calendar.</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Publish New Thread
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Forums List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between col-span-3">
            <h3 className="font-sans font-semibold text-sm text-slate-300">Active Campus Threads</h3>
            <button className="p-1.5 bg-slate-950 border border-slate-800 hover:text-white rounded-lg transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-6 text-xs text-slate-500">Syncing college forums...</div>
          ) : posts.length === 0 ? (
            <div className="p-10 border border-slate-800 bg-slate-900/10 text-center text-slate-500 text-xs rounded-xl">No active posts. Create one now.</div>
          ) : (
            posts.map(p => (
              <div key={p.id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 hover:border-slate-750 transition flex flex-col justify-between">
                
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 border text-[9.5px] font-bold font-mono rounded ${
                      p.category === "Hackathons" 
                        ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}>
                      {p.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{p.createdAt}</span>
                  </div>

                  <h4 className="font-semibold text-white text-base leading-snug">{p.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{p.content}</p>
                </div>

                <div className="border-t border-slate-800/80 pt-3 mt-2.5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <img src={p.authorAvatar} className="w-5.5 h-5.5 rounded-full object-cover border border-slate-705" alt={p.authorName} />
                    <div>
                      <div className="text-[10px] font-bold text-white leading-none flex items-center gap-1.5">
                        {p.authorName}
                        {p.authorId && p.authorId !== userRef.id && (
                          <button
                            onClick={() => handleOpenDirectChat(p.authorId!, p.authorName, p.authorAvatar, p.authorRole)}
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-slate-950 hover:bg-slate-850 hover:text-indigo-400 border border-slate-800 rounded text-[8px] font-mono cursor-pointer"
                            title="Direct Message Author"
                          >
                            Chat
                          </button>
                        )}
                      </div>
                      <div className="text-[8px] text-slate-500 leading-none mt-0.5">{p.authorRole}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleLike(p.id)}
                      className={`flex items-center gap-1 hover:text-red-400 transition cursor-pointer ${p.likedByUser ? "text-red-400" : "text-slate-500"}`}
                    >
                      <Heart className={`w-4 h-4 ${p.likedByUser ? "fill-current" : ""}`} />
                      <span className="text-[11px] font-semibold">{p.likes}</span>
                    </button>

                    <div className="flex items-center gap-1 text-slate-500">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[11px] font-semibold">{p.replies}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Info panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-purple-400" />
              Local Hackathons
            </h3>

            <div className="space-y-4">
              {hackathons.map(hk => (
                <div key={hk.title} className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-xs">{hk.title}</h4>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-400" /> {hk.date}</span>
                    <span className="font-bold text-emerald-400">{hk.prizePool}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {hk.tracks.map(t => (
                      <span key={t} className="px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[8px] text-slate-500 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Assembly Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Publish New Discussion Thread</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 text-red-400 text-xs border border-red-500/20 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Thread Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Critical alpha-beta algorithms summaries for CS 480"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Board Classification</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="Discussions">Academic Discussions</option>
                  <option value="General">General Campus Rumors</option>
                  <option value="Events">Campus Events</option>
                  <option value="Hackathons">Sprints & Hackathons</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Post Detail Content</label>
                <textarea
                  placeholder="Insert exact textbook requirements, detailed suggestions, event timing maps, or teammate requests..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none h-32 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-medium text-xs rounded-xl hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-medium text-xs text-white rounded-xl transition cursor-pointer"
                >
                  Confirm Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
