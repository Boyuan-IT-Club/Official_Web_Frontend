// pages/Publish/components/SelectField.tsx
import React from 'react';
import { Form, Select } from 'antd';
import type { SelectProps } from 'antd';

type OptionItem = {
  value: string;
  label: string;
};

type Props = {
  label: React.ReactNode;
  name: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: OptionItem[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
  disabledOptions?: string[];
} & Omit<SelectProps<string>, 'options' | 'value' | 'onChange' | 'disabled' | 'placeholder'>;

const SelectField: React.FC<Props> = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  className = '',
  disabledOptions = [],
  ...props
}) => {
  return (
    <Form.Item
      label={label}
      name={name}
      rules={required ? [{ required: true, message: `请选择${String(label)}` }] : []}
      className={className}
    >
      <Select<string>
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${className} black-text-select`}
        getPopupContainer={(trigger) => (trigger.parentNode as HTMLElement) || document.body}
        dropdownStyle={{ zIndex: 9999 }}
        suffixIcon={<span className="ant-select-arrow-icon" />}
        {...props}
      >
        {options.map((option) => (
          <Select.Option
            key={option.value}
            value={option.value}
            className="black-text-option"
            disabled={disabledOptions.includes(option.value)}
          >
            {option.label}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
};

export default SelectField;
