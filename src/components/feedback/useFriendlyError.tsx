import { App } from 'antd';
import { FriendlyErrorContent } from './FriendlyError';

export function useFriendlyError() {
  const { modal } = App.useApp();
  return (error: unknown, title = 'Chưa thể hoàn tất thao tác') => modal.error({
    icon: null,
    title: null,
    centered: true,
    width: 440,
    content: <FriendlyErrorContent error={error} title={title} compact />,
    okText: 'Đã hiểu',
  });
}
