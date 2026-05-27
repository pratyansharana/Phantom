import React, { useState } from 'react';
import { 
    Text, 
    View, 
    TouchableOpacity, 
    StyleSheet, 
    TextInput, 
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseconfig';

export default function LoginScreen({ navigation }: { navigation: any }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        Keyboard.dismiss(); 
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await userCredential.user.getIdToken(true);
            console.log('User logged in:', userCredential.user.email);
            navigation.replace('Home'); 
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please check your credentials and try again.');
        } finally {
            setLoading(false); 
        }
    };

    const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        
        Keyboard.dismiss(); 
        setLoading(true);

        signInWithEmailAndPassword(auth, demoEmail, demoPassword)
            .then(async (userCredential) => {
                await userCredential.user.getIdToken(true);
                console.log('User logged in (Demo):', userCredential.user.email);
                navigation.replace('Home'); 
            })
            .catch((error) => {
                console.error('Demo Login error:', error);
                alert('Demo Login failed. Please check your credentials and try again.');
            })
            .finally(() => {
                setLoading(false); 
            });
    };

    return (
        <View style={styles.mainContainer}>
            {/* Background Decorative Shapes */}
            <View style={styles.topSemicircle} />
            <View style={styles.circleOne} />
            <View style={styles.circleTwo} />

            <SafeAreaView style={styles.safeArea}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.container}
                    >
                        {/* Header Section */}
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Welcome Back !</Text>
                            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
                        </View>

                        {/* Input Section */}
                        <View style={styles.formContainer}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Email</Text>
                                <TextInput 
                                    placeholder='yourname@example.com' 
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.input} 
                                    value={email} 
                                    onChangeText={setEmail} 
                                    autoCapitalize='none' 
                                    keyboardType='email-address' 
                                    editable={!loading} 
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <View style={styles.passwordWrapper}>
                                    <TextInput 
                                        placeholder='••••••••' 
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry={!showPassword} 
                                        style={styles.passwordInput} 
                                        value={password} 
                                        onChangeText={setPassword} 
                                        editable={!loading} 
                                    />
                                    <TouchableOpacity 
                                        style={styles.eyeButton} 
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Text style={styles.eyeText}>
                                            {showPassword ? 'Hide' : 'Show'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.forgotPasswordButton}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Action Section */}
                        <View style={styles.actionContainer}>
                            <TouchableOpacity 
                                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Sign In</Text>
                                )}
                            </TouchableOpacity>

                            {/* Demo Recruiter Access */}
                            <View style={styles.demoSectionContainer}>
                                <Text style={styles.demoTitleText}>Recruiter Quick Check Ledger</Text>
                                <View style={styles.demoButtonsRow}>
                                    <TouchableOpacity 
                                        style={styles.demoButton} 
                                        onPress={() => handleDemoLogin('ishwar.seth@defence.gov.in', '12345678')}
                                        disabled={loading}
                                    >
                                        <Text style={styles.demoButtonText}>User 1 (Personnel)</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.demoButton} 
                                        onPress={() => handleDemoLogin('quincy.rao@defence.gov.in', '12345678')}
                                        disabled={loading}
                                    >
                                        <Text style={styles.demoButtonText}>User 2 (Dependent)</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Footer */}
                        <View style={styles.footerContainer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                                <Text style={styles.footerLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>

                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </SafeAreaView>
        </View>
    )
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        overflow: 'hidden', // Keeps the background shapes from breaking the layout
    },
    // --- Decorative Background Shapes ---
    topSemicircle: {
        position: 'absolute',
        top: -300, 
        left: -100,
        right: -100,
        height: 600,
        borderRadius: 300, 
        backgroundColor: '#4F46E5', // Primary Indigo Color
        opacity: 0.1,
    },
    circleOne: {
        position: 'absolute',
        top: 150,
        right: -60,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#818CF8',
        opacity: 0.15,
    },
    circleTwo: {
        position: 'absolute',
        bottom: 100,
        left: -80,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#C7D2FE',
        opacity: 0.2,
    },
    // ------------------------------------
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        marginTop: 100, 
    },
    headerContainer: {
        marginBottom: 40,
        marginTop: 50,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
    },
    formContainer: {
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 16,
        color: '#111827',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111827',
    },
    eyeButton: {
        paddingHorizontal: 16,
        justifyContent: 'center',
        height: '100%',
    },
    eyeText: {
        color: '#4F46E5',
        fontWeight: '600',
        fontSize: 14,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
    },
    forgotPasswordText: {
        color: '#4F46E5',
        fontWeight: '600',
        fontSize: 14,
    },
    actionContainer: {
        marginBottom: 30,
    },
    primaryButton: {
        backgroundColor: '#4F46E5', 
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryButtonDisabled: {
        backgroundColor: '#818CF8',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
        marginBottom: 20,
    },
    footerText: {
        color: '#6B7280',
        fontSize: 15,
    },
    footerLink: {
        color: '#4F46E5',
        fontSize: 15,
        fontWeight: '700',
    },
    demoSectionContainer: {
        marginTop: 20,
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    demoTitleText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    demoButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    demoButton: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    demoButtonText: {
        color: '#4F46E5',
        fontSize: 12,
        fontWeight: '800',
    },
});
