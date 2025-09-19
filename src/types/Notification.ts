export type Notification = {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
};
