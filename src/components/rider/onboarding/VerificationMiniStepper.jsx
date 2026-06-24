import { Fragment } from 'react';
import { Check, Clock, Circle, XCircle, Loader2 } from 'lucide-react';
import { VERIFICATION_TASKS } from '@/lib/verification';

const STATUS_ICON = {
  not_started: Circle,
  in_progress: Clock,
  processing: Loader2,
  submitted: Check,
  verified: Check,
  rejected: XCircle,
};

const STATUS_COLOR = {
  not_started: 'bg-muted text-muted-foreground border-border',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-200',
  processing: 'bg-amber-50 text-amber-600 border-amber-200',
  submitted: 'bg-blue-50 text-blue-600 border-blue-200',
  verified: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function VerificationMiniStepper({ tasks, activeIndex, onSelect }) {
  return (
    <div className="space-y-1.5">
      {/* Step dots with connecting lines */}
      <div className="flex items-center">
        {VERIFICATION_TASKS.map((task, i) => {
          const taskStatus = tasks[i]?.status || 'not_started';
          const isActive = i === activeIndex;
          const isDone = taskStatus === 'submitted' || taskStatus === 'verified';
          const Icon = STATUS_ICON[taskStatus] || Circle;
          return (
            <Fragment key={task.id}>
              <button
                onClick={() => onSelect?.(i)}
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold transition-all flex-shrink-0 ${
                  isActive ? 'ring-4 ring-primary/20 ' : ''
                }${STATUS_COLOR[taskStatus]}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isDone ? 'stroke-[3]' : ''}`} />
              </button>
              {i < VERIFICATION_TASKS.length - 1 && (
                <div className={`flex-1 h-1 mx-0.5 rounded-full transition-colors ${isDone ? 'bg-success/30' : 'bg-border'}`} />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        {VERIFICATION_TASKS.map((task, i) => (
          <span
            key={task.id}
            className={`text-[9px] font-medium text-center transition-colors flex-1 ${
              i === activeIndex ? 'text-primary font-bold' : 'text-muted-foreground/60'
            }`}
          >
            {task.short}
          </span>
        ))}
      </div>
    </div>
  );
}