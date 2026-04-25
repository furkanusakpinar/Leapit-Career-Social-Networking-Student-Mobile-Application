import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AuthStack from './AuthStack';
import UserStack from './UserStack';
import Loading from '../components/Loading';

const linking = {
  prefixes: ['leapit://'], 
  config: {
    screens: {
      
      JobApproval: 'approve-job/:jobId',
      
      JobApproval_Reject: {
        path: 'reject-job/:jobId',
        parse: { jobId: (id) => id },
      }
    },
  },
};

const RootNavigation = () => {
  const isAuth = useSelector(state => state.user.isAuth);
  const isLoading = useSelector(state => state.user.isLoading);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuth ? <UserStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigation;