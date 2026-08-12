export type ExportStatus =
  | 'queued'
  | 'processing'
  | 'rendering'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'deleting';

export type Account = {
  accountStatus: 'active' | 'deleted' | 'suspended';
  createdAt: string;
  displayName: string | null;
  email: string | null;
  id: string;
};

export type Credits = {
  availableBalance: number;
  lifetimeExpired: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  reservedBalance: number;
  updatedAt: string;
};

export type PreviewComment = {
  avatarUrl: string | null;
  authorName: string | null;
  createdAt: string | null;
  isAuthor: boolean;
  likeCount: number;
  replyCount: number;
  text: string;
};

export type VideoPreview = {
  authorAvatarUrl: string | null;
  authorName: string | null;
  cached: boolean;
  canonicalUrl: string;
  comments: PreviewComment[];
  coverUrl: string | null;
  playUrls: string[];
  publishedAt: string | null;
  reportedCommentCount: number | null;
  reportedFavoriteCount: number | null;
  reportedLikeCount: number | null;
  reportedPlayCount: number | null;
  reportedShareCount: number | null;
  title: string | null;
};

export type CreateExportResponse = {
  dispatchDelayed: boolean;
  id: string;
  reservedCredits: number;
  status: ExportStatus;
};

export type ExportResult = {
  downloadPath: string;
  expiresAt: string;
  format: 'csv' | 'xlsx';
  previewPath: string;
  ready: true;
  rowCount: number;
  sha256: string;
  sizeBytes: number;
};

export type ExportDetail = {
  authorName: string | null;
  billedCredits: number;
  cancelRequested: boolean;
  canonicalUrl: string | null;
  completedAt: string | null;
  createdAt: string;
  coverUrl: string | null;
  deliveredRows: number;
  error: { code: string; message: string } | null;
  format: 'csv' | 'xlsx';
  id: string;
  includeReplies: boolean;
  inputUrl: string;
  publishedAt: string | null;
  progress: {
    deliveredRows: number;
    percentage: number;
    replyRows: number;
    rootRows: number;
    stage: string;
    targetRows: number;
  };
  releasedCredits: number;
  replyRows: number;
  replyCoverage: string;
  reportedCommentCount: number | null;
  reservedCredits: number;
  result: ExportResult | null;
  resultLimit: number;
  rootRows: number;
  retryAfterSeconds: number | null;
  startedAt: string | null;
  status: ExportStatus;
  title: string | null;
  updatedAt: string;
};

export type ExportSummary = Pick<
  ExportDetail,
  | 'authorName'
  | 'billedCredits'
  | 'cancelRequested'
  | 'canonicalUrl'
  | 'completedAt'
  | 'coverUrl'
  | 'createdAt'
  | 'deliveredRows'
  | 'format'
  | 'id'
  | 'includeReplies'
  | 'replyRows'
  | 'reportedCommentCount'
  | 'resultLimit'
  | 'rootRows'
  | 'status'
  | 'title'
  | 'updatedAt'
>;

export type ExportList = {
  exports: ExportSummary[];
  nextCursor: string | null;
};

export type ResultPreviewComment = {
  authorAvatarUrl: string | null;
  authorName: string | null;
  createdAt: string | null;
  id: string;
  isAuthor: boolean;
  level: 1 | 2;
  likeCount: number;
  parentId: string | null;
  replyCount: number;
  replyToUserName: string | null;
  rootId: string;
  text: string;
};

export type ResultPreview = {
  comments: ResultPreviewComment[];
  jobId: string;
  previewCount: number;
  replyRows: number;
  rootRows: number;
  totalRows: number;
};

export type DeviceAuthorization = {
  deviceCode: string;
  expiresIn: number;
  interval: number;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
};

export type DeviceToken =
  | {
    apiKey: string;
    apiKeyId: string;
    status: 'authorized';
  }
  | {
    error: 'authorization_pending';
    interval: number;
    status: 'pending';
  };

export type ResumeExportResponse = {
  dispatchDelayed: boolean;
  dispatchVersion: number;
  id: string;
  remainingCredits: number;
  status: 'queued';
};
