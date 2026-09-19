// /main/feedback 路由的薄壳。
//
// 入口现在在顶栏头像菜单里（点开是弹窗），这条路由保留给直接访问链接的人，
// 正文与弹窗共用 FeedbackPanel，不再各写一份。
import React from 'react';
import FeedbackPanel from '@/components/FeedbackPanel';

const FeedbackPage: React.FC = () => <FeedbackPanel />;

export default FeedbackPage;
