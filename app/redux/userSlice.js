import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  email: '',
  password: '',
  isLoading: true,
  isAuth: false,
  userId: null,
  userInfo: {},
  publicVisibility: false, 
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setEmail: (state, action) => { state.email = action.payload; },
    setPassword: (state, action) => { state.password = action.payload; },
    setCredentials: (state, action) => {
      state.email = action.payload.email;
      state.password = action.payload.password;
    },
    setLoading: (state, action) => { state.isLoading = action.payload; },
    setAuth: (state, action) => { state.isAuth = action.payload; },
    setUserId: (state, action) => { state.userId = action.payload; },
    setUserInfo: (state, action) => { state.userInfo = action.payload; },
    setPublicVisibility: (state, action) => { state.publicVisibility = action.payload; },
    resetUser: (state) => {
      state.email = '';
      state.password = '';
      state.isLoading = false;
      state.isAuth = false;
      state.userId = null;
      state.userInfo = {};
      state.publicVisibility = false; 
    },
    logoutUser: () => initialState,
  },
});

export const {
  setEmail,
  setPassword,
  setCredentials,
  setLoading,
  setAuth,
  setUserId,
  setUserInfo,
  setPublicVisibility,
  resetUser,
  logoutUser,
} = userSlice.actions;

export default userSlice.reducer;
