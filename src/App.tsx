import React, { useState, useEffect, useRef } from "react";
import { 
  ShoppingCart, GraduationCap, Users, Sparkles, MessageSquare, 
  Briefcase, Layers, CreditCard, Menu, X, User,
  Github, Globe, HelpCircle, ShieldAlert, LogOut, Bell,
  Sun, Moon, LayoutDashboard
} from "lucide-react";

import { UserProfile, UserRole, Assignment, ChatThread } from "./types";
import Dashboard from "./components/Dashboard";
import GlobalSearch from "./components/GlobalSearch";
import Marketplace from "./components/Marketplace";
import Assignments from "./components/Assignments";
import Projects from "./components/Projects";
import AiAssistant from "./components/AiAssistant";
import Chats from "./components/Chats";
import Community from "./components/Community";
import Wallet from "./components/Wallet";
import Login from "./components/Login";

import { auth, rtdb } from "./firebase";
import { ref, onValue } from "firebase/database";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  subscribeUserProfile, 
  updateUserProfileInDb, 
  seedDatabaseIfEmpty,
  subscribeChats,
  subscribeAssignments
} from "./firebaseService";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [isLightTheme, setIsLightTheme] = useState<boolean>(() => {
    return localStorage.getItem("theme_preference") === "light";
  });

  // Real-time Firebase Connection State Tracking
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(navigator.onLine);

  const isOnline = isBrowserOnline && isFirebaseConnected;

  useEffect(() => {
    localStorage.setItem("theme_preference", isLightTheme ? "light" : "dark");
  }, [isLightTheme]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const connectedRef = ref(rtdb, ".info/connected");
      unsubscribe = onValue(connectedRef, (snap) => {
        setIsFirebaseConnected(!!snap.val());
      }, (error) => {
        console.warn("RTDB connected listener failed: ", error);
        // Fallback or keep current
      });
    } catch (err) {
      console.warn("Could not setup RTDB connection listener: ", err);
    }

    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Real-time toast notifications state
  interface ToastNotification {
    id: string;
    type: "chat" | "assignment";
    title: string;
    message: string;
    avatar?: string;
    action?: () => void;
  }
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const triggerToast = (toast: Omit<ToastNotification, "id">) => {
    const id = `${toast.type}_${Date.now()}`;
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const isInitialChats = useRef(true);
  const prevChatsRef = useRef<ChatThread[]>([]);
  const isInitialAssignments = useRef(true);
  const prevAssignmentsRef = useRef<Assignment[]>([]);

  // Form states for profile edit
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editUniv, setEditUniv] = useState("");
  const [editRole, setEditRole] = useState<UserRole>(UserRole.STUDENT);

  useEffect(() => {
    if (!userProfile) return;

    // 1. CHATS REAL-TIME LISTENER
    isInitialChats.current = true;
    const unsubscribeChats = subscribeChats(userProfile.id, (loadedThreads) => {
      if (isInitialChats.current) {
        prevChatsRef.current = loadedThreads;
        isInitialChats.current = false;
        return;
      }

      for (const thread of loadedThreads) {
        const prevThread = prevChatsRef.current.find(t => t.id === thread.id);
        const isNewMessage = !prevThread || prevThread.lastMessageAt !== thread.lastMessageAt || prevThread.lastMessage !== thread.lastMessage;
        
        if (isNewMessage) {
          // Check if lastSenderId is from someone else
          // @ts-ignore
          if (thread.lastSenderId && thread.lastSenderId !== userProfile.id) {
            triggerToast({
              type: "chat",
              title: "New Message 💬",
              // @ts-ignore
              message: `${thread.lastSenderName || thread.participantName}: "${thread.lastMessage}"`,
              // @ts-ignore
              avatar: thread.lastSenderAvatar || thread.participantAvatar,
              action: () => setActiveTab("chats")
            });
          }
        }
      }
      prevChatsRef.current = loadedThreads;
    });

    // 2. ASSIGNMENTS REAL-TIME LISTENER
    isInitialAssignments.current = true;
    const unsubscribeAssignments = subscribeAssignments((updated) => {
      if (isInitialAssignments.current) {
        prevAssignmentsRef.current = updated;
        isInitialAssignments.current = false;
        return;
      }

      for (const assign of updated) {
        const prevAssign = prevAssignmentsRef.current.find(a => a.id === assign.id);
        const myProp = assign.proposals.find(p => p.expertId === userProfile.id);
        const myPrevProp = prevAssign?.proposals.find(p => p.expertId === userProfile.id);

        if (myProp && myProp.status === "Accepted" && (!myPrevProp || myPrevProp.status !== "Accepted")) {
          triggerToast({
            type: "assignment",
            title: "Tutoring Bid Accepted! 🎓",
            message: `Your bid of ₹${myProp.bidAmount} for "${assign.title}" has been accepted!`,
            avatar: assign.userAvatar,
            action: () => setActiveTab("assignments")
          });
        }
      }
      prevAssignmentsRef.current = updated;
    });

    return () => {
      unsubscribeChats();
      unsubscribeAssignments();
    };
  }, [userProfile?.id]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Monitor active Firebase Authentication session
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Auto-seed database collections with initial mock data if they don't exist yet
        await seedDatabaseIfEmpty();

        // Subscribe to real-time updates for this user profile document
        unsubscribeProfile = subscribeUserProfile(firebaseUser.uid, (profile) => {
          if (profile) {
            setUserProfile(profile);
            setEditName(profile.name);
            setEditBio(profile.bio);
            setEditMajor(profile.major);
            setEditUniv(profile.university);
            setEditRole(profile.role as UserRole);
          } else {
            setUserProfile(null);
          }
          setAuthChecked(true);
        });
      } else {
        setUserProfile(null);
        setAuthChecked(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      await updateUserProfileInDb(userProfile.id, {
        name: editName,
        bio: editBio,
        role: editRole,
        major: editMajor,
        university: editUniv
      });
      setShowProfileModal(false);
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMobileMenuOpen(false);
    } catch (err) {
      console.error("Sign out transaction aborted", err);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "marketplace", label: "P2P Marketplace", icon: ShoppingCart },
    { id: "assignments", label: "Assignments Bid", icon: GraduationCap },
    { id: "projects", label: "Team Collaborator", icon: Users },
    { id: "ai", label: "AI Expert Tutor", icon: Sparkles, highlight: true },
    { id: "chats", label: "Peers Chat", icon: MessageSquare },
    { id: "community", label: "Community Forums", icon: Layers },
    { id: "wallet", label: "Secure Wallet & Escrow", icon: CreditCard }
  ];

  // While checking standard Firebase login session
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs font-mono">Synchronizing Secure Session Node...</p>
        </div>
      </div>
    );
  }

  // If no user profile loaded from Auth
  if (!userProfile) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${isLightTheme ? "theme-light" : ""}`}>
      
      {isLightTheme && (
        <style dangerouslySetInnerHTML={{ __html: `
          /* HIGH CONTRAST LIGHT THEME SCROLLBARS AND GENERAL ROOT */
          :root {
            color-scheme: light !important;
          }
          
          /* Main structural remapping */
          .theme-light, 
          .theme-light .bg-slate-950, 
          .theme-light .bg-slate-950\\/80, 
          .theme-light .bg-slate-950\\/95,
          .theme-light .bg-slate-950\\/60,
          .theme-light .bg-\\[\\#111216\\] {
            background-color: #f8fafc !important; /* pristine off-white slate-50 */
            color: #0f172a !important; /* solid charcoal slate-900 */
          }
          
          /* Overlay or floating panel overrides */
          .theme-light .bg-slate-900,
          .theme-light .bg-slate-900\\/60,
          .theme-light .bg-slate-900\\/50,
          .theme-light .bg-slate-900\\/80,
          .theme-light .bg-slate-950\\/40,
          .theme-light .bg-\\[\\#171920\\],
          .theme-light .bg-slate-900\\/60 {
            background-color: #ffffff !important; /* pure white for contrast */
            color: #1e293b !important;
          }
          
          /* Active page backgrounds & sidebar / header borders */
          .theme-light header,
          .theme-light aside,
          .theme-light .border-slate-900,
          .theme-light .border-slate-800,
          .theme-light .border-slate-850,
          .theme-light .border-slate-800\\/80,
          .theme-light .border-slate-750,
          .theme-light .border-slate-700 {
            border-color: #cbd5e1 !important; /* elegant border-slate-300 */
          }
          
          /* Button controls & list item hovers */
          .theme-light .hover\\:bg-slate-850:hover,
          .theme-light .hover\\:bg-slate-900\\/60:hover,
          .theme-light .hover\\:bg-slate-800:hover,
          .theme-light .bg-slate-850,
          .theme-light .bg-slate-800 {
            background-color: #f1f5f9 !important; /* light gray hover slate-100 */
            color: #0f172a !important;
          }
          
          /* Text overrides for headers and body elements */
          .theme-light .text-slate-100,
          .theme-light .text-white,
          .theme-light .text-slate-200,
          .theme-light h1,
          .theme-light h2,
          .theme-light h3,
          .theme-light h4,
          .theme-light h5 {
            color: #0f172a !important;
          }
          
          /* Specifically, make trade tutor title very dark */
          .theme-light h1.font-black,
          .theme-light h2.font-black {
            color: #0f172a !important;
          }
          
          .theme-light .text-slate-300,
          .theme-light .text-slate-350,
          .theme-light .text-slate-400,
          .theme-light .text-slate-450,
          .theme-light p {
            color: #334155 !important; /* readable dark gray slate-700 */
          }
          
          .theme-light .text-slate-500,
          .theme-light .text-slate-550,
          .theme-light .text-slate-600,
          .theme-light .text-slate-650 {
            color: #64748b !important; /* accessible generic gray slate-500 */
          }
          
          /* High contrast readability adjustments on alert banners & dynamic text */
          .theme-light .text-indigo-400 {
            color: #4f46e5 !important; /* rich deep indigo */
          }
          .theme-light .text-emerald-400 {
            color: #16a34a !important; /* readable rich forest green */
          }
          .theme-light .text-rose-400,
          .theme-light .text-red-400,
          .theme-light .text-slate-405 {
            color: #dc2626 !important; /* bright alarm red */
          }
          .theme-light .text-amber-400,
          .theme-light .text-orange-400 {
            color: #b45309 !important; /* dark readable orange */
          }
          
          /* Forms, Textareas, Inputs inside components */
          .theme-light input,
          .theme-light textarea,
          .theme-light select {
            background-color: #ffffff !important;
            border-color: #cbd5e1 !important;
            color: #0f172a !important;
          }
          .theme-light input::placeholder,
          .theme-light textarea::placeholder {
            color: #94a3b8 !important;
          }
          
          /* Interactive modals */
          .theme-light .backdrop-blur-xs,
          .theme-light .bg-black\\/60,
          .theme-light .bg-black\\/80 {
            background-color: rgba(15, 23, 42, 0.45) !important;
          }
          
          /* Custom overrides for components with special custom classes */
          .theme-light .border-indigo-500\\/10 {
            border-color: rgba(79, 70, 229, 0.2) !important;
          }
          
          /* Fix active icon highlight alignment in list components */
          .theme-light .bg-indigo-600 {
            background-color: #4f46e5 !important;
            color: #ffffff !important;
          }
          .theme-light .bg-indigo-600 * {
            color: #ffffff !important;
          }
          
          /* Additional visual fixes */
          .theme-light .shadow-2xl {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08) !important;
          }
          .theme-light .bg-indigo-500\\/5 {
            background-color: rgba(79, 70, 229, 0.05) !important;
          }
          .theme-light .bg-emerald-500\\/5 {
            background-color: rgba(22, 163, 74, 0.05) !important;
          }
          .theme-light .bg-amber-500\\/5 {
            background-color: rgba(217, 119, 6, 0.05) !important;
          }
          .theme-light .border-indigo-500\\/15 {
            border-color: rgba(79, 70, 229, 0.15) !important;
          }
          .theme-light .border-emerald-500\\/15 {
            border-color: rgba(22, 163, 74, 0.15) !important;
          }
          .theme-light .border-amber-500\\/15 {
            border-color: rgba(217, 119, 6, 0.15) !important;
          }
        ` }} />
      )}
      
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-slate-900 backdrop-blur-md px-4 lg:px-8 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-2.5 animate-fade-in">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/10">
            TT
          </div>
          <div>
            <h1 className="font-sans font-black text-white text-base tracking-tight leading-none">TRADE TUTOR</h1>
            <span className="text-[9.5px] text-indigo-400 font-mono tracking-widest uppercase mt-0.5 block">College Utility Portal</span>
          </div>
        </div>

        {/* Global Search Component */}
        <GlobalSearch 
          userRef={userProfile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Desktop navbar balance indicators & Profile Control */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-4 bg-slate-900 border border-slate-850 px-3.5 py-1.5 rounded-xl text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-550 font-bold">Wallet:</span>
              <span className="text-indigo-400 font-bold">₹{userProfile.walletBalance.toFixed(2)}</span>
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div className="flex items-center gap-1">
              <span className="text-slate-550 font-bold">Earnings:</span>
              <span className="text-emerald-400 font-bold">₹{userProfile.earnings.toFixed(2)}</span>
            </div>
          </div>

          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300 transition cursor-pointer"
          >
            <img src={userProfile.avatar} className="w-5.5 h-5.5 rounded-full object-cover border border-slate-755 animate-fade-in" alt={userProfile.name} />
            <div className="text-left font-medium">
              <div className="leading-none text-white font-semibold">{userProfile.name}</div>
              <div className="text-[8px] mt-0.5 font-mono tracking-wider">
                <span className="text-slate-500">{userProfile.role.toUpperCase()}</span>
              </div>
            </div>
          </button>

          {/* Dynamic Theme Toggle Widget */}
          <button
            onClick={() => setIsLightTheme(!isLightTheme)}
            title={isLightTheme ? "Switch to Dark Mode" : "Switch to High-Contrast Light Theme"}
            className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800/80 text-amber-400 hover:text-indigo-400 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
          >
            {isLightTheme ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Secure Logout system widget */}
          <button
            onClick={handleSignOut}
            title="Log Out Session"
            className="p-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-red-400 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu triggers */}
        <div className="lg:hidden flex items-center gap-2 animate-fade-in">
          {/* Mobile Theme Toggle Widget */}
          <button
            onClick={() => setIsLightTheme(!isLightTheme)}
            title={isLightTheme ? "Switch to Dark Mode" : "Switch to High-Contrast Light Theme"}
            className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-705 text-amber-400 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
          >
            {isLightTheme ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-705 p-1.5 rounded-xl text-xs text-slate-350 transition cursor-pointer"
          >
            <img src={userProfile.avatar} className="w-6 h-6 rounded-lg object-cover border border-slate-750" alt={userProfile.name} />
            <Menu className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Framework Container */}
      <div className="flex-grow flex flex-col lg:flex-row">
        
        {/* Lateral Sidebar Navigation */}
        <aside className="hidden lg:block w-72 bg-slate-950/80 border-r border-slate-900/80 p-5 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold tracking-wide transition text-sm cursor-pointer ${
                  isSelected 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                    : item.highlight 
                      ? "bg-slate-900 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 border border-indigo-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${item.highlight && !isSelected ? "text-indigo-400" : ""}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-6 border-t border-slate-900/80 mt-6 text-center space-y-2">
            <span className="text-[9px] uppercase tracking-widest text-slate-650 font-mono">Platform Identity</span>
            <div className="text-[10px] text-slate-500 font-medium">University District Beta v1.0.0</div>
          </div>
        </aside>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden"
              />

              {/* Drawer */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 border-r border-slate-900 z-55 p-5 flex flex-col justify-between shadow-2xl overflow-y-auto lg:hidden"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-indigo-600/10">
                        TT
                      </div>
                      <div>
                        <h2 className="font-sans font-black text-white text-sm tracking-tight leading-none">TRADE TUTOR</h2>
                        <span className="text-[8.5px] text-indigo-400 font-mono tracking-widest uppercase mt-0.5 block">College Utility Portal</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-900 border border-slate-850 rounded-xl text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Balance</span>
                      <span className="text-indigo-400 font-bold">₹{userProfile.walletBalance.toFixed(2)}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-800" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Earnings</span>
                      <span className="text-emerald-400 font-bold">₹{userProfile.earnings.toFixed(2)}</span>
                    </div>
                  </div>

                  <nav className="space-y-1.5 flex flex-col">
                    {navItems.map(item => {
                      const Icon = item.icon;
                      const isSelected = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                            isSelected 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                              : item.highlight 
                                ? "bg-slate-900 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 border border-indigo-500/10"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                          }`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${item.highlight && !isSelected ? "text-indigo-400" : ""}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-6 border-t border-slate-900/80 mt-6 space-y-4">
                  <button 
                    onClick={() => {
                      setShowProfileModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-3 rounded-xl text-xs text-slate-300 transition cursor-pointer"
                  >
                    <img src={userProfile.avatar} className="w-5.5 h-5.5 rounded-full object-cover border border-slate-755 animate-fade-in" alt="" />
                    <div className="text-left font-medium">
                      <div className="leading-none text-white font-semibold">{userProfile.name}</div>
                      <div className="text-[8px] mt-0.5 font-mono tracking-wider">
                        <span className="text-slate-500">{userProfile.role.toUpperCase()}</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-semibold rounded-xl border border-red-505/10 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out Session</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Central Work Space Page Area */}
        <main className="flex-grow p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === "dashboard" && (
            <Dashboard 
              userRef={userProfile} 
              onNavigate={(tabId) => setActiveTab(tabId)} 
            />
          )}

          {activeTab === "marketplace" && (
            <Marketplace 
              userRef={userProfile} 
              onUpdateUser={(updated) => setUserProfile(updated)} 
              onNavigate={(tabId) => setActiveTab(tabId)}
            />
          )}

          {activeTab === "assignments" && (
            <Assignments 
              userRef={userProfile} 
              onNavigate={(tabId) => setActiveTab(tabId)}
            />
          )}

          {activeTab === "projects" && (
            <Projects userRef={userProfile} />
          )}

          {activeTab === "ai" && (
            <AiAssistant userRef={userProfile} />
          )}

          {activeTab === "chats" && (
            <Chats userRef={userProfile} />
          )}

          {activeTab === "community" && (
            <Community 
              userRef={userProfile} 
              onNavigate={(tabId) => setActiveTab(tabId)}
            />
          )}

          {activeTab === "wallet" && (
            <Wallet 
              userRef={userProfile} 
              onUpdateUser={(updated) => setUserProfile(updated)} 
            />
          )}
        </main>
      </div>

      {/* Footer credits line */}
      <footer className="p-5 border-t border-slate-900/80 bg-slate-950 text-center text-[11px] text-slate-500">
        © 2026 Trade Tutor Inc. Built and protected with standard Google Firebase Identity systems and Firestore databases.
      </footer>

      {/* Profile Setup / Review Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Update Academic Credentials</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Role Classification</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="Student">Student (General Helper)</option>
                  <option value="Mentor">Verification Mentor (Counselor)</option>
                  <option value="Assignment Expert">Certified Assignment Expert (Developer)</option>
                  <option value="Seller">Store Vendor / Seller</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Major Major</label>
                  <input
                    type="text"
                    value={editMajor}
                    onChange={(e) => setEditMajor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">University</label>
                  <input
                    type="text"
                    value={editUniv}
                    onChange={(e) => setEditUniv(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Profile Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-medium text-xs rounded-xl hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-medium text-xs text-white rounded-xl transition cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Alert Banner overlay */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={() => {
                if (toast.action) toast.action();
                setToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              className="pointer-events-auto bg-slate-900/95 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md flex gap-3 cursor-pointer items-start hover:border-indigo-500/50 transition duration-200"
            >
              {toast.avatar ? (
                <img src={toast.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-700/50" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-600/10 flex items-center justify-center font-bold text-indigo-400">
                  <Bell className="w-5 h-5 text-indigo-400" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="font-sans font-bold text-xs text-white flex items-center justify-between">
                  <span>{toast.title}</span>
                  <span className="text-[9px] text-indigo-400/80 font-mono tracking-wider uppercase font-medium">Click to open</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-semibold line-clamp-2">
                  {toast.message}
                </p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="text-slate-400 hover:text-white text-xs cursor-pointer px-1.5 focus:outline-none"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
