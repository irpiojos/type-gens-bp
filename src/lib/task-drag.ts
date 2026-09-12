export type TaskDragSource = "day" | "member" | "unscheduled";

export type TaskDragPayload = {
  taskId: string;
  source: TaskDragSource;
};

/** Active HTML5 drag payload — needed because getData() is empty during dragover. */
let active: TaskDragPayload | null = null;

export function setActiveTaskDrag(payload: TaskDragPayload | null) {
  active = payload;
}

export function getActiveTaskDrag() {
  return active;
}

export function dragTypesIncludeTask(types: readonly string[]) {
  const list = Array.from(types);
  return (
    list.includes("application/x-ttm-task") ||
    list.includes("text/plain") ||
    list.some((t) => t.startsWith("application/x-ttm-from-"))
  );
}
