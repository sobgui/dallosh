// Simple background task manager for async jobs (e.g., S3 uploads)

const tasks: Promise<any>[] = [];

export function addTask(task: () => Promise<void>) {
  const p = task().catch((err) => {
    // Log error, could add retry logic here
    console.error('[TaskManager] Background task failed:', err);
  });
  tasks.push(p);
}

export async function waitAllTasks() {
  await Promise.all(tasks);
} 