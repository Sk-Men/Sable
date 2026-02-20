import { globalStyle, style } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { DefaultReset, config } from 'folds';

export const TimelineFloat = recipe({
  base: [
    DefaultReset,
    {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1,
      minWidth: 'max-content',
    },
  ],
  variants: {
    position: {
      Top: {
        top: config.space.S400,
      },
      Bottom: {
        bottom: config.space.S400,
      },
    },
  },
  defaultVariants: {
    position: 'Top',
  },
});

export type TimelineFloatVariants = RecipeVariants<typeof TimelineFloat>;


export const messageList = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

globalStyle(`${messageList} [class*="layout_MessageBase"]`, {
  transition: 'background-color 0.1s ease !important',
});

globalStyle(`${messageList} [class*="layout_MessageBase"]:hover`, {
  backgroundColor: 'var(--sable-surface-container-hover) !important',
});