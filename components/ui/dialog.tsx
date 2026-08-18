'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

/*
 * The app's one dialog, built on Radix.
 *
 * Every modal here used to be hand-rolled. None of them trapped focus or locked
 * the page behind them, and only some closed on Escape — so a keyboard user
 * could tab straight out of an open dialog into the page underneath, and on a
 * phone the background scrolled away under the sheet. Radix handles all of
 * that; the styling stays ours so the theme is unaffected.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Hides the corner close button for dialogs that force an explicit choice. */
    hideClose?: boolean;
  }
>(({ className, children, hideClose = false, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Bottom sheet on a phone, centred card from sm up: a dialog pinned to
        // the middle of a small screen puts its actions under the thumb's reach.
        'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden',
        'rounded-t-2xl border border-slate-200 bg-white shadow-xl',
        // The home indicator sits over the bottom of a phone screen, so the
        // last row of a sheet flush to that edge is partly under it.
        'pb-[env(safe-area-inset-bottom)] sm:pb-0',
        'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg',
        'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
        className
      )}
      {...props}
    >
      {children}

      {!hideClose && (
        <DialogPrimitive.Close
          className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

/** Sticky so the title stays visible while a long form scrolls under it. */
function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 border-b border-slate-200 px-5 py-4 pr-12 text-left',
        className
      )}
      {...props}
    />
  );
}

/** The scrolling middle of the dialog. */
function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)} {...props} />;
}

/** Actions, kept in view at the bottom rather than scrolling away with the form. */
function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3',
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-bold tracking-tight text-slate-900', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('mt-0.5 text-xs leading-relaxed text-slate-500', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
