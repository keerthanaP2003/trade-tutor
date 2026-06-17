export enum UserRole {
  STUDENT = "Student",
  MENTOR = "Mentor",
  ASSIGNMENT_EXPERT = "Assignment Expert",
  SELLER = "Seller",
  BUYER = "Buyer",
  ADMIN = "Admin"
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  skills: string[];
  bio: string;
  major: string;
  university: string;
  rating: number;
  reviewsCount: number;
  walletBalance: number;
  earnings: number;
  githubUrl?: string;
  portfolioUrl?: string;
  joinedAt: string;
}

export interface ListingCategory {
  id: string;
  name: string;
}

export interface ProductListing {
  id: string;
  title: string;
  description: string;
  category: "Books" | "Calculators" | "Electronics" | "Study Materials";
  price: number;
  condition: "New" | "Like New" | "Good" | "Fair";
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  imageUrl: string;
  status: "Available" | "Sold" | "Reserved";
  createdAt: string;
}

export interface AssignmentProposal {
  id: string;
  expertId: string;
  expertName: string;
  expertAvatar: string;
  expertRating: number;
  bidAmount: number;
  deliveryTime: string;
  coverLetter: string;
  status: "Pending" | "Accepted" | "Rejected";
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  budget: number;
  deadline: string;
  userId: string;
  userName: string;
  userAvatar: string;
  proposals: AssignmentProposal[];
  status: "Open" | "Assigned" | "Completed";
  assignedExpertId?: string;
}

export interface TeamMemberRequest {
  id: string;
  title: string;
  projectDescription: string;
  requiredSkills: string[];
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  membersCount: number;
  membersLimit: number;
  status: "Open" | "Full";
  createdAt: string;
  deadline?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  fileUrl?: string;
  fileName?: string;
}

export interface ChatThread {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  memberUids?: string[];
  memberDetails?: {
    [uid: string]: {
      name: string;
      avatar: string;
      role: string;
    };
  };
}

export interface InternshipListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "Full-time" | "Part-time" | "Remote" | "Hybrid";
  duration: string;
  stipend: string;
  requirements: string[];
  description: string;
  applied?: boolean;
  saved?: boolean;
  status?: "Applied" | "Interviewing" | "Offered" | "Rejected" | "Saved";
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  category: "General" | "Discussions" | "Events" | "Hackathons";
  content: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  likes: number;
  likedByUser: boolean;
  likedByUsers?: string[];
  replies: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: "Credit" | "Debit";
  description: string;
  status: "Completed" | "Pending" | "Refunded";
  createdAt: string;
}
