import { style, globalStyle } from '@vanilla-extract/css';

export const floatingEditor = style({
    minWidth: '100%',
});

globalStyle(`
    ${floatingEditor} > div, 
    ${floatingEditor} [class*="Editor"], 
    ${floatingEditor} [class*="EditorTextarea"],
    ${floatingEditor} [role="textbox"]`, {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    padding: '0 !important',
    color: 'var(--sable-primary-on-container)',
});

globalStyle(`${floatingEditor} button`, {
    borderRadius: '20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--sable-sec-on-container)',
    padding: '8px',
    cursor: 'pointer',
});

globalStyle(`${floatingEditor} button *`, {
    color: 'inherit',
});

globalStyle(`${floatingEditor} button:hover`, {
    backgroundColor: 'var(--sable-surface-container-hover)',
    color: 'var(--sable-primary-main)',
});
