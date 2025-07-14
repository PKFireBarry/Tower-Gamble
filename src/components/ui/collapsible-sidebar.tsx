'use client';

import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSidebarProps {
  children: ReactNode;
  title: string;
  side: 'left' | 'right';
  defaultCollapsed?: boolean;
  className?: string;
}

export function CollapsibleSidebar({ 
  children, 
  title, 
  side, 
  defaultCollapsed = false,
  className 
}: CollapsibleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={cn(
      "relative transition-all duration-300 ease-in-out",
      side === 'left' ? 'order-first' : 'order-last',
      isCollapsed ? 'w-12' : 'w-80',
      className
    )}>
      {/* Sidebar Content */}
      <div className={cn(
        "h-full modern-card overflow-hidden transition-all duration-300 ease-in-out",
        isCollapsed ? 'w-12' : 'w-80',
        side === 'left' ? (isCollapsed ? 'slide-in-left' : '') : (isCollapsed ? 'slide-in-right' : '')
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="ml-auto hover:bg-accent"
          >
            {side === 'left' ? (
              isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
            ) : (
              isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Content */}
        <div className={cn(
          "transition-all duration-300 ease-in-out overflow-y-auto",
          isCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'
        )}>
          {children}
        </div>
      </div>

      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
} 