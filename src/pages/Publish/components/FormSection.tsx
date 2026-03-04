// pages/Publish/components/FormSection.tsx
import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

type Props = {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const FormSection: React.FC<Props> = ({ title, icon, children, className = '' }) => {
  return (
    <div className={`form-section ${className}`}>
      <Title level={4} className="section-title">
        {icon} {title}
      </Title>
      {children}
    </div>
  );
};

export default FormSection;
