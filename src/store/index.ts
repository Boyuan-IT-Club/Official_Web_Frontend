// src/store/index.ts
//组合redux子模块+导出store实例

import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./modules/user";
import resumeReducer from "./modules/resume";
import resumeFieldsReducer from './modules/resumeFields';

export const store = configureStore({
  reducer: {
    user: userReducer,
    resume: resumeReducer,
    resumeFields: resumeFieldsReducer,
  },
});

// 推导 RootState / AppDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
