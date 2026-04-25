import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginPage from '../screens/LoginPage';
import SignupPage from '../screens/SignupPage';
import CreateProfilePage from '../screens/CreateProfile';
import StudentPage from '../screens/studentPage';
import CreatePage2 from '../screens/CreatePage2';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ 
        headerShown: false,
        animation: 'fade' 
      }}
    >
      <Stack.Screen name="Login" component={LoginPage} />
      <Stack.Screen name="Signup" component={SignupPage} />
      <Stack.Screen name="CreateProfile" component={CreateProfilePage} />
      <Stack.Screen name="CreatePage2" component={CreatePage2} />
      <Stack.Screen name="StudentPage" component={StudentPage} />
    </Stack.Navigator>
  );
};

export default AuthStack;