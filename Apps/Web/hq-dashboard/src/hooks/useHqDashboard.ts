import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActivityEvent, ChatMonitorRow } from '../types/activity';

const toDate = (value: any) => {
  if (!value) return undefined;
  if (typeof value.toDate === 'function') return value.toDate() as Date;
  return new Date(value);
};

export const useHqDashboard = (enabled: boolean) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [chats, setChats] = useState<ChatMonitorRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const cleanups: Array<() => void> = [];

    cleanups.push(onSnapshot(
      query(collection(db, 'activity_events'), orderBy('created_at', 'desc'), limit(200)),
      snapshot => {
        setEvents(snapshot.docs.map(item => {
          const data = item.data();
          return {
            id: item.id,
            type: data.type,
            actorUid: data.actorUid,
            actorName: data.actorName,
            actorProfilePath: data.actorProfilePath,
            targetProfilePath: data.targetProfilePath,
            targetName: data.targetName,
            chatId: data.chatId,
            chatType: data.chatType,
            requestId: data.requestId,
            metadata: data.metadata,
            createdAt: toDate(data.created_at),
          } as ActivityEvent;
        }));
        setLoading(false);
      },
      err => {
        console.error(err);
        setError('Activity feed unavailable. Check Firestore rules and HQ operator access.');
        setLoading(false);
      }
    ));

    cleanups.push(onSnapshot(
      query(collection(db, 'chats'), orderBy('updated_at', 'desc'), limit(100)),
      snapshot => {
        setChats(snapshot.docs.map(item => {
          const data = item.data();
          return {
            id: item.id,
            type: data.type || 'direct',
            name: data.name,
            memberCount: data.memberUids?.length || 0,
            memberNames: data.memberNames || [],
            updatedAt: toDate(data.updated_at),
            createdAt: toDate(data.created_at),
          };
        }));
      },
      err => console.error('Chat monitor listener failed:', err)
    ));

    cleanups.push(onSnapshot(
      query(collection(db, 'connection_requests'), orderBy('created_at', 'desc'), limit(50)),
      snapshot => {
        setPendingRequests(snapshot.docs.filter(item => item.data().status === 'pending').length);
      },
      err => console.error('Connection request listener failed:', err)
    ));

    cleanups.push(onSnapshot(
      query(collection(db, 'group_invitations'), orderBy('created_at', 'desc'), limit(50)),
      snapshot => {
        setPendingInvites(snapshot.docs.filter(item => item.data().status === 'pending').length);
      },
      err => console.error('Group invitation listener failed:', err)
    ));

    return () => cleanups.forEach(cleanup => cleanup());
  }, [enabled]);

  const messagesLast24h = events.filter(event => {
    if (event.type !== 'message_sent') return false;
    if (!event.createdAt) return false;
    return Date.now() - event.createdAt.getTime() < 24 * 60 * 60 * 1000;
  }).length;

  return {
    events,
    chats,
    pendingRequests,
    pendingInvites,
    messagesLast24h,
    loading,
    error,
  };
};
