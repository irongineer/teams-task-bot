export type TaskResponse = {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly description?: string;
  readonly status: string;
  readonly dueDate?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reminders: ReadonlyArray<{
    readonly id: string;
    readonly scheduledAt: string;
    readonly sentAt?: string;
  }>;
};
