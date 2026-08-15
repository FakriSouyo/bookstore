'use client';

// React 19 compatibility for antd v5 static APIs (message/notification/Modal.confirm).
import '@ant-design/v5-patch-for-react-19';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App as AntdApp, ConfigProvider } from 'antd';

import { antdTheme } from '@/lib/theme/antd-theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider theme={antdTheme}>
        {/* antd <App> provides context-based message/notification for all screens. */}
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
