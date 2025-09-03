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
          // 修改标题颜色为深蓝色
          headStyle={{ color: '#1f3a60', borderBottom: '1px solid #d9d9d9' }}
        >
          <ul className="tips-list">
            {tips.map((tip, index) => (
              <li key={index} className="tip-item" style={{ color: '#595959', marginBottom: '8px' }}>{tip}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default TipsCard;