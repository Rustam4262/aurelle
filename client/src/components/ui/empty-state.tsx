import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>

        <h3 className="text-lg font-semibold mb-2">{title}</h3>

        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {description}
        </p>

        {children}

        {action && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>

            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized empty states for common scenarios
export function NoDataEmptyState({
  title = 'Нет данных',
  description = 'Данные пока не загружены или недоступны',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const Icon = require('lucide-react').Database;

  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Обновить',
              onClick: onRetry,
              variant: 'outline',
            }
          : undefined
      }
    />
  );
}

export function NoResultsEmptyState({
  title = 'Ничего не найдено',
  description = 'Попробуйте изменить фильтры или поисковый запрос',
  onClearFilters,
}: {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
}) {
  const Icon = require('lucide-react').Search;

  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      action={
        onClearFilters
          ? {
              label: 'Очистить фильтры',
              onClick: onClearFilters,
              variant: 'outline',
            }
          : undefined
      }
    />
  );
}

export function NoItemsEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={{
        label: actionLabel,
        onClick: onAction,
      }}
    />
  );
}
