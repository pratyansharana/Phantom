import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customAlert as Alert } from '../utils/customAlert';
import { signOut } from 'firebase/auth';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../config/firebaseconfig';
import {
    ChatSummary,
    ConnectionRequest,
    DirectoryUser,
    acceptConnectionRequest,
    acceptGroupInvitation,
    createGroupWithInvites,
    declineConnectionRequest,
    declineGroupInvitation,
    ensureKyberIdentity,
    getCurrentProfile,
    loadDirectoryUsers,
    sendDistressAlert,
    sendConnectionRequest,
    subscribeInbox,
} from '../services/secureMessaging';

type HomeTab = 'chats' | 'people' | 'requests' | 'groups';

export default function HomeScreen({ navigation }: { navigation: any }) {
    const currentUser = auth.currentUser;
    const [activeTab, setActiveTab] = useState<HomeTab>('chats');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [profile, setProfile] = useState<DirectoryUser | null>(null);
    const [people, setPeople] = useState<DirectoryUser[]>([]);
    const [chats, setChats] = useState<ChatSummary[]>([]);
    const [requests, setRequests] = useState<ConnectionRequest[]>([]);
    const [groupInvites, setGroupInvites] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedInvitees, setSelectedInvitees] = useState<Record<string, DirectoryUser>>({});

    const bootstrap = useCallback(async () => {
        if (!currentUser) {
            navigation.replace('Login');
            return;
        }

        try {
            setLoading(true);
            const loadedProfile = await getCurrentProfile(currentUser);
            if (!loadedProfile) {
                Alert.alert('Profile missing', 'No seeded profile is linked to this account.');
                return;
            }

            await ensureKyberIdentity(currentUser, loadedProfile);
            const refreshedProfile = await getCurrentProfile(currentUser);
            const finalProfile = refreshedProfile || loadedProfile;
            setProfile(finalProfile);
            setPeople(await loadDirectoryUsers(finalProfile.path));
        } catch (error: any) {
            console.error('Secure inbox load failed:', error);
            Alert.alert('Inbox Error', error.message || 'Unable to load secure inbox.');
        } finally {
            setLoading(false);
        }
    }, [currentUser, navigation]);

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    useEffect(() => {
        if (!currentUser || !profile) return undefined;
        return subscribeInbox(currentUser, profile, payload => {
            setChats(payload.chats);
            setRequests(payload.requests);
            setGroupInvites(payload.groupInvites);
        }, error => {
            Alert.alert('Firestore Permission Error', error.message);
        });
    }, [currentUser, profile]);

    const filteredPeople = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return people;
        return people.filter(person =>
            person.name.toLowerCase().includes(term) ||
            person.email.toLowerCase().includes(term) ||
            person.subtitle.toLowerCase().includes(term)
        );
    }, [people, search]);

    const filteredChats = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return chats;
        return chats.filter(chat =>
            chat.title.toLowerCase().includes(term)
        );
    }, [chats, search]);

    const handleLogout = async () => {
        await signOut(auth);
        navigation.replace('Login');
    };

    const sendDistress = () => {
        if (!currentUser || !profile || busy) return;

        Alert.alert(
            'Send distress signal?',
            'HQ will receive an active distress alert with your profile details.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setBusy(true);
                            await sendDistressAlert(currentUser, profile);
                            Alert.alert('Distress sent', 'HQ has been notified.');
                        } catch (error: any) {
                            Alert.alert('Distress failed', error.message || 'Unable to send distress signal.');
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    };

    const requestConnection = async (person: DirectoryUser) => {
        if (!currentUser || !profile) return;
        Alert.alert(
            'Request permission',
            `Send ${person.name} a connection request? Chat starts only after they accept.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    onPress: async () => {
                        try {
                            setBusy(true);
                            await sendConnectionRequest(currentUser, profile, person);
                            Alert.alert('Request sent', `${person.name} can now approve or decline.`);
                        } catch (error: any) {
                            Alert.alert('Request failed', error.message || 'Unable to send request.');
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    };

    const acceptRequest = async (request: ConnectionRequest) => {
        if (!currentUser || !profile) return;
        try {
            setBusy(true);
            const chatId = await acceptConnectionRequest(currentUser, profile, request);
            navigation.navigate('Chat', { chatId, chatName: request.fromName });
        } catch (error: any) {
            Alert.alert('Accept failed', error.message || 'Unable to accept request.');
        } finally {
            setBusy(false);
        }
    };

    const createGroup = async () => {
        if (!currentUser || !profile) return;
        const invitees = Object.values(selectedInvitees);
        if (!groupName.trim() || invitees.length === 0) {
            Alert.alert('Group details needed', 'Add a group name and at least one invited member.');
            return;
        }

        Alert.alert(
            'Send group invites',
            `Create "${groupName.trim()}" and request permission from ${invitees.length} member${invitees.length === 1 ? '' : 's'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Create',
                    onPress: async () => {
                        try {
                            setBusy(true);
                            const chatId = await createGroupWithInvites(currentUser, profile, groupName, invitees);
                            setGroupModalVisible(false);
                            setGroupName('');
                            setSelectedInvitees({});
                            navigation.navigate('Chat', { chatId, chatName: groupName.trim() });
                        } catch (error: any) {
                            Alert.alert('Group failed', error.message || 'Unable to create group.');
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ]
        );
    };

    const toggleInvitee = (person: DirectoryUser) => {
        setSelectedInvitees(prev => {
            const next = { ...prev };
            if (next[person.path]) {
                delete next[person.path];
            } else {
                next[person.path] = person;
            }
            return next;
        });
    };

    const renderChat = ({ item }: { item: ChatSummary }) => (
        <TouchableOpacity
            style={styles.chatRow}
            activeOpacity={0.72}
            onPress={() => navigation.navigate('Chat', { chatId: item.id, chatName: item.title })}
        >
            <View style={[styles.avatar, item.type === 'group' && styles.groupAvatar]}>
                <Ionicons name={item.type === 'group' ? 'people' : 'person'} size={22} color="#FFFFFF" />
            </View>
            <View style={styles.rowBody}>
                <View style={styles.chatTopLine}>
                    <Text style={styles.chatName} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.chatTime}>{item.type === 'group' ? `${item.memberCount} members` : 'secure'}</Text>
                </View>
                <Text style={styles.chatMessage} numberOfLines={1}>{item.type === 'group' ? 'Encrypted group channel' : 'Encrypted direct channel'}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderPerson = ({ item }: { item: DirectoryUser }) => (
        <TouchableOpacity style={styles.chatRow} activeOpacity={0.72} onPress={() => requestConnection(item)}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.rowBody}>
                <View style={styles.chatTopLine}>
                    <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                    <Ionicons name="person-add-outline" size={20} color="#4F46E5" />
                </View>
                <Text style={styles.chatMessage} numberOfLines={1}>{item.subtitle} - {item.email}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderRequest = ({ item }: { item: ConnectionRequest }) => (
        <View style={styles.requestCard}>
            <Text style={styles.requestTitle}>{item.fromName}</Text>
            <Text style={styles.requestText}>{item.fromEmail} wants to connect. Chat opens only if you accept.</Text>
            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => currentUser && profile && declineConnectionRequest(currentUser, profile, item)}
                >
                    <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptButton} onPress={() => acceptRequest(item)}>
                    <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGroupInvite = ({ item }: { item: any }) => (
        <View style={styles.requestCard}>
            <Text style={styles.requestTitle}>{item.groupName}</Text>
            <Text style={styles.requestText}>{item.fromName} invited you to this group.</Text>
            <View style={styles.requestActions}>
                <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => currentUser && profile && declineGroupInvitation(currentUser, profile, item)}
                >
                    <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => currentUser && profile && acceptGroupInvitation(currentUser, profile, item)}
                >
                    <Text style={styles.acceptText}>Join</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const data = activeTab === 'chats' ? filteredChats : activeTab === 'people' ? filteredPeople : activeTab === 'requests' ? requests : groupInvites;

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color="#4F46E5" />
                <Text style={styles.loadingText}>Preparing secure inbox...</Text>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => profile && navigation.navigate('Profile', { mode: 'self', profilePath: profile.path })}
                    >
                        <Text style={styles.appTitle}>Phantom</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>{profile?.name}</Text>
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => setGroupModalVisible(true)}>
                            <Ionicons name="people-circle-outline" size={25} color="#F8FAFC" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconButton, styles.distressIconButton]} onPress={sendDistress} disabled={busy}>
                            <MaterialCommunityIcons name="alarm-light-outline" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={22} color="#F8FAFC" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={18} color="#64748B" />
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder={activeTab === 'people' ? "Search military database..." : "Search..."}
                        placeholderTextColor="#64748B"
                    />
                </View>

                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('people')}>
                        <Ionicons name="person-add" size={18} color="#E0E7FF" />
                        <Text style={styles.quickActionText}>Connect</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickAction} onPress={() => setGroupModalVisible(true)}>
                        <Ionicons name="people" size={19} color="#E0E7FF" />
                        <Text style={styles.quickActionText}>New Group</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickAction, styles.distressAction]} onPress={sendDistress} disabled={busy}>
                        <MaterialCommunityIcons name="alarm-light" size={18} color="#FEE2E2" />
                        <Text style={styles.quickActionText}>Distress</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.filters}>
                    {(['chats', 'people', 'requests', 'groups'] as HomeTab[]).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.filterChip, activeTab === tab && styles.filterActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.filterText, activeTab === tab && styles.filterTextActive]}>
                                {tab === 'groups' ? `Invites ${groupInvites.length || ''}` : tab === 'requests' ? `Requests ${requests.length || ''}` : tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <FlatList
                    data={data as any[]}
                    renderItem={activeTab === 'chats' ? renderChat as any : activeTab === 'people' ? renderPerson as any : activeTab === 'requests' ? renderRequest as any : renderGroupInvite as any}
                    keyExtractor={item => item.id || item.path}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'people' ? 'No records found' : 'Nothing here yet'}
                            </Text>
                            <Text style={styles.emptyText}>
                                {activeTab === 'chats' 
                                    ? (search.trim() ? 'No matching secure chats found.' : 'Accept a request or create a group to start.')
                                    : activeTab === 'people' 
                                        ? 'No military personnel/dependent found on the military database' 
                                        : 'Check another section.'}
                            </Text>
                        </View>
                    }
                />

                {busy && (
                    <View style={styles.busyOverlay}>
                        <ActivityIndicator color="#FFFFFF" />
                    </View>
                )}

                <Modal visible={groupModalVisible} animationType="slide" onRequestClose={() => setGroupModalVisible(false)}>
                    <SafeAreaView style={styles.modalRoot}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
                                <Ionicons name="close" size={26} color="#0F172A" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>New Group</Text>
                            <TouchableOpacity onPress={createGroup}>
                                <Text style={styles.modalAction}>Create</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.groupNameInput}
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholder="Group name"
                            placeholderTextColor="#64748B"
                        />
                        <FlatList
                            data={people}
                            keyExtractor={item => item.path}
                            renderItem={({ item }) => {
                                const selected = !!selectedInvitees[item.path];
                                return (
                                    <TouchableOpacity style={styles.chatRow} onPress={() => toggleInvitee(item)}>
                                        <View style={[styles.avatar, selected && styles.selectedAvatar]}>
                                            {selected ? <Ionicons name="checkmark" size={22} color="#FFFFFF" /> : <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>}
                                        </View>
                                        <View style={styles.rowBody}>
                                            <Text style={styles.chatName}>{item.name}</Text>
                                            <Text style={styles.chatMessage}>Invite requires their permission</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F4F5F7' },
    safeArea: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
    loadingText: { marginTop: 10, color: '#475569', fontWeight: '700' },
    header: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    appTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '800' },
    headerSub: { color: '#CBD5E1', fontSize: 12, marginTop: 2, maxWidth: 220 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    distressIconButton: { backgroundColor: '#B91C1C' },
    searchWrap: {
        marginHorizontal: 14,
        marginTop: 12,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInput: { flex: 1, color: '#0F172A', fontSize: 15 },
    quickActions: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 14,
        paddingTop: 10,
    },
    quickAction: {
        flex: 1,
        height: 42,
        borderRadius: 8,
        backgroundColor: '#312E81',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
    },
    distressAction: { backgroundColor: '#B91C1C' },
    quickActionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
    },
    filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
    filterChip: {
        paddingHorizontal: 13,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterActive: { backgroundColor: '#E0E7FF' },
    filterText: { color: '#475569', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
    filterTextActive: { color: '#3730A3' },
    listContent: { paddingTop: 4, paddingBottom: 96 },
    chatRow: {
        minHeight: 74,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        backgroundColor: '#4F46E5',
    },
    groupAvatar: { backgroundColor: '#0F172A' },
    selectedAvatar: { backgroundColor: '#4F46E5' },
    avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
    rowBody: {
        flex: 1,
        minHeight: 74,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        justifyContent: 'center',
    },
    chatTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
    chatName: { color: '#0F172A', fontSize: 16, fontWeight: '800', flexShrink: 1 },
    chatTime: { color: '#64748B', fontSize: 12, marginLeft: 10 },
    chatMessage: { color: '#64748B', fontSize: 14 },
    requestCard: {
        marginHorizontal: 14,
        marginTop: 10,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    requestTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
    requestText: { color: '#475569', fontSize: 14, marginTop: 5, lineHeight: 19 },
    requestActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
    declineButton: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
    declineText: { color: '#475569', fontWeight: '800' },
    acceptButton: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5' },
    acceptText: { color: '#FFFFFF', fontWeight: '800' },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
    emptyText: { color: '#64748B', fontSize: 14, marginTop: 6, textAlign: 'center' },
    busyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15,23,42,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalRoot: { flex: 1, backgroundColor: '#F8FAFC' },
    modalHeader: {
        height: 58,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    modalTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
    modalAction: { color: '#4F46E5', fontSize: 15, fontWeight: '900' },
    groupNameInput: {
        margin: 14,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 14,
        color: '#0F172A',
        fontSize: 16,
    },
});
