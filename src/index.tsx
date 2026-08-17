import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux'
import store from './store';
// @routes 由 craco 按 REACT_APP_MODE 解析到 router/user.tsx 或 router/admin.tsx（双构建拆分）
import router from '@routes';
// 皮肤上下文内部已包含 ConfigProvider（含 zhCN），主题由用户选择决定
import { SkinProvider } from './theme/SkinProvider';
import 'normalize.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <SkinProvider>
        <RouterProvider router={router} />
      </SkinProvider>
    </Provider>
  </React.StrictMode>
);
