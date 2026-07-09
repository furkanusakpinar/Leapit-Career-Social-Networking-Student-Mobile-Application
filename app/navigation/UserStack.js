import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';


import HomePage from '../screens/HomePage';
import Social from '../screens/Social';
import SendMessage from '../screens/SendMessage';
import ProfilePage from '../screens/ProfilePage';
import SettingPage from '../screens/SettingsPage';
import PhotoSharePage from '../screens/PhotoSharePage';
import SharePage from '../screens/SharePage';
import ProjectPage from '../screens/ProjectPage';
import PublicPage from '../screens/PublicPage';
import UsePage from '../screens/UsePage';
import JobsPage from '../screens/JobsPage';
import JobsPostingPage from '../screens/JobsPostingPage';
import JobsDetail from '../screens/JobsDetail';
import JobsPost2 from '../screens/JobsPost2';
import JobsPost3 from '../screens/JobsPost3';
import OtherProfilePage from '../screens/OtherProfilePage';
import SeeAllUsers from '../screens/SeeAllUsers';
import NotificationsPage from '../screens/NotificationsPage';
import BlogPage from '../screens/BlogPage';
import BlogPublicPage from '../screens/BlogPublicPage';
import CompanyProfilePage from '../screens/CompanyProfilePage';
import SchoolProfilePage from '../screens/SchoolProfilePage';
import JobApproval from '../screens/JobApproval';
import AdminJobsList from '../screens/AdminJobsList';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();


const SwipeableHome = () => {
  return (
    <Tab.Navigator
      initialRouteName="HomePage"
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' }, 
        swipeEnabled: true,
        lazy: true, 
      }}
    >
      <Tab.Screen name="HomePage" component={HomePage} />
      <Tab.Screen name="Social" component={Social} />
      <Tab.Screen name="JobsPage" component={JobsPage} />
      <Tab.Screen name="NotificationsPage" component={NotificationsPage} />
    </Tab.Navigator>
  );
};


const UserStack = () => {
  return (
    <Stack.Navigator
      initialRouteName='MainSwipe'
      screenOptions={{
        headerShown: false, 
        animation: 'slide_from_right', 
      }}
    >
      {}
      <Stack.Screen
        name="MainSwipe"
        component={SwipeableHome}
      />

      {}
      <Stack.Screen name="ProfilePage" component={ProfilePage} />
      <Stack.Screen name="SettingPage" component={SettingPage} />
      <Stack.Screen name="PhotoSharePage" component={PhotoSharePage} />
      <Stack.Screen name="SharePage" component={SharePage} />
      <Stack.Screen name="PublicPage" component={PublicPage} />
      <Stack.Screen name="UsePage" component={UsePage} />
      <Stack.Screen name="JobsPage" component={JobsPage} />
      <Stack.Screen name="JobsPostingPage" component={JobsPostingPage} />
      <Stack.Screen name="JobsDetail" component={JobsDetail} />
      <Stack.Screen name="JobsPost2" component={JobsPost2} />
      <Stack.Screen name="JobsPost3" component={JobsPost3} />
      <Stack.Screen name="OtherProfilePage" component={OtherProfilePage} />
      <Stack.Screen name="SeeAllUsers" component={SeeAllUsers} />
      <Stack.Screen name="NotificationsPage" component={NotificationsPage} />
      <Stack.Screen name="BlogPage" component={BlogPage} />
      <Stack.Screen name="BlogPublicPage" component={BlogPublicPage} />
      <Stack.Screen name="CompanyProfilePage" component={CompanyProfilePage} />
      <Stack.Screen name="SchoolProfilePage" component={SchoolProfilePage} />
      <Stack.Screen name="SendMessage" component={SendMessage} />
      <Stack.Screen name="ProjectPage" component={ProjectPage} />
      <Stack.Screen name="JobApproval" component={JobApproval} />
      <Stack.Screen name="AdminJobsList" component={AdminJobsList} />
    </Stack.Navigator>
  );
};

export default UserStack;