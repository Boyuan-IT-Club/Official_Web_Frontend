// pages/Publish/components/TechStackInput.tsx
import React from 'react';
import { Input, Button } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

type Props = {
  items?: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  placeholder?: string;
};

const TechStackInput: React.FC<Props> = React.memo(({
  items = [''],
  onChange,
  onAdd,
  onRemove,
  disabled = false,
  placeholder = '请输入技术栈',
}) => {
  /*
   * 空数组要当成「一个空行」渲染。
   *
   * items=[''] 的默认值只在 items 为 undefined 时生效，空数组照单全收，
   * 于是一行都不画——而「加一行」的按钮是挂在最后一行上的，没有行就没有按钮，
   * 整个技术栈栏彻底动不了。
   *
   * 触发路径：留着几个空行提交简历 → 保存时空行被过滤掉，存进去的是 []
   * → 再进来编辑，读回来就是空数组。用户报的正是这条。
   */
  const rows = items.length > 0 ? items : [''];

  return (
    <div className="tech-stack-container">
      {rows.map((item, index) => (
        <div
          key={index}
          className="tech-stack-item"
          style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}
        >
          <Input
            placeholder={placeholder}
            value={item}
            onChange={(e) => onChange(index, e.target.value)}
            disabled={disabled}
            style={{ marginRight: 8 }}
          />

          {rows.length > 1 && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => onRemove(index)}
              disabled={disabled}
              style={{ color: '#ff4d4f', marginRight: 8 }}
            />
          )}

          {index === rows.length - 1 && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAdd}
              disabled={disabled}
              className="add-button"
              style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
            />
          )}
        </div>
      ))}
    </div>
  );
});

export default TechStackInput;
