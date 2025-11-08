/**
 * Task Queue Panel - Shows all running and pending tasks
 */

import React, { useState, useEffect } from 'react';
import { taskQueue, Task } from '../services/taskQueue';

const TaskQueuePanel: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to task updates
    const unsubscribe = taskQueue.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
    });

    // Load initial tasks
    setTasks(taskQueue.getAllTasks());

    return unsubscribe;
  }, []);

  const activeTasks = tasks.filter(t => 
    t.status === 'running' || t.status === 'pending'
  );

  if (activeTasks.length === 0) {
    return null; // Don't show if no active tasks
  }

  const stats = taskQueue.getStats();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 transition-all duration-300 ${
        isExpanded ? 'w-96' : 'w-64'
      }`}>
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 rounded-t-2xl"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <span className="font-semibold text-sm">
              {stats.running} Running, {stats.pending} Pending
            </span>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            {isExpanded ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Task List */}
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto border-t border-slate-200">
            {activeTasks.map(task => (
              <div key={task.id} className="p-4 border-b border-slate-100 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {task.videoName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {task.type === 'subtitle' ? '📝 Generating Subtitles' : 
                       task.type === 'analysis' ? '🔍 Analyzing Video' : 
                       '🌐 Translating'}
                    </p>
                  </div>
                  {task.status === 'running' && (
                    <button
                      onClick={() => taskQueue.cancelTask(task.id)}
                      className="ml-2 text-slate-400 hover:text-red-500"
                      title="Cancel task"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                {task.status === 'running' && (
                  <>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">{task.stage}</p>
                  </>
                )}

                {task.status === 'pending' && (
                  <p className="text-xs text-slate-400 italic">Waiting in queue...</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {isExpanded && stats.completed > 0 && (
          <div className="p-3 bg-slate-50 rounded-b-2xl border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              ✅ {stats.completed} completed today
              {stats.failed > 0 && ` • ❌ ${stats.failed} failed`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskQueuePanel;
