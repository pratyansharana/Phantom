import type { ActivityEventType } from '../types/activity';

const EVENT_LABELS: Record<ActivityEventType, string> = {
  connection_request_sent: 'Connection request sent',
  connection_request_accepted: 'Connection accepted',
  connection_request_declined: 'Connection declined',
  group_created: 'Group created',
  group_invite_sent: 'Group invite sent',
  group_invite_accepted: 'Group invite accepted',
  group_invite_declined: 'Group invite declined',
  direct_chat_created: 'Direct chat opened',
  message_sent: 'Encrypted message sent',
};

export const labelForEvent = (type: ActivityEventType) => EVENT_LABELS[type] ?? type;

export const formatTimestamp = (value?: Date) => {
  if (!value) return '—';
  return value.toLocaleString();
};
