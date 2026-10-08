import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {HighlightedCodeSnippet, SyntaxDocPanel} from '../SyntaxDocPanel';

describe('SyntaxDocPanel', () => {
  it('returns null when isOpen is false', () => {
    const {container} = render(
      <SyntaxDocPanel isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders documentation sections and legend when isOpen is true', () => {
    render(<SyntaxDocPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('DSL Syntax & Calling Guide')).toBeDefined();
    expect(
      screen.getByText('3-Level Hierarchy (2-Space Indents)')
    ).toBeDefined();
    expect(screen.getByText('Amber: Keyword')).toBeDefined();
    expect(screen.getByText('Purple: Action/Call')).toBeDefined();
  });

  it('calls onClose when clicking close button', () => {
    const onClose = vi.fn();
    render(<SyntaxDocPanel isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByTitle('Close syntax guide');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onInsertSnippet when insert button is clicked', () => {
    const onInsert = vi.fn();
    render(
      <SyntaxDocPanel
        isOpen={true}
        onClose={vi.fn()}
        onInsertSnippet={onInsert}
      />
    );

    const insertBtns = screen.getAllByTitle('Insert into outline');
    expect(insertBtns.length).toBeGreaterThan(0);
    fireEvent.click(insertBtns[0]);
    expect(onInsert).toHaveBeenCalled();
  });

  describe('HighlightedCodeSnippet', () => {
    it('renders color-coded tokens for code lines', () => {
      const {container} = render(
        <HighlightedCodeSnippet
          code={'class OrderService\n  public checkout(): void'}
        />
      );
      const pre = container.querySelector('pre');
      expect(pre).toBeDefined();
      expect(pre?.textContent).toContain('class OrderService');
      expect(pre?.textContent).toContain('public checkout(): void');
    });
  });
});
