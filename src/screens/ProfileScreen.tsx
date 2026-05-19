import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    TouchableOpacity, 
    ScrollView 
} from 'react-native';
import { auth } from '../config/firebaseconfig';

export default function ProfileScreen({ navigation }) {
    const userEmail = auth.currentUser?.email || 'developer@example.com';
    const displayName = userEmail.split('@')[0];

    return (
        <View style={styles.mainContainer}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.container}>
                    {/* Profile Header Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {displayName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.nameText}>{displayName}</Text>
                        <Text style={styles.emailText}>{userEmail}</Text>
                    </View>

                    {/* Settings & Options Group */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account Settings</Text>
                        
                        <TouchableOpacity style={styles.menuItem} onPress={() => alert('Feature coming soon!')}>
                            <Text style={styles.menuText}>Edit Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => alert('Feature coming soon!')}>
                            <Text style={styles.menuText}>App Preferences</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => alert('Feature coming soon!')}>
                            <Text style={styles.menuText}>Security & Passwords</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Support & About</Text>
                        
                        <TouchableOpacity style={styles.menuItem} onPress={() => alert('Version 1.0.0')}>
                            <Text style={styles.menuText}>App Version</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => alert('Contacting support...')}>
                            <Text style={styles.menuText}>Contact Support</Text>
                        </TouchableOpacity>
                    </View>
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
    safeArea: {
        flex: 1,
    },
    container: {
        padding: 24,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: 'bold',
    },
    nameText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    emailText: {
        fontSize: 14,
        color: '#6B7280',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 12,
        marginLeft: 4,
    },
    menuItem: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F9FAFB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
});