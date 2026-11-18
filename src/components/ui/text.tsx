import { createContext, useContext, type ComponentProps } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { FontTokens } from '@/constants/theme';

/**
 * App-wide Text and TextInput.
 *
 * React 19 ignores `defaultProps` on function components, so the default font has to be
 * applied here. Inter Regular is used unless a font-* family class or a fontFamily style is
 * given. Nested Text inherits its parent's font instead of resetting to Regular.
 */

const FONT_FAMILY_CLASS =
  /(^|\s)font-(inter|inter-medium|inter-semibold|inter-bold|ui|body|caption|sans|heading|display|serif|serifRegular|stat)(?=$|\s)/;

const InsideText = createContext(false);

function needsDefaultFont(className: string | undefined, style: StyleProp<TextStyle>) {
  if (className && FONT_FAMILY_CLASS.test(className)) return false;
  return !StyleSheet.flatten(style)?.fontFamily;
}

export function Text({ className, style, ...props }: ComponentProps<typeof NativeText>) {
  const isNested = useContext(InsideText);
  const applyDefault = !isNested && needsDefaultFont(className, style);

  return (
    <InsideText.Provider value>
      <NativeText
        className={className}
        style={applyDefault ? [styles.base, style] : style}
        {...props}
      />
    </InsideText.Provider>
  );
}

export function TextInput({ className, style, ...props }: ComponentProps<typeof NativeTextInput>) {
  return (
    <NativeTextInput
      className={className}
      style={needsDefaultFont(className, style) ? [styles.base, style] : style}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: { fontFamily: FontTokens.body },
});
