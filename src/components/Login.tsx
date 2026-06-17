import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInAnonymously
} from "firebase/auth";
import { auth, db } from "../firebase";
import { createUserProfileInDb, getUserProfile } from "../firebaseService";
import { UserRole } from "../types";
import { Sparkles, Mail, Lock, User, GraduationCap, MapPin, AlertCircle, Eye, EyeOff, ClipboardList } from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";

interface LoginProps {
  onLoginSuccess: (uid: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isAuthNotAllowed, setIsAuthNotAllowed] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all requested fields.");
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name) {
          setErrorMsg("Full name is required for registration.");
          setLoading(false);
          return;
        }
        // Create user in firebase Auth
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = credential.user.uid;
        
        // Write profile statistics to Firestore
        await createUserProfileInDb(uid, {
          name,
          email,
          role,
          university: university || "Metro State University",
          major: major || "Computer Science",
          avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 9000000)}?auto=format&fit=crop&q=80&w=150`
        });

        onLoginSuccess(uid);
      } else {
        // Sign in standard user in Auth
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const uid = credential.user.uid;
        
        // Check if profile document on Firestore exists. If not, bootstrap a default one!
        const existingProfile = await getUserProfile(uid);
        if (!existingProfile) {
          await createUserProfileInDb(uid, {
            name: credential.user.displayName || email.split("@")[0],
            email: email,
            role: UserRole.STUDENT
          });
        }
        onLoginSuccess(uid);
      }
    } catch (err: any) {
      console.error("Auth error", err);
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        setIsAuthNotAllowed(true);
        setErrorMsg("Email/Password Sign-In is disabled in the Firebase Console. Follow the guide below to enable it.");
      } else if (err.code === "auth/invalid-credential") {
        setErrorMsg("Incorrect credentials. Please verify your email/password.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Password must be at least 6 characters.");
      } else if (err.code === "auth/email-already-in-use") {
        setErrorMsg("This email is already registered on our node. Use Login instead.");
      } else {
        setErrorMsg(err.message || "Authentication transaction failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const uid = result.user.uid;

      // Seed/load the profile for this user
      const existing = await getUserProfile(uid);
      if (!existing) {
        await createUserProfileInDb(uid, {
          name: result.user.displayName || "Google Scholar",
          email: result.user.email || "",
          role: UserRole.STUDENT,
          avatar: result.user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"
        });
      }
      onLoginSuccess(uid);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Google Consent Popup was blocked or aborted. Try the Fallback Quick Demo Entry!");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoAccess = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      // Sign in anonymously via Firebase Auth
      const result = await signInAnonymously(auth);
      const uid = result.user.uid;

      const existing = await getUserProfile(uid);
      if (!existing) {
        await createUserProfileInDb(uid, {
          name: "Guest Scholar",
          email: "guest@tradetutor.edu",
          role: UserRole.STUDENT,
          avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
          bio: "Just checking out the platform!",
          university: "Federation College"
        });
      }
      onLoginSuccess(uid);
    } catch (err: any) {
      console.error("Anonymous authentication error", err);
      if (err?.code === "auth/admin-restricted-operation" || (err?.message && err.message.includes("admin-restricted-operation"))) {
        setErrorMsg("Instant Guest access is disabled in your Firebase configuration! To enable this feature, please go to your Firebase Console -> Authentication -> Sign-in Method, and enable the 'Anonymous' sign-in provider.");
      } else {
        setErrorMsg("Instant Access error. Please register or sign in with email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Decorative cyber backdrop circles */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-gradient-to-tr from-indigo-700/10 to-indigo-500/0 filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-600/5 to-emerald-400/0 filter blur-3xl pointer-events-none" />

      {/* Main container card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-850 p-8 rounded-3xl shadow-2xl relative z-10 space-y-6">
        
        {/* Logo and Greeting Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-600/10 mx-auto">
            TT
          </div>
          <div>
            <h1 className="font-sans font-black text-white text-xl tracking-tight uppercase leading-none">Trade Tutor</h1>
            <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase mt-1 block">Real-time college service network</span>
          </div>
          <p className="text-slate-450 text-xs mt-1">
            {isSignUp ? "Create your verified student nodes and profile." : "Access your campus marketplace, bids, and peers."}
          </p>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isAuthNotAllowed && (
          <div className="p-4 bg-slate-950/90 border border-amber-500/30 rounded-2xl space-y-3 text-xs text-slate-300 font-sans animate-fade-in">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
              <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
              <span>Firebase Auth Action Required</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              To use email registration or password authentication, you need to turn on the **Email/Password** provider inside your virtual Firebase console project.
            </p>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-850 space-y-2 text-[10.5px]">
              <span className="text-white font-semibold block">Simplest Resolution Steps:</span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-350">
                <li>
                  Open the <a 
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-indigo-400 hover:text-indigo-300 underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Firebase Auth Console <span className="text-[9px]">↗</span>
                  </a>
                </li>
                <li>Under the <span className="text-slate-200 font-medium">Sign-in method</span> tab, click <span className="text-slate-200 font-medium">Add new provider</span></li>
                <li>Select <span className="text-slate-200 font-medium">Email/Password</span>, toggle it to <span className="text-emerald-400 font-medium">Enable</span>, and click <span className="text-slate-200 font-medium">Save</span>.</li>
                <li>(Optional) Enable <span className="text-slate-200 font-medium font-mono">Anonymous</span> to support quick demo guest entry if needed later.</li>
              </ol>
            </div>
            <p className="text-[10px] text-slate-500 italic leading-tight">
              Once saved, please refresh the browser or retry signing up here immediately without any restarts!
            </p>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          
          {isSignUp && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-indigo-500 focus:outline-none placeholder-slate-650"
                  />
                </div>
              </div>

              {/* Choose Role Selector */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Your Primary Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl py-3 px-4 text-sm text-slate-300 focus:border-indigo-500 focus:outline-none"
                >
                  <option value={UserRole.STUDENT}>Student Scholar</option>
                  <option value={UserRole.MENTOR}>Academic Graduate Mentor</option>
                  <option value={UserRole.ASSIGNMENT_EXPERT}>Exam & Assignment Expert</option>
                  <option value={UserRole.SELLER}>Store Vendor / Seller</option>
                </select>
              </div>

              {/* University Name */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-sans block">University Name *</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metro State University"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-indigo-500 focus:outline-none placeholder-slate-650"
                  />
                </div>
              </div>

              {/* Major of Study */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Major Field *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-indigo-500 focus:outline-none placeholder-slate-650"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Area */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-805 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-indigo-500 focus:outline-none placeholder-slate-650"
              />
            </div>
          </div>

          {/* Password Area */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Account Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-805 rounded-xl py-3 pl-11 pr-8 text-sm text-white focus:border-indigo-500 focus:outline-none placeholder-slate-650"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Area */}
          {isSignUp && (
            <div className="space-y-1 animate-fade-in">
              <label className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-805 rounded-xl py-3 pl-11 pr-8 text-sm text-white focus:border-indigo-500 focus:outline-none placeholder-slate-650"
                />
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-indigo-600/20 active:translate-y-0.5 transition cursor-pointer mt-2"
          >
            {loading ? "AUTHENTICATING SECURE PIN..." : isSignUp ? "REGISTER ACCOUNT PROFILE" : "ENTER CAMPUS GATES"}
          </button>
        </form>

        {/* Divisor row */}
        <div className="flex items-center gap-3 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
          <div className="h-px bg-slate-800 flex-grow" />
          <span>Or proceed via</span>
          <div className="h-px bg-slate-800 flex-grow" />
        </div>

        {/* Third Party logins */}
        <div className="block">
          {/* Real Google Login */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-slate-800 bg-slate-950/60 hover:bg-slate-850 text-slate-200 hover:text-white rounded-xl py-3 text-xs font-semibold hover:border-slate-700 transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-450" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.737-.08-1.3-.177-1.859H12.24z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition underline cursor-pointer"
          >
            {isSignUp ? "Already registered? Go to Login" : "New member? Sign up the campus profile here"}
          </button>
        </div>

      </div>
    </div>
  );
}
