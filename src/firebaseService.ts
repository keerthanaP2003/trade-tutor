import { 
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, where, writeBatch 
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  signInAnonymously
} from "firebase/auth";
import { auth, db } from "./firebase";
import { UserProfile, ProductListing, Assignment, ForumPost, ChatThread, ChatMessage, TeamMemberRequest, WalletTransaction, UserRole, InternshipListing } from "./types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// =========================================================================
// REAL-TIME FIRESTORE DATA SEEDER
// =========================================================================

export async function seedDatabaseIfEmpty() {
  try {
    const prodSnap = await getDocs(collection(db, "products"));
    if (prodSnap.empty) {
      console.log("Seeding initial products into Firestore...");
      const dummyProducts = [
        {
          id: "prod_1",
          title: "Cracking the Coding Interview (6th Edition)",
          description: "Essential book for tech recruiting. Has some pencil annotations, but otherwise clean pages. Selling because I just landed my internship!",
          category: "Books",
          price: 1500,
          condition: "Like New",
          sellerId: "seller_1",
          sellerName: "Marcus Vance",
          sellerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
          imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400",
          status: "Available",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_2",
          title: "TI-84 Plus CE Graphing Calculator",
          description: "Slightly scratch on back, screen and rechargeable battery are in perfect condition. Charger and cable included. Used for Calculus II and Engineering Physics.",
          category: "Calculators",
          price: 5500,
          condition: "Good",
          sellerId: "seller_2",
          sellerName: "Emily Zhao",
          sellerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
          imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=400",
          status: "Available",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_3",
          title: "Sony WH-1000XM4 Noise Canceling Headphones",
          description: "Incredible active noise canceling headphones. Great for studying in the bustling student union. Comes with original case, 3.5mm plug, and USBC cord.",
          category: "Electronics",
          price: 13000,
          condition: "Good",
          sellerId: "seller_3",
          sellerName: "Jordan K.",
          sellerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
          status: "Available",
          createdAt: new Date().toISOString()
        }
      ];

      for (const p of dummyProducts) {
        await setDoc(doc(db, "products", p.id), p);
      }
    }

    const assignSnap = await getDocs(collection(db, "assignments"));
    if (assignSnap.empty) {
      console.log("Seeding initial assignments into Firestore...");
      const dummyAssignments = [
        {
          id: "assign_1",
          title: "Operating Systems - Nachos Project Part 1",
          description: "Need guidance setting up thread synchronization and semaphores inside Nachos environment strictly in C++. Code is partially complete but hitting lock deadlocks.",
          subject: "Computer Science",
          budget: 1500,
          deadline: "June 25, 2026",
          userId: "buyer_12",
          userName: "Tyler Durden",
          userAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150",
          status: "Open",
          proposals: [
            {
              id: "prop_1",
              expertId: "exp_1",
              expertName: "Dr. Dave Kernighan",
              expertAvatar: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&q=80&w=150",
              expertRating: 4.9,
              bidAmount: 1200,
              deliveryTime: "3 days",
              coverLetter: "Hi! I have extensive experience with Nachos and MINIX kernels. I can guide you through implementing the Priority Scheduler and solving deadlocks.",
              status: "Pending"
            }
          ]
        },
        {
          id: "assign_2",
          title: "Database Normalization and SQL Optimization Guide",
          description: "Looking for an expert mentor to conduct a 1-hour workshop on 1NF, 2NF, 3NF, BCNF, and index query execution plan optimization.",
          subject: "Information Technology",
          budget: 800,
          deadline: "June 20, 2026",
          userId: "buyer_15",
          userName: "Nisha Patel",
          userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
          status: "Open",
          proposals: []
        }
      ];

      for (const a of dummyAssignments) {
        await setDoc(doc(db, "assignments", a.id), a);
      }
    }

    const collabSnap = await getDocs(collection(db, "collabs"));
    if (collabSnap.empty) {
      console.log("Seeding initial collabs into Firestore...");
      const dummyCollabs = [
        {
          id: "col_1",
          title: "AI Campus Navigation Helper (Mobile iOS/Android)",
          projectDescription: "Developing a Flutter application that overlays campus routing directions in real-time augmented reality. Great capstone project.",
          requiredSkills: ["Flutter", "TensorFlow Lite", "ARCore", "Dart"],
          creatorId: "creator_3",
          creatorName: "Daniel Smith",
          creatorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
          membersCount: 2,
          membersLimit: 4,
          status: "Open" as const,
          createdAt: new Date().toISOString().split('T')[0],
          deadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString() // 18 hours from now
        },
        {
          id: "col_2",
          title: "Eco-Friendly Textbook Sharing Portal",
          projectDescription: "Creating a localized WebApp for textbook rotations. Need a solid frontend React designer to match wireframe standards.",
          requiredSkills: ["React", "CSS/Tailwind", "Figma", "UI/UX Design"],
          creatorId: "creator_5",
          creatorName: "Siddharth Verma",
          creatorAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150",
          membersCount: 1,
          membersLimit: 2,
          status: "Open" as const,
          createdAt: new Date().toISOString().split('T')[0],
          deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 3 days from now
        }
      ];

      for (const c of dummyCollabs) {
        await setDoc(doc(db, "collabs", c.id), c);
      }
    }

    const forumSnap = await getDocs(collection(db, "forums"));
    if (forumSnap.empty) {
      console.log("Seeding initial forums into Firestore...");
      const dummyForums = [
        {
          id: "post_1",
          title: "Who wants to team up for the MetroHacks 2026 Hackathon?",
          category: "Hackathons",
          content: "Hi everyone! Main theme is 'AI in Local Communities'. I have a solid Express back-end setup built and ready. Looking for a frontend designer who can crank out beautiful tailwind overlays and dashboards inside 36 hours.",
          authorName: "Marcus Vance",
          authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
          authorRole: "Student",
          likes: 12,
          likedByUsers: [],
          replies: 5,
          createdAt: new Date().toISOString()
        }
      ];

      for (const f of dummyForums) {
        await setDoc(doc(db, "forums", f.id), f);
      }
    }

    const internSnap = await getDocs(collection(db, "internships"));
    if (internSnap.empty) {
      console.log("Seeding initial internships into Firestore...");
      const dummyInternships = [
        {
          id: "intern_1",
          title: "Software Engineering Intern (Web Systems)",
          company: "Stripe",
          location: "San Francisco, CA / Remote Possible",
          type: "Remote",
          duration: "12 Weeks (Fall 2026)",
          stipend: "₹500/hour + Housing Allowance",
          requirements: ["Solid foundations in React, TS & RESTful systems", "Willingness to learn Ruby/Go frameworks", "Past personal fullstack side-projects"],
          description: "Stripe makes accepting payments simple, seamless, and global. Join the Developer Relations & Dashboard core engineering team to build interfaces used by millions of merchants worldwide.",
          createdAt: "2026-06-08"
        },
        {
          id: "intern_2",
          title: "Junior Product Manager (Growth Team)",
          company: "Notion Labs",
          location: "New York, NY",
          type: "Hybrid",
          duration: "16 Weeks",
          stipend: "₹450/hour",
          requirements: ["Excellent written communication", "Can query relational data utilizing basic SQL", "Keen eye for functional minimalistic UI design"],
          description: "Join Notion Product Growth team. You'll run continuous AB testing, draft PRDs (Product Requirements Documents), and optimize workspace setup onboarding funnel speeds.",
          createdAt: "2026-06-11"
        },
        {
          id: "intern_3",
          title: "Generative AI Systems Intern",
          company: "Google",
          location: "Mountain View, CA / Hybrid",
          type: "Hybrid",
          duration: "12 Weeks",
          stipend: "₹650/hour",
          requirements: ["Familiarity with foundational Large Language Models", "Python, JAX, or PyTorch knowledge", "Highly interested in agentic frameworks"],
          description: "Work on next-generation model capabilities, tool telemetry logging, and prompt interface optimizations.",
          createdAt: "2026-06-12"
        }
      ];

      for (const i of dummyInternships) {
        await setDoc(doc(db, "internships", i.id), i);
      }
    }
  } catch (error) {
    console.error("Database seeding failed", error);
  }
}

// =========================================================================
// PROFILE CONTROLLERS
// =========================================================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `profiles/${uid}`;
  try {
    const docRef = doc(db, "profiles", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function createUserProfileInDb(uid: string, profile: Partial<UserProfile>): Promise<UserProfile> {
  const path = `profiles/${uid}`;
  const fullProfile: UserProfile = {
    id: uid,
    name: profile.name || "New Student",
    email: profile.email || "",
    role: profile.role || UserRole.STUDENT,
    avatar: profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
    skills: profile.skills || ["React", "HTML", "CSS"],
    bio: profile.bio || "Hi! I just joined Trade Tutor.",
    major: profile.major || "Undecided",
    university: profile.university || "Public Campus University",
    rating: 5.0,
    reviewsCount: 0,
    walletBalance: 2000, // Initial free student credits to let them buy goods/tutoring
    earnings: 0,
    joinedAt: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    githubUrl: profile.githubUrl || "",
    portfolioUrl: profile.portfolioUrl || ""
  };

  try {
    await setDoc(doc(db, "profiles", uid), fullProfile);
    return fullProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function updateUserProfileInDb(uid: string, fields: Partial<UserProfile>): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    const docRef = doc(db, "profiles", uid);
    await updateDoc(docRef, fields);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// =========================================================================
// REAL-TIME BROADCAST SUBSCRIPTIONS
// =========================================================================

export function subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const path = `profiles/${uid}`;
  return onSnapshot(doc(db, "profiles", uid), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      callback(null);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
  });
}

export function subscribePeers(callback: (profiles: UserProfile[]) => void) {
  const path = "profiles";
  const q = query(collection(db, "profiles"));
  return onSnapshot(q, (snap) => {
    const list: UserProfile[] = [];
    snap.forEach((d) => {
      list.push(d.data() as UserProfile);
    });
    // Sort alphabetically by name
    list.sort((a, b) => a.name.localeCompare(b.name));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export function subscribeProducts(callback: (products: ProductListing[]) => void) {
  const p = "products";
  const q = query(collection(db, p));
  return onSnapshot(q, (snap) => {
    const list: ProductListing[] = [];
    snap.forEach((d) => {
      list.push(d.data() as ProductListing);
    });
    // Sort reverse-chronologically by creation or id
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, p);
  });
}

export function subscribeAssignments(callback: (assignments: Assignment[]) => void) {
  const path = "assignments";
  const q = query(collection(db, path));
  return onSnapshot(q, (snap) => {
    const list: Assignment[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Assignment);
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export function subscribeCollabs(callback: (collabs: TeamMemberRequest[]) => void) {
  const path = "collabs";
  const q = query(collection(db, path));
  return onSnapshot(q, (snap) => {
    const list: TeamMemberRequest[] = [];
    snap.forEach((d) => {
      list.push(d.data() as TeamMemberRequest);
    });
    // Sort reverse chronologically
    list.sort((a, b) => b.id.localeCompare(a.id));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export function subscribeForums(callback: (forums: ForumPost[]) => void) {
  const path = "forums";
  const q = query(collection(db, path));
  return onSnapshot(q, (snap) => {
    const list: ForumPost[] = [];
    snap.forEach((d) => {
      list.push(d.data() as ForumPost);
    });
    // Sort by likes or createdAt info
    list.sort((a, b) => b.id.localeCompare(a.id));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export function subscribeChats(uid: string, callback: (chats: ChatThread[]) => void) {
  const path = "chats";
  // Filter where members array includes this user
  const q = query(collection(db, path), where("memberUids", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    const list: ChatThread[] = [];
    snap.forEach((d) => {
      list.push(d.data() as ChatThread);
    });
    list.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export function subscribeMessages(chatId: string, callback: (msgs: ChatMessage[]) => void) {
  const path = `chats/${chatId}/messages`;
  const q = query(collection(db, "chats", chatId, "messages"));
  return onSnapshot(q, (snap) => {
    const list: ChatMessage[] = [];
    snap.forEach((d) => {
      list.push(d.data() as ChatMessage);
    });
    list.sort((a, b) => a.id.localeCompare(b.id)); // message timeline
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export function subscribeTransactions(uid: string, callback: (txs: WalletTransaction[]) => void) {
  const path = "transactions";
  const q = query(collection(db, path), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const list: WalletTransaction[] = [];
    snap.forEach((d) => {
      list.push(d.data() as WalletTransaction);
    });
    list.sort((a, b) => b.id.localeCompare(a.id));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export interface InternshipInteraction {
  id: string;
  userId: string;
  internshipId: string;
  applied: boolean;
  saved: boolean;
  status?: string;
  updatedAt: string;
}

export function subscribeInternships(callback: (listings: InternshipListing[]) => void) {
  const path = "internships";
  const q = query(collection(db, path));
  return onSnapshot(q, (snap) => {
    const list: InternshipListing[] = [];
    snap.forEach((d) => {
      list.push(d.data() as InternshipListing);
    });
    list.sort((a, b) => a.id.localeCompare(b.id));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export function subscribeInternshipInteractions(uid: string, callback: (interactions: InternshipInteraction[]) => void) {
  const path = "internship_interactions";
  const q = query(collection(db, path), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const list: InternshipInteraction[] = [];
    snap.forEach((d) => {
      list.push(d.data() as InternshipInteraction);
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, path);
  });
}

export async function setInternshipInteractionInDb(userId: string, internshipId: string, updates: Partial<InternshipInteraction>) {
  const id = `${userId}_${internshipId}`;
  const path = `internship_interactions/${id}`;
  try {
    const docRef = doc(db, "internship_interactions", id);
    const snap = await getDoc(docRef);
    const timeString = new Date().toISOString();
    
    if (snap.exists()) {
      await updateDoc(docRef, {
        ...updates,
        updatedAt: timeString
      });
    } else {
      const initial: InternshipInteraction = {
        id,
        userId,
        internshipId,
        applied: updates.applied ?? false,
        saved: updates.saved ?? false,
        status: updates.status,
        updatedAt: timeString
      };
      await setDoc(docRef, initial);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// =========================================================================
// DATA WRITE COMMANDS
// =========================================================================

export async function addProductToDb(newListing: Partial<ProductListing>) {
  const path = "products";
  try {
    const id = `prod_${Date.now()}`;
    const product = { ...newListing, id, createdAt: new Date().toISOString() };
    await setDoc(doc(db, "products", id), product);
    return product;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function buyProductInDb(product: ProductListing, buyerProfile: UserProfile) {
  const path = `products/${product.id}`;
  try {
    const batch = writeBatch(db);
    
    // Update product status
    const prodRef = doc(db, "products", product.id);
    batch.update(prodRef, { status: "Sold" });

    // Deduct buyer balance
    const buyerRef = doc(db, "profiles", buyerProfile.id);
    batch.update(buyerRef, { walletBalance: buyerProfile.walletBalance - product.price });

    // Create wallet record in transactions
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, "transactions", txId);
    batch.set(txRef, {
      id: txId,
      userId: buyerProfile.id,
      amount: product.price,
      type: "Debit",
      description: `Bought product: ${product.title}`,
      status: "Completed",
      createdAt: new Date().toISOString().split("T")[0]
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProductFromDb(prodId: string) {
  const path = `products/${prodId}`;
  try {
    await deleteDoc(doc(db, "products", prodId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addAssignmentToDb(assign: Partial<Assignment>) {
  const path = "assignments";
  try {
    const id = `assign_${Date.now()}`;
    const assignment = { ...assign, id, proposals: [] };
    await setDoc(doc(db, "assignments", id), assignment);
    return assignment;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function submitProposalToDb(assignId: string, updatedProposals: any[]) {
  const path = `assignments/${assignId}`;
  try {
    await updateDoc(doc(db, "assignments", assignId), {
      proposals: updatedProposals
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function acceptProposalInDb(assignId: string, propId: string): Promise<void> {
  const path = `assignments/${assignId}`;
  try {
    const docRef = doc(db, "assignments", assignId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Assignment;
      const proposals = data.proposals.map(p => {
        if (p.id === propId) {
          return { ...p, status: "Accepted" as const };
        } else {
          return { ...p, status: "Rejected" as const };
        }
      });
      const acceptedProp = data.proposals.find(p => p.id === propId);
      await updateDoc(docRef, {
        proposals,
        status: "Assigned",
        assignedExpertId: acceptedProp?.expertId
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function addCollabToDb(collab: Partial<TeamMemberRequest>) {
  const path = "collabs";
  try {
    const id = `col_${Date.now()}`;
    const data = { ...collab, id, createdAt: new Date().toISOString().split('T')[0] };
    await setDoc(doc(db, "collabs", id), data);
    return data;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function joinCollabInDb(collabId: string, currentCount: number) {
  const path = `collabs/${collabId}`;
  try {
    await updateDoc(doc(db, "collabs", collabId), {
      membersCount: currentCount + 1
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function addForumPostToDb(post: Partial<ForumPost>) {
  const path = "forums";
  try {
    const id = `post_${Date.now()}`;
    const data = { ...post, id, likes: 0, likedByUsers: [], replies: 0, createdAt: new Date().toISOString() };
    await setDoc(doc(db, "forums", id), data);
    return data;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function likeForumPostInDb(postId: string, likedByUsers: string[], currentLikes: number) {
  const path = `forums/${postId}`;
  try {
    await updateDoc(doc(db, "forums", postId), {
      likedByUsers,
      likes: currentLikes
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createChatThreadInDb(sender: UserProfile, recipientId: string, recipientName: string, recipientAvatar: string, recipientRole: string) {
  const chatId = [sender.id, recipientId].sort().join("_");
  const path = `chats/${chatId}`;
  try {
    const threadRef = doc(db, "chats", chatId);
    const snap = await getDoc(threadRef);
    if (!snap.exists()) {
      const newThread: ChatThread = {
        id: chatId,
        participantId: recipientId,
        participantName: recipientName,
        participantAvatar: recipientAvatar,
        participantRole: recipientRole,
        lastMessage: "Conversation initiated.",
        lastMessageAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        memberUids: [sender.id, recipientId],
        memberDetails: {
          [sender.id]: {
            name: sender.name,
            avatar: sender.avatar,
            role: sender.role
          },
          [recipientId]: {
            name: recipientName,
            avatar: recipientAvatar,
            role: recipientRole
          }
        }
      };
      await setDoc(threadRef, newThread);
    }
    return chatId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    return chatId;
  }
}

export async function sendChatMessageToDb(chatId: string, sender: UserProfile, text: string, fileUrl = "", fileName = "") {
  const path = `chats/${chatId}/messages`;
  try {
    const msgId = `msg_${Date.now()}`;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg: ChatMessage = {
      id: msgId,
      chatId,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      text,
      createdAt: timeString,
      fileUrl,
      fileName
    };
    
    // Write message
    await setDoc(doc(db, "chats", chatId, "messages", msgId), msg);

    // Update conversation summary
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: fileUrl ? `📎 File: ${fileName || "Attachment"}` : text,
      lastMessageAt: timeString,
      lastSenderId: sender.id,
      lastSenderName: sender.name,
      lastSenderAvatar: sender.avatar
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function depositIntoWalletInDb(userId: string, currentBalance: number, topupAmount: number) {
  const path = "transactions";
  try {
    const batch = writeBatch(db);

    // Update profile balance
    const profileRef = doc(db, "profiles", userId);
    batch.update(profileRef, { walletBalance: currentBalance + topupAmount });

    // Create transaction log
    const txId = `tx_${Date.now()}`;
    const txRef = doc(db, "transactions", txId);
    batch.set(txRef, {
      id: txId,
      userId,
      amount: topupAmount,
      type: "Credit",
      description: "Deposited secured wallet funds via Campus razorpay gateway",
      status: "Completed",
      createdAt: new Date().toISOString().split("T")[0]
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeAiChats(uid: string, callback: (messages: { role: "user" | "model", text: string, category?: string }[]) => void) {
  const path = `profiles/${uid}/ai_chats`;
  const q = query(collection(db, "profiles", uid, "ai_chats"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const list: { role: "user" | "model", text: string, category?: string }[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      list.push({
        role: data.role as "user" | "model",
        text: data.text,
        category: data.category
      });
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function addAiChatMessageToDb(uid: string, category: string, role: "user" | "model", text: string) {
  const path = `profiles/${uid}/ai_chats`;
  try {
    const msgId = `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msg = {
      id: msgId,
      userId: uid,
      category,
      role,
      text,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "profiles", uid, "ai_chats", msgId), msg);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function clearAiChatHistoryInDb(uid: string) {
  const path = `profiles/${uid}/ai_chats`;
  try {
    const q = query(collection(db, "profiles", uid, "ai_chats"));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

