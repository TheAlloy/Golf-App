import * as Slot from '@rn-primitives/slot';
import { createContext, useContext } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';

const TextClassContext = createContext<string | undefined>(undefined);

type TextProps = RNTextProps & {
  className?: string;
  asChild?: boolean;
};

/**
 * Text primitive. React Native has no inherited text styling, so parents
 * (Button, CardTitle, ...) pass class names down through TextClassContext
 * the same way shadcn relies on CSS inheritance on the web.
 */
function Text({ className, asChild = false, ...props }: TextProps) {
  const context = useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  return <Component className={cn('text-base text-foreground', context, className)} {...props} />;
}

export { Text, TextClassContext };
