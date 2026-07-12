import type { ThemeConfig } from 'antd';

// Medical design system mapped onto Ant Design theme tokens so the app does
// not read as default/generic AntD — see src/styles/tokens/_colors.scss and
// _elevation.scss for the CSS custom properties this mirrors.
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1e5e9e',
    colorInfo: '#2878c8',
    colorSuccess: '#238a57',
    colorWarning: '#b7791f',
    colorError: '#c83e4d',
    colorTextBase: '#172033',
    colorTextSecondary: '#5f6b7a',
    colorTextTertiary: '#8792a2',
    colorBgBase: '#ffffff',
    colorBgLayout: '#f3f6f9',
    colorBgContainer: '#ffffff',
    colorBorder: '#dce4ec',
    colorBorderSecondary: '#e9eff4',
    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    controlHeight: 36,
    boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.04)',
    boxShadowSecondary: '0 1px 2px rgba(16,24,40,0.05), 0 8px 20px rgba(16,24,40,0.06)',
    wireframe: false,
  },
  components: {
    Button: {
      controlHeight: 36,
      fontWeight: 600,
      primaryShadow: 'none',
      dangerShadow: 'none',
      defaultShadow: 'none',
    },
    Card: {
      borderRadiusLG: 10,
      paddingLG: 20,
      headerFontSize: 15,
    },
    Layout: {
      siderBg: '#0f2f4d',
      headerBg: '#ffffff',
      bodyBg: '#f3f6f9',
      headerHeight: 60,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(52,145,230,0.22)',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemColor: 'rgba(255,255,255,0.68)',
      darkItemSelectedColor: '#ffffff',
      itemBorderRadius: 8,
      itemMarginInline: 8,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#5f6b7a',
      borderColor: '#dce4ec',
      rowHoverBg: '#f5f9fc',
    },
    Tag: {
      defaultBg: '#f8fafc',
      borderRadiusSM: 6,
    },
    Statistic: {
      contentFontSize: 26,
    },
    Steps: {
      colorPrimary: '#1e5e9e',
    },
    Tabs: {
      inkBarColor: '#1e5e9e',
      itemSelectedColor: '#1e5e9e',
      itemHoverColor: '#174a7c',
    },
  },
};
