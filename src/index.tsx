import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux'
import store from './store';
// @routes 由 craco 按 REACT_APP_MODE 解析到 router/user.tsx 或 router/admin.tsx（双构建拆分）
import router from '@routes';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
// @theme 由 craco 按 REACT_APP_MODE 解析到 theme/admin.ts 或 theme/user.ts
import theme from '@theme';
import 'normalize.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={theme} locale={zhCN}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);
