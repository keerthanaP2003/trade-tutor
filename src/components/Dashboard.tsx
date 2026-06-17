import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, Award, Users, ShoppingCart, CreditCard, 
  ArrowUpRight, Clock, AlertTriangle, Sparkles, TrendingUp,
  Bookmark, ShieldCheck, Plus, Briefcase, ChevronRight, CheckCircle2
} from "lucide-react";
import { 
  UserProfile, ProductListing, Assignment, TeamMemberRequest, WalletTransaction 
} from "../types";
import { 
  subscribeProducts, 
  subscribeAssignments, 
  subscribeCollabs, 
  subscribeTransactions 
} from "../firebaseService";
import { motion, AnimatePresence } from "motion/react";

interface DashboardProps {
  userRef: UserProfile;
  onNavigate: (tabId: string) => void;
}

export default function Dashboard({ userRef, onNavigate }: DashboardProps) {
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [collabs, setCollabs] = useState<TeamMemberRequest[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const unsubProducts = subscribeProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });

    const unsubAssignments = subscribeAssignments((updatedAssignments) => {
      setAssignments(updatedAssignments);
    });

    const unsubCollabs = subscribeCollabs((updatedCollabs) => {
      setCollabs(updatedCollabs);
    });

    const unsubTransactions = subscribeTransactions(userRef.id, (updatedTxs) => {
      setTransactions(updatedTxs);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubAssignments();
      unsubCollabs();
      unsubTransactions();
    };
  }, [userRef.id]);

  // Calculations for User Statistics
  // 1. Assignments (Bids)
  const myBids = assignments.filter(a => 
    a.proposals?.some(p => p.expertId === userRef.id)
  );
  
  const bidsWon = assignments.filter(a => 
    a.assignedExpertId === userRef.id || 
    a.proposals?.some(p => p.expertId === userRef.id && p.status === "Accepted")
  );

  const bidsPending = assignments.filter(a => 
    a.proposals?.some(p => p.expertId === userRef.id && p.status === "Pending")
  );

  const bidsPlacedCount = myBids.length;
  const bidsWonCount = bidsWon.length;
  const bidsPendingCount = bidsPending.length;
  const bidSuccessRate = bidsPlacedCount > 0 
    ? Math.round((bidsWonCount / bidsPlacedCount) * 100) 
    : 0;

  // 2. Collabs (Projects)
  const myCreatedCollabs = collabs.filter(c => c.creatorId === userRef.id);
  const activeProjectsCount = myCreatedCollabs.length;
  
  // High resolution check of projects with deadlines within 24 hours
  const upcomingDeadlines = collabs.filter(c => {
    if (!c.deadline) return false;
    const diffMs = new Date(c.deadline).getTime() - Date.now();
    const hrs = diffMs / (1000 * 60 * 60);
    return diffMs > 0 && hrs <= 24;
  });

  // 3. Marketplace Listings
  const myListings = products.filter(p => p.sellerId === userRef.id);
  const totalListingsCount = myListings.length;
  const listingsSold = myListings.filter(p => p.status === "Sold").length;
  const listingsAvailable = myListings.filter(p => p.status === "Available").length;

  // Estimated total bid volume value
  const estimatedBidWonEarnings = bidsWon.reduce((total, a) => {
    const matchedProp = a.proposals?.find(p => p.expertId === userRef.id);
    return total + (matchedProp?.bidAmount || 0);
  }, 0);

  // Community Feed stats
  const hotAssignments = assignments.filter(a => a.status === "Open" && (!a.proposals || a.proposals.length === 0)).slice(0, 3);
  const recentProducts = products.filter(p => p.status === "Available" && p.sellerId !== userRef.id).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Dynamic Animated Styling Matrix */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes subtlePulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        .animate-bg-pulse {
          animation: subtlePulse 8s ease-in-out infinite;
        }
      ` }} />

      {/* Grid: Main Welcome Banner & Network Token Identity */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none animate-bg-pulse" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none animate-bg-pulse" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-mono text-[9.5px] rounded-lg tracking-widest uppercase font-bold">
              Autonomous Student Hub
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <h2 className="text-xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{userRef.name}</span> 👋
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            You are operating as a verified <span className="text-indigo-400 font-semibold">{userRef.role}</span>. Here is your aggregated, real-time performance matrix across peer markets, homework contracts, and project rosters.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <div className="text-[10px] text-slate-400 font-mono bg-slate-950/60 border border-slate-800/80 px-2.5 py-1 rounded-md">
              🏫 University: <span className="text-slate-200 font-semibold">{userRef.university || "Main Campus Node"}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono bg-slate-950/60 border border-slate-800/80 px-2.5 py-1 rounded-md">
              🧬 Major: <span className="text-indigo-400 font-semibold">{userRef.major || "Applied Sciences"}</span>
            </div>
          </div>
        </div>

        {/* Quick Identity Box & Direct Navigation Controls */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl min-w-[240px] shrink-0 space-y-3.5 relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img 
              src={userRef.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
              className="w-10 h-10 rounded-full object-cover border-2 border-indigo-600/30" 
              alt="Profile" 
            />
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">{userRef.name}</div>
              <div className="text-[9px] text-slate-400 font-mono mt-0.5">{userRef.email}</div>
            </div>
          </div>
          
          <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center bg-transparent">
            <div>
              <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 block">Balance Index</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">₹{userRef.walletBalance?.toLocaleString() || "0"}</span>
            </div>
            <button 
              onClick={() => onNavigate("wallet")}
              className="flex items-center gap-1 text-[9.5px] font-bold text-indigo-400 hover:text-white px-2 py-1 bg-indigo-500/5 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-lg transition"
            >
              Add Fund <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Dynamic Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-statistics-grid">
        
        {/* Stat Card 1: Bids Won */}
        <div 
          onClick={() => onNavigate("assignments")}
          className="bg-slate-910 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/40 p-5 rounded-2xl transition duration-300 cursor-pointer group flex flex-col justify-between h-[155px] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-125 transition" />
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
              <Award className="w-5 h-5 group-hover:animate-bounce" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-indigo-400 group-hover:translate-x-1 transition flex items-center gap-1">
              Bidding <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expert Assignments Won</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white font-mono">{bidsWonCount}</span>
              <span className="text-[10px] text-slate-500 font-mono">/ {bidsPlacedCount} bids</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1 bg-slate-800 rounded-full flex-1 overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: `${bidSuccessRate}%` }} />
              </div>
              <span className="text-[10px] font-mono text-indigo-400 font-semibold">{bidSuccessRate}% Win</span>
            </div>
          </div>
        </div>

        {/* Stat Card 2: Active Project Teams */}
        <div 
          onClick={() => onNavigate("projects")}
          className="bg-slate-910 hover:bg-slate-900 border border-slate-850 hover:border-emerald-500/40 p-5 rounded-2xl transition duration-300 cursor-pointer group flex flex-col justify-between h-[155px] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-125 transition" />
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
              <Users className="w-5 h-5 group-hover:animate-bounce" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 group-hover:translate-x-1 transition flex items-center gap-1">
              Teams <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Capstone Squads</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white font-mono">{activeProjectsCount}</span>
              <span className="text-[10px] text-emerald-400 font-mono">Created List</span>
            </div>
            
            {upcomingDeadlines.length > 0 ? (
              <div className="mt-2 flex items-center gap-1 text-[9.5px] font-bold text-amber-500 animate-pulse bg-amber-500/5 py-1 px-2 border border-amber-500/10 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{upcomingDeadlines.length} Squads Due Under 24h!</span>
              </div>
            ) : (
              <p className="text-[9px] text-slate-500 italic mt-2.5">All team milestone deadlines secure.</p>
            )}
          </div>
        </div>

        {/* Stat Card 3: Marketplace Listings */}
        <div 
          onClick={() => onNavigate("marketplace")}
          className="bg-slate-910 hover:bg-slate-900 border border-slate-850 hover:border-cyan-500/40 p-5 rounded-2xl transition duration-300 cursor-pointer group flex flex-col justify-between h-[155px] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:scale-125 transition" />
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
              <ShoppingCart className="w-5 h-5 group-hover:animate-bounce" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-cyan-400 group-hover:translate-x-1 transition flex items-center gap-1">
              Storefront <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Marketplace Listings</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white font-mono">{totalListingsCount}</span>
              <span className="text-[10px] text-slate-500 font-mono">peer posts</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>🟢 Available: <strong className="text-cyan-400">{listingsAvailable}</strong></span>
              <span>🟣 Sold: <strong className="text-indigo-400">{listingsSold}</strong></span>
            </div>
          </div>
        </div>

        {/* Stat Card 4: Wallet & Bid Volume */}
        <div 
          onClick={() => onNavigate("wallet")}
          className="bg-slate-910 hover:bg-slate-900 border border-slate-850 hover:border-amber-500/40 p-5 rounded-2xl transition duration-300 cursor-pointer group flex flex-col justify-between h-[155px] relative overflow-hidden"
        >
          <div className="absolute top-0 right-5 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:scale-125 transition" />
          <div className="flex justify-between items-start">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/15">
              <CreditCard className="w-5 h-5 group-hover:animate-bounce" />
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-amber-500 group-hover:translate-x-1 transition flex items-center gap-1">
              Wallet <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tutor Bid Earnings Volume</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">₹{estimatedBidWonEarnings.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500 font-mono">Won Cap</span>
            </div>
            <div className="mt-2 text-[10px] flex items-center justify-between text-slate-400 bg-slate-950/40 p-1.5 rounded-lg border border-slate-850">
              <span className="font-mono text-[8.5px]">Earnings: <strong className="text-emerald-400">₹{userRef.earnings || '0'}</strong></span>
              {bidsPendingCount > 0 && <span className="text-[8.5px] font-bold text-amber-400 animate-pulse">⏰ {bidsPendingCount} Bid Pending</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Visual Category Analytics Chart & Dynamic Workspace Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Visual Chart Comparison Column */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Platform Category Activity Indices
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Community marketplace items vs tutoring assignments and capstone team rosters.</p>
            </div>
            <span className="text-[9px] bg-slate-950 px-2 py-1 rounded font-mono text-indigo-300 font-bold tracking-wider border border-slate-850">LATEST REALTIME</span>
          </div>

          {/* Clean Custom Responsive SVG / Bar Comparison Chart */}
          <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-4 space-y-5">
            {/* Index 1 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-cyan-500" /> Available Peer Marketplace Items
                </span>
                <span className="text-slate-400 font-bold">{products.length} listed <span className="text-[10px] text-slate-600">({myListings.length} yours)</span></span>
              </div>
              <div className="h-3.5 bg-slate-900 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-1000" 
                  style={{ width: `${Math.min(100, Math.max(12, (products.length / (Math.max(1, products.length + assignments.length + collabs.length))) * 100))}%` }} 
                />
                <div 
                  className="h-full bg-cyan-700 transition-all duration-1000" 
                  style={{ width: `${(myListings.length / Math.max(1, products.length)) * 100}%` }}
                  title="Your Listings Proportion"
                />
              </div>
            </div>

            {/* Index 2 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-indigo-500" /> Tutors Coursework & Homework Gigs
                </span>
                <span className="text-slate-400 font-bold">{assignments.length} assignments <span className="text-[10px] text-slate-600">({myBids.length} bid)</span></span>
              </div>
              <div className="h-3.5 bg-slate-900 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-1000" 
                  style={{ width: `${Math.min(100, Math.max(12, (assignments.length / (Math.max(1, products.length + assignments.length + collabs.length))) * 100))}%` }} 
                />
                <div 
                  className="h-full bg-indigo-700 transition-all duration-1000" 
                  style={{ width: `${(myBids.length / Math.max(1, assignments.length)) * 100}%` }}
                />
              </div>
            </div>

            {/* Index 3 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-emerald-500" /> Active Team Collaborations & Roster Assemblers
                </span>
                <span className="text-slate-400 font-bold">{collabs.length} teams <span className="text-[10px] text-slate-600">({myCreatedCollabs.length} yours)</span></span>
              </div>
              <div className="h-3.5 bg-slate-900 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${Math.min(100, Math.max(12, (collabs.length / (Math.max(1, products.length + assignments.length + collabs.length))) * 100))}%` }} 
                />
                <div 
                  className="h-full bg-emerald-700 transition-all duration-1000" 
                  style={{ width: `${(myCreatedCollabs.length / Math.max(1, collabs.length)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Hub Navigation Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <button 
              onClick={() => onNavigate("marketplace")}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800 rounded-xl text-center cursor-pointer transition text-xs font-semibold hover:border-cyan-500/40 group"
            >
              <ShoppingCart className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition pb-0.5" />
              <span className="text-slate-300 mt-1">Market Place</span>
            </button>

            <button 
              onClick={() => onNavigate("assignments")}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800 rounded-xl text-center cursor-pointer transition text-xs font-semibold hover:border-indigo-500/40 group"
            >
              <Award className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition pb-0.5" />
              <span className="text-slate-300 mt-1">Bid Assignments</span>
            </button>

            <button 
              onClick={() => onNavigate("projects")}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800 rounded-xl text-center cursor-pointer transition text-xs font-semibold hover:border-emerald-500/40 group"
            >
              <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition pb-0.5" />
              <span className="text-slate-300 mt-1">Team Roster</span>
            </button>

            <button 
              onClick={() => onNavigate("ai")}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800 rounded-xl text-center cursor-pointer transition text-xs font-semibold hover:border-indigo-400 group"
            >
              <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition pb-0.5" />
              <span className="text-slate-300 mt-1">AI Scholar</span>
            </button>
          </div>
        </div>

        {/* Real-time Deadline Alert Monitor & Suggested Gigs column */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2 border-b border-slate-850">
            <Clock className="w-4 h-4 text-amber-400" /> Active Alarms & Feeds
          </h3>

          {/* Section 1: Urgent deadlines list */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">My Assembly Alerts</span>
              {upcomingDeadlines.length > 0 && <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">URGENT</span>}
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] text-slate-300 leading-normal">Awesome! No project squad deadlines are currently expiring under 24 hours.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map(c => {
                  const remainingHrs = Math.ceil((new Date(c.deadline!).getTime() - Date.now()) / (1000 * 60 * 60));
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => onNavigate("projects")}
                      className="p-3 bg-slate-950 hover:bg-slate-900 border border-amber-500/20 rounded-xl cursor-pointer transition flex justify-between items-center gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 animate-bounce" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-[11px] text-white truncate">{c.title}</h4>
                          <p className="text-[9.5px] text-slate-400 truncate">Leader: {c.creatorName}</p>
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 bg-amber-500/10 text-amber-400 font-mono text-[9px] font-extrabold rounded-md">
                        Due in {remainingHrs}h!
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Hot bidding tutoring opportunities */}
          <div className="space-y-2.5 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Hot Non-Bid Gigs To Earn (₹)</span>
            {hotAssignments.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">No brand-new assignment gigs listed. Try posting one to start tutor bidding.</p>
            ) : (
              <div className="space-y-2">
                {hotAssignments.map(a => (
                  <div 
                    key={a.id}
                    onClick={() => onNavigate("assignments")}
                    className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl flex justify-between items-center cursor-pointer transition group"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-[11px] text-slate-200 group-hover:text-indigo-400 transition truncate">{a.title}</h4>
                      <p className="text-[9.5px] text-slate-400 mt-0.5">Budget Cap: <strong className="text-emerald-400 font-mono">₹{a.budget}</strong></p>
                    </div>
                    <span className="p-1 px-2 border border-indigo-500/20 hover:bg-indigo-600/10 rounded-md text-[9.5px] text-indigo-400 font-bold shrink-0 transition">
                      Bid Now
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Recommended peer study items */}
          <div className="space-y-2.5 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Featured Campus Peer Gear</span>
            {recentProducts.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">No peer books or calculators recently listed.</p>
            ) : (
              <div className="space-y-2">
                {recentProducts.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => onNavigate("marketplace")}
                    className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl flex justify-between items-center cursor-pointer transition group"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <img src={p.imageUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=150"} className="w-7 h-7 rounded object-cover border border-slate-800" alt="" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-[11px] text-slate-200 group-hover:text-cyan-400 transition truncate">{p.title}</h4>
                        <p className="text-[9.5px] text-slate-400 mt-0.5">Price: <strong className="text-cyan-400 font-mono">₹{p.price}</strong></p>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono font-bold capitalize">{p.condition}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Dynamic Activity Transactions stream */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex justify-between items-center pb-3 border-b border-slate-850">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" /> Secure Wallet Activity Logs
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Campus escrow, reward commissions, and billing entries recorded on the local sandbox blockchain.</p>
          </div>
          <button 
            onClick={() => onNavigate("wallet")}
            className="text-[10px] font-bold text-indigo-400 hover:text-white flex items-center gap-1 transition"
          >
            Launch Escrow Wallet <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-6 text-center text-[11px] text-slate-500 font-mono">
            No transaction ledger signatures registered yet for {userRef.name}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4">
            {transactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[8px] uppercase font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-500">SIGNATURE ID: {tx.id}</span>
                  <p className="text-xs font-semibold text-slate-200 truncate mt-1.5">{tx.description}</p>
                  <span className="text-[9px] text-slate-500 block font-mono mt-0.5">{tx.createdAt}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold font-mono ${tx.type === "Credit" ? "text-emerald-400" : "text-amber-500"}`}>
                    {tx.type === "Credit" ? "+" : "-"} ₹{tx.amount}
                  </span>
                  <span className="text-[8px] text-slate-600 block uppercase font-bold tracking-wider">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
