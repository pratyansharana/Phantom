import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../config/firebaseconfig';
import {
    DirectoryUser,
    ProfileDetails,
    getChatDetails,
    getCurrentProfile,
    getProfileDetailsByPath,
} from '../services/secureMessaging';

const labelize = (value: string) =>
    value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());

const formatValue = (value: any) => {
    if (value === undefined || value === null || value === '') return 'Not available';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{formatValue(value)}</Text>
    </View>
);

const HIDDEN_PERSONAL_KEYS = new Set(['contact', 'national_id']);

const InfoSection = ({ title, data }: { title: string; data?: Record<string, any> }) => {
    if (!data) return null;
    const entries = Object.entries(data).filter(([key]) => !HIDDEN_PERSONAL_KEYS.has(key));
    if (!entries.length) return null;

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {entries.map(([key, value]) => (
                <InfoRow key={key} label={labelize(key)} value={value} />
            ))}
        </View>
    );
};

export default function ProfileScreen({ navigation, route }: { navigation: any; route: any }) {
    const currentUser = auth.currentUser;
    const mode = route?.params?.mode || 'self';
    const profilePath = route?.params?.profilePath;
    const chatId = route?.params?.chatId;
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfileDetails | null>(null);
    const [selfProfile, setSelfProfile] = useState<DirectoryUser | null>(null);
    const [group, setGroup] = useState<any | null>(null);
    const [members, setMembers] = useState<ProfileDetails[]>([]);

    const loadProfile = useCallback(async () => {
        if (!currentUser) {
            navigation.replace('Login');
            return;
        }

        try {
            setLoading(true);
            const currentProfile = await getCurrentProfile(currentUser);
            setSelfProfile(currentProfile);

            if (mode === 'group' && chatId) {
                const chat = await getChatDetails(chatId);
                setGroup(chat);
                const memberProfiles = await Promise.all((chat?.memberProfilePaths || []).map(getProfileDetailsByPath));
                setMembers(memberProfiles.filter(Boolean) as ProfileDetails[]);
                return;
            }

            if (profilePath) {
                setProfile(await getProfileDetailsByPath(profilePath));
                return;
            }

            if (currentProfile) {
                setProfile(await getProfileDetailsByPath(currentProfile.path));
            }
        } finally {
            setLoading(false);
        }
    }, [chatId, currentUser, mode, navigation, profilePath]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color="#4F46E5" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    if (mode === 'group') {
        return (
            <View style={styles.root}>
                <SafeAreaView style={styles.safeArea}>
                    <Header title="Group Details" onBack={() => navigation.goBack()} />
                    <ScrollView contentContainerStyle={styles.container}>
                        <View style={styles.hero}>
                            <View style={styles.groupAvatar}>
                                <Ionicons name="people" size={38} color="#FFFFFF" />
                            </View>
                            <Text style={styles.nameText}>{group?.name || 'Secure Group'}</Text>
                            <Text style={styles.emailText}>{members.length} approved members</Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Members</Text>
                            {members.map(member => (
                                <TouchableOpacity
                                    key={member.path}
                                    style={styles.memberRow}
                                    onPress={() => navigation.push('Profile', { profilePath: member.path })}
                                >
                                    <View style={styles.memberAvatar}>
                                        <Text style={styles.memberAvatarText}>{member.name.charAt(0)}</Text>
                                    </View>
                                    <View style={styles.memberBody}>
                                        <Text style={styles.memberName}>{member.name}</Text>
                                        <Text style={styles.memberMeta}>{member.email}</Text>
                                    </View>
                                    {member.path === selfProfile?.path && <Text style={styles.youPill}>You</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.centered}>
                <Text style={styles.loadingText}>Profile not found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safeArea}>
                <Header title={profile.path === selfProfile?.path ? 'My Profile' : 'Profile'} onBack={() => navigation.goBack()} />
                <ScrollView contentContainerStyle={styles.container}>
                    <View style={styles.hero}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.nameText}>{profile.name}</Text>
                        <Text style={styles.emailText}>{profile.email}</Text>
                        {!!profile.phone && <Text style={styles.emailText}>{profile.phone}</Text>}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Identity</Text>
                        <InfoRow label="Profile Type" value={labelize(profile.collectionName)} />
                        <InfoRow label="Service Number" value={profile.serviceNumber} />
                        <InfoRow label="Dependent Card" value={profile.dependentCardNumber} />
                    </View>

                    <InfoSection title="Personal Information" data={profile.personalInformation} />
                    <InfoSection title="Military Profile" data={profile.militaryProfile} />
                    <InfoSection title="Relationship Profile" data={profile.relationshipProfile} />

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Security</Text>
                        <InfoRow label="PQC Version" value={profile.authentication?.pqc_version} />
                        <InfoRow label="Clearance Level" value={profile.authentication?.clearance_level} />
                        <View style={styles.securityRow}>
                            <MaterialCommunityIcons name="shield-lock" size={18} color="#4F46E5" />
                            <Text style={styles.securityText}>Kyber public key is registered for encrypted messages.</Text>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const Header = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backButton} />
    </View>
);

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F4F5F7' },
    safeArea: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F5F7' },
    loadingText: { color: '#475569', fontSize: 15, fontWeight: '800', marginTop: 10 },
    header: {
        height: 58,
        backgroundColor: '#1E293B',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, color: '#FFFFFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
    container: { padding: 16, paddingBottom: 32 },
    hero: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 22,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
    },
    avatar: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    groupAvatar: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
    nameText: { color: '#0F172A', fontSize: 23, fontWeight: '900', textAlign: 'center' },
    emailText: { color: '#64748B', fontSize: 14, marginTop: 4, textAlign: 'center' },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 14,
    },
    sectionTitle: { color: '#0F172A', fontSize: 15, fontWeight: '900', marginBottom: 8 },
    infoRow: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    infoLabel: { color: '#64748B', fontSize: 12, fontWeight: '800', marginBottom: 3 },
    infoValue: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
    securityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
    securityText: { flex: 1, color: '#334155', fontSize: 13, fontWeight: '700' },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 62,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    memberAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    memberAvatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
    memberBody: { flex: 1 },
    memberName: { color: '#0F172A', fontSize: 15, fontWeight: '900' },
    memberMeta: { color: '#64748B', fontSize: 12, marginTop: 2 },
    youPill: {
        color: '#4F46E5',
        backgroundColor: '#E0E7FF',
        overflow: 'hidden',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        fontSize: 11,
        fontWeight: '900',
    },
});
