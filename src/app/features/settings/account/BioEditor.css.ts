import { style, globalStyle } from '@vanilla-extract/css';

export const BioEditorContainer = style({
    backgroundColor: 'var(--sable-bg-container)',
    borderRadius: 'var(--radii-300)',
});

globalStyle(`${BioEditorContainer} [class*="EditorTextarea"]`, {
    backgroundColor: 'var(--sable-bg-container) !important',
});

globalStyle(`${BioEditorContainer} [class*="EditorTextareaScroll"]`, {
    backgroundColor: 'var(--sable-bg-container) !important',
});

globalStyle(`${BioEditorContainer} [class*="Toolbar"]`, {
    backgroundColor: 'var(--sable-bg-container) !important',
    padding: 'var(--space-S100) !important',
});

globalStyle(`${BioEditorContainer} [class*="Toolbar"] button`, {
    backgroundColor: 'var(--sable-bg-container) !important',
});