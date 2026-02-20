import { globalStyle } from '@vanilla-extract/css';

globalStyle(`
    button, 
    [role="button"], 
    [class*="Button"], 
    [class*="Chip"], 
    [class*="MenuItem"]
`, {
    transition: 'transform 0.1s ease-in-out, background-color 0.15s ease !important',
});

globalStyle(`
    button:active, 
    [role="button"]:active, 
    [class*="Button"]:active, 
    [class*="Chip"]:active, 
    [class*="MenuItem"]:active
`, {
    transform: 'scale(0.96) !important',
});

globalStyle(`
    button:hover, 
    [role="button"]:hover
`, {
    transform: 'translateY(-1px)',
});

globalStyle(`
    button[class*="styles_UserHeroAvatar"]:hover,
    [class*="RoomPinMenu_PinMenuContent"] [class*="layout_AvatarBase"]:hover,
    [class*="RoomPinMenu_PinMenuContent"] [class*="UserAvatar"]:hover,
    [class*="RoomPinMenu_PinMenuContent"] button:has([class*="UserAvatar"]):hover
`, {
    transform: 'none',
});