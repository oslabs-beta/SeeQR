import { configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import appViewReducer from './Slices/AppViewSlice';
import menuReducer from './Slices/MenuSlice';
import queryReducer from './Slices/QuerySlice';

// Configure the Redux store with slices for app view, menu, and query state
const store = configureStore({
  reducer: {
    appView: appViewReducer,
    menu: menuReducer,
    query: queryReducer,
  },
});

// exporting type of State for use in other files
export type RootState = ReturnType<typeof store.getState>;
// exporting dispatch type & useDispatch method to use in component files
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

export default store;
