import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Empty } from 'antd';
import dayjs from 'dayjs';

// modular 引入:只注册用到的折线图 + 网格/提示 + Canvas 渲染器,显著减包体(review D2)
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface Props {
  points: { evaluatedAt: string; totalScore: number }[];
}

/** 评测得分趋势折线图(echarts)。y 轴 0–500(5-task 制,review F2)。 */
const ScoreTrendChart: React.FC<Props> = ({ points }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = echarts.init(containerRef.current);
    const onResize = () => chartRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption(
      {
        tooltip: { trigger: 'axis' },
        grid: { left: 44, right: 20, top: 24, bottom: 32 },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: points.map((p) => dayjs(p.evaluatedAt).format('MM-DD HH:mm')),
        },
        yAxis: { type: 'value', min: 0, max: 500 },
        series: [
          {
            type: 'line',
            smooth: true,
            symbolSize: 7,
            data: points.map((p) => p.totalScore),
            lineStyle: { width: 2.5 },
            areaStyle: { opacity: 0.08 },
          },
        ],
      },
      true,
    );
  }, [points]);

  if (points.length === 0) {
    return <Empty description="暂无趋势数据" />;
  }
  return <div ref={containerRef} style={{ width: '100%', height: 260 }} />;
};

export default ScoreTrendChart;