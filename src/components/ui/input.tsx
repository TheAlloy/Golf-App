import { TextInput, type TextInputProps } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { cn } from '@/lib/cn';

type InputProps = TextInputProps & { className?: string };

function Input({ className, ...props }: InputProps) {
  const colors = useThemeColors();
  return (
    <TextInput
      className={cn(
        'h-12 rounded-lg border border-input bg-background px-4 text-base text-foreground',
        className
      )}
      placeholderTextColor={colors.mutedForeground}
      {...props}
    />
  );
}

export { Input };
