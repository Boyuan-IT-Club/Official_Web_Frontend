import React from 'react';
import { Form, Input } from 'antd';

const { TextArea } = Input;

const TextAreaField = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  rows = 4,
  disabled = false,
  required = false,
  ...props
}) => {
  return (
    <Form.Item 
      label={label} 
      name={name}
      rules={required ? [{ required: true, message: `${label}不能为空` }] : []}
    >
      <TextArea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
    </Form.Item>
  );
};

export default TextAreaField;