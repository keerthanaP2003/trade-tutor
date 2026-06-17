import React, { useState, useEffect, useRef } from "react";
import { 
  Search, X, ShoppingCart, Users, User, ArrowRight, MessageSquare, 
  MapPin, Check, Briefcase, GraduationCap, Sparkles, Filter, ChevronRight
} from "lucide-react";
import { 
  UserProfile, ProductListing, TeamMemberRequest, ChatThread
} from "../types";
import { 
  subscribeProducts, subscribeCollabs, subscribePeers, 
  buyProductInDb, joinCollabInDb, createChatThreadInDb 
} from "../firebaseService";
import { motion, AnimatePresence } from "motion/react";

interface GlobalSearchProps {
  userRef: UserProfile;
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

export default function GlobalSearch({ userRef, activeTab, setActiveTab }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState<"all" | "products" | "projects" | "peers">("all");
  
  // Real-time sub datasets
  const [productsList, setProductsList] = useState<ProductListing[]>([]);
  const [collabsList, setCollabsList] = useState<TeamMemberRequest[]>([]);
  const [peersList, setPeersList] = useState<UserProfile[]>([]);
  
  // Selected item for the side summary inspection panel
  const [selectedItem, setSelectedItem] = useState<{
    type: "product" | "project" | "peer";
    data: any;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to real-time collections
  useEffect(() => {
    if (!isOpen) return;

    const unsubProducts = subscribeProducts((data) => {
      setProductsList(data);
    });

    const unsubCollabs = subscribeCollabs((data) => {
      setCollabsList(data);
    });

    const unsubPeers = subscribePeers((data) => {
      setPeersList(data.filter(p => p.id !== userRef.id)); // exclude logged-in user
    });

    return () => {
      unsubProducts();
      unsubCollabs();
      unsubPeers();
    };
  }, [isOpen, userRef.id]);

  // Global Keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setSearchQuery("");
    setSelectedItem(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery("");
    setSelectedItem(null);
  };

  // Advanced search algorithm & filtering
  const filteredProducts = productsList.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCollabs = collabsList.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.projectDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.requiredSkills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPeers = peersList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const hasResults = 
    filteredProducts.length > 0 || 
    filteredCollabs.length > 0 || 
    filteredPeers.length > 0;

  // Direct Interactive Buttons with actual DB integrations
  const handleBuyProduct = async (product: ProductListing) => {
    if (userRef.walletBalance < product.price) {
      alert(`Insufficient Funds. Product Price is ₹${product.price}, while your balance is ₹${userRef.walletBalance}. Please post high budget bids or add funds.`);
      return;
    }
    const conf = window.confirm(`Confirm purchase of "${product.title}" for ₹${product.price}?`);
    if (!conf) return;

    try {
      await buyProductInDb(product, userRef);
      alert(`Success! You have purchased "${product.title}" from ${product.sellerName}. Transaction logs generated.`);
      setSelectedItem(null);
      handleClose();
      setActiveTab("wallet");
    } catch (err) {
      console.error(err);
      alert("An error occurred during purchase processing.");
    }
  };

  const handleJoinProject = async (col: TeamMemberRequest) => {
    if (col.membersCount >= col.membersLimit) {
      alert("This project roster has reached its strict capacity.");
      return;
    }
    const conf = window.confirm(`Apply to join "${col.title}" project team squad?`);
    if (!conf) return;

    try {
      await joinCollabInDb(col.id, col.membersCount);
      alert("Successfully registered as a squad partner of this project! Check the Team Collaborator workspace for assembly updates.");
      setSelectedItem(null);
      handleClose();
      setActiveTab("projects");
    } catch (err) {
      console.error(err);
      alert("Could not process project application.");
    }
  };

  const handleMessagePeer = async (peer: UserProfile) => {
    try {
      const threadId = await createChatThreadInDb(userRef, peer.id, peer.name, peer.avatar, peer.role);
      handleClose();
      setActiveTab("chats");
    } catch (err) {
      console.error(err);
      alert("Unable to open secure chat with peer.");
    }
  };

  return (
    <>
      {/* Header Search Trigger */}
      <div className="flex-grow max-w-sm mx-4 lg:mx-8 relative">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
          <input
            type="text"
            placeholder="Search listings, projects, peers (Cmd+K)..."
            onClick={handleOpen}
            readOnly
            className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-indigo-500/30 text-xs text-slate-300 placeholder-slate-500 rounded-xl pl-10 pr-16 py-2 focus:outline-none transition cursor-pointer"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-950 border border-slate-800 rounded-md font-mono pointer-events-none">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Visual Command Palette Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            
            {/* Background close trigger */}
            <div className="absolute inset-0" onClick={handleClose} />

            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-slate-910 border border-slate-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden relative shadow-2xl"
            >
              {/* Header Input Area */}
              <div className="p-4 border-b border-slate-850 flex items-center justify-between gap-4 bg-slate-950/60">
                <div className="flex items-center gap-3 flex-1">
                  <Search className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedItem(null);
                    }}
                    placeholder="Search titles, skills, authors, marketplace lists..."
                    className="bg-transparent border-none text-sm text-white placeholder-slate-500 py-1.5 w-full focus:outline-none"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => { setSearchQuery(""); setSelectedItem(null); }}
                      className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button 
                  onClick={handleClose}
                  className="px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-350 rounded-lg transition"
                >
                  ESC Close
                </button>
              </div>

              {/* Segmented Filter Navigation */}
              <div className="px-4 py-2 bg-slate-950/20 border-b border-slate-850/60 flex flex-wrap gap-1.5 items-center justify-between">
                <div className="flex gap-1">
                  {(["all", "products", "projects", "peers"] as const).map((seg) => (
                    <button
                      key={seg}
                      onClick={() => {
                        setActiveSegment(seg);
                        setSelectedItem(null);
                      }}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg border uppercase tracking-wider transition ${
                        activeSegment === seg
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
                          : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
                      }`}
                    >
                      {seg === "all" ? "All Nodes" : seg === "products" ? "🛒 Marketplace" : seg === "projects" ? "👥 Teams" : "🎓 Peers"}
                    </button>
                  ))}
                </div>

                <div className="text-[10px] font-mono text-slate-500">
                  {searchQuery ? `Searching for "${searchQuery}"` : "Global campus database connected"}
                </div>
              </div>

              {/* Central Contents: Grid containing Search Output & Detail Panel */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-5 overflow-hidden">
                
                {/* Left Side: Results Stream */}
                <div className="md:col-span-3 overflow-y-auto p-4 space-y-5 border-r border-slate-850">
                  
                  {!searchQuery && (
                    <div className="text-center py-10 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400">
                        <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                      <p className="text-xs font-semibold text-slate-300">Uniquely indexing campus commerce assets...</p>
                      <p className="text-[10px] text-slate-500 max-w-xs mx-auto">Get connected instantly with peer books, calculators, hackathon teammate rosters, and subject expert peers.</p>
                    </div>
                  )}

                  {searchQuery && !hasResults && (
                    <div className="text-center py-12 text-slate-500">
                      <p className="text-xs font-mono">No matching records found in the portal index.</p>
                      <p className="text-[10px] text-slate-600 mt-1">Try another keyword like "React", "Books", or classmate names.</p>
                    </div>
                  )}

                  {searchQuery && hasResults && (
                    <div className="space-y-4">
                      
                      {/* Marketplace Section */}
                      {(activeSegment === "all" || activeSegment === "products") && filteredProducts.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono flex items-center gap-1.5 pb-1 border-b border-slate-850">
                            <ShoppingCart className="w-3.5 h-3.5 text-cyan-400" /> Marketplace Listings ({filteredProducts.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {filteredProducts.map(p => (
                              <div
                                key={p.id}
                                onClick={() => setSelectedItem({ type: "product", data: p })}
                                className={`p-3 bg-slate-900 border rounded-xl cursor-pointer hover:bg-slate-850/80 transition flex justify-between items-center ${
                                  selectedItem?.type === "product" && selectedItem.data.id === p.id 
                                    ? "border-cyan-500/55" 
                                    : "border-slate-850"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <img 
                                    src={p.imageUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=150"} 
                                    className="w-10 h-10 rounded object-cover border border-slate-800" 
                                    alt="" 
                                  />
                                  <div className="min-w-0">
                                    <h5 className="text-xs font-bold text-slate-200 truncate">{p.title}</h5>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                      <span>Condition: <strong className="text-cyan-400">{p.condition}</strong></span>
                                      <span>•</span>
                                      <span>Category: {p.category}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-extrabold text-emerald-400 font-mono">₹{p.price}</span>
                                  <span className={`text-[8.5px] font-bold block uppercase ${p.status === "Available" ? "text-emerald-500" : "text-slate-500"}`}>{p.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Project Rosters Section */}
                      {(activeSegment === "all" || activeSegment === "projects") && filteredCollabs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono flex items-center gap-1.5 pb-1 border-b border-slate-850">
                            <Users className="w-3.5 h-3.5 text-emerald-400" /> Project Teammate Boards ({filteredCollabs.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {filteredCollabs.map(c => (
                              <div
                                key={c.id}
                                onClick={() => setSelectedItem({ type: "project", data: c })}
                                className={`p-3 bg-slate-900 border rounded-xl cursor-pointer hover:bg-slate-850/80 transition flex items-center justify-between ${
                                  selectedItem?.type === "project" && selectedItem.data.id === c.id 
                                    ? "border-emerald-500/55" 
                                    : "border-slate-850"
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <h5 className="text-xs font-bold text-slate-200 truncate">{c.title}</h5>
                                  <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{c.projectDescription}</p>
                                  <div className="flex gap-1 flex-wrap pt-1.5">
                                    {c.requiredSkills.slice(0, 3).map((sk, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 bg-slate-950 text-[8px] rounded border border-slate-800 text-slate-400 font-mono">{sk}</span>
                                    ))}
                                    {c.requiredSkills.length > 3 && <span className="text-[8px] text-slate-500 font-mono">+{c.requiredSkills.length - 3}</span>}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-semibold text-slate-300 font-mono">{c.membersCount}/{c.membersLimit} members</span>
                                  <span className="text-[8px] text-indigo-400 block font-mono">{c.creatorName}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Classmates / Peers Section */}
                      {(activeSegment === "all" || activeSegment === "peers") && filteredPeers.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono flex items-center gap-1.5 pb-1 border-b border-slate-850">
                            <User className="w-3.5 h-3.5 text-indigo-400" /> Peer Students & Campus Mentors ({filteredPeers.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {filteredPeers.map(p => (
                              <div
                                key={p.id}
                                onClick={() => setSelectedItem({ type: "peer", data: p })}
                                className={`p-3 bg-slate-900 border rounded-xl cursor-pointer hover:bg-slate-850/80 transition flex items-center justify-between ${
                                  selectedItem?.type === "peer" && selectedItem.data.id === p.id 
                                    ? "border-indigo-500/55" 
                                    : "border-slate-850"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 pr-3">
                                  <img 
                                    src={p.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
                                    className="w-8 h-8 rounded-full object-cover border border-slate-800" 
                                    alt="" 
                                  />
                                  <div className="min-w-0">
                                    <h5 className="text-xs font-bold text-slate-200 truncate">{p.name}</h5>
                                    <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{p.major || "Applied Science"} • {p.university || "Main Node"}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="px-1.5 py-0.5 text-[8.5px] leading-none uppercase font-bold text-indigo-400 bg-indigo-500/5 rounded border border-indigo-500/10 block font-mono">{p.role}</span>
                                  {p.skills && p.skills.length > 0 && (
                                    <span className="text-[9px] text-slate-500 block mt-1 truncate max-w-[100px] font-mono">{p.skills[0]}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* Right Side: Detailed Focus Inspection Panel */}
                <div className="md:col-span-2 overflow-y-auto p-4 bg-slate-950/40 flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    {!selectedItem ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <Filter className="w-8 h-8 text-slate-700 mb-2" />
                        <span className="text-xs font-bold text-slate-400">Roster Selection Active</span>
                        <p className="text-[10px] text-slate-500 mt-1">Select any item to trigger interactive details, communication tools, and instant checkout portals.</p>
                      </div>
                    ) : (
                      <motion.div
                        key={selectedItem.data.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.12 }}
                        className="space-y-4 flex-grow flex flex-col justify-between"
                      >
                        {/* Selected Type Wrapper */}
                        <div className="space-y-4">
                          {selectedItem.type === "product" && (() => {
                            const p = selectedItem.data as ProductListing;
                            return (
                              <>
                                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                                  <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />
                                  <span className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-cyan-400 border border-slate-800 rounded font-mono">
                                    {p.category.toUpperCase()}
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  <h3 className="text-sm font-bold text-white">{p.title}</h3>
                                  <div className="text-xs font-mono flex items-center justify-between text-slate-300">
                                    <span>Price: <strong className="text-emerald-400 font-extrabold text-sm">₹{p.price}</strong></span>
                                    <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] border border-indigo-500/15 uppercase font-bold">{p.condition}</span>
                                  </div>
                                </div>

                                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                                  {p.description}
                                </p>

                                <div className="border-t border-slate-850 pt-3 flex items-center gap-2.5">
                                  <img src={p.sellerAvatar} className="w-7 h-7 rounded-full object-cover border border-slate-800" alt="" />
                                  <div>
                                    <span className="text-[9px] uppercase tracking-wider block text-slate-500 font-bold">Seller Node</span>
                                    <span className="text-xs font-bold text-white leading-tight">{p.sellerName}</span>
                                  </div>
                                </div>
                              </>
                            );
                          })()}

                          {selectedItem.type === "project" && (() => {
                            const c = selectedItem.data as TeamMemberRequest;
                            return (
                              <>
                                <div className="space-y-1.5">
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] uppercase font-bold tracking-wider font-mono">CAMPUS COHORT RECRUITER</span>
                                  <h3 className="text-sm font-bold text-white">{c.title}</h3>
                                </div>

                                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                                  {c.projectDescription}
                                </p>

                                <div className="space-y-2">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Roster Stack Required</span>
                                  <div className="flex gap-1.5 flex-wrap">
                                    {c.requiredSkills.map((sk: string, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 bg-slate-950 text-[10px] rounded-lg border border-slate-850 text-slate-300 font-mono">{sk}</span>
                                    ))}
                                  </div>
                                </div>

                                <div className="border-t border-slate-850 pt-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <img src={c.creatorAvatar} className="w-7 h-7 rounded-full object-cover border border-slate-800" alt="" />
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider block text-slate-500 font-bold">Team Lead</span>
                                      <span className="text-xs font-bold text-white leading-tight">{c.creatorName}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                    Capacity: {c.membersCount}/{c.membersLimit}
                                  </span>
                                </div>
                              </>
                            );
                          })()}

                          {selectedItem.type === "peer" && (() => {
                            const p = selectedItem.data as UserProfile;
                            return (
                              <>
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={p.avatar}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-600/30" 
                                    alt="" 
                                  />
                                  <div>
                                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                                    <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9.5px] border border-indigo-500/15 uppercase font-mono font-bold">{p.role}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                                  <div>
                                    <span className="text-[8px] uppercase tracking-wider block text-slate-500 font-bold">Major Segment</span>
                                    <span className="text-[11px] font-bold text-slate-200">{p.major || "Computer Science"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] uppercase tracking-wider block text-slate-500 font-bold">University Node</span>
                                    <span className="text-[11px] font-bold text-slate-200">{p.university || "University Campus"}</span>
                                  </div>
                                </div>

                                {p.bio && (
                                  <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-905 p-3 rounded-lg border border-slate-850">
                                    {p.bio}
                                  </p>
                                )}

                                {p.skills && p.skills.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Skills Tag Deck</span>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {p.skills.map((sk: string, idx: number) => (
                                        <span key={idx} className="px-2 py-0.5 bg-slate-950 text-[10px] rounded-md border border-slate-850 text-indigo-300 font-mono">{sk}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        {/* Interactive Direct DB Handlers trigger button bar */}
                        <div className="border-t border-slate-850 pt-4 mt-4">
                          {selectedItem.type === "product" && (
                            <div className="flex gap-2">
                              {selectedItem.data.status === "Available" ? (
                                <button
                                  onClick={() => handleBuyProduct(selectedItem.data)}
                                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  Checkout Now (₹{selectedItem.data.price}) <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="w-full py-2 bg-slate-850 text-slate-500 font-bold text-xs rounded-xl flex items-center justify-center border border-slate-800 uppercase">
                                  Sold Out
                                </span>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    const mockPeer = {
                                      id: selectedItem.data.sellerId,
                                      name: selectedItem.data.sellerName,
                                      avatar: selectedItem.data.sellerAvatar,
                                      role: "Seller" as any
                                    } as UserProfile;
                                    await handleMessagePeer(mockPeer);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition flex items-center justify-center cursor-pointer"
                                title="Message Seller"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {selectedItem.type === "project" && (
                            <button
                              onClick={() => handleJoinProject(selectedItem.data)}
                              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              Join Project Squad <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {selectedItem.type === "peer" && (
                            <button
                              onClick={() => handleMessagePeer(selectedItem.data)}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4" /> Secure Message Peer
                            </button>
                          )}
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* Secure Dialog Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-850 flex justify-between items-center text-[9.5px] font-mono text-slate-550">
                <span>Database Index signature: <strong className="text-slate-400">FIRESTORE_RECONCILIATION_LIVE</strong></span>
                <span className="hidden sm:inline">Use ↑↓ keys with selection nodes, ESC to close window overlay.</span>
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>
    </>
  );
}
