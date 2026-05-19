import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { BottomTabs } from 'react-native-screens';
import MainTabs from './MainTabs';

const stack = createNativeStackNavigator();

export default function AppNavigator(){

    return (
        <stack.Navigator>
            <stack.Screen name="Login" component={LoginScreen} options={{headerShown:false}}  />
            <stack.Screen name="Signup" component={SignupScreen} options={{headerShown:false}}/>
            
            <stack.Screen 
                name="MainTabs" 
                component={MainTabs} 
                // Disable header and gestures so they can't swipe back to Login
                options={{ headerShown: false, gestureEnabled: false }} 
            />
        </stack.Navigator>
        
    )
}