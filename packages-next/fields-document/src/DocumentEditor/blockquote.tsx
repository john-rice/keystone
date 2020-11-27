/** @jsx jsx */

import { ButtonHTMLAttributes } from 'react';
import { Editor, Node, Path, Range, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useEditor } from 'slate-react';

import { jsx, useTheme } from '@keystone-ui/core';
import { Tooltip } from '@keystone-ui/tooltip';

import { IconBase } from './Toolbar';
import { ToolbarButton } from './primitives';
import { getMaybeMarkdownShortcutText } from './utils';

export const insertBlockquote = (editor: ReactEditor) => {
  Transforms.wrapNodes(
    editor,
    {
      type: 'blockquote',
      children: [{ type: 'paragraph', children: [{ text: '' }] }],
    },
    { match: node => node.type === 'paragraph' }
  );
};

function getDirectBlockquoteParentFromSelection(editor: ReactEditor) {
  if (!editor.selection) return { isInside: false } as const;
  const [, parentPath] = Editor.parent(editor, editor.selection);
  const [maybeBlockquoteParent, maybeBlockquoteParentPath] = Editor.parent(editor, parentPath);
  const isBlockquote = maybeBlockquoteParent.type === 'blockquote';
  return isBlockquote
    ? ({ isInside: true, path: maybeBlockquoteParentPath } as const)
    : ({ isInside: false } as const);
}

export const withBlockquote = (enableBlockquote: boolean, editor: ReactEditor) => {
  const { insertBreak, deleteBackward, insertText } = editor;
  editor.deleteBackward = unit => {
    if (editor.selection) {
      const parentBlockquote = getDirectBlockquoteParentFromSelection(editor);
      if (
        parentBlockquote.isInside &&
        Range.isCollapsed(editor.selection) &&
        // the selection is at the start of the paragraph
        editor.selection.anchor.offset === 0 &&
        // it's the first paragraph in the panel
        editor.selection.anchor.path[editor.selection.anchor.path.length - 2] === 0
      ) {
        Transforms.unwrapNodes(editor, { at: parentBlockquote.path });
        return;
      }
    }
    deleteBackward(unit);
  };
  editor.insertBreak = () => {
    const panel = getDirectBlockquoteParentFromSelection(editor);
    if (editor.selection && panel.isInside) {
      const [node, nodePath] = Editor.node(editor, editor.selection);
      if (Path.isDescendant(nodePath, panel.path) && Node.string(node) === '') {
        Transforms.unwrapNodes(editor, {
          match: node => node.type === 'blockquote',
          split: true,
        });
        return;
      }
    }
    insertBreak();
  };
  if (enableBlockquote) {
    editor.insertText = text => {
      const [shortcutText, deleteShortcutText] = getMaybeMarkdownShortcutText(text, editor);
      if (shortcutText === '>') {
        deleteShortcutText();
        Transforms.wrapNodes(
          editor,
          { type: 'blockquote', children: [] },
          { match: node => node.type === 'paragraph' }
        );
        return;
      }
      insertText(text);
    };
  }
  return editor;
};

export const BlockquoteElement = ({ attributes, children }: RenderElementProps) => {
  const { colors, spacing } = useTheme();
  return (
    <blockquote
      css={{
        color: colors.foregroundDim,
        margin: 0,
        padding: `0 ${spacing.xxlarge}px`,
      }}
      {...attributes}
    >
      {children}
    </blockquote>
  );
};

const BlockquoteButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  // useEditor does not update when the value/selection changes.
  // that's fine for what it's being used for here
  // because we're just inserting things on events, not reading things in render
  const editor = useEditor();

  return (
    <Tooltip content="Quote" weight="subtle">
      {attrs => (
        <ToolbarButton
          onMouseDown={event => {
            event.preventDefault();
            insertBlockquote(editor);
          }}
          {...attrs}
          {...props}
        >
          <QuoteIcon />
        </ToolbarButton>
      )}
    </Tooltip>
  );
};
export const blockquoteButton = <BlockquoteButton />;

const QuoteIcon = () => (
  <IconBase>
    <path d="M11.3031 2C9.83843 2 8.64879 3.22321 8.64879 4.73171C8.64879 6.23928 9.83843 7.46342 11.3031 7.46342C13.8195 7.46342 12.3613 12.2071 9.18767 12.7012C9.03793 12.7239 8.90127 12.7995 8.80243 12.9143C8.70358 13.029 8.64908 13.1754 8.64879 13.3268C8.64879 13.7147 8.99561 14.0214 9.37973 13.9627C15.148 13.0881 17.1991 2.00093 11.3031 2.00093V2ZM3.65526 2C2.18871 2 1 3.22228 1 4.73171C1 6.23835 2.18871 7.46155 3.65526 7.46155C6.17067 7.46155 4.71252 12.2071 1.53888 12.7012C1.3893 12.7239 1.25277 12.7993 1.15394 12.9139C1.05511 13.0285 1.00051 13.1746 1 13.3259C1 13.7137 1.34682 14.0205 1.73001 13.9617C7.50016 13.0872 9.55128 2 3.65526 2Z" />
  </IconBase>
);