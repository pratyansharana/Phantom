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
    Keyboard,
    ScrollView,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseconfig';

export default function SignupScreen({ navigation }: { navigation: any }) {
    const [userRole, setUserRole] = useState<'personnel' | 'dependents'>('personnel');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [serviceNumber, setServiceNumber] = useState('');
    const [dependentCardNumber, setDependentCardNumber] = useState('');

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSignup = async () => {
        console.log('\n=========================================');
        console.log('--- PHANTOM REGISTRATION PIPELINE INITIALIZED ---');
        console.log(`[LOG] Selected Classification Role: ${userRole}`);
        console.log(`[LOG] Form Input First Name: "${firstName}"`);
        console.log(`[LOG] Form Input Last Name: "${lastName}"`);
        console.log(`[LOG] Form Input Email: "${email}"`);

        if (!email || !password || !firstName || !lastName) {
            console.log('[WARN] Core inputs are incomplete.');
            Alert.alert('Validation Error', 'Please complete all foundational fields.');
            return;
        }

        // Clean input strings to remove unintended whitespaces
        const lookupKey = (userRole === 'personnel' ? serviceNumber : dependentCardNumber)
            .trim()
            .replace(/\s+/g, '')
            .toUpperCase();
        
        // CORRECTED: Pointing strictly to root parameters according to populate.py schema maps
        const lookupField = userRole === 'personnel' ? 'service_number' : 'dependent_card_number';
        const targetCollection = userRole === 'personnel' ? 'personnel' : 'dependents';

        console.log(`[LOG] Target Lookup Collection: "${targetCollection}"`);
        console.log(`[LOG] Target Query Filter Field: "${lookupField}" == "${lookupKey}"`);

        if (!lookupKey) {
            console.log('[WARN] Identification registration key input is missing.');
            Alert.alert('Validation Error', 'Identification field cannot be left blank.');
            return;
        }

        Keyboard.dismiss();
        setLoading(true);

        try {
            // 1. CONSTRUCT FIRESTORE QUERY
            console.log(`[LOG] Searching database for pre-seeded root item...`);
            const targetQuery = query(
                collection(db, targetCollection), 
                where(lookupField, '==', lookupKey)
            );

            const querySnapshot = await getDocs(targetQuery);
            console.log(`[LOG] Firestore response received. Size matched: ${querySnapshot.size}`);

            // 2. CHECK IF DOCUMENT WAS FOUND
            if (querySnapshot.empty) {
                console.log(`[DENIED] Lookup failed. No record matches ${lookupField} = "${lookupKey}"`);
                setLoading(false);
                Alert.alert(
                    'Access Denied',
                    `The provided ${userRole === 'personnel' ? 'Service Number' : 'Dependent Card Number'} was not found in our pre-vetted system registry.`
                );
                return;
            }

            // Extract document data block matching schema
            const matchedDoc = querySnapshot.docs[0];
            const matchedData = matchedDoc.data();
            const documentId = matchedDoc.id;

            console.log(`[LOG] Target pre-seeded Document ID Key: ${documentId}`);

            // CORRECTED: Target nested properties inside 'personal_information' map explicitly
            const dbFirstName = matchedData.personal_information?.first_name || '';
            const dbLastName = matchedData.personal_information?.last_name || '';
            
            console.log(`[LOG] Database Record Name Profile: "${dbFirstName} ${dbLastName}"`);
            console.log(`[LOG] Client Form Name Profile: "${firstName.trim()} ${lastName.trim()}"`);

            // 3. VALIDATE FIRST NAME & LAST NAME (Case-Insensitive Check)
            if (
                dbFirstName.toLowerCase() !== firstName.trim().toLowerCase() ||
                dbLastName.toLowerCase() !== lastName.trim().toLowerCase()
            ) {
                console.log(`[DENIED] Name verification profile mismatch.`);
                setLoading(false);
                Alert.alert('Verification Mismatch', 'Provided name profile parameters do not align with our internal record ledger metrics.');
                return;
            }

            console.log('[LOG] Identity check validation confirmed. Creating authentication token...');

            // 4. CREATE FIREBASE AUTH USER
            console.log('[LOG] Submitting credentials to Firebase Authentication layer...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log(`[LOG] Firebase Auth Instance created successfully. UID: ${user.uid}`);

            // 5. UPDATE TARGET RECORD FIELD METRICS
            console.log(`[LOG] Binding newly generated Auth UID "${user.uid}" into target profile...`);
            const docRef = doc(db, targetCollection, documentId);
            
            // Setting up atomic key mapping matches for schema update tracking
            const updatePayload: any = {
                'personal_information.contact.email': user.email,
                'metadata.updated_at': new Date().toISOString()
            };

            updatePayload.auth_uid = user.uid;

            await updateDoc(docRef, updatePayload);
            console.log('[LOG] Update operations confirmed on remote cloud nodes.');

            // 6. CLEAR AUTOMATIC AUTH SESSION RETENTION BOUNDARIES
            console.log('[LOG] Severing active validation channel parameters...');
            await signOut(auth);
            console.log('[LOG] Session cleanly terminated. State tracking safe.');

            Alert.alert(
                'Account Confirmed',
                'Your node has been successfully verified against the pre-seeded ledger. Access profile active.',
                [{ text: 'Return to Login', onPress: () => navigation.navigate('Login') }]
            );

        } catch (error: any) {
            console.error('[CRITICAL EXCEPTION] Registration process broken:', error);
            Alert.alert('Registration Halted', error.message || 'Error processing confirmation matrices.');
        } finally {
            console.log('--- PHANTOM REGISTRATION END OF RUN OPERATION ---\n=========================================');
            setLoading(false);
        }
    };

    return (
        <View style={styles.mainContainer}>
            <View style={styles.topSemicircle} />
            <View style={styles.circleOne} />
            <View style={styles.circleTwo} />

            <SafeAreaView style={styles.safeArea}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                            
                            <View style={styles.headerContainer}>
                                <Text style={styles.title}>Verify Account</Text>
                                <Text style={styles.subtitle}>Link your credentials to your pre-vetted profile ledger</Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Select Profile Classification</Text>
                                <View style={styles.roleSelectorRow}>
                                    <TouchableOpacity style={[styles.roleTabButton, userRole === 'personnel' && styles.roleTabActive]} onPress={() => setUserRole('personnel')} disabled={loading}>
                                        <Text style={[styles.roleTabText, userRole === 'personnel' && styles.roleTextActive]}>Personnel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.roleTabButton, userRole === 'dependents' && styles.roleTabActive]} onPress={() => setUserRole('dependents')} disabled={loading}>
                                        <Text style={[styles.roleTabText, userRole === 'dependents' && styles.roleTextActive]}>Dependent</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formContainer}>
                                {userRole === 'personnel' ? (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Official Service Number</Text>
                                        <TextInput placeholder='AR-2026-XXXX' placeholderTextColor="#9CA3AF" style={styles.input} value={serviceNumber} onChangeText={setServiceNumber} autoCapitalize='characters' editable={!loading} />
                                    </View>
                                ) : (
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Dependent Card Number</Text>
                                        <TextInput placeholder='DEP-XXXX-A' placeholderTextColor="#9CA3AF" style={styles.input} value={dependentCardNumber} onChangeText={setDependentCardNumber} autoCapitalize='characters' editable={!loading} />
                                    </View>
                                )}

                                <View style={styles.rowContainer}>
                                    <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.inputLabel}>First Name</Text>
                                        <TextInput placeholder='Sara' placeholderTextColor="#9CA3AF" style={styles.input} value={firstName} onChangeText={setFirstName} editable={!loading} />
                                    </View>
                                    <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                                        <Text style={styles.inputLabel}>Last Name</Text>
                                        <TextInput placeholder='Trivedi' placeholderTextColor="#9CA3AF" style={styles.input} value={lastName} onChangeText={setLastName} editable={!loading} />
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Configure New Account Email</Text>
                                    <TextInput placeholder='sara.trivedi@defence.gov.in' placeholderTextColor="#9CA3AF" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize='none' keyboardType='email-address' editable={!loading} />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Configure New Passphrase</Text>
                                    <View style={styles.passwordWrapper}>
                                        <TextInput placeholder='••••••••' placeholderTextColor="#9CA3AF" secureTextEntry={!showPassword} style={styles.passwordInput} value={password} onChangeText={setPassword} editable={!loading} />
                                        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                                            <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.actionContainer}>
                                <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={handleSignup} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Verify & Activate Account</Text>}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footerContainer}>
                                <Text style={styles.footerText}>Already activated? </Text>
                                <TouchableOpacity onPress={() => navigation.goBack()}>
                                    <Text style={styles.footerLink}>Sign In</Text>
                                </TouchableOpacity>
                            </View>

                        </ScrollView>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F9FAFB', overflow: 'hidden' },
    topSemicircle: { position: 'absolute', top: -300, left: -100, right: -100, height: 600, borderRadius: 300, backgroundColor: '#4F46E5', opacity: 0.1 },
    circleOne: { position: 'absolute', top: 150, right: -60, width: 140, height: 140, borderRadius: 70, backgroundColor: '#818CF8', opacity: 0.15 },
    circleTwo: { position: 'absolute', bottom: 100, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: '#C7D2FE', opacity: 0.2 },
    safeArea: { flex: 1 },
    scrollContainer: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
    headerContainer: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 6 },
    subtitle: { fontSize: 14, color: '#6B7280' },
    roleSelectorRow: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4, marginBottom: 8 },
    roleTabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
    roleTabActive: { backgroundColor: '#4F46E5', elevation: 2 },
    roleTabText: { color: '#4B5563', fontWeight: '700', fontSize: 14 },
    roleTextActive: { color: '#FFFFFF' },
    formContainer: { marginBottom: 10 },
    rowContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    inputContainer: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 16, color: '#111827' },
    passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, height: 48 },
    passwordInput: { flex: 1, paddingHorizontal: 16, fontSize: 16, color: '#111827' },
    eyeButton: { paddingHorizontal: 16, justifyContent: 'center', height: '100%' },
    eyeText: { color: '#4F46E5', fontWeight: '600', fontSize: 14 },
    actionContainer: { marginTop: 12, marginBottom: 16 },
    primaryButton: { backgroundColor: '#4F46E5', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    primaryButtonDisabled: { backgroundColor: '#818CF8' },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    footerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
    footerText: { color: '#6B7280', fontSize: 15 },
    footerLink: { color: '#4F46E5', fontSize: 15, fontWeight: '700' }
});
