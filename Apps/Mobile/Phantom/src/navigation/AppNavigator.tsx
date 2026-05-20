import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';

const stack = createNativeStackNavigator();

export default function AppNavigator(){

    return (
        <stack.Navigator>
            <stack.Screen name="Login" component={LoginScreen} options={{headerShown:false}}  />
            <stack.Screen name="Signup" component={SignupScreen} options={{headerShown:false}}/>
            <stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{ headerShown: false, gestureEnabled: false }} 
            />
            <stack.Screen name="Chat" component={ChatScreen} options={{headerShown:false}}/>
            <stack.Screen name="Profile" component={ProfileScreen} options={{headerShown:false}}/>
        </stack.Navigator>
        
    )
}
