import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    })
  : null;

// ==========================================
// IN-MEMORY DATABASE STATE (FOR DISKLESS/STATEFUL SIMULATION)
// ==========================================

let userProfile = {
  id: "std_42",
  name: "Alex Rivera",
  email: "dinesh226580@gmail.com",
  role: "Student",
  avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
  skills: ["React", "TypeScript", "Node.js", "Python", "Data Structures", "Tailwind CSS"],
  bio: "Senior Computer Science student at Metro State. Passionate about building developer tools and full-stack campus apps. Looking for senior capstone teammates and freelance tutoring gigs.",
  major: "Computer Science",
  university: "Metro State University",
  rating: 4.8,
  reviewsCount: 14,
  walletBalance: 250.00,
  earnings: 1120.00,
  githubUrl: "https://github.com/alexrivera",
  portfolioUrl: "https://alexrivera.dev",
  joinedAt: "Sept 2024"
};

let products = [
  {
    id: "prod_1",
    title: "Cracking the Coding Interview (6th Edition)",
    description: "Essential book for tech recruiting. Has some pencil annotations, but otherwise clean pages. Selling because I just landed my internship!",
    category: "Books",
    price: 25.00,
    condition: "Like New",
    sellerId: "seller_1",
    sellerName: "Marcus Vance",
    sellerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400",
    status: "Available",
    createdAt: "2026-06-10"
  },
  {
    id: "prod_2",
    title: "TI-84 Plus CE Graphing Calculator",
    description: "Slightly scratch on back, screen and rechargeable battery are in perfect condition. Charger and cable included. Used for Calculus II and Engineering Physics.",
    category: "Calculators",
    price: 60.00,
    condition: "Good",
    sellerId: "seller_2",
    sellerName: "Emily Zhao",
    sellerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=400",
    status: "Available",
    createdAt: "2026-06-11"
  },
  {
    id: "prod_3",
    title: "Sony WH-1000XM4 Noise Canceling Headphones",
    description: "Incredible active noise canceling headphones. Great for studying in the bustling student union. Comes with original case, 3.5mm plug, and USBC cord.",
    category: "Electronics",
    price: 130.00,
    condition: "Good",
    sellerId: "seller_3",
    sellerName: "Jordan K.",
    sellerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400",
    status: "Available",
    createdAt: "2026-06-12"
  },
  {
    id: "prod_4",
    title: "Digital Design & RTL Synthesis Study Guide",
    description: "Comprehensive notes covering Karnaugh maps, state machines, Verilog RTL code snippets, and setup/hold time analysis. Saved me in ECE 302.",
    category: "Study Materials",
    price: 10.00,
    condition: "New",
    sellerId: "seller_4",
    sellerName: "Prof. Alan Turing",
    sellerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
    imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400",
    status: "Available",
    createdAt: "2026-06-12"
  }
];

let assignments = [
  {
    id: "assign_1",
    title: "Operating Systems - Nachos Project Part 1",
    description: "Need guidance setting up thread synchronization and semaphores inside Nachos environment strictly in C++. Code is partially complete but hitting lock deadlocks.",
    subject: "Computer Science",
    budget: 80.00,
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
        bidAmount: 75.00,
        deliveryTime: "3 days",
        coverLetter: "Hi! I have extensive experience with Nachos and MINIX kernels. I can guide you through implementing the Priority Scheduler and solving deadlocks.",
        status: "Pending"
      },
      {
        id: "prop_2",
        expertId: "std_42", // User profile
        expertName: "Alex Rivera",
        expertAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
        expertRating: 4.8,
        bidAmount: 80.00,
        deliveryTime: "2 days",
        coverLetter: "Hey Tyler, I aced OS last semester with an A+. I know standard lock pitfalls inside the Nachos kernel like the back of my hand. Let me help!",
        status: "Pending"
      }
    ]
  },
  {
    id: "assign_2",
    title: "Database Normalization and SQL Optimization Guide",
    description: "Looking for an expert mentor to conduct a 1-hour workshop on 1NF, 2NF, 3NF, BCNF, and index query execution plan optimization.",
    subject: "Information Technology",
    budget: 40.00,
    deadline: "June 20, 2026",
    userId: "buyer_15",
    userName: "Nisha Patel",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    status: "Open",
    proposals: []
  }
];

let collabs = [
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
    status: "Open",
    createdAt: "2026-06-11"
  },
  {
    id: "col_2",
    title: "Eco-Friendly Textbook Sharing Portal",
    projectDescription: "Creating a localized WebApp for college textbook rotation. Need a solid frontend React designer to match wireframes and styles.",
    requiredSkills: ["React", "CSS/Tailwind", "Figma", "UI/UX Design"],
    creatorId: "creator_5",
    creatorName: "Siddharth Verma",
    creatorAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150",
    membersCount: 1,
    membersLimit: 2,
    status: "Open",
    createdAt: "2026-06-12"
  }
];

let chats = [
  {
    id: "chat_1",
    participantId: "seller_2",
    participantName: "Emily Zhao",
    participantAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    participantRole: "Seller (Calculators)",
    lastMessage: "Is ₹55 okay with you for the TI-84 Plus CE?",
    lastMessageAt: "10:32 AM",
    unreadCount: 1,
    messages: [
      {
        id: "msg_1",
        chatId: "chat_1",
        senderId: "std_42",
        senderName: "Alex Rivera",
        senderAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
        text: "Hi Emily, is the TI-84 calculator still available?",
        createdAt: "10:30 AM"
      },
      {
        id: "msg_2",
        chatId: "chat_1",
        senderId: "seller_2",
        senderName: "Emily Zhao",
        senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
        text: "Yes, it is! It is in fully working order.",
        createdAt: "10:31 AM"
      },
      {
        id: "msg_3",
        chatId: "chat_1",
        senderId: "seller_2",
        senderName: "Emily Zhao",
        senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
        text: "Is ₹55 okay with you for the TI-84 Plus CE?",
        createdAt: "10:32 AM"
      }
    ]
  },
  {
    id: "chat_2",
    participantId: "admin_hub",
    participantName: "Campus System Support",
    participantAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150",
    participantRole: "System Admin",
    lastMessage: "Welcome to Trade Tutor! Go in 'Wallet' tab to deposit mock credits.",
    lastMessageAt: "Yesterday",
    unreadCount: 0,
    messages: [
      {
        id: "msg_4",
        chatId: "chat_2",
        senderId: "admin_hub",
        senderName: "System",
        senderAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150",
        text: "Welcome to Trade Tutor! Explore assignments, trade goods, connect with project teammates and use our server-side Gemini powered tutor.",
        createdAt: "Yesterday"
      }
    ]
  }
];

let internships = [
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
    applied: false,
    saved: true,
    status: "Saved",
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
    applied: false,
    saved: false,
    status: undefined,
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
    applied: false,
    saved: false,
    status: undefined,
    createdAt: "2026-06-12"
  }
];

let forumPosts = [
  {
    id: "post_1",
    title: "Who wants to team up for the MetroHacks 2026 Hackathon?",
    category: "Hackathons",
    content: "Hi everyone! Main theme is 'AI in Local Communities'. I have a solid Express back-end setup built and ready. Looking for a frontend designer who can crank out beautiful tailwind overlays and dashboards inside 36 hours. Let's draft a proposal in the next chat!",
    authorName: "Marcus Vance",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    authorRole: "Student",
    likes: 12,
    likedByUser: false,
    replies: 5,
    createdAt: "2026-06-11 11:20 AM"
  },
  {
    id: "post_2",
    title: "Review of CS 480 (Artificial Intelligence) Study Guides",
    category: "Discussions",
    content: "Prof. Jordan just posted study outlines for the recursive adversarial state search / Minimax trees exam next Tuesday. I summarized the alpha-beta pruning rules into a quick cheat-sheet. Reply here or ping me directly in the marketplace study-materials if you want the PDF reference!",
    authorName: "Alex Rivera",
    authorAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
    authorRole: "Student",
    likes: 24,
    likedByUser: true,
    replies: 8,
    createdAt: "2026-06-12 02:40 PM"
  }
];

let transactionHistory = [
  {
    id: "tx_1",
    amount: 15.00,
    type: "Credit",
    description: "Sold study notes: Advanced Algorithms Cheat-sheet",
    status: "Completed",
    createdAt: "2026-06-05"
  },
  {
    id: "tx_2",
    amount: 120.00,
    type: "Credit",
    description: "Completed Tutoring: OS Lock Thread Synchronization",
    status: "Completed",
    createdAt: "2026-06-09"
  },
  {
    id: "tx_3",
    amount: 50.00,
    type: "Debit",
    description: "Withdrew to external bank account",
    status: "Completed",
    createdAt: "2026-06-11"
  }
];


// ==========================================
// REST API SYSTEM ROUTES
// ==========================================

// Authenticated User Info
app.get("/api/auth/me", (req, res) => {
  res.json({ status: "success", profile: userProfile });
});

app.put("/api/auth/profile", (req, res) => {
  const { name, bio, skills, major, university, githubUrl, portfolioUrl } = req.body;
  if (name) userProfile.name = name;
  if (bio) userProfile.bio = bio;
  if (skills && Array.isArray(skills)) userProfile.skills = skills;
  if (major) userProfile.major = major;
  if (university) userProfile.university = university;
  if (githubUrl !== undefined) userProfile.githubUrl = githubUrl;
  if (portfolioUrl !== undefined) userProfile.portfolioUrl = portfolioUrl;
  res.json({ status: "success", profile: userProfile });
});

// Products Marketplace APIs
app.get("/api/products", (req, res) => {
  res.json({ status: "success", products });
});

app.post("/api/products", (req, res) => {
  const { title, description, category, price, condition, imageUrl } = req.body;
  if (!title || !price || !category) {
    return res.status(400).json({ status: "error", message: "Missing required fields" });
  }
  const newProduct = {
    id: `prod_${Date.now()}`,
    title,
    description: description || "No description provided.",
    category,
    price: Number(price),
    condition: condition || "Good",
    sellerId: userProfile.id,
    sellerName: userProfile.name,
    sellerAvatar: userProfile.avatar,
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400",
    status: "Available",
    createdAt: new Date().toISOString().split('T')[0]
  };
  // @ts-ignore
  products.unshift(newProduct);
  res.json({ status: "success", product: newProduct });
});

app.post("/api/products/:id/buy", (req, res) => {
  const prod = products.find(p => p.id === req.params.id);
  if (!prod) {
    return res.status(404).json({ status: "error", message: "Product listing not found" });
  }
  if (prod.status === "Sold") {
    return res.status(400).json({ status: "error", message: "Product is already sold" });
  }
  if (userProfile.walletBalance < prod.price) {
    return res.status(400).json({ status: "error", message: "Insufficient wallet balance! Please add funds in the Wallet tab." });
  }

  // Update product state
  prod.status = "Sold";
  
  // Deduct wallet, log transaction
  userProfile.walletBalance -= prod.price;
  // @ts-ignore
  transactionHistory.unshift({
    id: `tx_${Date.now()}`,
    amount: prod.price,
    type: "Debit",
    description: `Bought product: ${prod.title}`,
    status: "Completed",
    createdAt: new Date().toISOString().split('T')[0]
  });

  res.json({ status: "success", message: "Product purchased in escrow state successfully!", profile: userProfile });
});

app.delete("/api/products/:id", (req, res) => {
  products = products.filter(p => p.id !== req.params.id);
  res.json({ status: "success", message: "Product removed." });
});

// Assignments Marketplace
app.get("/api/assignments", (req, res) => {
  res.json({ status: "success", assignments });
});

app.post("/api/assignments", (req, res) => {
  const { title, description, subject, budget, deadline } = req.body;
  if (!title || !budget) return res.status(400).json({ status: "error", message: "Missing required details" });
  
  const newAssign = {
    id: `assign_${Date.now()}`,
    title,
    description: description || "",
    subject: subject || "General Academic",
    budget: Number(budget),
    deadline: deadline || "flexible",
    userId: userProfile.id,
    userName: userProfile.name,
    userAvatar: userProfile.avatar,
    status: "Open" as const,
    proposals: []
  };

  assignments.unshift(newAssign);
  res.json({ status: "success", assignment: newAssign });
});

app.post("/api/assignments/:id/proposals", (req, res) => {
  const assign = assignments.find(a => a.id === req.params.id);
  if (!assign) return res.status(404).json({ status: "error", message: "Assignment not found" });
  
  const { price, coverLetter } = req.body;
  
  const newProposal = {
    id: `prop_${Date.now()}`,
    expertId: userProfile.id,
    expertName: userProfile.name,
    expertAvatar: userProfile.avatar,
    expertRating: userProfile.rating,
    bidAmount: Number(price) || assign.budget,
    deliveryTime: "3 Days",
    coverLetter: coverLetter || "I can guide you perfectly on this assignment.",
    status: "Pending" as const
  };

  assign.proposals.push(newProposal);
  res.json({ status: "success", proposal: newProposal });
});

// Team Finder Collabs
app.get("/api/collabs", (req, res) => {
  res.json({ status: "success", collabs });
});

app.post("/api/collabs", (req, res) => {
  const { title, projectDescription, requiredSkills, membersLimit } = req.body;
  if (!title) return res.status(400).json({ status: "error", message: "Project title required" });

  const newCollab = {
    id: `col_${Date.now()}`,
    title,
    projectDescription: projectDescription || "",
    requiredSkills: requiredSkills || [],
    creatorId: userProfile.id,
    creatorName: userProfile.name,
    creatorAvatar: userProfile.avatar,
    membersCount: 1,
    membersLimit: Number(membersLimit) || 3,
    status: "Open" as const,
    createdAt: new Date().toISOString().split('T')[0]
  };

  collabs.unshift(newCollab);
  res.json({ status: "success", collab: newCollab });
});

// Internship Tracking
app.get("/api/internships", (req, res) => {
  res.json({ status: "success", internships });
});

app.post("/api/internships/:id/apply", (req, res) => {
  const job = internships.find(i => i.id === req.params.id);
  if (!job) return res.status(404).json({ status: "error", message: "Opportunity not found" });
  
  job.applied = true;
  job.status = "Applied";
  res.json({ status: "success", job });
});

app.post("/api/internships/:id/save", (req, res) => {
  const job = internships.find(i => i.id === req.params.id);
  if (!job) return res.status(404).json({ status: "error", message: "Opportunity not found" });
  
  job.saved = !job.saved;
  job.status = job.saved ? "Saved" : undefined;
  res.json({ status: "success", job });
});

// Chats
app.get("/api/chats", (req, res) => {
  res.json({ status: "success", chats });
});

app.post("/api/chats/:id/messages", (req, res) => {
  const thread = chats.find(c => c.id === req.params.id);
  if (!thread) return res.status(404).json({ status: "error", message: "Thread not found" });

  const { text, fileUrl, fileName } = req.body;
  const newMsg = {
    id: `msg_${Date.now()}`,
    chatId: thread.id,
    senderId: userProfile.id,
    senderName: userProfile.name,
    senderAvatar: userProfile.avatar,
    text: text || "",
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    fileUrl,
    fileName
  };

  thread.messages.push(newMsg);
  thread.lastMessage = fileUrl ? `📎 File: ${fileName || "Uploaded attachment"}` : text;
  thread.lastMessageAt = newMsg.createdAt;
  thread.unreadCount = 0;

  // Let's create an auto-reply simulation for demo value!
  if (thread.participantId === "seller_2" && (text.toLowerCase().includes("$55") || text.toLowerCase().includes("₹55") || text.toLowerCase().includes("55"))) {
    setTimeout(() => {
      const npcMsg = {
        id: `msg_${Date.now() + 1}`,
        chatId: thread.id,
        senderId: "seller_2",
        senderName: "Emily Zhao",
        senderAvatar: thread.participantAvatar,
        text: "That works for me! Let's meet at the Student Library ground floor near the coffee shop tomorrow at 1:00 PM. Please approve the escrow payment inside the 'Wallet' dashboard. Thanks!",
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      thread.messages.push(npcMsg);
      thread.lastMessage = npcMsg.text;
      thread.lastMessageAt = npcMsg.createdAt;
    }, 1200);
  }

  res.json({ status: "success", thread });
});

// Community Board
app.get("/api/forums", (req, res) => {
  res.json({ status: "success", forumPosts });
});

app.post("/api/forums", (req, res) => {
  const { title, category, content } = req.body;
  if (!title || !content) return res.status(400).json({ status: "error", message: "Title and content are required" });

  const newPost = {
    id: `post_${Date.now()}`,
    title,
    category: category || "General",
    content,
    authorName: userProfile.name,
    authorAvatar: userProfile.avatar,
    authorRole: userProfile.role,
    likes: 0,
    likedByUser: false,
    replies: 0,
    createdAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  // @ts-ignore
  forumPosts.unshift(newPost);
  res.json({ status: "success", post: newPost });
});

app.post("/api/forums/:id/like", (req, res) => {
  const post = forumPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ status: "error", message: "Post not found" });

  post.likedByUser = !post.likedByUser;
  post.likes += post.likedByUser ? 1 : -1;
  res.json({ status: "success", post });
});

// Transaction & Wallet Topup
app.get("/api/wallet/transactions", (req, res) => {
  res.json({ status: "success", transactions: transactionHistory });
});

app.post("/api/wallet/deposit", (req, res) => {
  const { amount } = req.body;
  const numAmnt = Number(amount);
  if (isNaN(numAmnt) || numAmnt <= 0) return res.status(400).json({ status: "error", message: "Valid amount is required" });

  userProfile.walletBalance += numAmnt;
  
  // Create logged transaction
  transactionHistory.unshift({
    id: `tx_${Date.now()}`,
    amount: numAmnt,
    type: "Credit",
    description: "Deposited via Razorpay secure integration gateway simulation",
    status: "Completed",
    createdAt: new Date().toISOString().split('T')[0]
  });

  res.json({ status: "success", profile: userProfile });
});


// ==========================================
// GEMINI SERVER-SIDE AI ASSISTANT ENDPOINT
// ==========================================

async function callGeminiWithFallback(aiInstance: GoogleGenAI, prompt: string, systemInstruction: string) {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini API] Fast generation attempt. Model: ${model}`);
      const response = await aiInstance.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      if (response && response.text) {
        return {
          reply: response.text,
          modelUsed: model
        };
      }
      throw new Error("Empty text response received from Gemini API");
    } catch (error: any) {
      lastError = error;
      console.warn(`[Gemini API Warning] Model ${model} failed:`, error.message || error);
      // Immediately move to the next model in the list with zero wait delay for maximum speed
    }
  }

  throw lastError || new Error("Failed to process request with any of the available models.");
}

app.post("/api/ai/chat", async (req, res) => {
  if (!process.env.GEMINI_API_KEY || !ai) {
    return res.status(503).json({ 
      status: "error", 
      message: "Gemini API Master Key is not configured in Secrets panel. Please instruct the user to configure process.env.GEMINI_API_KEY in Settings." 
    });
  }

  const { prompt, category, contextData } = req.body;
  if (!prompt) {
    return res.status(400).json({ status: "error", message: "Missing instruction prompt" });
  }

  // Inject professional contextual system instructions according to category
  let systemInstruction = "You are Trade Tutor Expert AI, a helpful, deeply knowledgeable academic assistant for college students.";
  
  if (category === "resume-builder") {
    systemInstruction = `You are a Career Path and Resume Designer. 
Your goal is to help college students structure highly compelling resumes tailored for tech and corporate roles.
Analyze their inputs, structure them into Markdown code-blocks matching high-standard industry formats, and provide concrete bullet improvements using the STAR methodology (Situation, Task, Action, Result). 
Be concise, practical, and highly strategic. Use clean formatting.`;
  } else if (category === "career-advisor") {
    systemInstruction = `You are an elite Career Mentor and Coach.
Help students map out personalized engineering, product management, or design career trajectories. 
Provide roadmap actions, certification guidelines, stack priorities, interview prep blueprints, and recommended portfolios.
Adopt a highly encouraging, informative, professional tone. Avoid generic fluff.`;
  } else if (category === "study-assistant") {
    systemInstruction = `You are an absolute expert Academic Tutor specializing in STEM fields (Computer Science, Engineering, Mathematics, Physics).
Provide clean explanations, code examples (with markdown highlights), mathematical formulations, and detailed problem breakdowns.
Ensure your answers are mathematically and logically sound, intuitive, and educational.`;
  } else if (category === "project-generator") {
    systemInstruction = `You are an elite Tech Architect and Project Planner.
Generate outstanding full-stack capstone and side project ideas that make student portfolios pop.
For any idea you generate, supply:
- A descriptive title
- Visual/design guidelines
- Complete Recommended Stack (Frontend, Backend, DB, Hosting)
- 3 core modules to build first
- Architectural breakdown of data flows`;
  } else if (category === "interview-prep") {
    systemInstruction = `You are a Senior Technical Engineering Interviewer.
Conduct coding, algorithms, design, or behavioral mock interview reviews. Let the user answer questions or ask you to drill down into subjects.
Supply clear review rubrics, key architectural traps to avoid, and exact code templates when discussing LeetCode-style or system-design questions.`;
  }

  try {
    const result = await callGeminiWithFallback(ai, prompt, systemInstruction);

    res.json({
      status: "success",
      reply: result.reply,
      modelUsed: result.modelUsed
    });
  } catch (error: any) {
    console.error("Gemini API Error after all attempts:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to interact with Gemini API. Check telemetry console or billing settings."
    });
  }
});


// ==========================================
// METADATA & DOCUMENTATION API HUD ENDPOINT
// ==========================================

app.get("/api/docs/specifications", (req, res) => {
  res.json({
    status: "success",
    appVersion: "1.0.0",
    docs: {
      prd: "Trade Tutor is a comprehensive peer-to-peer ecosystem designed exclusively for college campuses to alleviate academic, resource, and professional friction. By merging a secure college goods marketplace, an escrowed assignment guidance center, teammate/mentor search tools, Google Gemini AI tutoring, and simulated Razorpay payments, it empowers students with unified tools to thrive.",
      databaseEngine: "PostgreSQL Database Model using Prisma ORM",
      securityFramework: "JSON Web Tokens (JWT) inside auth cookies, role-based access control (RBAC), sanitized database queries preventing SQLi, and in-memory rate-limiting",
      devopsStrategy: "Multi-stage Dockerfile bundling Vite assets and compiling Express/TS via esbuild with automated GitHub Actions testing CI pipelines."
    }
  });
});


// ==========================================
// VITE AND STATIC ASSETS HANDLER
// ==========================================

const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in static production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // @ts-ignore
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Trade Tutor Backend Server operational on http://0.0.0.0:${PORT}`);
  });
};

startServer();
