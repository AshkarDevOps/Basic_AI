'use client';

import { Card, Row, Col, Button, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface DashboardProps {
  stats: any;
  onRefresh: () => void;
}

export default function Dashboard({ stats, onRefresh }: DashboardProps) {
  return (
    <div>
      <h2>📊 Dashboard</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Total Stocks</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#3f8600' }}>
                {stats?.stocks?.total || 0}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Watchlists</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}>
                {stats?.watchlists?.total || 0}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Strategies</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#722ed1' }}>
                {stats?.strategies?.total || 0}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Total Analyses</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#cf1322' }}>
                {stats?.analysis_history?.total_executions || 0}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      <Card title="System Info" style={{ marginTop: 24 }}>
        <p><strong>Status:</strong> <Tag color="success">Healthy</Tag></p>
        <p><strong>API:</strong> http://localhost:8000</p>
        <Button type="primary" icon={<ReloadOutlined />} onClick={onRefresh}>
          Refresh Data
        </Button>
      </Card>
    </div>
  );
}