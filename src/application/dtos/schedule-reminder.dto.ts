export type ScheduleReminderInput = {
  readonly taskId: string;
  readonly userId: string;
  readonly scheduledAt: string;
};

export type ScheduleReminderResponse = {
  readonly reminderId: string;
  readonly taskId: string;
  readonly scheduledAt: string;
};
