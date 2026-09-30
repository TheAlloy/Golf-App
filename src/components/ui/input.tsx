import { TextInput, type TextInputProps } from 'react-native';

import { useThemeColors } from '@/constants/theme';
import { withFontFamily } from '@/components/ui/text';
import { cn } from '@/lib/cn';

type InputProps = TextInputProps & { className?: string };

function Input({ className, ...props }: InputProps) {
  const colors = useThemeColors();
  return (
    <TextInput
      className={withFontFamily(
        cn(
          'h-12 rounded-lg border border-input bg-background px-4 text-base text-foreground',
          className
        )
      )}
      placeholderTextColor={colors.mutedForeground}
      {...props}
    />
  );
}

export { Input };
