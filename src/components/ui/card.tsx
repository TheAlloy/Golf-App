import { View, type ViewProps } from 'react-native';

import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/cn';

type DivProps = ViewProps & { className?: string };

function Card({ className, ...props }: DivProps) {
  return <View className={cn('rounded-xl border border-border bg-card', className)} {...props} />;
}

function CardHeader({ className, ...props }: DivProps) {
  return <View className={cn('gap-1.5 p-4', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-lg font-semibold text-card-foreground', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function CardContent({ className, ...props }: DivProps) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View className={cn('p-4 pt-0', className)} {...props} />
    </TextClassContext.Provider>
  );
}

function CardFooter({ className, ...props }: DivProps) {
  return <View className={cn('flex-row items-center p-4 pt-0', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
