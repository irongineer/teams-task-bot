export type CreateTaskInput = {
  readonly userId: string;
  readonly title: string;
  readonly description?: string;
  readonly dueDate?: string;
  readonly conversationReference: {
    readonly conversationId: string;
    readonly tenantId: string;
    readonly serviceUrl: string;
  };
};
