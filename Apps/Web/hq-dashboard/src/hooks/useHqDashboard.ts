import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActivityEvent, ChatMonitorRow, DistressAlert, UserDetails } from '../types/activity';

const toDate = (value: any) => {
  if (!value) return undefined;
  if (typeof value.toDate === 'function') return value.toDate() as Date;
  return new Date(value);
};

export const useHqDashboard = (enabled: boolean) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [chats, setChats] = useState<ChatMonitorRow[]>([]);
  const [distressAlerts, setDistressAlerts] = useState<DistressAlert[]>([]);
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
            memberProfilePaths: data.memberProfilePaths || [],
            updatedAt: toDate(data.updated_at),
            createdAt: toDate(data.created_at),
          };
        }));
      },
      err => console.error('Chat monitor listener failed:', err)
    ));

    cleanups.push(onSnapshot(
      query(collection(db, 'distress_alerts'), orderBy('created_at', 'desc'), limit(100)),
      snapshot => {
        setDistressAlerts(snapshot.docs.map(item => {
          const data = item.data();
          return {
            id: item.id,
            uid: data.uid,
            profilePath: data.profilePath,
            name: data.name,
            email: data.email,
            subtitle: data.subtitle,
            status: data.status || 'active',
            location: data.location,
            createdAt: toDate(data.created_at),
            updatedAt: toDate(data.updated_at),
          } as DistressAlert;
        }));
      },
      err => console.error('Distress alert listener failed:', err)
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

  const eraseChat = async (chatId: string) => {
    const chatRef = doc(db, 'chats', chatId);
    const messagesSnapshot = await getDocs(collection(db, 'chats', chatId, 'messages'));
    const batches: ReturnType<typeof writeBatch>[] = [];
    let batch = writeBatch(db);
    let writes = 0;

    messagesSnapshot.docs.forEach(message => {
      if (writes === 450) {
        batches.push(batch);
        batch = writeBatch(db);
        writes = 0;
      }
      batch.delete(message.ref);
      writes += 1;
    });

    if (writes > 0) batches.push(batch);
    for (const pendingBatch of batches) {
      await pendingBatch.commit();
    }

    await deleteDoc(chatRef);
  };

  const resolveDistressAlert = async (alertId: string) => {
    await updateDoc(doc(db, 'distress_alerts', alertId), {
      status: 'resolved',
      updated_at: serverTimestamp(),
    });
  };

  const loadUserDetails = async (profilePath: string): Promise<UserDetails | null> => {
    const [collectionName, documentId] = profilePath.split('/') as ['personnel' | 'dependents', string];
    if (!collectionName || !documentId || !['personnel', 'dependents'].includes(collectionName)) return null;

    const snapshot = await getDoc(doc(db, collectionName, documentId));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    const firstName = data.personal_information?.first_name || 'Unknown';
    const lastName = data.personal_information?.last_name || 'User';

    return {
      id: snapshot.id,
      path: `${collectionName}/${snapshot.id}`,
      collectionName,
      name: `${firstName} ${lastName}`,
      email: data.personal_information?.contact?.email || '',
      phone: data.personal_information?.contact?.phone,
      serviceNumber: data.service_number,
      dependentCardNumber: data.dependent_card_number,
      militaryProfile: data.military_profile,
      relationshipProfile: data.relationship_profile,
      personalInformation: data.personal_information,
      metadata: data.metadata,
      authentication: data.authentication,
    };
  };

  return {
    events,
    chats,
    distressAlerts,
    pendingRequests,
    pendingInvites,
    messagesLast24h,
    loading,
    error,
    eraseChat,
    resolveDistressAlert,
    loadUserDetails,
  };
};
