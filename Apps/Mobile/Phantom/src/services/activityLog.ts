import { User } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseconfig';
import { DirectoryUser } from './secureMessaging';

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

type ActivityPayload = {
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
};

export const logActivity = async (payload: ActivityPayload) => {
  try {
    await addDoc(collection(db, 'activity_events'), {
      ...payload,
      created_at: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Activity log write failed:', error);
  }
};

export const logActivityForUser = async (
  user: User,
  profile: DirectoryUser,
  payload: Omit<ActivityPayload, 'actorUid' | 'actorName' | 'actorProfilePath'>
) => {
  await logActivity({
    ...payload,
    actorUid: user.uid,
    actorName: profile.name,
    actorProfilePath: profile.path,
  });
};
