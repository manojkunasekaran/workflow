// Should read the rules before creating/updating the test files
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StudioTaskCatalog } from '../StudioTaskCatalog';
import { TASK_PALETTE } from '../constants/taskPalette';

describe('StudioTaskCatalog Component', () => {
  afterEach(cleanup);

  it('K-027: filters task list based on search input', async () => {
    render(
      <StudioTaskCatalog
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Should render all items initially
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThan(0);
    
    const waitTaskName = TASK_PALETTE.find(t => t.type === 'WAIT')?.label || 'Wait';

    // Type in search box
    const searchInput = screen.getByTestId('task-catalog-search');
    fireEvent.change(searchInput, { target: { value: waitTaskName } });

    // List should be filtered down
    const filteredItems = screen.getAllByRole('listitem');
    expect(filteredItems.length).toBeLessThan(listItems.length);
    expect(filteredItems[0].textContent).toContain(waitTaskName);
  });
});
