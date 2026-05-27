import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { customAlert as Alert } from '../utils/customAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { auth } from '../config/firebaseconfig';
import {
  ChatMessage,
  DirectoryUser,
  EncryptedMedia,
  eraseChatForEveryone,
  ensureKyberIdentity,
  getChatDetails,
  getCurrentProfile,
  sendEncryptedMessage,
  subscribeMessages,
} from '../services/secureMessaging';

const formatMessageTime = (createdAt: any) => {
  const date = createdAt?.toDate?.() || new Date();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ChatScreen({ navigation, route }: { navigation: any; route: any }) {
  const currentUser = auth.currentUser;
  const insets = useSafeAreaInsets();
  const chatId = route?.params?.chatId;
  const chatName = route?.params?.chatName || 'Secure Chat';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [profile, setProfile] = useState<DirectoryUser | null>(null);
  const [chatDetails, setChatDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [pickingMedia, setPickingMedia] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    let cleanup: undefined | (() => void);

    const load = async () => {
      if (!currentUser || !chatId) {
        navigation.goBack();
        return;
      }

      try {
        setLoading(true);
        const loadedProfile = await getCurrentProfile(currentUser);
        if (!loadedProfile) {
          Alert.alert('Profile missing', 'Unable to load your secure identity.');
          navigation.goBack();
          return;
        }

        await ensureKyberIdentity(currentUser, loadedProfile);
        setProfile(loadedProfile);
        setChatDetails(await getChatDetails(chatId));
        cleanup = subscribeMessages(currentUser, chatId, setMessages);
      } catch (error: any) {
        Alert.alert('Chat Error', error.message || 'Unable to open secure chat.');
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => cleanup?.();
  }, [chatId, currentUser, navigation]);

  const sendMessage = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || !currentUser || !profile || !chatId || sending) return;

    try {
      setSending(true);
      setDraft('');
      await sendEncryptedMessage(currentUser, profile, chatId, trimmed);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (error: any) {
      setDraft(trimmed);
      Alert.alert('Send failed', error.message || 'Unable to encrypt and send this message.');
    } finally {
      setSending(false);
    }
  }, [chatId, currentUser, draft, profile, sending]);

  const sendMedia = useCallback(async () => {
    if (!currentUser || !profile || !chatId || sending || pickingMedia) return;

    try {
      setPickingMedia(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow media access to send encrypted photos or videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.35,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (asset.mimeType?.startsWith('audio/')) {
        Alert.alert('Not supported', 'Audio messages are disabled. Send text, photos, or videos only.');
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 700 * 1024) {
        Alert.alert('Media too large', 'Please choose media under 700 KB for encrypted Firestore delivery.');
        return;
      }

      const mediaBase64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (mediaBase64.length > 900 * 1024) {
        Alert.alert('Media too large', 'This file is still too large after compression.');
        return;
      }

      const media: EncryptedMedia = {
        kind: asset.type === 'video' ? 'video' : 'image',
        name: asset.fileName || `secure-${asset.type || 'media'}`,
        mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        base64: mediaBase64,
        width: asset.width,
        height: asset.height,
      };

      setSending(true);
      await sendEncryptedMessage(currentUser, profile, chatId, '', media);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (error: any) {
      Alert.alert('Media failed', error.message || 'Unable to encrypt and send this media.');
    } finally {
      setPickingMedia(false);
      setSending(false);
    }
  }, [chatId, currentUser, pickingMedia, profile, sending]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const outgoing = item.senderUid === currentUser?.uid;
    return (
      <View style={[styles.messageRow, outgoing ? styles.messageRowOut : styles.messageRowIn]}>
        <View style={[styles.bubble, outgoing ? styles.bubbleOut : styles.bubbleIn]}>
          {!outgoing && <Text style={styles.senderName}>{item.senderName}</Text>}
          {item.media?.kind === 'image' && (
            <Image
              source={{ uri: `data:${item.media.mimeType};base64,${item.media.base64}` }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          )}
          {item.media?.kind === 'video' && (
            <View style={styles.mediaFile}>
              <MaterialCommunityIcons name="video" size={22} color="#4F46E5" />
              <Text style={styles.mediaFileText} numberOfLines={1}>{item.media.name}</Text>
            </View>
          )}
          {!!item.plainText && <Text style={styles.messageText}>{item.plainText}</Text>}
          {!item.plainText && !item.media && <Text style={styles.messageText}>Encrypted message unavailable on this device</Text>}
          <View style={styles.metaRow}>
            <Text style={styles.messageTime}>{formatMessageTime(item.createdAt)}</Text>
            {outgoing && <Ionicons name="lock-closed" size={12} color="#4F46E5" style={styles.checkIcon} />}
          </View>
        </View>
      </View>
    );
  };

  const openChatProfile = () => {
    if (!chatId || !chatDetails) return;
    if (chatDetails.type === 'group') {
      navigation.navigate('Profile', { mode: 'group', chatId });
      return;
    }

    const otherProfilePath = (chatDetails.memberProfilePaths || []).find((path: string) => path !== profile?.path);
    if (otherProfilePath) {
      navigation.navigate('Profile', { profilePath: otherProfilePath });
    }
  };

  const confirmEraseChat = () => {
    if (!currentUser || !profile || !chatId || erasing) return;

    Alert.alert(
      'Erase chat for everyone?',
      'This permanently deletes this chat and all messages for every member.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            try {
              setErasing(true);
              await eraseChatForEveryone(currentUser, profile, chatId);
              navigation.replace('Home');
            } catch (error: any) {
              Alert.alert('Erase failed', error.message || 'Unable to erase this chat.');
            } finally {
              setErasing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4F46E5" />
        <Text style={styles.loadingText}>Opening encrypted channel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profilePanel} activeOpacity={0.78} onPress={openChatProfile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{chatName.charAt(0)}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>{chatName}</Text>
              <Text style={styles.subtitle}>Kyber encrypted</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerButton, styles.headerDangerButton]} onPress={confirmEraseChat} disabled={erasing}>
            {erasing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="trash-outline" size={21} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="lock-closed-outline" size={28} color="#64748B" />
                <Text style={styles.emptyText}>No messages yet</Text>
              </View>
            }
          />

          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={styles.composer}>
              <TouchableOpacity style={styles.composerIcon}>
                <Ionicons name="happy-outline" size={23} color="#667781" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Message"
                placeholderTextColor="#667781"
                multiline
                editable={!sending}
              />
              <TouchableOpacity style={styles.composerIcon} onPress={sendMedia} disabled={sending || pickingMedia}>
                {pickingMedia ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <MaterialCommunityIcons name="paperclip" size={22} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              activeOpacity={0.84}
              disabled={sending || !draft.trim()}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={21} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF1F5' },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 10, color: '#475569', fontWeight: '700' },
  header: {
    height: 64,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  backButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  profilePanel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#4F46E5',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  headerText: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 1 },
  headerButton: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerDangerButton: { borderRadius: 19, backgroundColor: '#B91C1C', height: 38, marginRight: 2 },
  chatArea: { flex: 1 },
  listContent: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, flexGrow: 1 },
  messageRow: { marginVertical: 3, flexDirection: 'row' },
  messageRowIn: { justifyContent: 'flex-start' },
  messageRowOut: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  bubbleIn: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 2 },
  bubbleOut: { backgroundColor: '#E0E7FF', borderTopRightRadius: 2 },
  senderName: { color: '#4F46E5', fontSize: 12, fontWeight: '800', marginBottom: 3 },
  messageText: { color: '#111B21', fontSize: 15, lineHeight: 20 },
  mediaImage: {
    width: 220,
    height: 170,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#CBD5E1',
  },
  mediaFile: {
    width: 220,
    minHeight: 62,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  mediaFileText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  messageTime: { color: '#667781', fontSize: 11 },
  checkIcon: { marginLeft: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 6,
    gap: 7,
    backgroundColor: '#EEF1F5',
  },
  composer: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  composerIcon: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    color: '#111B21',
    fontSize: 16,
    paddingTop: Platform.OS === 'ios' ? 9 : 7,
    paddingBottom: Platform.OS === 'ios' ? 9 : 7,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 180 },
  emptyText: { color: '#64748B', fontSize: 14, fontWeight: '700', marginTop: 8 },
});
