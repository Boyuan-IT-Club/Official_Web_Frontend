// pages/Publish/components/TextAreaField.tsx
import React from 'react';
import { Form, Input } from 'antd';
import type { TextAreaProps } from 'antd/es/input';

const { TextArea } = Input;

type Props = {
  label: React.ReactNode;
  name: string;
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
} & Omit<TextAreaProps, 'value' | 'onChange' | 'rows' | 'disabled' | 'placeholder'>;

const TextAreaField: React.FC<Props> = ({
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
      rules={required ? [{ required: true, message: `${String(label)}不能为空` }] : []}
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
