import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PageContainer } from '../src/components/layout/PageContainer';
import { SuperAdminPortal } from '../src/views/superadmin/SuperAdminPortal';
// @ts-ignore
import fs from 'node:fs';
// @ts-ignore
import path from 'node:path';

declare const process: any;

describe('Shared CMS Layout - 12px Outer Padding Specification', () => {
  const cssPath = path.resolve(process.cwd(), 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  const appLayoutPath = path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx');
  const appLayoutContent = fs.readFileSync(appLayoutPath, 'utf8');

  it('defines --page-pad as 12px across all screen sizes in src/index.css', () => {
    // Check :root definition
    expect(cssContent).toMatch(/--page-pad:\s*12px;/);

    // Check media queries do not increase --page-pad to 1.5rem or 2rem
    expect(cssContent).not.toMatch(/@media\s*\(min-width:\s*640px\)\s*\{\s*:root\s*\{\s*--page-pad:\s*1\.5rem;/);
    expect(cssContent).not.toMatch(/@media\s*\(min-width:\s*1024px\)\s*\{\s*:root\s*\{\s*--page-pad:\s*2rem;/);

    // Ensure 640px and 1024px retain 12px
    expect(cssContent).toMatch(/@media\s*\(min-width:\s*640px\)\s*\{\s*:root\s*\{\s*--page-pad:\s*12px;\s*\}\s*\}/);
    expect(cssContent).toMatch(/@media\s*\(min-width:\s*1024px\)\s*\{\s*:root\s*\{\s*--page-pad:\s*12px;\s*\}\s*\}/);
  });

  it('sets --page-max to 100% in src/index.css so content fills available width', () => {
    expect(cssContent).toMatch(/--page-max:\s*100%;/);
  });

  it('configures AppLayout main container with exact 12px outer padding without tab offset', () => {
    // Ensure main container uses var(--page-pad) for all sides
    expect(appLayoutContent).toContain("paddingLeft: 'var(--page-pad)'");
    expect(appLayoutContent).toContain("paddingRight: 'var(--page-pad)'");
    expect(appLayoutContent).toContain("paddingTop: 'var(--page-pad)'");
    expect(appLayoutContent).toContain("paddingBottom: 'var(--page-pad)'");

    // Ensure no subtraction/addition of --tab-top-space
    expect(appLayoutContent).not.toContain("paddingTop: 'calc(var(--page-pad) - var(--tab-top-space");
  });

  it('renders PageContainer with full width and standard class contract', () => {
    const { container } = render(
      <PageContainer data-testid="test-page-container">
        <div>Child View</div>
      </PageContainer>
    );

    const el = (container.querySelector('[data-testid="test-page-container"]') || container.firstChild) as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toContain('w-full');
  });

  it('ensures SuperAdminPortal does not have nested max-w-7xl, mx-auto, or extra padding wrappers', () => {
    const { container } = render(<SuperAdminPortal initialTab="super_dashboard" />);

    // Outermost wrapper should be w-full
    const rootEl = container.firstElementChild as HTMLElement;
    expect(rootEl).toBeTruthy();
    expect(rootEl.className).toBe('w-full');

    // Ensure no nested main element inside SuperAdminPortal
    const nestedMain = container.querySelector('main');
    expect(nestedMain).toBeNull();

    // Ensure no extra max-w-7xl or mx-auto container wrapping the views
    const centeredWrapper = container.querySelector('.max-w-7xl');
    expect(centeredWrapper).toBeNull();
  });
});
