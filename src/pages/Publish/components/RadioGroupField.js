import React from 'react';
import { Form, Radio } from 'antd';

const RadioGroupField = ({
  label,
  name,
  value,
  onChange,
  options = [],
  disabled = false,
  required = false,
  ...props
}) => {
  return (
    <Form.Item 
      label={label} 
      name={name}
      rules={required ? [{ required: true, message: `请选择${label}` }] : []}
    >
      <Radio.Group 
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
      >
        {options.map(option => (
          <Radio key={option.value} value={option.value}>
            {option.label}
          </Radio>
        ))}
      </Radio.Group>
    </Form.Item>
  );
};

export default RadioGroupField;