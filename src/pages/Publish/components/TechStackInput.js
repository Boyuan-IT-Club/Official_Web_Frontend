import React from 'react';
import { Input, Button, Space } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

const TechStackInput = ({
  items = [],
  onChange,
  onAdd,
  onRemove,
  disabled = false,
  placeholder = "请输入技术栈"
}) => {
  return (
    <div className="tech-stack-container">
      {items.map((item, index) => (
        <div key={index} className="tech-stack-item">
          <Input
            placeholder={placeholder}
            value={item}
            onChange={(e) => onChange(index, e.target.value)}
            disabled={disabled}
            style={{ marginBottom: 8 }}
          />
          {items.length > 1 && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => onRemove(index)}
              disabled={disabled}
              className="remove-tech-btn"
            />
          )}
        </div>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={onAdd}
        disabled={disabled}
        style={{ width: '100%' }}
      >
        添加技术栈
      </Button>
    </div>
  );
};

export default TechStackInput;