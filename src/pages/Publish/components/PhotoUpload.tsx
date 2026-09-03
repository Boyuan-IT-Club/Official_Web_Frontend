// pages/Publish/components/PhotoUpload.tsx
import React from 'react';
import { Upload, Spin, Form, Typography } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import './photoUpload.scss';

const { Text } = Typography;

type Props = {
  photoBase64?: string;
  onUpload: (file: File) => void | Promise<void> | boolean | Promise<boolean>;
  isCompressing?: boolean;
  disabled?: boolean;
  label?: string;
  required?: boolean;  // 添加 required 属性
};

const PhotoUpload: React.FC<Props> = React.memo(({
  photoBase64 = '',
  onUpload,
  isCompressing = false,
  disabled = false,
  label = '个人照片',
}) => {
  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    // antd Upload 返回的是 RcFile（继承 File），这里直接当 File 用即可
    await onUpload(file as unknown as File);
    return false; // 阻止自动上传，保持原逻辑
  };

  return (
    <Form.Item label={label} name="personal_photo" className="photo-label">
      {/*
        尺寸样式挂在这个类上，不再依赖外层的 .photo-container ——
        那个包裹层在投递表单改成数据驱动之后就没了，原来那条 120×160 的规则
        整块失效，照片框退回 antd picture-card 的方形默认值。
        样式跟着组件走，换容器就不会再悄悄失效。
      */}
      <div className="photo-upload" style={{ textAlign: 'center' }}>
        <Upload
          name="personal_photo"
          listType="picture-card"
          showUploadList={false}
          beforeUpload={beforeUpload}
          accept="image/*"
          disabled={disabled || isCompressing}
        >
          {isCompressing ? (
            <Spin />
          ) : photoBase64 ? (
            <img
              src={photoBase64}
              alt="个人照片"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '4px',
              }}
            />
          ) : (
            <div>
              <UploadOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
              <div style={{ marginTop: 8, color: '#000' }}>上传照片</div>
            </div>
          )}
        </Upload>
        <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: '12px' }}>
          建议上传正面免冠照片，大小不超过5MB
        </Text>
      </div>
    </Form.Item>
  );
});

export default PhotoUpload;
