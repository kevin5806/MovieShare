-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ListMemberRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ListInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ListInviteKind" AS ENUM ('APP_USER', 'EMAIL_LINK', 'PUBLIC_LINK');

-- CreateEnum
CREATE TYPE "MovieDataProvider" AS ENUM ('TMDB');

-- CreateEnum
CREATE TYPE "FeedbackSeenState" AS ENUM ('UNSEEN', 'SEEN');

-- CreateEnum
CREATE TYPE "FeedbackInterest" AS ENUM ('NOT_SET', 'INTERESTED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "SelectionMode" AS ENUM ('MANUAL', 'RANDOM', 'AUTOMATIC', 'GENRE', 'DURATION', 'MOOD');

-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WatchSessionType" AS ENUM ('SOLO', 'GROUP');

-- CreateEnum
CREATE TYPE "WatchSessionStatus" AS ENUM ('PENDING', 'LIVE', 'PAUSED', 'ENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WatchProgressState" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PresenceState" AS ENUM ('INVITED', 'JOINED', 'LEFT');

-- CreateEnum
CREATE TYPE "PlaybackCheckpointSource" AS ENUM ('MANUAL', 'AUTO_HEARTBEAT', 'SESSION_END');

-- CreateEnum
CREATE TYPE "StreamingProviderKey" AS ENUM ('VIXSRC', 'PLEX');

-- CreateEnum
CREATE TYPE "ActivityActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('LIST_INVITES', 'FRIEND_INVITES', 'WATCH_SESSIONS', 'ACTIVITY_DIGEST', 'PRODUCT_UPDATES');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "favoriteGenres" TEXT[],
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendshipInvite" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "FriendshipInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieList" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverColor" TEXT,
    "coverImageUrl" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieListMember" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ListMemberRole" NOT NULL DEFAULT 'MEMBER',
    "viewPreferences" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "MovieListMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieListInvite" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "kind" "ListInviteKind" NOT NULL DEFAULT 'EMAIL_LINK',
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" "ListInviteStatus" NOT NULL DEFAULT 'PENDING',
    "targetRole" "ListMemberRole" NOT NULL DEFAULT 'MEMBER',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedUserId" TEXT,
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieListInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "posterPath" TEXT,
    "posterImageUrl" TEXT,
    "backdropPath" TEXT,
    "backdropImageUrl" TEXT,
    "overview" TEXT,
    "runtimeMinutes" INTEGER,
    "genres" JSONB,
    "releaseDate" TIMESTAMP(3),
    "tmdbVoteAverage" DOUBLE PRECISION,
    "dataProvider" "MovieDataProvider" NOT NULL DEFAULT 'TMDB',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieFeedback" (
    "id" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenState" "FeedbackSeenState" NOT NULL DEFAULT 'UNSEEN',
    "interest" "FeedbackInterest" NOT NULL DEFAULT 'NOT_SET',
    "wouldRewatch" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionRun" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "mode" "SelectionMode" NOT NULL,
    "status" "SelectionStatus" NOT NULL DEFAULT 'COMPLETED',
    "criteria" JSONB,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelectionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "rationale" JSONB,

    CONSTRAINT "SelectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchSession" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "type" "WatchSessionType" NOT NULL,
    "status" "WatchSessionStatus" NOT NULL DEFAULT 'PENDING',
    "streamingProvider" "StreamingProviderKey",
    "streamingPlaybackUrl" TEXT,
    "resumeFromSeconds" INTEGER NOT NULL DEFAULT 0,
    "groupState" JSONB,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchSessionMember" (
    "id" TEXT NOT NULL,
    "watchSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "presence" "PresenceState" NOT NULL DEFAULT 'INVITED',
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "activeSegmentStartSeconds" INTEGER,
    "currentPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),

    CONSTRAINT "WatchSessionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieWatchProgress" (
    "id" TEXT NOT NULL,
    "listItemId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completionState" "WatchProgressState" NOT NULL DEFAULT 'NOT_STARTED',
    "lastPositionSeconds" INTEGER NOT NULL DEFAULT 0,
    "coveredRanges" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastWatchedAt" TIMESTAMP(3),
    "lastWatchSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieWatchProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackCheckpoint" (
    "id" TEXT NOT NULL,
    "watchSessionId" TEXT,
    "listItemId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionSeconds" INTEGER NOT NULL,
    "source" "PlaybackCheckpointSource" NOT NULL DEFAULT 'MANUAL',
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaybackCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamingProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "StreamingProviderKey" NOT NULL,
    "label" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamingProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'default',
    "tmdbApiToken" TEXT,
    "tmdbApiKey" TEXT,
    "tmdbLanguage" TEXT NOT NULL DEFAULT 'en-US',
    "smtpHost" TEXT,
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFrom" TEXT,
    "authEmailPasswordEnabled" BOOLEAN NOT NULL DEFAULT true,
    "authEmailCodeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "authMagicLinkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "authPasskeyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "authTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vapidPublicKey" TEXT,
    "vapidPrivateKey" TEXT,
    "vapidSubject" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemNotificationPreference" (
    "id" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "listId" TEXT,
    "actorId" TEXT,
    "actorType" "ActivityActorType" NOT NULL DEFAULT 'USER',
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "inAppEnabled" BOOLEAN,
    "emailEnabled" BOOLEAN,
    "pushEnabled" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aaguid" TEXT,

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendshipInvite_senderId_receiverId_key" ON "FriendshipInvite"("senderId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_initiatorId_acceptedById_key" ON "Friendship"("initiatorId", "acceptedById");

-- CreateIndex
CREATE UNIQUE INDEX "MovieList_slug_key" ON "MovieList"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MovieListMember_listId_userId_key" ON "MovieListMember"("listId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieListInvite_token_key" ON "MovieListInvite"("token");

-- CreateIndex
CREATE INDEX "MovieListInvite_listId_status_idx" ON "MovieListInvite"("listId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "MovieListItem_listId_addedAt_idx" ON "MovieListItem"("listId", "addedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MovieListItem_listId_movieId_key" ON "MovieListItem"("listId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieFeedback_listItemId_userId_key" ON "MovieFeedback"("listItemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchSessionMember_watchSessionId_userId_key" ON "WatchSessionMember"("watchSessionId", "userId");

-- CreateIndex
CREATE INDEX "MovieWatchProgress_listItemId_completionState_idx" ON "MovieWatchProgress"("listItemId", "completionState");

-- CreateIndex
CREATE INDEX "MovieWatchProgress_userId_lastWatchedAt_idx" ON "MovieWatchProgress"("userId", "lastWatchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MovieWatchProgress_listItemId_userId_key" ON "MovieWatchProgress"("listItemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamingProviderConfig_provider_key" ON "StreamingProviderConfig"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_scope_key" ON "SystemConfig"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "SystemNotificationPreference_category_key" ON "SystemNotificationPreference"("category");

-- CreateIndex
CREATE INDEX "ActivityLog_listId_createdAt_idx" ON "ActivityLog"("listId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationState_userId_readAt_idx" ON "NotificationState"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationState_userId_notificationKey_key" ON "NotificationState"("userId", "notificationKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_category_key" ON "UserNotificationPreference"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactor_userId_key" ON "TwoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialID_key" ON "Passkey"("credentialID");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendshipInvite" ADD CONSTRAINT "FriendshipInvite_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendshipInvite" ADD CONSTRAINT "FriendshipInvite_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieList" ADD CONSTRAINT "MovieList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListMember" ADD CONSTRAINT "MovieListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MovieList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListMember" ADD CONSTRAINT "MovieListMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListInvite" ADD CONSTRAINT "MovieListInvite_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MovieList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListInvite" ADD CONSTRAINT "MovieListInvite_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListInvite" ADD CONSTRAINT "MovieListInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListItem" ADD CONSTRAINT "MovieListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MovieList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListItem" ADD CONSTRAINT "MovieListItem_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieListItem" ADD CONSTRAINT "MovieListItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieFeedback" ADD CONSTRAINT "MovieFeedback_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "MovieListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieFeedback" ADD CONSTRAINT "MovieFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionRun" ADD CONSTRAINT "SelectionRun_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MovieList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionRun" ADD CONSTRAINT "SelectionRun_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionResult" ADD CONSTRAINT "SelectionResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SelectionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionResult" ADD CONSTRAINT "SelectionResult_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "MovieListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchSession" ADD CONSTRAINT "WatchSession_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MovieList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchSession" ADD CONSTRAINT "WatchSession_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "MovieListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchSession" ADD CONSTRAINT "WatchSession_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchSession" ADD CONSTRAINT "WatchSession_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchSessionMember" ADD CONSTRAINT "WatchSessionMember_watchSessionId_fkey" FOREIGN KEY ("watchSessionId") REFERENCES "WatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchSessionMember" ADD CONSTRAINT "WatchSessionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieWatchProgress" ADD CONSTRAINT "MovieWatchProgress_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "MovieListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieWatchProgress" ADD CONSTRAINT "MovieWatchProgress_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieWatchProgress" ADD CONSTRAINT "MovieWatchProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieWatchProgress" ADD CONSTRAINT "MovieWatchProgress_lastWatchSessionId_fkey" FOREIGN KEY ("lastWatchSessionId") REFERENCES "WatchSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackCheckpoint" ADD CONSTRAINT "PlaybackCheckpoint_watchSessionId_fkey" FOREIGN KEY ("watchSessionId") REFERENCES "WatchSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackCheckpoint" ADD CONSTRAINT "PlaybackCheckpoint_listItemId_fkey" FOREIGN KEY ("listItemId") REFERENCES "MovieListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackCheckpoint" ADD CONSTRAINT "PlaybackCheckpoint_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackCheckpoint" ADD CONSTRAINT "PlaybackCheckpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MovieList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationState" ADD CONSTRAINT "NotificationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactor" ADD CONSTRAINT "TwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

