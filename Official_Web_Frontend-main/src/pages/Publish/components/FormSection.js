import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const FormSection = ({ 
  title, 
  icon, 
  children, 
  className = '' 
}) => {
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