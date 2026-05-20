export type ActivityEventType =
  | 'connection_request_sent'
  | 'connection_request_accepted'
  | 'connection_request_declined'
  | 'group_created'
  | 'group_invite_sent'
  | 'group_invite_accepted'
  | 'group_invite_declined'
  | 'direct_chat_created'
  | 'message_sent';

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
  updatedAt?: Date;
  createdAt?: Date;
};
