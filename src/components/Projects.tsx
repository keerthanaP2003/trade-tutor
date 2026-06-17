import React, { useState, useEffect } from "react";
import { Users, Code, Plus, RefreshCw, Send, CheckCircle, Github, Award, Bell, Clock, AlertTriangle } from "lucide-react";
import { TeamMemberRequest, UserProfile } from "../types";
import { subscribeCollabs, addCollabToDb, joinCollabInDb } from "../firebaseService";

interface ProjectsProps {
  userRef: UserProfile;
}

export default function Projects({ userRef }: ProjectsProps) {
  const [collabs, setCollabs] = useState<TeamMemberRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState("");
  const [limit, setLimit] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [notifiedProjects, setNotifiedProjects] = useState<string[]>([]);
  const [localToasts, setLocalToasts] = useState<{ id: string; title: string; message: string }[]>([]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeCollabs((updated) => {
      setCollabs(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check custom browser notifications permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionGranted(Notification.permission === "granted");
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const status = await Notification.requestPermission();
        setPermissionGranted(status === "granted");
        if (status === "granted") {
          new Notification("Notifications Active!", {
            body: "You'll now receive background alerts for upcoming Capstone assembly deadlines."
          });
        }
      } catch (err) {
        console.warn("Notification request failed or denied: ", err);
      }
    }
  };

  // Automated Real-time local notification trigger engine
  useEffect(() => {
    if (collabs.length === 0) return;

    const checkUpcomingDeadlines = () => {
      const now = Date.now();
      const triggeredAlerts: { id: string; title: string; message: string }[] = [];
      const currentNotified = [...notifiedProjects];
      let hasNewNotif = false;

      collabs.forEach(col => {
        if (!col.deadline) return;
        const deadlineTime = new Date(col.deadline).getTime();
        const diffMs = deadlineTime - now;
        const hrsRemaining = diffMs / (1000 * 60 * 60);

        // Within 24 hours of deadline, currently active and not previously warned
        if (diffMs > 0 && hrsRemaining <= 24) {
          if (!currentNotified.includes(col.id)) {
            currentNotified.push(col.id);
            hasNewNotif = true;

            const alarmTitle = "⏳ Capstone Deadline Reminder!";
            const alarmBody = `"${col.title}" creator cohort deadline is within 24 hours (Due: ${new Date(col.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})!`;

            // 1. Browser Native Alert Integration
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(alarmTitle, {
                  body: alarmBody,
                  icon: col.creatorAvatar || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=150"
                });
              } catch (e) {
                console.warn("Local desktop indicator suppressed by iframe restriction", e);
              }
            }

            // 2. Beautiful In-App Alert Overlay System
            const tId = `${col.id}_${now}`;
            triggeredAlerts.push({
              id: tId,
              title: alarmTitle,
              message: alarmBody
            });
          }
        }
      });

      if (hasNewNotif) {
        setNotifiedProjects(currentNotified);
        if (triggeredAlerts.length > 0) {
          setLocalToasts(prev => [...prev, ...triggeredAlerts]);
          
          // Dismiss alert toasts automatically after 8 seconds of continuous display
          triggeredAlerts.forEach(t => {
            setTimeout(() => {
              setLocalToasts(prev => prev.filter(item => item.id !== t.id));
            }, 8000);
          });
        }
      }
    };

    // Trigger run immediately, then poll every 10s for high resolution tracking
    checkUpcomingDeadlines();
    const timer = setInterval(checkUpcomingDeadlines, 10000);
    return () => clearInterval(timer);
  }, [collabs, notifiedProjects]);

  const handlePostCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setErrorMsg("Title is required.");
      return;
    }

    try {
      const collabData = {
        title,
        projectDescription: desc,
        requiredSkills: skills.split(",").map(s => s.trim()).filter(Boolean),
        membersLimit: Number(limit) || 3,
        creatorId: userRef.id,
        creatorName: userRef.name,
        creatorAvatar: userRef.avatar,
        status: "Open" as const,
        membersCount: 1,
        deadline: deadlineInput || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // Default to 48 hours out if unspecified
      };
      await addCollabToDb(collabData);
      setShowAddModal(false);
      setTitle("");
      setDesc("");
      setSkills("");
      setLimit("");
      setDeadlineInput("");
    } catch (err) {
      setErrorMsg("Failed to connect with database.");
    }
  };

  const mentors = [
    {
      name: "Dr. Dave Kernighan",
      role: "Visiting Research Mentor",
      avatar: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=150",
      rating: 4.9,
      subjects: ["Systems programming", "C/C++ Compiler optimization", "TCP/IP Networks"],
      bio: "Retired principal systems engineer. Happy to supervise capstones or resolve thorny OS kernel bugs with smart students."
    },
    {
      name: "Prof. Priya Srinivasan",
      role: "Associate Professor (AI / Algorithms)",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
      rating: 4.8,
      subjects: ["Recursive Adversarial Search", "Heuristics", "Pruning Algorithms"],
      bio: "Active AI researcher. Mentoring undergraduate capstones building multi-modal models or localized student aid vectors."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Inline animation helpers for Slide and Shrink */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shrinkFill {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-custom-slide {
          animation: slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-custom-shrink {
          animation: shrinkFill 8s linear forwards;
        }
      ` }} />

      {/* Floating Local Notification Center */}
      {localToasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full pointer-events-auto">
          {localToasts.map(toast => (
            <div 
              key={toast.id} 
              className="bg-slate-900 border-2 border-indigo-600/90 p-4 rounded-xl shadow-2xl flex gap-3 animate-custom-slide relative overflow-hidden bg-opacity-95 backdrop-blur-md"
            >
              <div className="absolute top-0 left-0 bg-indigo-500 h-1 w-full animate-custom-shrink" />
              <div className="w-8 h-8 rounded-full bg-indigo-600/15 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-indigo-400 animate-bounce" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-xs text-white flex items-center justify-between">
                  <span>{toast.title}</span>
                  <button 
                    onClick={() => setLocalToasts(prev => prev.filter(item => item.id !== toast.id))}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer focus:outline-none"
                  >
                    ✕
                  </button>
                </h5>
                <p className="text-[10px] text-slate-300 mt-1 leading-normal font-medium">
                  {toast.message}
                </p>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[8px] uppercase tracking-wider font-bold text-indigo-400 font-mono">
                    System Sandbox Alert
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">Dismissable</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-xl font-sans font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Project Teammates & Mentor Hub
          </h2>
          <p className="text-xs text-slate-400">Assemble elite engineering squads for college capstones, startups, or local hackathons.</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Propose Team Assembly
        </button>
      </div>

      {/* Real-time Reminder Settings & Alert Dashboards Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Permission and device toggles */}
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4 col-span-3 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-slate-950 border border-slate-800 ${permissionGranted ? "text-indigo-400" : "text-slate-500"}`}>
              <Bell className={`w-4 h-4 ${permissionGranted ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">System Push Alerts</h4>
              <p className="text-[9.5px] text-slate-400 leading-none mt-0.5">
                {permissionGranted ? "Local browser notifier active" : "Blocked by iframe container settings"}
              </p>
            </div>
          </div>
          {!permissionGranted ? (
            <button 
              onClick={requestNotificationPermission}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[9.5px] font-semibold text-indigo-400 rounded-lg transition"
            >
              Enable Desktop Alerts
            </button>
          ) : (
            <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase py-0.5 px-1.5 bg-emerald-500/5 rounded-full border border-emerald-500/10">Active</span>
          )}
        </div>

        {/* Dynamic approaching deadline count and details banner */}
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4 col-span-3 md:col-span-2">
          {(() => {
            const now = Date.now();
            const approachingList = collabs.filter(c => {
              if (!c.deadline) return false;
              const diffMs = new Date(c.deadline).getTime() - now;
              const hrs = diffMs / (1000 * 60 * 60);
              return diffMs > 0 && hrs <= 24;
            });

            return (
              <div className="flex items-center gap-3 w-full justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${approachingList.length > 0 ? "bg-amber-500/5 text-amber-500 border-amber-500/20 animate-pulse" : "bg-slate-950 text-slate-500 border-slate-850"}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">Capstone Reminders Matrix</h4>
                    <p className="text-[9.5px] text-slate-300 pr-4">
                      {approachingList.length > 0 
                        ? `Urgent Action Required: ${approachingList.length} collaborator squad assembly deadlines are within 24 hours!` 
                        : "Outstanding news! All collaborative milestone submissions are comfortably in the future."}
                    </p>
                  </div>
                </div>

                {approachingList.length > 0 && (
                  <span className="px-2 py-1 shrink-0 bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold rounded-lg uppercase tracking-wider font-mono">
                    {approachingList.length} URGENT COHORTS
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Teammate finder list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-semibold text-sm text-slate-300">Active Campus Teammate Boards</h3>
            <button disabled={loading} className="p-1.5 bg-slate-950 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-6 text-xs text-slate-500">Scanning campus boards...</div>
          ) : collabs.length === 0 ? (
            <div className="p-10 bg-slate-900/10 border border-slate-800 text-center text-slate-500 text-xs rounded-xl">
              No teammate requests found. Kickstart your own project!
            </div>
          ) : (
            <div className="space-y-4">
              {collabs.map(col => (
                <div key={col.id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 hover:border-slate-755 transition">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                      <h4 className="font-semibold text-white text-base">{col.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{col.projectDescription}</p>

                      {/* Explicit Capstone Collaboration Deadline Badge */}
                      {col.deadline && (
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Deadline: {new Date(col.deadline).toLocaleDateString()} {new Date(col.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          {(() => {
                            const diff = new Date(col.deadline).getTime() - Date.now();
                            if (diff <= 0) {
                              return <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-bold text-[9px]">⌛ Cohort Expired</span>;
                            }
                            const hrs = Math.ceil(diff / (1000 * 60 * 60));
                            if (hrs <= 24) {
                              return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded font-bold text-[9px] animate-pulse">⏰ Assembly Alarm: Due in {hrs}h!</span>;
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 text-[10px] rounded-full">
                        {col.membersCount} / {col.membersLimit} Enrolled
                      </span>
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {col.requiredSkills.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-slate-950 text-slate-400 hover:text-indigo-300 border border-slate-800/80 rounded text-[9px] font-mono">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="border-t border-slate-800/60 pt-3 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <img src={col.creatorAvatar} className="w-5 h-5 rounded-full object-cover border border-slate-700" alt={col.creatorName} />
                      <span className="text-[10px] font-medium text-slate-300">Formed by: {col.creatorName}</span>
                    </div>

                    {col.creatorId === userRef.id ? (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> You lead this project
                      </span>
                    ) : (
                      <button 
                        onClick={async () => {
                          if (col.membersCount >= col.membersLimit) {
                            alert("This project group has already hit its member limits.");
                            return;
                          }
                          try {
                            await joinCollabInDb(col.id, col.membersCount);
                            alert(`You have enrolled in the group! Coordinate with creator ${col.creatorName}.`);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold rounded-lg transition"
                      >
                        Request to Join
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mentor Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="font-sans font-semibold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider mb-3">
              <Award className="w-4 h-4 text-emerald-400" />
              Verified Advisor Network
            </h3>

            <div className="space-y-4">
              {mentors.map(m => (
                <div key={m.name} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2">
                    <img src={m.avatar} className="w-8 h-8 rounded-full object-cover" alt={m.name} />
                    <div>
                      <h4 className="font-semibold text-white text-xs">{m.name}</h4>
                      <p className="text-[10px] text-slate-400">{m.role}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-350 leading-normal italic">"{m.bio}"</p>

                  <div className="flex flex-wrap gap-1">
                    {m.subjects.map(s => (
                      <span key={s} className="px-1.5 py-0.5 bg-slate-900 text-slate-400 text-[8px] font-mono rounded">
                        {s}
                      </span>
                    ))}
                  </div>

                  <button 
                    onClick={() => alert("Successfully reserved technical consulting session with " + m.name + ". Details forwarded to your college email address.")}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold rounded-lg transition"
                  >
                    Schedule Consultation
                  </button>
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
              <h3 className="text-base font-bold text-white">Propose Project Team Assembly</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handlePostCollab} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 text-red-400 text-xs border border-red-500/20 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g. AR Campus Directions Mobile Overlay App"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Target Teammate Size</label>
                  <input
                    type="number"
                    placeholder="e.g. 4"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Capstone / Project Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Required Skills *</label>
                <input
                  type="text"
                  placeholder="e.g. React, Flutter, Python, JAX"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Project Pitch Description</label>
                <textarea
                  placeholder="Describe what you plan to build, scope, technology stack, target competition deadlines, and visual milestones..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
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
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
