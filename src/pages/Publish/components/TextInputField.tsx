// pages/Publish/components/TextInputField.tsx
import React from 'react';
import { Form, Input } from 'antd';
import type { InputProps } from 'antd/es/input';

type Props = {
  label: React.ReactNode;
  name: string;
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  required?: boolean;
  className?: string;
} & Omit<InputProps, 'value' | 'onChange' | 'disabled' | 'placeholder'>;

const TextInputField: React.FC<Props> = ({
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
      rules={required ? [{ required: true, message: `${String(label)}不能为空` }] : []}
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
