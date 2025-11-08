/**
 * Task Queue Manager
 * Manages parallel processing of multiple videos and tasks
 */

export type TaskType = 'subtitle' | 'analysis' | 'translation';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  videoId: string;
  videoName: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  stage: string;
  startTime?: number;
  endTime?: number;
  error?: string;
  result?: any;
}

export type TaskUpdateCallback = (tasks: Task[]) => void;
export type TaskExecutor = (taskId: string) => Promise<any>;

class TaskQueueManager {
  private tasks: Map<string, Task> = new Map();
  private running: Set<string> = new Set();
  private maxConcurrent: number = 3; // Max 3 parallel tasks
  private listeners: Set<TaskUpdateCallback> = new Set();
  private executors: Map<string, TaskExecutor> = new Map(); // Task executors
  private pendingQueue: string[] = []; // Queue of pending task IDs
  
  /**
   * Add a new task to the queue with its executor
   */
  async addTask(
    videoId: string,
    videoName: string,
    type: TaskType,
    executor: TaskExecutor
  ): Promise<any> {
    const taskId = `${videoId}-${type}-${Date.now()}`;
    
    const task: Task = {
      id: taskId,
      videoId,
      videoName,
      type,
      status: 'pending',
      progress: 0,
      stage: 'Waiting in queue...',
    };
    
    this.tasks.set(taskId, task);
    this.executors.set(taskId, executor);
    this.pendingQueue.push(taskId);
    this.notifyListeners();
    
    // Try to start task immediately if slots available
    this.processQueue();
    
    // Wait for task completion
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        const currentTask = this.tasks.get(taskId);
        if (!currentTask) {
          reject(new Error('Task not found'));
          return;
        }
        
        if (currentTask.status === 'completed') {
          resolve(currentTask.result);
        } else if (currentTask.status === 'failed') {
          reject(new Error(currentTask.error || 'Task failed'));
        } else if (currentTask.status === 'cancelled') {
          reject(new Error('Task cancelled'));
        } else {
          // Check again in 100ms
          setTimeout(checkCompletion, 100);
        }
      };
      
      checkCompletion();
    });
  }
  
  /**
   * Update task progress
   */
  updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    Object.assign(task, updates);
    this.notifyListeners();
  }
  
  /**
   * Mark task as running
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = 'running';
    task.startTime = Date.now();
    this.running.add(taskId);
    this.notifyListeners();
  }
  
  /**
   * Mark task as completed
   */
  completeTask(taskId: string, result?: any): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = 'completed';
    task.progress = 100;
    task.endTime = Date.now();
    task.result = result;
    this.running.delete(taskId);
    this.notifyListeners();
    this.processQueue();
  }
  
  /**
   * Mark task as failed
   */
  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = 'failed';
    task.endTime = Date.now();
    task.error = error;
    this.running.delete(taskId);
    this.notifyListeners();
    this.processQueue();
  }
  
  /**
   * Cancel a task
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = 'cancelled';
    task.endTime = Date.now();
    this.running.delete(taskId);
    this.notifyListeners();
    this.processQueue();
  }
  
  /**
   * Process the queue - start pending tasks if slots available
   */
  private async processQueue(): Promise<void> {
    while (this.running.size < this.maxConcurrent && this.pendingQueue.length > 0) {
      const taskId = this.pendingQueue.shift();
      if (!taskId) break;
      
      const task = this.tasks.get(taskId);
      const executor = this.executors.get(taskId);
      
      if (!task || !executor) continue;
      
      // Start the task
      this.startTask(taskId);
      
      // Execute the task in the background
      executor(taskId)
        .then(result => {
          this.completeTask(taskId, result);
        })
        .catch(error => {
          this.failTask(taskId, error instanceof Error ? error.message : 'Unknown error');
        })
        .finally(() => {
          this.executors.delete(taskId);
          this.processQueue(); // Process next queued task
        });
    }
  }
  
  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
  }
  
  /**
   * Get tasks for a specific video
   */
  getVideoTasks(videoId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.videoId === videoId);
  }
  
  /**
   * Get running tasks
   */
  getRunningTasks(): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'running');
  }
  
  /**
   * Get pending tasks
   */
  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'pending');
  }
  
  /**
   * Check if can start more tasks
   */
  canStartMore(): boolean {
    return this.running.size < this.maxConcurrent;
  }
  
  /**
   * Subscribe to task updates
   */
  subscribe(callback: TaskUpdateCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const tasks = this.getAllTasks();
    this.listeners.forEach(listener => listener(tasks));
  }
  
  /**
   * Clear completed tasks older than 1 hour
   */
  clearOldTasks(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [id, task] of this.tasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.endTime &&
        task.endTime < oneHourAgo
      ) {
        this.tasks.delete(id);
      }
    }
    
    this.notifyListeners();
  }
  
  /**
   * Get queue statistics
   */
  getStats() {
    const tasks = this.getAllTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
  }
}

// Singleton instance
export const taskQueue = new TaskQueueManager();
