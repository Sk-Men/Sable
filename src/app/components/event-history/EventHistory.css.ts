import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const EventHistory = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const Header = style({
  paddingLeft: config.space.S400,
  paddingRight: config.space.S300,

  flexShrink: 0,
});

export const Content = style({
  paddingLeft: config.space.S200,
  paddingBottom: config.space.S400,
});
export const EventItem = style({
  padding: `${config.space.S200} ${config.space.S200}`,
  height: 'unset',
  borderRadius: '5px',
  border: '2px hidden',
  borderColor: color.Secondary.Main,
  selectors: {
    '&:hover': {
      border: '2px solid',
    },
  },
});
