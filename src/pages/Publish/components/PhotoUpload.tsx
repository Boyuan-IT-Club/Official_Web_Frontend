// pages/Publish/components/PhotoUpload.tsx
import React from 'react';
import { Upload, Spin, Form, Typography } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Text } = Typography;

type Props = {
  photoBase64?: string;
  onUpload: (file: File) => void | Promise<void> | boolean | Promise<boolean>;
  isCompressing?: boolean;
  disabled?: boolean;
  label?: string;
};

const PhotoUpload: React.FC<Props> = ({
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
      <div style={{ textAlign: 'center' }}>
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
};

export default PhotoUpload;
