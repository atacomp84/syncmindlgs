"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
// Input, Separator, Sheet, SheetContent, Skeleton kaldırıldı
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft, // Bu kullanılıyor
  // ChevronRight, Copy, CreditCard, File, Home, LineChart, ListFilter, MoreVertical, Package, Package2, PanelLeft, Search, Settings, ShoppingCart, Truck, Users2 kaldırıldı
} from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  children: React.ReactNode;
}

const Sidebar = ({
  isCollapsed,
  setIsCollapsed,
  children,
  className,
  ...props
}: SidebarProps) => {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "relative flex h-full flex-col bg-sidebar-background text-sidebar-foreground",
        className,
      )}
      {...props}
    >
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-[-15px] top-1/2 z-10 h-6 w-6 rounded-full border bg-background",
            isCollapsed ? "rotate-180" : "",
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {children}
    </div>
  );
};

interface SidebarLinkProps extends React.ComponentPropsWithoutRef<typeof Button> {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  isCollapsed?: boolean;
}

const SidebarLink = React.forwardRef<HTMLButtonElement, SidebarLinkProps>(
  ({ icon: Icon, label, active, isCollapsed, className, ...props }, ref) => {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant={active ? "sidebar-primary" : "sidebar-ghost"}
              size="icon"
              className={cn(
                "h-9 w-9",
                isCollapsed ? "rounded-lg" : "w-full justify-start px-4",
                className,
              )}
              {...props}
            >
              <Icon className={cn("h-5 w-5", isCollapsed ? "" : "mr-2")} />
              {!isCollapsed && label}
              {active && !isCollapsed && (
                <span className="sr-only">{label}</span>
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">{label}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    );
  },
);
SidebarLink.displayName = "SidebarLink";

interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
}

const SidebarGroup = ({
  title,
  children,
  isCollapsed,
  className,
  ...props
}: SidebarGroupProps) => {
  return (
    <div className={cn("grid gap-1 p-2", className)} {...props}>
      {!isCollapsed && title && (
        <span className="px-4 py-2 text-sm font-semibold text-sidebar-foreground">
          {title}
        </span>
      )}
      {children}
    </div>
  );
};

interface SidebarButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  icon: React.ElementType;
  label: string;
  isCollapsed?: boolean;
}

const SidebarButton = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
  ({ icon: Icon, label, isCollapsed, className, onClick, ...props }, ref) => {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant="sidebar-ghost"
              size="icon"
              className={cn(
                "h-9 w-9",
                isCollapsed ? "rounded-lg" : "w-full justify-start px-4",
                className,
              )}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                onClick?.(event);
              }}
              {...props}
            >
              <Icon className={cn("h-5 w-5", isCollapsed ? "" : "mr-2")} />
              {!isCollapsed && label}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">{label}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    );
  },
);
SidebarButton.displayName = "SidebarButton";

export { Sidebar, SidebarLink, SidebarGroup, SidebarButton };