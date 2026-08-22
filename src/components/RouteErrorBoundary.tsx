import React, { useEffect } from 'react';
import { Button, Result } from 'antd';
import { useRouteError } from 'react-router-dom';
import { isChunkLoadError } from '@/utils/chunkError';

/**
 * 路由级错误兜底：
 * - 发布后旧缓存导致的分包加载失败（ChunkLoadError）自动强刷一次恢复；
 * - 其他错误展示友好页面而非白屏堆栈。
 */
const RouteErrorBoundary: React.FC = () => {
  const error: any = useRouteError();

  const isChunkError = isChunkLoadError(error);

  useEffect(() => {
    if (!isChunkError) return;
    // 防死循环：同一会话只自动刷新一次
    const KEY = 'chunk-reload-once';
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, '1');
      window.location.reload();
    }
  }, [isChunkError]);

  useEffect(() => {
    // 正常加载成功后清除标记，允许下次发布再自动恢复
    if (!isChunkError) sessionStorage.removeItem('chunk-reload-once');
  }, [isChunkError]);

  return (
    <Result
      status="warning"
      title={isChunkError ? '页面已更新' : '页面出了点问题'}
      subTitle={isChunkError ? '网站刚刚发布了新版本，请刷新以加载最新页面' : '请刷新重试；若持续出现请联系管理员'}
      extra={
        <Button type="primary" onClick={() => { sessionStorage.removeItem('chunk-reload-once'); window.location.reload(); }}>
          刷新页面
        </Button>
      }
    />
  );
};

export default RouteErrorBoundary;
