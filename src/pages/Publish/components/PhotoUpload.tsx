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
  /** 本届把个人照片配成必填时为 true —— 真正参与校验，见下方 rules */
  required?: boolean;
};

const PhotoUpload: React.FC<Props> = React.memo(({
  photoBase64 = '',
  onUpload,
  isCompressing = false,
  disabled = false,
  label = '个人照片',
  required = false,
}) => {
  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    // antd Upload 返回的是 RcFile（继承 File），这里直接当 File 用即可
    await onUpload(file as unknown as File);
    return false; // 阻止自动上传，保持原逻辑
  };

  return (
    /*
      required 以前只是声明了一个 prop、从头到尾没用过：红星没画、规则也没加，
      于是「个人照片」配成必填也拦不住任何人（线上真的有人没传照片就投出来了）。

      照片的值走 redux（handleFieldChange），不进 antd Form，所以不能用
      rules:[{required:true}] —— 那样传了照片也永远通不过。改成读 photoBase64
      的校验器：它才是「到底有没有照片」的唯一事实来源。
    */
    <Form.Item
      label={label}
      name="personal_photo"
      className="photo-label"
      required={required}
      rules={required ? [{
        validator: () => (photoBase64
          ? Promise.resolve()
          : Promise.reject(new Error('请上传个人照片'))),
      }] : undefined}
    >
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
