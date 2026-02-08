import { type Task } from '../../models/task.js';

export interface NotificationSender {
  sendReminder(task: Task): Promise<void>;
}
