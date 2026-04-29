import { ComponentProps, JSX, JSXElementConstructor } from 'react';

export type ComponentPropsWithoutClassName<
  T extends keyof JSX.IntrinsicElements | JSXElementConstructor<unknown>,
> = Omit<ComponentProps<T>, 'className'>;
