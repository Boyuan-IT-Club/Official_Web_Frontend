// pages/Publish/components/TipsCard.js
import React from 'react';
import { Card, Button } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const TipsCard = ({ 
  tips = [], 
  title = "填写注意事项",
  showTips,
  onToggleTips 
}) => {
  return (
    <div className="tips-section">
      <Button 
        type="default" 
        icon={<InfoCircleOutlined />} 
        onClick={onToggleTips}
        style={{ marginBottom: 16, width: '100%' }}
      >
        {showTips ? '收起提示' : '填写提示'}
      </Button>
      
      {showTips && (
        <Card 
          size="small" 
          title={title} 
          className="tips-card" 
          headStyle={{ color: '#1f3a60', borderBottom: '1px solid #d9d9d9' }}
        >
          <div className="tips-content">
            {tips.map((tip, index) => (
              <div key={index} className="tip-item" style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#1f3a60' }}>{tip.title}:</strong>
                <p style={{ color: '#595959', margin: '4px 0 0 0', lineHeight: '1.6' }}>
                  {tip.content}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default TipsCard;