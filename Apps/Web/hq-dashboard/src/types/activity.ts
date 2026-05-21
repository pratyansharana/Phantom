export type ActivityEventType =
  | 'connection_request_sent'
  | 'connection_request_accepted'
  | 'connection_request_declined'
  | 'group_created'
  | 'group_invite_sent'
  | 'group_invite_accepted'
  | 'group_invite_declined'
  | 'direct_chat_created'
  | 'message_sent'
  | 'chat_erased'
  | 'distress_signal_sent';

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  actorUid: string;
  actorName: string;
  actorProfilePath?: string;
  targetProfilePath?: string;
  targetName?: string;
  chatId?: string;
  chatType?: 'direct' | 'group';
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

export type ChatMonitorRow = {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  memberCount: number;
  memberNames: string[];
  memberProfilePaths: string[];
  updatedAt?: Date;
  createdAt?: Date;
};

export type DistressAlert = {
  id: string;
  uid: string;
  profilePath: string;
  name: string;
  email: string;
  subtitle?: string;
  status: 'active' | 'resolved';
  location?: {
    available?: boolean;
    latitude?: number;
    longitude?: number;
    accuracy?: number | null;
    altitude?: number | null;
    heading?: number | null;
    speed?: number | null;
    capturedAt?: string;
    reason?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserDetails = {
  id: string;
  path: string;
  collectionName: 'personnel' | 'dependents';
  name: string;
  email: string;
  phone?: string;
  serviceNumber?: string;
  dependentCardNumber?: string;
  militaryProfile?: Record<string, unknown>;
  relationshipProfile?: Record<string, unknown>;
  personalInformation?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  authentication?: Record<string, unknown>;
};
