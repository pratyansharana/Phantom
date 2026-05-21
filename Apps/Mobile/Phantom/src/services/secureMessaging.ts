import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { User } from 'firebase/auth';
import {
  addDoc,
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
  where,
  writeBatch,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../config/firebaseconfig';
import { logActivityForUser } from './activityLog';

const base64 = require('base64-js') as {
  fromByteArray(bytes: Uint8Array): string;
  toByteArray(value: string): Uint8Array;
};

export type DirectoryUser = {
  id: string;
  path: string;
  collectionName: 'personnel' | 'dependents';
  authUid?: string;
  name: string;
  email: string;
  subtitle: string;
  publicKeyB64?: string;
};

export type ProfileDetails = {
  id: string;
  path: string;
  collectionName: 'personnel' | 'dependents';
  name: string;
  email: string;
  phone?: string;
  authUid?: string;
  serviceNumber?: string;
  dependentCardNumber?: string;
  militaryProfile?: Record<string, any>;
  relationshipProfile?: Record<string, any>;
  personalInformation?: Record<string, any>;
  metadata?: Record<string, any>;
  authentication?: Record<string, any>;
};

export type ConnectionRequest = {
  id: string;
  fromUid: string;
  fromProfilePath: string;
  fromName: string;
  fromEmail: string;
  fromPublicKeyB64: string;
  toUid?: string;
  toProfilePath: string;
  toName: string;
  toEmail: string;
  toPublicKeyB64?: string;
  status: 'pending' | 'accepted' | 'declined';
};

export type ChatSummary = {
  id: string;
  type: 'direct' | 'group';
  title: string;
  unread?: number;
  memberCount: number;
  memberProfilePaths: string[];
};

export type EncryptedMedia = {
  kind: 'image' | 'video';
  name: string;
  mimeType: string;
  base64: string;
  width?: number;
  height?: number;
};

export type ChatMessage = {
  id: string;
  senderUid: string;
  senderName: string;
  plainText: string;
  media?: EncryptedMedia;
  createdAt?: any;
};

const privateKeyStorageKey = (uid: string) => `phantom.kyber.privateKey.${uid}`;
let kyberRuntime: any | null | undefined;

const randomBytes = (length: number) => {
  const cryptoObject = (globalThis as any).crypto;
  if (cryptoObject?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObject.getRandomValues(bytes);
    return bytes;
  }

  return Crypto.getRandomBytes(length);
};

const bytesToBase64 = (bytes: Uint8Array) => {
  return base64.fromByteArray(bytes);
};

const base64ToBytes = (value: string) => {
  return base64.toByteArray(value);
};

const utf8ToBytes = (value: string) => {
  const encoded = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) {
    bytes[i] = encoded.charCodeAt(i);
  }
  return bytes;
};

const bytesToUtf8 = (value: Uint8Array) => {
  let encoded = '';
  value.forEach(byte => {
    encoded += String.fromCharCode(byte);
  });
  return decodeURIComponent(escape(encoded));
};

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return { text: value };
  }
};

const xorWithSecret = (message: Uint8Array, secret: Uint8Array) => {
  const output = new Uint8Array(message.length);
  for (let i = 0; i < message.length; i += 1) {
    output[i] = message[i] ^ secret[i % secret.length];
  }
  return output;
};

const mixBytes = (seed: Uint8Array, length = 32) => {
  const output = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    const a = seed[i % seed.length] || 0;
    const b = seed[(i * 7 + 11) % seed.length] || 0;
    output[i] = (a ^ b ^ ((i * 31) & 255)) & 255;
  }
  return output;
};

const getKyberRuntime = async () => {
  if (kyberRuntime !== undefined) return kyberRuntime;

  if (Platform.OS !== 'web') {
    kyberRuntime = null;
    return kyberRuntime;
  }

  try {
    kyberRuntime = require('kyber-crystals').kyber;
    await kyberRuntime.bytes;
  } catch (error) {
    console.warn('Kyber WASM unavailable in this runtime; using mobile fallback encryption.', error);
    kyberRuntime = null;
  }

  return kyberRuntime;
};

const createKeyPair = async () => {
  const runtime = await getKyberRuntime();
  if (runtime) {
    const keyPair = await runtime.keyPair();
    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      algorithm: 'Kyber-1024',
    };
  }

  const sharedKey = randomBytes(32);
  return {
    privateKey: sharedKey,
    publicKey: sharedKey,
    algorithm: 'Mobile-Fallback-XOR',
  };
};

const encapsulateSecret = async (publicKey: Uint8Array) => {
  const runtime = await getKyberRuntime();
  if (runtime && publicKey.length > 64) {
    return runtime.encrypt(publicKey);
  }

  const nonce = randomBytes(32);
  const secret = mixBytes(new Uint8Array([...publicKey, ...nonce]), 32);
  return {
    cyphertext: nonce,
    secret,
  };
};

const decapsulateSecret = async (cyphertext: Uint8Array, privateKey: Uint8Array) => {
  const runtime = await getKyberRuntime();
  if (runtime && privateKey.length > 64 && cyphertext.length > 64) {
    return runtime.decrypt(cyphertext, privateKey);
  }

  return mixBytes(new Uint8Array([...privateKey, ...cyphertext]), 32);
};

const profileFromDoc = (collectionName: 'personnel' | 'dependents', snapshot: any): DirectoryUser => {
  const data = snapshot.data();
  const firstName = data.personal_information?.first_name || 'Unknown';
  const lastName = data.personal_information?.last_name || 'User';
  const profile = data.military_profile || data.relationship_profile || {};

  return {
    id: snapshot.id,
    path: `${collectionName}/${snapshot.id}`,
    collectionName,
    authUid: data.auth_uid,
    name: `${firstName} ${lastName}`,
    email: data.personal_information?.contact?.email || '',
    subtitle: profile.rank || profile.relationship || profile.branch || collectionName,
    publicKeyB64: data.authentication?.kyber_public_key_b64,
  };
};

export const profileDetailsFromDoc = (collectionName: 'personnel' | 'dependents', snapshot: any): ProfileDetails => {
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
    authUid: data.auth_uid,
    serviceNumber: data.service_number,
    dependentCardNumber: data.dependent_card_number,
    militaryProfile: data.military_profile,
    relationshipProfile: data.relationship_profile,
    personalInformation: data.personal_information,
    metadata: data.metadata,
    authentication: data.authentication,
  };
};

export const getProfileDetailsByPath = async (profilePath: string) => {
  const [collectionName, documentId] = profilePath.split('/') as ['personnel' | 'dependents', string];
  if (!collectionName || !documentId || !['personnel', 'dependents'].includes(collectionName)) return null;

  const snapshot = await getDoc(doc(db, collectionName, documentId));
  if (!snapshot.exists()) return null;
  return profileDetailsFromDoc(collectionName, snapshot);
};

export const getChatDetails = async (chatId: string): Promise<any | null> => {
  const snapshot = await getDoc(doc(db, 'chats', chatId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
};

export const getCurrentProfile = async (user: User): Promise<DirectoryUser | null> => {
  for (const collectionName of ['personnel', 'dependents'] as const) {
    const byUid = await getDocs(query(collection(db, collectionName), where('auth_uid', '==', user.uid), limit(1)));
    if (!byUid.empty) return profileFromDoc(collectionName, byUid.docs[0]);

    if (user.email) {
      const byEmail = await getDocs(query(
        collection(db, collectionName),
        where('personal_information.contact.email', '==', user.email),
        limit(1)
      ));
      if (!byEmail.empty) return profileFromDoc(collectionName, byEmail.docs[0]);
    }
  }

  return null;
};

export const ensureKyberIdentity = async (user: User, profile: DirectoryUser) => {
  const storedPrivateKey = await AsyncStorage.getItem(privateKeyStorageKey(user.uid));
  if (storedPrivateKey && profile.publicKeyB64 && !profile.publicKeyB64.startsWith('[')) {
    return { privateKeyB64: storedPrivateKey, publicKeyB64: profile.publicKeyB64 };
  }

  const keyPair = await createKeyPair();
  const privateKeyB64 = bytesToBase64(keyPair.privateKey);
  const publicKeyB64 = bytesToBase64(keyPair.publicKey);

  await AsyncStorage.setItem(privateKeyStorageKey(user.uid), privateKeyB64);
  await updateDoc(doc(db, profile.path), {
    auth_uid: user.uid,
    'authentication.kyber_public_key_b64': publicKeyB64,
    'authentication.pqc_version': keyPair.algorithm,
    'metadata.updated_at': new Date().toISOString(),
  });

  return { privateKeyB64, publicKeyB64 };
};

export const loadDirectoryUsers = async (currentProfilePath: string) => {
  const people: DirectoryUser[] = [];

  for (const collectionName of ['personnel', 'dependents'] as const) {
    const snapshot = await getDocs(collection(db, collectionName));
    snapshot.forEach(item => {
      const user = profileFromDoc(collectionName, item);
      if (user.path !== currentProfilePath) people.push(user);
    });
  }

  return people.sort((a, b) => a.name.localeCompare(b.name));
};

export const sendConnectionRequest = async (
  currentUser: User,
  fromProfile: DirectoryUser,
  toProfile: DirectoryUser
) => {
  const identity = await ensureKyberIdentity(currentUser, fromProfile);

  const requestRef = await addDoc(collection(db, 'connection_requests'), {
    fromUid: currentUser.uid,
    fromProfilePath: fromProfile.path,
    fromName: fromProfile.name,
    fromEmail: fromProfile.email,
    fromPublicKeyB64: identity.publicKeyB64,
    toUid: toProfile.authUid || null,
    toProfilePath: toProfile.path,
    toName: toProfile.name,
    toEmail: toProfile.email,
    toPublicKeyB64: toProfile.publicKeyB64 || null,
    status: 'pending',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await logActivityForUser(currentUser, fromProfile, {
    type: 'connection_request_sent',
    targetProfilePath: toProfile.path,
    targetName: toProfile.name,
    requestId: requestRef.id,
  });
};

export const subscribeInbox = (
  user: User,
  profile: DirectoryUser,
  onUpdate: (payload: { chats: ChatSummary[]; requests: ConnectionRequest[]; groupInvites: any[] }) => void,
  onError?: (error: Error) => void
) => {
  const cleanups: Array<() => void> = [];
  let chats: ChatSummary[] = [];
  let requests: ConnectionRequest[] = [];
  let groupInvites: any[] = [];

  const emit = () => onUpdate({ chats, requests, groupInvites });

  cleanups.push(onSnapshot(
    query(collection(db, 'chats'), where('memberUids', 'array-contains', user.uid)),
    snapshot => {
      chats = snapshot.docs.map(item => {
        const data = item.data();
        const title = data.type === 'group'
          ? data.name
          : (data.memberNames || []).find((name: string) => name !== profile.name) || 'Secure Chat';

        return {
          id: item.id,
          type: data.type || 'direct',
          title,
          memberCount: data.memberUids?.length || 0,
          memberProfilePaths: data.memberProfilePaths || [],
        };
      });
      emit();
    },
    error => {
      console.error('Chats listener failed:', error);
      onError?.(error);
    }
  ));

  cleanups.push(onSnapshot(
    query(collection(db, 'connection_requests'), where('toProfilePath', '==', profile.path), where('status', '==', 'pending')),
    snapshot => {
      requests = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as ConnectionRequest));
      emit();
    },
    error => {
      console.error('Connection requests listener failed:', error);
      onError?.(error);
    }
  ));

  cleanups.push(onSnapshot(
    query(collection(db, 'group_invitations'), where('toProfilePath', '==', profile.path), where('status', '==', 'pending')),
    snapshot => {
      groupInvites = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      emit();
    },
    error => {
      console.error('Group invitations listener failed:', error);
      onError?.(error);
    }
  ));

  return () => cleanups.forEach(cleanup => cleanup());
};

export const acceptConnectionRequest = async (currentUser: User, profile: DirectoryUser, request: ConnectionRequest) => {
  const identity = await ensureKyberIdentity(currentUser, profile);
  const chatRef = await addDoc(collection(db, 'chats'), {
    type: 'direct',
    memberUids: [request.fromUid, currentUser.uid],
    memberProfilePaths: [request.fromProfilePath, profile.path],
    memberNames: [request.fromName, profile.name],
    memberPublicKeys: {
      [request.fromUid]: request.fromPublicKeyB64,
      [currentUser.uid]: identity.publicKeyB64,
    },
    createdByUid: request.fromUid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await updateDoc(doc(db, 'connection_requests', request.id), {
    status: 'accepted',
    acceptedByUid: currentUser.uid,
    chatId: chatRef.id,
    toUid: currentUser.uid,
    toPublicKeyB64: identity.publicKeyB64,
    updated_at: serverTimestamp(),
  });

  await logActivityForUser(currentUser, profile, {
    type: 'connection_request_accepted',
    targetProfilePath: request.fromProfilePath,
    targetName: request.fromName,
    chatId: chatRef.id,
    chatType: 'direct',
    requestId: request.id,
  });

  await logActivityForUser(currentUser, profile, {
    type: 'direct_chat_created',
    chatId: chatRef.id,
    chatType: 'direct',
    metadata: { memberCount: 2 },
  });

  return chatRef.id;
};

export const declineConnectionRequest = async (
  currentUser: User,
  profile: DirectoryUser,
  request: ConnectionRequest
) => {
  await updateDoc(doc(db, 'connection_requests', request.id), {
    status: 'declined',
    updated_at: serverTimestamp(),
  });

  await logActivityForUser(currentUser, profile, {
    type: 'connection_request_declined',
    targetProfilePath: request.fromProfilePath,
    targetName: request.fromName,
    requestId: request.id,
  });
};

export const createGroupWithInvites = async (
  currentUser: User,
  profile: DirectoryUser,
  groupName: string,
  invitees: DirectoryUser[]
) => {
  const identity = await ensureKyberIdentity(currentUser, profile);
  const chatRef = await addDoc(collection(db, 'chats'), {
    type: 'group',
    name: groupName.trim(),
    memberUids: [currentUser.uid],
    memberProfilePaths: [profile.path],
    memberNames: [profile.name],
    memberPublicKeys: { [currentUser.uid]: identity.publicKeyB64 },
    pendingProfilePaths: invitees.map(invitee => invitee.path),
    createdByUid: currentUser.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await Promise.all(invitees.map(async invitee => {
    const inviteRef = await addDoc(collection(db, 'group_invitations'), {
      chatId: chatRef.id,
      groupName: groupName.trim(),
      fromUid: currentUser.uid,
      fromName: profile.name,
      toUid: invitee.authUid || null,
      toProfilePath: invitee.path,
      toName: invitee.name,
      status: 'pending',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    await logActivityForUser(currentUser, profile, {
      type: 'group_invite_sent',
      targetProfilePath: invitee.path,
      targetName: invitee.name,
      chatId: chatRef.id,
      chatType: 'group',
      metadata: { groupName: groupName.trim() },
      requestId: inviteRef.id,
    });
  }));

  await logActivityForUser(currentUser, profile, {
    type: 'group_created',
    chatId: chatRef.id,
    chatType: 'group',
    metadata: { groupName: groupName.trim(), inviteCount: invitees.length },
  });

  return chatRef.id;
};

export const acceptGroupInvitation = async (currentUser: User, profile: DirectoryUser, invitation: any) => {
  const identity = await ensureKyberIdentity(currentUser, profile);
  const chatRef = doc(db, 'chats', invitation.chatId);
  const chatSnapshot = await getDoc(chatRef);
  const chat = chatSnapshot.data() || {};
  const memberUids = Array.from(new Set([...(chat.memberUids || []), currentUser.uid]));
  const memberProfilePaths = Array.from(new Set([...(chat.memberProfilePaths || []), profile.path]));
  const memberNames = Array.from(new Set([...(chat.memberNames || []), profile.name]));

  await updateDoc(chatRef, {
    memberUids,
    memberProfilePaths,
    memberNames,
    [`memberPublicKeys.${currentUser.uid}`]: identity.publicKeyB64,
    updated_at: serverTimestamp(),
  });

  await updateDoc(doc(db, 'group_invitations', invitation.id), {
    status: 'accepted',
    acceptedByUid: currentUser.uid,
    updated_at: serverTimestamp(),
  });

  await logActivityForUser(currentUser, profile, {
    type: 'group_invite_accepted',
    chatId: invitation.chatId,
    chatType: 'group',
    metadata: { groupName: invitation.groupName },
    requestId: invitation.id,
  });
};

export const declineGroupInvitation = async (
  currentUser: User,
  profile: DirectoryUser,
  invitation: any
) => {
  await updateDoc(doc(db, 'group_invitations', invitation.id), {
    status: 'declined',
    updated_at: serverTimestamp(),
  });

  await logActivityForUser(currentUser, profile, {
    type: 'group_invite_declined',
    chatId: invitation.chatId,
    chatType: 'group',
    metadata: { groupName: invitation.groupName },
    requestId: invitation.id,
  });
};

export const eraseChatForEveryone = async (currentUser: User, profile: DirectoryUser, chatId: string) => {
  const chatRef = doc(db, 'chats', chatId);
  const chatSnapshot = await getDoc(chatRef);
  if (!chatSnapshot.exists()) return;

  const chat = chatSnapshot.data();
  if (!Array.isArray(chat.memberUids) || !chat.memberUids.includes(currentUser.uid)) {
    throw new Error('Only chat members can erase this chat.');
  }

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

  await logActivityForUser(currentUser, profile, {
    type: 'chat_erased',
    chatId,
    chatType: chat.type || 'direct',
    metadata: {
      erasedMessageCount: messagesSnapshot.size,
      memberCount: chat.memberUids.length,
      erasedByMember: true,
    },
  });
};

export const sendDistressAlert = async (currentUser: User, profile: DirectoryUser) => {
  const alertRef = await addDoc(collection(db, 'distress_alerts'), {
    uid: currentUser.uid,
    profilePath: profile.path,
    name: profile.name,
    email: profile.email,
    subtitle: profile.subtitle,
    collectionName: profile.collectionName,
    status: 'active',
    source: 'mobile',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await logActivityForUser(currentUser, profile, {
    type: 'distress_signal_sent',
    requestId: alertRef.id,
    metadata: {
      status: 'active',
      source: 'mobile',
    },
  });

  return alertRef.id;
};

export const encryptMessageForChat = async (chatId: string, payload: { text: string; media?: EncryptedMedia }) => {
  const chatSnapshot = await getDoc(doc(db, 'chats', chatId));
  const chat = chatSnapshot.data();
  const publicKeys = chat?.memberPublicKeys || {};
  const encryptedFor: Record<string, { cyphertextB64: string; payloadB64: string }> = {};
  const serializedPayload = JSON.stringify(payload);

  for (const [uid, publicKeyB64] of Object.entries(publicKeys)) {
    if (!publicKeyB64 || typeof publicKeyB64 !== 'string') continue;
    const { cyphertext, secret } = await encapsulateSecret(base64ToBytes(publicKeyB64));
    encryptedFor[uid] = {
      cyphertextB64: bytesToBase64(cyphertext),
      payloadB64: bytesToBase64(xorWithSecret(utf8ToBytes(serializedPayload), secret)),
    };
  }

  return encryptedFor;
};

export const decryptMessageForUser = async (uid: string, encryptedFor: any): Promise<{ text: string; media?: EncryptedMedia }> => {
  const privateKeyB64 = await AsyncStorage.getItem(privateKeyStorageKey(uid));
  const encrypted = encryptedFor?.[uid];
  if (!privateKeyB64 || !encrypted) return { text: '' };

  const secret = await decapsulateSecret(base64ToBytes(encrypted.cyphertextB64), base64ToBytes(privateKeyB64));
  const payload = safeJsonParse(bytesToUtf8(xorWithSecret(base64ToBytes(encrypted.payloadB64), secret)));
  return {
    text: payload.text || '',
    media: payload.media,
  };
};

export const sendEncryptedMessage = async (
  currentUser: User,
  profile: DirectoryUser,
  chatId: string,
  plainText: string,
  media?: EncryptedMedia
) => {
  const chatSnapshot = await getDoc(doc(db, 'chats', chatId));
  const chat = chatSnapshot.data();
  const encryptedFor = await encryptMessageForChat(chatId, { text: plainText, media });
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderUid: currentUser.uid,
    senderName: profile.name,
    encryptedFor,
    hasMedia: !!media,
    mediaKind: media?.kind || null,
    created_at: serverTimestamp(),
  });
  await updateDoc(doc(db, 'chats', chatId), {
    updated_at: serverTimestamp(),
  });

  await logActivityForUser(currentUser, profile, {
    type: 'message_sent',
    chatId,
    chatType: chat?.type || 'direct',
    metadata: {
      hasMedia: !!media,
      mediaKind: media?.kind || null,
      textLength: plainText.trim().length,
    },
  });
};

export const subscribeMessages = (
  currentUser: User,
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void
) => onSnapshot(
  query(collection(db, 'chats', chatId, 'messages'), orderBy('created_at', 'asc')),
  async snapshot => {
    const messages = await Promise.all(snapshot.docs.map(async item => {
      const data = item.data();
      const payload = await decryptMessageForUser(currentUser.uid, data.encryptedFor);
      return {
        id: item.id,
        senderUid: data.senderUid,
        senderName: data.senderName,
        plainText: payload.text,
        media: payload.media,
        createdAt: data.created_at,
      };
    }));
    onUpdate(messages);
  }
);
