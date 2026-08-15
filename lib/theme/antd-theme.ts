/**
 * Ant Design ThemeConfig — maps the design tokens onto AntD's theme system.
 * See skills/bookstore-ui/SKILL.md (ConfigProvider + component tokens).
 */

import type { ThemeConfig } from 'antd';

import { tokens } from './tokens';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: tokens.color.primary,
    colorSuccess: tokens.color.success,
    colorWarning: tokens.color.warning,
    colorError: tokens.color.error,
    colorInfo: tokens.color.info,
    colorBgLayout: tokens.color.background,
    colorBgContainer: tokens.color.surface,
    colorBorder: tokens.color.border,
    colorText: tokens.color.text,
    colorTextSecondary: tokens.color.textSecondary,
    borderRadius: tokens.radius,
    fontSize: tokens.fontSize,
    fontFamily: tokens.fontFamily,
  },
  components: {
    Layout: { headerBg: tokens.color.surface, siderBg: tokens.color.surface },
    Table: { headerBg: tokens.color.background, headerColor: tokens.color.textSecondary },
    Button: { controlHeight: 36 },
    Card: { headerBg: 'transparent' },
  },
};
