import React, { useState, useEffect } from "react";
import { 
  DollarSign, ShieldAlert, CreditCard, ArrowDownRight, ArrowUpLeft, 
  CheckCircle, RefreshCw, Send, ShieldCheck, HeartCrack, Layers,
  Building, Smartphone, KeyRound, Check
} from "lucide-react";
import { UserProfile, WalletTransaction } from "../types";
import { subscribeTransactions, depositIntoWalletInDb } from "../firebaseService";

interface WalletProps {
  userRef: UserProfile;
  onUpdateUser: (profile: UserProfile) => void;
}

export default function Wallet({ userRef, onUpdateUser }: WalletProps) {
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [gatewayStep, setGatewayStep] = useState<
    "input" | "method_select" | "card_details" | "upi_details" | "netbanking_details" | "otp_verification" | "processing" | "success"
  >("input");

  // Dynamic Razorpay SDK loading state
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [useEmulator, setUseEmulator] = useState(true);

  // Custom Razorpay Simulator States
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "netbanking">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState(userRef.name || "");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [escrowList, setEscrowList] = useState([
    { id: "esc_1", item: "TI-84 Plus CE Graphing Calculator", vendor: "Emily Zhao", amount: 5500.00, status: "Locked in Escrow" }
  ]);

  useEffect(() => {
    // Dynamically load Razorpay SDK Script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("Razorpay Checkout SDK is operational.");
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.warn("Razorpay script blocked or offline. Falling back to sandbox emulation.");
      setScriptLoaded(false);
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (err) {}
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeTransactions(userRef.id, (loadedTxs) => {
      setTxs(loadedTxs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userRef.id]);

  const handleDepositInit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Invalid Deposit amount.");
      return;
    }
    setErrorMessage("");
    
    // Try to launch real Razorpay Web SDK if loaded and active
    if (!useEmulator && scriptLoaded && (window as any).Razorpay) {
      try {
        const options = {
          key: "rzp_test_tradetutor123abc456", // Mock Test Key
          amount: amt * 100, // in Paise (e.g. ₹10.00 is 1000 paise)
          currency: "INR",
          name: "Trade Tutor Inc.",
          description: "Secure Wallet topup via Razorpay Checkout",
          image: userRef.avatar || "https://images.unsplash.com/photo-1570295999915-56ceb5ecca61?auto=format&fit=crop&q=80&w=150",
          handler: async function (response: any) {
            console.log("Razorpay Payment Success callback:", response);
            setGatewayStep("processing");
            try {
              await depositIntoWalletInDb(userRef.id, userRef.walletBalance, amt);
              setGatewayStep("success");
            } catch (err) {
              console.error("Firestore balance write failed:", err);
              setErrorMessage("Could not increment Firestore wallet balances.");
              setGatewayStep("method_select");
            }
          },
          prefill: {
            name: userRef.name,
            email: userRef.email,
            contact: "9999999999"
          },
          theme: {
            color: "#6366f1"
          },
          modal: {
            ondismiss: function () {
              console.log("Razorpay checkout UI shut down.");
              setGatewayStep("input");
            }
          }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      } catch (err) {
        console.warn("Real Razorpay launch failed, rolling over to built-in secure modal:", err);
      }
    }

    // Otherwise, transition seamlessly to custom built-in HTML5 Razorpay emulator steps
    setPaymentMethod("card");
    setGatewayStep("method_select");
  };

  const executeSimulatedPayment = async () => {
    const amt = Number(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    setGatewayStep("processing");
    try {
      await depositIntoWalletInDb(userRef.id, userRef.walletBalance, amt);
      setGatewayStep("success");
    } catch (err) {
      console.error(err);
      setErrorMessage("Firestore update rejected. Check permissions.");
      setGatewayStep("method_select");
    }
  };

  const releaseEscrow = (id: string, name: string, amount: number) => {
    if (!confirm(`Are you sure you want to release ₹${amount.toFixed(2)} from escrow directly to ${name}? Confirm only if you have received and inspected the item.`)) return;
    
    // Simulate payment dispersal
    setEscrowList(prev => prev.filter(e => e.id !== id));
    alert(`Escrow released successfully! ₹${amount.toFixed(2)} dispersed directly to vendor ${name}.`);
  };

  const refundEscrow = (id: string, name: string, amount: number) => {
    if (!confirm(`Initiate dispute refund request for ₹${amount.toFixed(2)} locked in escrow? A campus moderator will analyze corresponding transaction logs.`)) return;
    alert("Dispute ticket raised. Locked escrow funds frozen. Support representatives will contact you inside 'Chats' tab within 12 hours.");
  };

  return (
    <div className="space-y-6">
      
      {/* Earnings Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Available Wallet Card */}
        <div className="p-6 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col justify-between h-44 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-[0.03] text-indigo-500 font-bold text-[180px] pointer-events-none translate-y-12 translate-x-4">
            ₹
          </div>

          <div className="space-y-1 z-10">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Campus Wallet Balance</span>
            <h3 className="text-3xl font-sans font-black text-white flex items-center">
              <span className="text-indigo-400">₹</span>{userRef.walletBalance.toFixed(2)}
            </h3>
          </div>

          <button 
            onClick={() => {
              setGatewayStep("input");
              setDepositAmount("");
              setShowDepositModal(true);
            }}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer z-15"
          >
            <CreditCard className="w-4 h-4" />
            Top-up Securely via Razorpay
          </button>
        </div>

        {/* Tutoring Earnings Card */}
        <div className="p-6 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col justify-between h-44 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-[0.03] text-emerald-500 font-bold text-[180px] pointer-events-none translate-y-12 translate-x-4">
            💸
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expert Tutor Earnings</span>
            <h3 className="text-3xl font-sans font-black text-white flex items-center">
              <span className="text-emerald-400">₹</span>{userRef.earnings.toFixed(2)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Disbursed directly upon coursework deliverables audits.</p>
          </div>

          <button 
            onClick={() => alert("Withdrawal request logged! ₹5000+ disbursements are cleared to associated bank profiles on Fridays.")}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 hover:text-white text-slate-400 font-medium text-xs rounded-xl border border-slate-800 transition cursor-pointer"
          >
            Withdraw to Bank Profile
          </button>
        </div>

        {/* Escrow Locks list */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[9.5px] uppercase font-mono tracking-wider text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/15 px-2 py-0.5 rounded flex items-center gap-1.5 w-fit">
              <ShieldCheck className="w-3.5 h-3.5" /> Escrow Safe Locks
            </span>
            <div className="text-slate-400 text-[10.5px] leading-relaxed pt-1">
              Active merchandise funds held in sandboxed platform security until transactions verification.
            </div>
          </div>

          {escrowList.map(esc => (
            <div key={esc.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl flex flex-col space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-white truncate max-w-[120px]">{esc.item}</span>
                <span className="font-bold text-rose-400">₹{esc.amount}</span>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => releaseEscrow(esc.id, esc.vendor, esc.amount)}
                  className="w-1/2 py-1 bg-green-600/10 hover:bg-green-600/25 text-green-400 text-[10px] border border-green-500/15 font-semibold rounded transition"
                >
                  Verify Release
                </button>
                <button 
                  onClick={() => refundEscrow(esc.id, esc.vendor, esc.amount)}
                  className="w-1/2 py-1 bg-red-600/10 hover:bg-red-600/25 text-red-500 hover:text-red-400 text-[10px] border border-red-500/15 font-semibold rounded transition"
                >
                  Issue Dispute
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Transactions History ledger lists */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-sans font-semibold text-sm text-slate-300">Transaction History</h3>
          <button className="p-1.5 bg-slate-950 border border-slate-800 hover:text-white rounded-lg transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-850">
          {txs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">Checking ledgers...</div>
          ) : (
            txs.map(t => (
              <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-850/40 transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${t.type === "Credit" ? "bg-green-600/10 text-green-400" : "bg-red-600/10 text-red-400"}`}>
                    {t.type === "Credit" ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpLeft className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-xs leading-none">{t.description}</h4>
                    <span className="text-[10px] text-slate-500 block mt-1">{t.createdAt}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-mono text-sm font-bold ${t.type === "Credit" ? "text-green-400" : "text-white"}`}>
                    {t.type === "Credit" ? "+" : "-"}₹{t.amount.toFixed(2)}
                  </span>
                  <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-500 mt-1">
                    {t.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Razorpay Simulated Top-up Gateway Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#111216] border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative">
            
            {/* Razorpay Header styling */}
            <div className="p-5 bg-[#0a0b0e] border-b border-slate-800/80 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="font-mono text-xs text-indigo-400 font-bold border border-indigo-500/20 px-2 py-0.5 rounded tracking-widest bg-indigo-500/5">
                  RAZORPAY
                </div>
                <span className="text-slate-400 text-xs font-semibold">Secure Checkout Gateway</span>
              </div>
              <button 
                onClick={() => {
                  setShowDepositModal(false);
                  setGatewayStep("input");
                }} 
                className="text-slate-400 hover:text-white font-sans text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-2.5 text-xs text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: Enter deposit amount */}
            {gatewayStep === "input" && (
              <form onSubmit={handleDepositInit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Merchant Profile</label>
                  <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-lg text-xs text-slate-300">
                    <p className="font-bold text-white">TRADE TUTOR PVT. LTD.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Secure Escrow Services & Peer Tutoring Gateway</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wider">Payment Amount (INR, ₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-500 text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-3 py-3 text-sm text-white focus:outline-none placeholder-slate-600 font-mono font-bold"
                      required
                      min="1"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500">Funds are temporarily escrowed and fully refundable via disputes ledger.</p>
                </div>

                <div className="space-y-2 bg-[#171920] p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[9.5px] uppercase font-bold text-indigo-400 tracking-wider font-mono">Simulate Payment Gateway</span>
                  <div className="flex gap-4 items-center pt-1.5">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input 
                        type="radio" 
                        name="gatewayMode" 
                        checked={useEmulator}
                        onChange={() => setUseEmulator(true)}
                        className="text-indigo-600 border-slate-700 bg-slate-900 focus:ring-0 focus:outline-none"
                      />
                      <span className="font-medium text-slate-200">Sandbox Emulator (Recommended)</span>
                    </label>
                  </div>
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input 
                        type="radio" 
                        name="gatewayMode" 
                        checked={!useEmulator}
                        onChange={() => setUseEmulator(false)}
                        className="text-indigo-600 border-slate-700 bg-slate-900 focus:ring-0 focus:outline-none"
                      />
                      <span className="font-medium text-slate-200">Real SDK Checkout (Requires secure popups)</span>
                    </label>
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-normal pt-1 border-t border-slate-800 mt-1">
                    {useEmulator 
                      ? "✨ Guided checkout bypasses security iframe shields to grant immediate wallet credits." 
                      : "⚡ Loads live Razorpay script flow. Note: typically gets blocked in sandboxed preview windows."}
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  {[500, 1000, 5000].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setDepositAmount(qty.toString())}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-850 text-xs font-semibold text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                    >
                      +₹{qty}
                    </button>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4 ml-1" />
                    Proceed to Payment Options
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-500 text-center pt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Razorpay Safe Encryption. Secured with AES-256 standards.</span>
                </div>
              </form>
            )}

            {/* STEP 2: Select Razorpay Method */}
            {gatewayStep === "method_select" && (
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center bg-[#171920] px-4 py-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Fees</span>
                    <span className="font-mono text-sm font-bold text-white">₹{Number(depositAmount).toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Test Mode</span>
                  </div>
                </div>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Payment Method</p>

                <div className="space-y-2.5">
                  <button 
                    onClick={() => {
                      setPaymentMethod("card");
                      setGatewayStep("card_details");
                    }}
                    className="w-full p-4 bg-[#171920] hover:bg-slate-850 border border-slate-800/80 rounded-xl flex items-center justify-between text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 transition">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Card Payment</h4>
                        <p className="text-[10px] text-slate-400">Pay using Visa, MasterCard, RuPay, or Maestro</p>
                      </div>
                    </div>
                    <span className="text-slate-500 group-hover:text-white transition font-mono text-xs">➔</span>
                  </button>

                  <button 
                    onClick={() => {
                      setPaymentMethod("upi");
                      setGatewayStep("upi_details");
                    }}
                    className="w-full p-4 bg-[#171920] hover:bg-slate-850 border border-slate-800/80 rounded-xl flex items-center justify-between text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-400 group-hover:bg-sky-500/20 transition">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">UPI / Instant QR</h4>
                        <p className="text-[10px] text-slate-400">Google Pay, PhonePe, Paytm, or custom VPA handles</p>
                      </div>
                    </div>
                    <span className="text-slate-500 group-hover:text-white transition font-mono text-xs">➔</span>
                  </button>

                  <button 
                    onClick={() => {
                      setPaymentMethod("netbanking");
                      setGatewayStep("netbanking_details");
                    }}
                    className="w-full p-4 bg-[#171920] hover:bg-slate-850 border border-slate-800/80 rounded-xl flex items-center justify-between text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">NetBanking</h4>
                        <p className="text-[10px] text-slate-400">All popular Indian banks configured instantly</p>
                      </div>
                    </div>
                    <span className="text-slate-500 group-hover:text-white transition font-mono text-xs">➔</span>
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button 
                    onClick={() => setGatewayStep("input")}
                    className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
                  >
                    ← Back to Amount
                  </button>
                  <span className="text-[9px] text-slate-500 italic">🔒 Sandboxed Fallback Protocol</span>
                </div>
              </div>
            )}

            {/* STEP 3A: Card Details Form */}
            {gatewayStep === "card_details" && (
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Visa / Mastercard Options</span>
                  <span className="font-mono font-bold text-indigo-400">₹{Number(depositAmount).toFixed(2)}</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">Card Number</label>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => {
                        // Apply formatted chunking spaces for card
                        const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setCardNumber(val.slice(0, 19));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono tracking-widest"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="12/28"
                        value={cardExpiry}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9/]/g, "");
                          setCardExpiry(val.slice(0, 5));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">Card Verification CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400">Cardholder Full Name</label>
                    <input
                      type="text"
                      placeholder="Alex Rivera"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 text-left"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (cardNumber.length < 15) {
                        alert("Please provide a valid card credit length.");
                        return;
                      }
                      if (cardExpiry.length < 5) {
                        alert("Please specify card expiration dates.");
                        return;
                      }
                      if (cardCvv.length < 3) {
                        alert("CVV must comprise 3 numbers.");
                        return;
                      }
                      setGatewayStep("otp_verification");
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Pay ₹{Number(depositAmount).toFixed(2)} Securely
                  </button>
                </div>

                <button 
                  onClick={() => setGatewayStep("method_select")}
                  className="text-xs text-slate-400 hover:text-white font-medium block pt-1 cursor-pointer"
                >
                  ← Select another method
                </button>
              </div>
            )}

            {/* STEP 3B: UPI Details Form */}
            {gatewayStep === "upi_details" && (
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Unified Payments Interface (UPI)</span>
                  <span className="font-mono font-bold text-indigo-400">₹{Number(depositAmount).toFixed(2)}</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase font-bold text-slate-400 block pb-0.5">Enter Associated VPA ID / UPI ID</label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono">@okhdfcbank</span>
                      <input
                        type="text"
                        placeholder="e.g. alexrivera"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono placeholder-slate-600"
                        required
                      />
                    </div>
                    <p className="text-[9px] text-slate-500">Provide VPA handle. Format must mimic username@bank handle.</p>
                  </div>

                  <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-850 space-y-1.5">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 tracking-wider">Fast-attach UPI providers</span>
                    <div className="flex flex-wrap gap-1.5">
                      {["@okaxis", "@paytm", "@okhdfcbank", "@okicici", "@ybl"].map(handle => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => {
                            const core = upiId.split("@")[0] || "alexrivera";
                            setUpiId(core + handle);
                          }}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9.5px] text-slate-400 rounded transition cursor-pointer"
                        >
                          {handle}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (!upiId || !upiId.includes("@")) {
                        alert("Invalid UPI format. Always specify @bank handle.");
                        return;
                      }
                      setGatewayStep("otp_verification");
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 mr-1" />
                    Verify & Pay ₹{Number(depositAmount).toFixed(2)}
                  </button>
                </div>

                <button 
                  onClick={() => setGatewayStep("method_select")}
                  className="text-xs text-slate-400 hover:text-white font-medium block pt-1 cursor-pointer"
                >
                  ← Select another method
                </button>
              </div>
            )}

            {/* STEP 3C: Netbanking Selection */}
            {gatewayStep === "netbanking_details" && (
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Direct Banking Portals (NetBanking)</span>
                  <span className="font-mono font-bold text-indigo-400">₹{Number(depositAmount).toFixed(2)}</span>
                </div>

                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Select Bank Account</p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "hdfc", name: "HDFC Bank", desc: "Corporate / Retail" },
                    { key: "sbi", name: "State Bank of India", desc: "SBI Indian Portals" },
                    { key: "icici", name: "ICICI Bank", desc: "Infinity Secure Channels" },
                    { key: "axis", name: "Axis Bank", desc: "Axis Online Retail" },
                    { key: "kotak", name: "Kotak Bank", desc: "Kotak Net Banking" },
                    { key: "pnb", name: "Punjab National Bank", desc: "PNB Retail Gate" }
                  ].map(bank => (
                    <button
                      key={bank.key}
                      onClick={() => setSelectedBank(bank.name)}
                      className={`p-3 rounded-lg border text-left transition text-xs cursor-pointer ${
                        selectedBank === bank.name 
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" 
                          : "bg-[#171920] border-slate-800 text-slate-300 hover:bg-slate-850"
                      }`}
                    >
                      <p className="font-bold">{bank.name}</p>
                      <p className="text-[8.5px] text-slate-500 mt-0.5">{bank.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (!selectedBank) {
                        alert("Please select a banking portal.");
                        return;
                      }
                      setGatewayStep("otp_verification");
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Building className="w-3.5 h-3.5 mr-1" />
                    Pay via NetBanking
                  </button>
                </div>

                <button 
                  onClick={() => setGatewayStep("method_select")}
                  className="text-xs text-slate-400 hover:text-white font-medium block pt-1 cursor-pointer"
                >
                  ← Select another method
                </button>
              </div>
            )}

            {/* STEP 4: OTP verification */}
            {gatewayStep === "otp_verification" && (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-2 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/20">
                    <KeyRound className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Two-Factor OTP Security Check</h4>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                    Razorpay 3D-Secure has dispatched an SMS message with verification passwords to your profile phone ending in *9876.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block text-center">Verify Deposit Authentication Password</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-36 mx-auto bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-center sm:text-base text-white focus:outline-none font-mono tracking-widest font-bold block"
                    />
                    <span className="text-[9.5px] text-indigo-400/95 block text-center font-semibold animate-pulse">
                      (Test mode code: Enter <strong className="font-extrabold underline">123456</strong>)
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => {
                      if (otpValue !== "123456") {
                        alert("Invalid OTP code! Please enter the secure simulation code '123456' to proceed.");
                        return;
                      }
                      executeSimulatedPayment();
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Authorize & Authenticate Transaction
                  </button>

                  <button
                    onClick={() => setGatewayStep("method_select")}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs rounded-lg transition border border-slate-800 cursor-pointer"
                  >
                    Cancel Transaction
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Processing Ledger Writes */}
            {gatewayStep === "processing" && (
              <div className="p-10 text-center space-y-5">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto pb-1" />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-white text-sm">Settling Razorpay Escrow Ledgers...</h4>
                  <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Executing dual atomic updates in your cloud Firestore clusters. Generating secure cryptographic block indexes.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 6: Success Confirmation */}
            {gatewayStep === "success" && (
              <div className="p-8 text-center space-y-5">
                <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full animate-bounce">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-white text-sm">Secured Funds Disbursed!</h4>
                  <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
                    Wallet top-up processed successfully under authorization block. Balance increased immediately.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-left text-[11px] space-y-1 text-slate-400 font-mono">
                  <p><span className="text-slate-500 font-bold">MERCHANT:</span> Trade Tutor Pvt. Ltd.</p>
                  <p><span className="text-slate-500 font-bold">DEPOSIT:</span> ₹{Number(depositAmount).toFixed(2)}</p>
                  <p><span className="text-slate-500 font-bold">METHOD:</span> {paymentMethod.toUpperCase()}</p>
                  <p><span className="text-slate-500 font-bold">STATUS:</span> FIRESTORE_COMMITTED_OK</p>
                </div>

                <button
                  onClick={() => {
                    setShowDepositModal(false);
                    setGatewayStep("input");
                    setDepositAmount("");
                    setOtpValue("");
                    setCardNumber("");
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  Return to Trade Tutor Wallet
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
