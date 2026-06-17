import React, { useState, useEffect } from "react";
import { ListFilter, Plus, GraduationCap, IndianRupee, Clock, MessageSquare, Send, RefreshCw, Star } from "lucide-react";
import { Assignment, UserProfile } from "../types";
import { subscribeAssignments, addAssignmentToDb, submitProposalToDb, acceptProposalInDb, createChatThreadInDb } from "../firebaseService";

interface AssignmentsProps {
  userRef: UserProfile;
  onNavigate?: (tabId: string) => void;
}

export default function Assignments({ userRef, onNavigate }: AssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
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
  
  // Create Assignment State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSubj, setNewSubj] = useState("Computer Science");
  const [newBudget, setNewBudget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  // Create Proposal state
  const [activeBidId, setActiveBidId] = useState<string | null>(null);
  const [bidPrice, setBidPrice] = useState("");
  const [bidCoverLetter, setBidCoverLetter] = useState("");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAssignments((updated) => {
      setAssignments(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePostAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newBudget) {
      setErrorMsg("Title and Budget are mandatory.");
      return;
    }
    setErrorMsg("");

    try {
      const assignmentData = {
        title: newTitle,
        description: newDesc,
        subject: newSubj,
        budget: Number(newBudget),
        deadline: newDeadline || "flexible",
        userId: userRef.id,
        userName: userRef.name,
        userAvatar: userRef.avatar,
        status: "Open" as const
      };
      await addAssignmentToDb(assignmentData);
      setShowAddModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewBudget("");
      setNewDeadline("");
    } catch (err) {
      setErrorMsg("Failed to connect with live database.");
    }
  };

  const handlePostProposal = async (id: string) => {
    if (!bidPrice) {
      alert("Please mention your desired bid price.");
      return;
    }

    const assign = assignments.find(a => a.id === id);
    if (!assign) return;

    const newProposal = {
      id: `prop_${Date.now()}`,
      expertId: userRef.id,
      expertName: userRef.name,
      expertAvatar: userRef.avatar,
      expertRating: userRef.rating || 5.0,
      bidAmount: Number(bidPrice),
      deliveryTime: "3 days",
      coverLetter: bidCoverLetter || "I can guide you perfectly on this assignment.",
      status: "Pending" as const
    };

    const updatedProposals = [...assign.proposals, newProposal];

    try {
      await submitProposalToDb(id, updatedProposals);
      alert("Your expert tutoring bid has been logged under this project!");
      setActiveBidId(null);
      setBidPrice("");
      setBidCoverLetter("");
    } catch (err) {
      console.error(err);
      alert("Could not post proposal to Firestore.");
    }
  };

  const handleAcceptProposal = async (assignmentId: string, proposalId: string) => {
    try {
      await acceptProposalInDb(assignmentId, proposalId);
      alert("Tutoring bid accepted & coursework status assigned!");
    } catch (err) {
      console.error(err);
      alert("Could not accept proposal.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            Assignment Guidance & Tutoring Board
          </h2>
          <p className="text-xs text-slate-400">Post difficult campus coursework or pitch your technical skillsets as an academic expert helper.</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Request Coursework Aid
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-sans font-semibold text-sm text-slate-300">Open Coursework Requests</h3>
        <button 
          disabled={loading}
          className="p-1.5 bg-slate-950 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-xs text-slate-500">Retrieving tutoring boards...</div>
      ) : assignments.length === 0 ? (
        <div className="p-10 border border-slate-800/60 rounded-xl bg-slate-900/10 text-center text-slate-400 text-xs">
          No current academic help positions listed. Be the first to post!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {assignments.map(a => (
            <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-750 transition flex flex-col justify-between">
              
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-bold rounded">
                      {a.subject}
                    </span>
                    <h4 className="font-semibold text-white text-base mt-1.5">{a.title}</h4>
                  </div>

                  <div className="text-right">
                    <div className="text-emerald-400 font-bold flex items-center justify-end text-sm">
                      <IndianRupee className="w-3 h-3 mr-0.5" />
                      {a.budget}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Budget Guide</span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">{a.description}</p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 pb-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Deadline: {a.deadline}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <img src={a.userAvatar} className="w-4 h-4 rounded-full" alt={a.userName} />
                    <span>Requested by: {a.userName}</span>
                    {a.userId !== userRef.id && (
                      <button
                        onClick={() => handleOpenDirectChat(a.userId, a.userName, a.userAvatar, "Student")}
                        className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 bg-slate-950 hover:bg-slate-850 hover:text-indigo-400 border border-slate-805 rounded font-mono text-[9px] cursor-pointer"
                        title="Chat about requirements"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Proposals and Action Board */}
              <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-3">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Star className="w-3 h-3 text-indigo-400" />
                  Expert Bid Offers ({a.proposals.length})
                </h5>

                {a.proposals.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic pb-2">No active bid proposals yet on this tutorial task.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {a.proposals.map(prop => (
                      <div key={prop.id} className="p-2.5 bg-slate-950 border border-slate-800/75 rounded-lg space-y-1.5 text-xs flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <img src={prop.expertAvatar} className="w-4 h-4 rounded-full" alt={prop.expertName} />
                              <span className="font-semibold text-white text-[11px]">{prop.expertName}</span>
                              <span className="text-[9px] text-amber-400 flex items-center">★{prop.expertRating}</span>
                              {prop.expertId !== userRef.id && (
                                <button
                                  onClick={() => handleOpenDirectChat(prop.expertId, prop.expertName, prop.expertAvatar, "Expert")}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 hover:text-indigo-400 border border-slate-800 rounded text-[9px] font-mono cursor-pointer"
                                  title="Chat with tutor"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  Chat
                                </button>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                prop.status === "Accepted"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : prop.status === "Rejected"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {prop.status}
                              </span>
                            </div>
                            <span className="font-bold text-amber-400">₹{prop.bidAmount}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed italic mt-1.5">"{prop.coverLetter}"</p>
                        </div>
                        {userRef.id === a.userId && a.status === "Open" && prop.status === "Pending" && (
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => handleAcceptProposal(a.id, prop.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] rounded-lg transition shadow-sm cursor-pointer"
                            >
                              Accept Expert Bid
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit Bid Selector */}
                {activeBidId === a.id ? (
                  <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Bid Amount (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 75"
                          value={bidPrice}
                          onChange={(e) => setBidPrice(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Helper Rating</label>
                        <div className="py-2 text-[11px] text-slate-400 italic">Pre-verified expert credentials</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Pitch proposal</label>
                      <textarea
                        placeholder="Detail your exact skillset, background acing this subject, and estimated delivery dates..."
                        value={bidCoverLetter}
                        onChange={(e) => setBidCoverLetter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white h-12 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => setActiveBidId(null)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handlePostProposal(a.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white rounded-lg transition font-medium flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Pitch Bid
                      </button>
                    </div>
                  </div>
                ) : (
                  userRef.id !== a.userId && (
                    <button
                      onClick={() => setActiveBidId(a.id)}
                      className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Propose Guided Solution on this task
                    </button>
                  )
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Add Homework Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Request Coursework Guideline Aid</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handlePostAssignment} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 text-red-400 text-xs border border-red-500/20 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Class or Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems - Nachos Project thread scheduler"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Subject Category</label>
                  <select
                    value={newSubj}
                    onChange={(e) => setNewSubj(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Advanced Mathematics">Advanced Mathematics</option>
                    <option value="Physics & Chem">Physics & Chemistry</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Budget Limit (₹) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Expected Completion Deadline</label>
                <input
                  type="text"
                  placeholder="e.g. June 25, 2026"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Detailed Description and Tasks</label>
                <textarea
                  placeholder="Insert exact problem requirements. Mention locks, compilers, code frameworks, datasets, or textbook chapter titles..."
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
