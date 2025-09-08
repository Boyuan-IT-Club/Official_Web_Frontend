// components/TechStackInput.js
import React from 'react';
import { Input, Button, Space } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

const TechStackInput = ({
  items = [''],
  onChange,
  onAdd,
  onRemove,
  disabled = false,
  placeholder = "请输入技术栈"
}) => {
  return (
    <div className="tech-stack-container">
      {items.map((item, index) => (
        <div key={index} className="tech-stack-item" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <Input
            placeholder={placeholder}
            value={item}
            onChange={(e) => onChange(index, e.target.value)}
            disabled={disabled}
            style={{ marginRight: 8 }}
          />
          {items.length > 1 && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => onRemove(index)}
              disabled={disabled}
              style={{ color: '#ff4d4f', marginRight: 8 }}
            />
          )}
          {index === items.length - 1 && (
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
};

export default TechStackInput;