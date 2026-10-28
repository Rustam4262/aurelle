import React, { ReactNode } from "react";
import { LucideIcon, Database, Search } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent } from "./card";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
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
    <Card
      className={`relative overflow-hidden rounded-3xl border-2 border-dashed border-foreground/10 bg-card/50 ${className ?? ""}`}
    >
      {/* Glow via gradient (no filter/infinite animation: those broke text painting in Chromium) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(40%_70%_at_50%_20%,hsl(var(--primary)/0.18),transparent_70%)]" />
      <CardContent className="relative flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
        {/* Icon with a soft halo ring */}
        <div className="relative mb-6">
          <span className="absolute -inset-3 rounded-full bg-primary/10 ring-1 ring-primary/15" />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25 shadow-glow">
            <Icon className="h-7 w-7" />
          </span>
        </div>

        <h3 className="mb-2 font-serif text-2xl font-light tracking-[-0.01em]">
          {title}
        </h3>

        <p
          className="mb-6 max-w-md text-sm leading-relaxed text-muted-foreground"
          style={{ animationDelay: "80ms" }}
        >
          {description}
        </p>

        {children}

        {action && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={action.onClick} variant={action.variant || "default"}>
              {action.label}
            </Button>

            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline">
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
  title = "Нет данных",
  description = "Данные пока не загружены или недоступны",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const Icon = Database;

  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: "Обновить",
              onClick: onRetry,
              variant: "outline",
            }
          : undefined
      }
    />
  );
}

export function NoResultsEmptyState({
  title = "Ничего не найдено",
  description = "Попробуйте изменить фильтры или поисковый запрос",
  onClearFilters,
}: {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
}) {
  const Icon = Search;

  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      action={
        onClearFilters
          ? {
              label: "Очистить фильтры",
              onClick: onClearFilters,
              variant: "outline",
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
