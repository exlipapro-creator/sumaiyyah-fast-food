interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  testId?: string;
}

export default function EmptyState({ icon = "📋", title, description, action, testId }: EmptyStateProps) {
  return (
    <div data-testid={testId} className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-400 mb-6 max-w-xs">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
