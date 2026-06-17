import React, { useState, useEffect } from "react";
import { 
  Search, Filter, Plus, Book, Cpu, Radio, Clipboard, IndianRupee, 
  RefreshCw, ShoppingCart, User, Trash2, ShieldAlert, CheckCircle, 
  Sparkles, AlertTriangle, ArrowRight, Wallet, Coins, Loader2, MessageSquare 
} from "lucide-react";
import { ProductListing, UserProfile } from "../types";
import { 
  subscribeProducts, addProductToDb, buyProductInDb, deleteProductFromDb, 
  depositIntoWalletInDb, createChatThreadInDb 
} from "../firebaseService";
import { AnimatePresence, motion } from "motion/react";

interface MarketplaceProps {
  userRef: UserProfile;
  onUpdateUser: (profile: UserProfile) => void;
  onNavigate?: (tabId: string) => void;
}

export default function Marketplace({ userRef, onUpdateUser, onNavigate }: MarketplaceProps) {
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Purchase State Machines
  const [insufficientFundsItem, setInsufficientFundsItem] = useState<ProductListing | null>(null);
  const [recentPurchasedItem, setRecentPurchasedItem] = useState<ProductListing | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [fundingLoading, setFundingLoading] = useState(false);

  // New Listing Data state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState<"Books" | "Calculators" | "Electronics" | "Study Materials">("Books");
  const [newPrice, setNewPrice] = useState("");
  const [newCond, setNewCond] = useState<"New" | "Like New" | "Good" | "Fair">("Good");
  const [newImg, setNewImg] = useState("");

  const handleMessageSeller = async (p: ProductListing) => {
    try {
      await createChatThreadInDb(userRef, p.sellerId, p.sellerName, p.sellerAvatar, "Seller");
      if (onNavigate) {
        onNavigate("chats");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to open chat with seller.");
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeProducts((updatedProducts) => {
      setProducts(updatedProducts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice) {
      setErrorMsg("Title and Price are required.");
      return;
    }
    setErrorMsg("");

    try {
      const newListing = {
        title: newTitle,
        description: newDesc,
        category: newCat,
        price: Number(newPrice),
        condition: newCond,
        imageUrl: newImg || "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400",
        sellerId: userRef.id,
        sellerName: userRef.name,
        sellerAvatar: userRef.avatar,
        status: "Available" as const
      };
      await addProductToDb(newListing);
      setShowAddModal(false);
      // Reset states
      setNewTitle("");
      setNewDesc("");
      setNewPrice("");
      setNewImg("");
    } catch (err) {
      setErrorMsg("Failed to connect with live database.");
    }
  };

  const handleBuy = async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    
    if (userRef.walletBalance < prod.price) {
      setInsufficientFundsItem(prod);
      return;
    }

    setPurchaseLoading(true);
    setPurchaseError(null);
    try {
      await buyProductInDb(prod, userRef);
      setRecentPurchasedItem(prod);
    } catch (err) {
      console.error(err);
      setPurchaseError("Cryptographic Escrow handoff failed. Please verify stable network connectivity.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleQuickAutoFundingAndBuy = async () => {
    if (!insufficientFundsItem) return;
    const surplus = insufficientFundsItem.price - userRef.walletBalance;
    if (surplus <= 0) return;

    setFundingLoading(true);
    setPurchaseError(null);
    try {
      // Simulate Razorpay funding instantly internally
      await depositIntoWalletInDb(userRef.id, userRef.walletBalance, surplus);
      // Construct mock user with top-up applied to execute atomic ledger write
      const mockUpdatedUser = { ...userRef, walletBalance: userRef.walletBalance + surplus };
      await buyProductInDb(insufficientFundsItem, mockUpdatedUser);
      
      const itemCompleted = insufficientFundsItem;
      setInsufficientFundsItem(null);
      setRecentPurchasedItem(itemCompleted);
    } catch (err) {
      console.error(err);
      setPurchaseError("Auto top-up gateway settlement rejected. Please verify your mock Razorpay profile.");
    } finally {
      setFundingLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this listing?")) return;
    try {
      await deleteProductFromDb(id);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Books": return <Book className="w-4 h-4 text-emerald-400" />;
      case "Calculators": return <Cpu className="w-4 h-4 text-sky-400" />;
      case "Electronics": return <Radio className="w-4 h-4 text-indigo-400" />;
      case "Study Materials": return <Clipboard className="w-4 h-4 text-amber-400" />;
      default: return <Book className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            Campus Marketplace
          </h2>
          <p className="text-xs text-slate-400">Secure student peer-to-peer trade with standard escrow protection.</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Listing
        </button>
      </div>

      {/* Filters & Navigation Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 border border-slate-800/80 rounded-xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search books, gadgets, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-300 focus:outline-none transition"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {["All", "Books", "Calculators", "Electronics", "Study Materials"].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                selectedCategory === cat 
                  ? "bg-indigo-600 text-white" 
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}

          <button 
            disabled={loading}
            className="p-1.5 bg-slate-950 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition ml-auto md:ml-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Product Listings Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <p className="text-sm text-slate-400">No active campus listings matching your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col hover:border-slate-700 transition duration-150">
              <div className="relative h-44 bg-slate-950">
                <img 
                  referrerPolicy="no-referrer"
                  src={p.imageUrl} 
                  alt={p.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400";
                  }}
                />
                
                {/* Condition pill */}
                <span className="absolute top-3 left-3 bg-slate-900/95 text-slate-300 font-mono text-[9px] uppercase px-2 py-0.5 rounded border border-slate-700">
                  {p.condition}
                </span>

                {/* Status pill */}
                <span className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  p.status === "Available" 
                    ? "bg-green-500/10 text-green-400 border-green-500/20" 
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}>
                  {p.status}
                </span>
              </div>

              {/* Body Details */}
              <div className="p-4 flex-grow flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(p.category)}
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{p.category}</span>
                  </div>
                  <h3 className="font-sans font-semibold text-white text-sm line-clamp-1">{p.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{p.description}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                    <span className="text-white text-base font-bold flex items-center">
                      <IndianRupee className="w-3.5 h-3.5 text-indigo-400 mr-0.5" />
                      {p.price.toFixed(2)}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <img src={p.sellerAvatar} className="w-5 h-5 rounded-full object-cover border border-slate-700" alt={p.sellerName} />
                      <span className="text-[10px] text-slate-400 font-medium max-w-[80px] truncate">{p.sellerName}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {p.sellerId === userRef.id ? (
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Listing
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleBuy(p.id)}
                          disabled={p.status === "Sold"}
                          className={`flex-grow py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            p.status === "Sold" 
                              ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed" 
                              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {p.status === "Sold" ? "Sold" : "Buy Now"}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleMessageSeller(p)}
                          title="Message Seller"
                          className="px-3 py-2 bg-slate-950 hover:bg-slate-850 text-indigo-400 hover:text-white border border-slate-800 hover:border-indigo-500/30 rounded-xl transition cursor-pointer flex items-center justify-center"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Listing Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Create New Merchandise Listing</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateListing} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 text-red-400 text-xs border border-red-500/20 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Product Title *</label>
                <input
                  type="text"
                  placeholder="e.g. iPad Pro M1 256GB with Pencil"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Category *</label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Books">Books</option>
                    <option value="Calculators">Calculators</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Study Materials">Study Materials</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Ask Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 45.00"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Condition</label>
                  <select
                    value={newCond}
                    onChange={(e) => setNewCond(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Custom Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="e.g. https://domain.com/image.png"
                    value={newImg}
                    onChange={(e) => setNewImg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Details Description</label>
                <textarea
                  placeholder="Describe your item, details regarding its performance, annotations, standard meeting spots on campus..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none h-20 resize-none"
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
                  Create Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Purchase Error Toast */}
      {purchaseError && (
        <div className="fixed bottom-6 right-6 z-55 max-w-sm bg-red-950/95 border border-red-500/30 p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-fade-in">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Transaction Error</h5>
            <p className="text-[11px] text-red-300 leading-relaxed">{purchaseError}</p>
            <button 
              onClick={() => setPurchaseError(null)}
              className="text-[10px] text-red-400 hover:text-red-300 underline font-semibold mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Insufficient Escrow Funds Modal */}
      <AnimatePresence>
        {insufficientFundsItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInsufficientFundsItem(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            >
              {/* Modal Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#111216] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              >
                {/* Header */}
                <div className="p-5 bg-amber-500/5 border-b border-amber-500/15 flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wide">Escrow Balance Warning</h4>
                    <p className="text-[10px] text-amber-500 font-mono tracking-widest uppercase mb-0.5">Insufficient Funds</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Selected Item Reference CARD */}
                  <div className="flex gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    <img 
                      src={insufficientFundsItem.imageUrl} 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-800 shrink-0" 
                      alt="" 
                    />
                    <div className="min-w-0 flex-grow">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">{insufficientFundsItem.category}</span>
                      <h5 className="text-xs font-bold text-white truncate leading-tight">{insufficientFundsItem.title}</h5>
                      <p className="text-xs font-bold text-slate-400 mt-0.5 flex items-center">
                        <IndianRupee className="w-3 h-3 text-indigo-400" />
                        {insufficientFundsItem.price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Transaction Math Breakdown */}
                  <div className="bg-[#171920] border border-slate-800 p-4 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Available Wallet Balance</span>
                      <span className="font-mono text-white font-semibold">₹{userRef.walletBalance.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Item Trade Cost</span>
                      <span className="font-mono text-white font-semibold">-₹{insufficientFundsItem.price.toFixed(2)}</span>
                    </div>

                    <div className="h-px bg-slate-800 my-1" />

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-rose-400">Escrow Shortfall</span>
                      <span className="font-mono text-rose-400 font-black text-sm">
                        ₹{(insufficientFundsItem.price - userRef.walletBalance).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed text-center py-1">
                    Your current balance is insufficient to lock this trade. Complete an instant secure top-up using the Razorpay sandbox emulation protocol below.
                  </p>

                  {/* Operational Controls */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleQuickAutoFundingAndBuy}
                      disabled={fundingLoading}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 font-bold text-xs text-white rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/10"
                    >
                      {fundingLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing Top-Up Ledgers...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4" />
                          <span>Secure Quick Top-up & Buy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setInsufficientFundsItem(null)}
                      disabled={fundingLoading}
                      className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Cancel Escrow Request
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Purchase Success Confirmation Modal */}
      <AnimatePresence>
        {recentPurchasedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecentPurchasedItem(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            >
              {/* Modal Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#111216] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-center"
              >
                {/* Header Animated Glow */}
                <div className="p-8 bg-emerald-500/5 flex flex-col items-center space-y-4">
                  <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full animate-bounce">
                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Escrow Pledge Registered!</h3>
                    <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase mt-0.5">Secure Transaction Authenticated</p>
                  </div>
                </div>

                <div className="p-6 space-y-5 pt-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Student credits matching <span className="text-white font-semibold">₹{recentPurchasedItem.price.toFixed(2)}</span> have been deducted from your wallet and securely locked inside the campus sandbox escrow contract.
                  </p>

                  {/* Next Step Checklist */}
                  <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-2.5 text-left text-xs">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Transaction Checklist</span>
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-400 font-medium">✓</span>
                      <p className="text-slate-300">Transaction hash successfully indexed on Firestore</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-400 font-medium">✓</span>
                      <p className="text-slate-300">Credits locked in multi-sig sandbox vault</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-indigo-400 font-bold animate-pulse">●</span>
                      <p className="text-slate-300">Coordinate on-campus exchange with <strong className="text-white font-semibold">{recentPurchasedItem.sellerName}</strong></p>
                    </div>
                  </div>

                  <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/10 text-left text-[11px] text-orange-400 leading-normal font-sans">
                    <strong>Note:</strong> Check the <strong>Wallet</strong>'s "Escrow Safe Locks" sub-panel to release payment once you inspect the item, or file a dispute ticket if issues arise.
                  </div>

                  <button
                    onClick={() => setRecentPurchasedItem(null)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer animate-fade-in"
                  >
                    Acknowledge & Continue
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
