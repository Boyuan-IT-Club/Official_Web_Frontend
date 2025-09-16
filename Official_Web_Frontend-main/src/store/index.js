//组合redux子模块+导出store实例

import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./modules/user";
import resumeReducer from "./modules/resume";

export default configureStore({
    reducer: {
        user: userReducer,
        resume: resumeReducer,
    }
}); 