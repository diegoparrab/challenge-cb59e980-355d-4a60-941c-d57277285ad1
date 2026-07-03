import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { EventFeedback } from '../EventFeedback';

describe('EventFeedback', () => {
  it('returns null when status is idle', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EventFeedback status="idle" />);
    });

    expect(tree!.toJSON()).toBeNull();
  });

  it('returns null when status is success (feedback via Alert)', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EventFeedback status="success" />);
    });

    expect(tree!.toJSON()).toBeNull();
  });

  it('returns null when status is failed (feedback via Alert)', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EventFeedback status="failed" />);
    });

    expect(tree!.toJSON()).toBeNull();
  });

  it('renders "Verificando identidad..." when status is authenticating', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EventFeedback status="authenticating" />);
    });
    const json = JSON.stringify(tree!.toJSON());

    expect(json).toContain('Verificando identidad...');
  });

  it('has accessibilityLiveRegion="polite" for screen reader support', () => {
    let tree: ReactTestRenderer;
    act(() => {
      tree = create(<EventFeedback status="authenticating" />);
    });
    const root = tree!.root;
    const container = root.findByProps({ accessibilityLiveRegion: 'polite' });

    expect(container).toBeDefined();
  });
});
