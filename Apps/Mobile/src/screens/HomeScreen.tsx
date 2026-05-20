import React, { useEffect, useRef } from 'react';
import { 
    Text, 
    View, 
    TouchableOpacity, 
    StyleSheet, 
    SafeAreaView,
    ScrollView,
    Animated,
    Dimensions
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebaseconfig';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    // Setup Entrance Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigation.replace('Login');
        } catch (error) {
            console.error('Logout Error:', error);
            alert('Failed to log out.');
        }
    };

    // Safely extract the display name
    const userEmail = auth.currentUser?.email || 'Developer';
    const displayName = userEmail.split('@')[0];

    return (
        <View style={styles.mainContainer}>
            {/* Background Geometric Elements */}
            <View style={styles.bgCircleTop} />
            <View style={styles.bgCircleBottom} />

            <SafeAreaView style={styles.safeArea}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Section */}
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.greeting}>Hello,</Text>
                                <Text style={styles.name}>{displayName}</Text>
                            </View>
                            <TouchableOpacity style={styles.profileBadge}>
                                <Text style={styles.profileBadgeText}>
                                    {displayName.charAt(0).toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Quick Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>12</Text>
                                <Text style={styles.statLabel}>Active Projects</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>98%</Text>
                                <Text style={styles.statLabel}>Uptime</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Dashboard Cards */}
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        <Text style={styles.sectionTitle}>Active Systems</Text>
                        
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>LokAwaz Core</Text>
                                <View style={styles.statusDotLive} />
                            </View>
                            <Text style={styles.cardSubtitle}>Civic Reporting Engine</Text>
                            <View style={styles.tagContainer}>
                                <View style={styles.tag}><Text style={styles.tagText}>React Native</Text></View>
                                <View style={styles.tag}><Text style={styles.tagText}>INT8 Model</Text></View>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>QUBES Protocol</Text>
                                <View style={styles.statusDotSync} />
                            </View>
                            <Text style={styles.cardSubtitle}>Quantum-Secured Socket</Text>
                            <View style={styles.tagContainer}>
                                <View style={[styles.tag, { backgroundColor: '#FEE2E2' }]}>
                                    <Text style={[styles.tagText, { color: '#991B1B' }]}>Encrypted</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Milestones Section */}
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        <Text style={styles.sectionTitle}>Milestones</Text>
                        <View style={styles.achievementCard}>
                            <Text style={styles.achievementTitle}>🏆 SIH Grand Finalist</Text>
                            <Text style={styles.achievementSubtitle}>National Level Hackathon Recognition</Text>
                        </View>
                    </Animated.View>

                    {/* Logout Button */}
                    <Animated.View style={[{ marginTop: 40, opacity: fadeAnim }]}>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutButtonText}>Sign Out</Text>
                        </TouchableOpacity>
                    </Animated.View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    bgCircleTop: {
        position: 'absolute',
        top: -150,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: '#4F46E5',
        opacity: 0.08,
    },
    bgCircleBottom: {
        position: 'absolute',
        bottom: -200,
        left: -150,
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: '#818CF8',
        opacity: 0.1,
    },
    safeArea: {
        flex: 1,
    },
    scrollContainer: {
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    greeting: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    name: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        textTransform: 'capitalize',
    },
    profileBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    profileBadgeText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    statBox: {
        width: (width - 60) / 2,
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#4F46E5',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
        marginTop: 10,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    statusDotLive: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
    },
    statusDotSync: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#F59E0B',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    tagContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    tag: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagText: {
        color: '#4F46E5',
        fontSize: 12,
        fontWeight: '600',
    },
    achievementCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    achievementTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#92400E',
        marginBottom: 4,
    },
    achievementSubtitle: {
        fontSize: 13,
        color: '#B45309',
    },
    logoutButton: {
        backgroundColor: '#EF4444',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});