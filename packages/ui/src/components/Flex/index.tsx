import React from 'react';

import { FlexProps } from './types.js';
import { FlexPrimitive } from './style.js';

export function Flex(props: FlexProps): JSX.Element {
  const { children, gap = 0, onClick, direction = 'row', flex = 'initial', justify = 'start', align = 'start' } = props;

  return (
    <FlexPrimitive
      $customAlign={align}
      $customDirection={direction}
      $customFlex={flex}
      $customGap={`${gap}px`}
      $customJustify={justify}
      onClick={onClick}
    >
      {children}
    </FlexPrimitive>
  );
}
