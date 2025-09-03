// pages/Publish/components/SelectField.js
import React from 'react';
import { Form, Select } from 'antd';

const SelectField = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  className = ''
}) => {
  return (
    <Form.Item
      label={label}
      name={name}
      rules={required ? [{ required: true, message: `请选择${label}` }] : []}
    >
      <Select
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${className} black-text-select`}
        getPopupContainer={trigger => trigger.parentNode}
      >
        {options.map(option => (
          <Select.Option 
            key={option.value} 
            value={option.value}
            className="black-text-option"
          >
            {option.label}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
};

export default SelectField;