// pages/Publish/components/RadioGroupField.tsx
import React from 'react';
import { Form, Radio } from 'antd';
import type { RadioGroupProps } from 'antd';

type OptionItem = {
  value: string;
  label: string;
};

type Props = {
  label: React.ReactNode;
  name: string;
  value?: string;
  onChange?: RadioGroupProps['onChange'];
  options?: OptionItem[];
  disabled?: boolean;
  required?: boolean;
} & Omit<RadioGroupProps, 'value' | 'onChange' | 'disabled'>;

const RadioGroupField: React.FC<Props> = ({
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
      rules={required ? [{ required: true, message: `请选择${String(label)}` }] : []}
    >
      <Radio.Group value={value} onChange={onChange} disabled={disabled} {...props}>
        {options.map((option) => (
          <Radio key={option.value} value={option.value}>
            {option.label}
          </Radio>
        ))}
      </Radio.Group>
    </Form.Item>
  );
};

export default RadioGroupField;
