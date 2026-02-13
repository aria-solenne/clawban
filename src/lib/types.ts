export const STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "done",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export const PRIORITIES = ["low", "med", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ASSIGNEES = ["unassigned", "rajin", "aria", "both"] as const;
export type Assignee = (typeof ASSIGNEES)[number];

export type Task = {
  id: string;
  title: string;
  description?: string;
  assignee: Assignee;
  status: Status;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
};

export type Board = {
  tasks: Task[];
};
