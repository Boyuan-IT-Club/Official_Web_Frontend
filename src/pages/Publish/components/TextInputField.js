import React from 'react';
import { Form, Input } from 'antd';

const TextInputField = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <Form.Item 
      label={label} 
      name={name}
      rules={required ? [{ required: true, message: `${label}不能为空` }] : []}
      className={className}
    >
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
    </Form.Item>
  );
};

export default TextInputField;