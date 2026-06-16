export interface QueueShip {
  id: number;
  projectTitle: string;
  projectShipIdLabel: string;
  ownerDisplayName: string;
  ageText: string;
  status: 'pending' | 'approved' | 'returned';
  hasBadReview: boolean;
  claimState: 'open' | 'locked' | null;
  claimReviewerDisplayName: string;
  claimExpiresAt: string | null;
  isOwnProject: boolean;
  projectType: string;
  screenshotUrl?: string | null;
  waitingHours?: number;
}

export interface QueueStats {
  net_flow: number;
  net_positive: boolean;
  pending: number;
  oldest_waiting_text: string;
  oldest_waiting_id: number | null;
  approval_rate: number | null;
  decisions_this_week: number;
  overdue_pending: number;
  approved: number;
  returned: number;
  decided: number;
}

export interface LeaderboardRow {
  position: number;
  name: string;
  count: number;
}

export interface QueueData {
  stats: QueueStats;
  leaderboards: Record<string, LeaderboardRow[]>;
  ships: QueueShip[];
  status: string;
  sort: string;
}

export interface ReviewOwner {
  displayName: string;
  slackUserId: string;
  age: number | null;
  country: string | null;
  avatarUrl: string | null;
}

export interface ReviewProject {
  projectId: number;
  title: string;
  description: string;
  projectType: string;
  screenshotUrl: string | null;
  playableUrl: string | null;
  repoUrl: string | null;
  readmeUrl: string | null;
}

export interface TimelineEvent {
  id: number;
  title: string;
  status: string;
  date: string;
  reviewerName: string;
  feedback: string;
}

export interface ReviewClaim {
  heldByMe: boolean;
  expiresAt: string | null;
  action: string;
  method: string;
  authenticityToken: string;
}

export interface ReviewDetail {
  id: number;
  projectTitle: string;
  status: string;
  momentum: {
    count: number;
    label: string;
  };
  description: string;
  aiDeclaration: string;
  links: Record<string, string>;
  submissionMeta: Record<string, string>;
  returnedAlert: {
    by: string;
    reason: string;
  } | null;
  claim: ReviewClaim;
  owner: ReviewOwner;
  project: ReviewProject;
  hackatimeHours: number | null;
  joeFraudPassed: boolean | null;
  joeTrustScore: number | null;
  timeline: TimelineEvent[];
}

export interface GitHubRepo {
  repoUrl: string;
  fullName: string;
  stars: number;
  forks: number;
  openIssues: number;
  pullRequests: number;
  language: string | null;
  license: string | null;
  createdAt: string;
  pushedAt: string;
  commits: {
    sha: string;
    message: string;
    author: string;
    date: string;
  }[];
}

export interface ChecklistState {
  checkedItems: number[];
}

export interface NotesState {
  projectNote: string;
  userNote: string;
}

export interface MyStats {
  stats: {
    total: number;
    approved: number;
    returned: number;
    approvalRate: number | null;
    unclaimed: number;
    pendingPayout: string | null;
  };
  history: {
    id: number;
    title: string;
    status: string;
    amount: number;
    isPayout: boolean;
    date: string;
  }[];
}
