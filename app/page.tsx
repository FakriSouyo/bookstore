'use client';

import { BookOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Space, Typography } from 'antd';

import { formatMoney } from '@/lib/utils/money';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 480 }}>
        <Flex vertical gap={12} align="flex-start">
          <Typography.Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined /> Bookstore Management
          </Typography.Title>
          <Typography.Text type="secondary">
            Foundation is ready — themed with the Ant Design token system. Business screens land in
            F-04 onward.
          </Typography.Text>
          <Typography.Text className="tabular-nums" strong style={{ fontSize: 28 }}>
            {formatMoney(123456)}
          </Typography.Text>
          <Space>
            <Button type="primary" icon={<PlusOutlined />}>
              New sale (F-10)
            </Button>
            <Button>Settings (F-03+)</Button>
          </Space>
        </Flex>
      </Card>
    </main>
  );
}
