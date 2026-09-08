// 简历卡片上的照片头像：有照片渲染照片，没照片（或取不到）回落占位图标。
// 单独成组件是因为取照片要走 hook，而列表的 renderItem 回调里不能调 hook。
import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useResumePhoto } from '@/hooks/useResumePhoto';

export interface ResumePhotoAvatarProps {
  resumeId?: number | string | null;
  /** personal_photo 字段值：历史 base64 或 COS objectKey */
  value?: string | null;
  size?: number | 'large' | 'small' | 'default';
}

const ResumePhotoAvatar: React.FC<ResumePhotoAvatarProps> = ({ resumeId, value, size = 'large' }) => {
  const url = useResumePhoto(resumeId, value);
  return <Avatar size={size} src={url || undefined} icon={<UserOutlined />} />;
};

export default ResumePhotoAvatar;
