import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable, type PressableProps } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'flex-row items-center justify-center gap-2 rounded-lg active:opacity-90',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        destructive: 'bg-destructive',
        outline: 'border border-border bg-background',
        secondary: 'bg-secondary',
        ghost: 'bg-transparent active:bg-muted',
      },
      size: {
        default: 'h-12 px-5',
        sm: 'h-9 px-3',
        lg: 'h-14 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

// Text colour can't be inherited in RN, so each variant names its own.
const buttonTextVariants = cva('font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Pressable : Pressable;
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
