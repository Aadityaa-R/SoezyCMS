import React, { createContext, useContext, useRef, useState, useEffect, useMemo } from 'react';
import { Button } from './Button';

export type StackBreakpoint = 'sm' | 'md' | 'lg';
export type HideBreakpoint = 'sm' | 'md' | 'lg' | 'xl';
export type ColumnKind = 'short' | 'text';

export interface ColumnDef<T = any> {
  key: string;
  header: React.ReactNode;
  label?: string;
  kind?: ColumnKind;
  priority?: number;
  hideBelow?: HideBreakpoint;
  minWidthRem?: number;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
  isPrimary?: boolean;
  isActions?: boolean;
  pinned?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface PriorityHideResult<T = any> {
  visibleColumns: ColumnDef<T>[];
  hiddenColumns: ColumnDef<T>[];
  isStacked: boolean;
}

export function getColumnMinWidthPx<T = any>(col: ColumnDef<T>, baseFontSize: number = 16): number {
  if (col.minWidthRem) {
    return col.minWidthRem * baseFontSize;
  }
  if (col.kind === 'text') {
    return 14 * baseFontSize;
  }
  if (col.isActions) {
    return 8.5 * baseFontSize;
  }
  return 6.5 * baseFontSize;
}

export function calculateVisibleColumns<T = any>(
  columns: ColumnDef<T>[],
  containerWidth: number,
  minWidthsMap?: Record<string, number>,
  baseFontSize: number = 16
): PriorityHideResult<T> {
  // Below 768px the stack layout takes over
  if (containerWidth < 768) {
    return {
      visibleColumns: columns,
      hiddenColumns: [],
      isStacked: true,
    };
  }

  const getWidth = (col: ColumnDef<T>): number => {
    if (minWidthsMap && typeof minWidthsMap[col.key] === 'number') {
      return minWidthsMap[col.key];
    }
    return getColumnMinWidthPx(col, baseFontSize);
  };

  // Priority 1 columns (1 = never hidden)
  const p1Columns = columns.filter((c) => (c.priority ?? 1) === 1);
  const p1TotalWidth = p1Columns.reduce((sum, c) => sum + getWidth(c), 0);

  // If container is too small even for priority-1 columns, return stack mode
  if (p1TotalWidth > containerWidth) {
    return {
      visibleColumns: columns,
      hiddenColumns: [],
      isStacked: true,
    };
  }

  // Start with all columns visible
  let visible = [...columns];
  let hidden: ColumnDef<T>[] = [];

  const totalWidth = () => visible.reduce((sum, c) => sum + getWidth(c), 0);

  // Hide highest-priority-number columns (> 1) one at a time until everything fits
  while (totalWidth() > containerWidth) {
    let maxPriority = 1;
    visible.forEach((c) => {
      const p = c.priority ?? 1;
      if (p > maxPriority) {
        maxPriority = p;
      }
    });

    if (maxPriority <= 1) {
      return {
        visibleColumns: columns,
        hiddenColumns: [],
        isStacked: true,
      };
    }

    // Find the rightmost column with maxPriority to hide
    let hideIdx = -1;
    for (let i = visible.length - 1; i >= 0; i--) {
      if ((visible[i].priority ?? 1) === maxPriority) {
        hideIdx = i;
        break;
      }
    }

    if (hideIdx === -1) break;

    const [removed] = visible.splice(hideIdx, 1);
    hidden.push(removed);
  }

  return {
    visibleColumns: visible,
    hiddenColumns: hidden,
    isStacked: false,
  };
}

interface TableContextValue {
  stackBelow: StackBreakpoint;
  isStacked?: boolean;
  pinLeading?: boolean;
}

const TableContext = createContext<TableContextValue>({ stackBelow: 'md', pinLeading: false });

export interface TableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({ className = '', children, ...props }) => (
  <div
    data-slot="smart-table-toolbar"
    className={`px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 ${className}`.trim()}
    {...props}
  >
    {children}
  </div>
);

export interface TableProps<T = any> extends React.TableHTMLAttributes<HTMLTableElement> {
  stackBelow?: StackBreakpoint;
  columns?: ColumnDef<T>[];
  data?: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  isLoading?: boolean;
  error?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  emptyAction?: { label: string; onClick: () => void };
  shrinkToFit?: boolean;
  toolbar?: React.ReactNode;
  pinLeading?: boolean;
  containerClassName?: string;
}

export const Table = <T = any,>({
  className = '',
  stackBelow = 'md',
  columns,
  data,
  keyExtractor,
  isLoading,
  error,
  emptyMessage,
  emptyAction,
  shrinkToFit,
  toolbar,
  pinLeading,
  containerClassName = '',
  children,
  ...props
}: TableProps<T>): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { visibleColumns, isStacked } = useMemo(() => {
    if (!columns) return { visibleColumns: [], isStacked: false };
    return calculateVisibleColumns(columns, containerWidth);
  }, [columns, containerWidth]);

  const effectiveStackBelow: StackBreakpoint = isStacked ? 'lg' : stackBelow;
  const isFewColumns = columns && columns.length <= 5;
  const shouldShrink = shrinkToFit || (isFewColumns && shrinkToFit !== false);
  const containerShrinkClass = shouldShrink ? 'w-fit max-w-full min-w-[40rem]' : 'w-full';

  if (columns && data) {
    return (
      <div
        ref={containerRef}
        data-slot="smart-table"
        className={`${containerShrinkClass} border border-slate-200 dark:border-slate-800 rounded-[8px] bg-white dark:bg-slate-900 shadow-xs flex flex-col overflow-hidden ${containerClassName}`.trim()}
      >
        {toolbar && (
          <div
            data-slot="smart-table-toolbar"
            className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 shrink-0"
          >
            {toolbar}
          </div>
        )}
        <div className="overflow-x-auto w-full [scrollbar-width:thin] flex-1">
          <TableContext.Provider value={{ stackBelow: effectiveStackBelow, isStacked, pinLeading: pinLeading ?? true }}>
            <table className={`w-full border-collapse text-left text-xs ${className}`} {...props}>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((col, colIdx) => (
                    <TableHead
                      key={col.key}
                      hideBelow={col.hideBelow}
                      kind={col.kind || 'short'}
                      priority={col.priority}
                      isActions={col.isActions}
                      pinned={col.pinned || (colIdx === 0 && (pinLeading ?? true))}
                      className={`${col.headerClassName || ''} ${
                        col.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="text-center py-8 text-slate-500 dark:text-slate-400"
                    >
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="text-center py-8 text-rose-600 dark:text-rose-400"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="text-center py-8 text-slate-500 dark:text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span>{emptyMessage || 'No records found.'}</span>
                        {emptyAction && (
                          <Button variant="outline" size="sm" onClick={emptyAction.onClick}>
                            {emptyAction.label}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, rowIdx) => (
                    <TableRow key={keyExtractor ? keyExtractor(item, rowIdx) : rowIdx}>
                      {visibleColumns.map((col, colIdx) => {
                        const content = col.render ? col.render(item, rowIdx) : (item as any)[col.key];
                        const colLabel = col.label || (typeof col.header === 'string' ? col.header : undefined);
                        return (
                          <TableCell
                            key={col.key}
                            hideBelow={col.hideBelow}
                            kind={col.kind || 'short'}
                            priority={col.priority}
                            label={colLabel}
                            isPrimary={col.isPrimary}
                            isActions={col.isActions}
                            pinned={col.pinned || (colIdx === 0 && (pinLeading ?? true))}
                            className={`${col.className || ''} ${
                              col.align === 'right' ? 'text-right' : ''
                            }`}
                          >
                            {content}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </table>
          </TableContext.Provider>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-slot="smart-table"
      className={`${containerShrinkClass} border border-slate-200 dark:border-slate-800 rounded-[8px] bg-white dark:bg-slate-900 shadow-xs flex flex-col overflow-hidden ${containerClassName}`.trim()}
    >
      {toolbar && (
        <div
          data-slot="smart-table-toolbar"
          className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 shrink-0"
        >
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto w-full [scrollbar-width:thin] flex-1">
        <TableContext.Provider value={{ stackBelow, isStacked: containerWidth < 768, pinLeading: pinLeading ?? false }}>
          <table className={`w-full border-collapse text-left text-xs ${className}`} {...props}>
            {children}
          </table>
        </TableContext.Provider>
      </div>
    </div>
  );
};

export const DataTable = Table;

const stackHeaderClasses: Record<StackBreakpoint, string> = {
  sm: 'hidden sm:table-header-group',
  md: 'hidden md:table-header-group',
  lg: 'hidden lg:table-header-group',
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const stackClass = stackBelow ? stackHeaderClasses[stackBelow] : '';
  return (
    <thead
      className={`bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-fs-th whitespace-nowrap ${stackClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </thead>
  );
};

const stackBodyClasses: Record<StackBreakpoint, string> = {
  sm: 'block sm:table-row-group',
  md: 'block md:table-row-group',
  lg: 'block lg:table-row-group',
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const stackClass = stackBelow ? stackBodyClasses[stackBelow] : '';
  return (
    <tbody
      className={`divide-y divide-[#eef0f3] dark:divide-slate-800 ${stackClass} ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
};

const stackRowClasses: Record<StackBreakpoint, string> = {
  sm: 'block sm:table-row bg-white dark:bg-slate-900 py-3.5 px-3 sm:p-0 border-b border-[#eef0f3] dark:border-slate-800 last:border-b-0 space-y-2 sm:space-y-0',
  md: 'block md:table-row bg-white dark:bg-slate-900 py-3.5 px-3 md:p-0 border-b border-[#eef0f3] dark:border-slate-800 last:border-b-0 space-y-2 md:space-y-0',
  lg: 'block lg:table-row bg-white dark:bg-slate-900 py-3.5 px-3 lg:p-0 border-b border-[#eef0f3] dark:border-slate-800 last:border-b-0 space-y-2 lg:space-y-0',
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const stackClass = stackBelow ? stackRowClasses[stackBelow] : '';
  return (
    <tr className={`${stackClass} ${className}`} {...props}>
      {children}
    </tr>
  );
};

const hideBelowClasses: Record<HideBreakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export const HIDE_BELOW_CLASSES = hideBelowClasses;

const stickyActionsHeadClasses: Record<StackBreakpoint, string> = {
  sm: 'sm:sticky sm:right-0 sm:bg-inherit sm:z-10',
  md: 'md:sticky md:right-0 md:bg-inherit md:z-10',
  lg: 'lg:sticky lg:right-0 lg:bg-inherit lg:z-10',
};

const stickyActionsCellClasses: Record<StackBreakpoint, string> = {
  sm: 'sm:sticky sm:right-0 sm:bg-inherit sm:z-10',
  md: 'md:sticky md:right-0 md:bg-inherit md:z-10',
  lg: 'lg:sticky lg:right-0 lg:bg-inherit lg:z-10',
};

const stackButtonMinHeight: Record<StackBreakpoint, string> = {
  sm: 'max-sm:[&_button]:min-h-[44px] max-sm:[&_button]:h-auto max-sm:[&_button]:py-2.5',
  md: 'max-md:[&_button]:min-h-[44px] max-md:[&_button]:h-auto max-md:[&_button]:py-2.5',
  lg: 'max-lg:[&_button]:min-h-[44px] max-lg:[&_button]:h-auto max-lg:[&_button]:py-2.5',
};

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  hideBelow?: HideBreakpoint;
  kind?: ColumnKind;
  priority?: number;
  width?: 'fit' | 'flex';
  isActions?: boolean;
  pinned?: boolean;
}

export const TableHead: React.FC<TableHeadProps> = ({
  className = '',
  hideBelow,
  kind = 'short',
  priority,
  width,
  isActions = false,
  pinned = false,
  children,
  scope = 'col',
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const hideClass = hideBelow ? hideBelowClasses[hideBelow] : '';
  const stickyClass = isActions && stackBelow ? stickyActionsHeadClasses[stackBelow] : isActions ? 'sticky right-0 bg-inherit z-10' : '';
  const pinnedClass = pinned ? 'sm:sticky sm:left-0 sm:z-20 bg-slate-100 dark:bg-slate-800 sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:shadow-[1px_0_0_0_#e2e8f0] dark:sm:shadow-[1px_0_0_0_#334155]' : '';
  const effectiveKind = kind || (width === 'flex' ? 'text' : 'short');
  const kindClass = isActions || effectiveKind === 'short' ? 'whitespace-nowrap' : 'min-w-[14rem] text-left';

  return (
    <th
      scope={scope}
      className={`h-8 px-3 py-1.5 align-middle font-semibold text-slate-600 dark:text-slate-300 text-[13px] normal-case border-r border-slate-200/70 dark:border-slate-800/70 last:border-r-0 ${kindClass} ${hideClass} ${stickyClass} ${pinnedClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  label?: React.ReactNode;
  hideBelow?: HideBreakpoint;
  kind?: ColumnKind;
  priority?: number;
  width?: 'fit' | 'flex';
  fullWidthOnStack?: boolean;
  isPrimary?: boolean;
  isActions?: boolean;
  pinned?: boolean;
}

const hideLabelClasses: Record<StackBreakpoint, string> = {
  sm: 'sm:hidden',
  md: 'md:hidden',
  lg: 'lg:hidden',
};

const stackCellClasses: Record<StackBreakpoint, string> = {
  sm: 'block sm:table-cell py-1 sm:py-2 px-0 sm:px-3',
  md: 'block md:table-cell py-1 md:py-2 px-0 md:px-3',
  lg: 'block lg:table-cell py-1 lg:py-2 px-0 lg:px-3',
};

const fullWidthStackClasses: Record<StackBreakpoint, string> = {
  sm: 'block w-full pt-2 sm:pt-0 border-t sm:border-t-0 sm:table-cell sm:w-auto',
  md: 'block w-full pt-2 md:pt-0 border-t md:border-t-0 md:table-cell md:w-auto',
  lg: 'block w-full pt-2 lg:pt-0 border-t lg:border-t-0 lg:table-cell lg:w-auto',
};

export const TableCell: React.FC<TableCellProps> = ({
  className = '',
  label,
  hideBelow,
  kind = 'short',
  priority,
  width,
  fullWidthOnStack = false,
  isPrimary = false,
  isActions = false,
  pinned = false,
  children,
  ...props
}) => {
  const { stackBelow } = useContext(TableContext);
  const hideClass = hideBelow ? hideBelowClasses[hideBelow] : '';
  const stackCellClass = stackBelow ? stackCellClasses[stackBelow] : '';
  const stickyClass = isActions && stackBelow ? stickyActionsCellClasses[stackBelow] : isActions ? 'sticky right-0 bg-inherit z-10' : '';
  const pinnedClass = pinned ? 'sm:sticky sm:left-0 sm:z-10 bg-white dark:bg-slate-900 sm:border-r sm:border-slate-200 dark:sm:border-slate-700 sm:shadow-[1px_0_0_0_#e2e8f0] dark:sm:shadow-[1px_0_0_0_#334155]' : '';

  const effectiveKind = kind || (width === 'flex' ? 'text' : 'short');
  const kindClass = isActions
    ? 'whitespace-nowrap text-right'
    : effectiveKind === 'text'
    ? 'min-w-[14rem] break-words'
    : 'whitespace-nowrap';

  const isEmpty =
    !isActions &&
    (children === undefined ||
      children === null ||
      children === '' ||
      (typeof children === 'string' && children.trim() === ''));
  const cellContent = isEmpty ? '—' : children;

  const wrappedContent =
    effectiveKind === 'text' && typeof cellContent === 'string' ? (
      <div className="line-clamp-2 max-w-xl leading-normal py-0.5">{cellContent}</div>
    ) : (
      cellContent
    );

  // 1. Primary cell in stack mode: bold first line, no label
  if (stackBelow && isPrimary) {
    const desktopDisplay = stackBelow === 'sm' ? 'sm:block' : stackBelow === 'lg' ? 'lg:block' : 'md:block';
    return (
      <td
        className={`px-0 sm:px-3 py-1 sm:py-2 align-middle leading-normal min-h-[40px] border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 ${kindClass} ${hideClass} ${stackCellClass} ${pinnedClass} ${className}`.trim()}
        {...props}
      >
        <div className={`font-bold text-fs-body text-slate-900 dark:text-slate-100 ${desktopDisplay}`}>
          {wrappedContent}
        </div>
      </td>
    );
  }

  // 2. Actions cell in stack mode: full width, wrapping row of buttons at least 44px high
  if (stackBelow && (isActions || fullWidthOnStack)) {
    const fullStackClass = fullWidthStackClasses[stackBelow];
    const buttonMinHeightClass = stackButtonMinHeight[stackBelow];
    const desktopDisplay = stackBelow === 'sm' ? 'sm:block' : stackBelow === 'lg' ? 'lg:block' : 'md:block';
    return (
      <td
        className={`px-0 sm:px-3 py-2 align-middle min-h-[40px] border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 ${kindClass} ${hideClass} ${fullStackClass} ${stickyClass} ${className}`.trim()}
        {...props}
      >
        <div
          className={`flex flex-wrap items-center md:flex-nowrap justify-end gap-2 w-full ${buttonMinHeightClass} ${desktopDisplay}`}
        >
          {children}
        </div>
      </td>
    );
  }

  // 3. Regular labeled row in stack mode: muted label on left, value left-aligned
  if (stackBelow && label) {
    const hideLabelClass = hideLabelClasses[stackBelow];
    const desktopDisplay = stackBelow === 'sm' ? 'sm:block' : stackBelow === 'lg' ? 'lg:block' : 'md:block';

    return (
      <td
        className={`px-0 sm:px-3 py-1 sm:py-2 align-middle leading-normal min-h-[40px] border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 ${kindClass} ${hideClass} ${stackCellClass} ${pinnedClass} ${className}`.trim()}
        {...props}
      >
        <div className={`flex items-start sm:items-center gap-2 sm:gap-3 text-left ${desktopDisplay}`}>
          <span
            className={`${hideLabelClass} text-fs-label text-slate-500 dark:text-slate-400 w-28 sm:w-36 shrink-0 text-left select-none`}
          >
            {label}
          </span>
          <div className={`text-fs-body text-slate-800 dark:text-slate-200 text-left flex-1 leading-normal ${effectiveKind === 'text' ? 'min-w-0 break-words max-w-xl' : 'break-words'}`}>
            {wrappedContent}
          </div>
        </div>
      </td>
    );
  }

  return (
    <td
      className={`px-0 sm:px-3 py-2 align-middle text-fs-body leading-normal min-h-[40px] border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 ${kindClass} ${hideClass} ${stackCellClass} ${pinnedClass} ${className}`.trim()}
      {...props}
    >
      {wrappedContent}
    </td>
  );
};

export interface TableTruncateProps {
  children?: React.ReactNode;
  text?: string;
  className?: string;
  maxWidth?: string;
}

export const TableTruncate: React.FC<TableTruncateProps> = ({
  children,
  text,
  className = '',
  maxWidth = 'max-w-[140px] sm:max-w-[180px]',
}) => {
  const content = children ?? text;
  return (
    <span
      className={`table-cell-truncate truncate ${maxWidth} inline-block align-bottom ${className}`}
      title={typeof content === 'string' ? content : undefined}
    >
      {content}
    </span>
  );
};

export const TableEmptyRow: React.FC<{
  colSpan?: number;
  message?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}> = ({ colSpan, message = 'No records found.', action }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="text-center py-8 text-slate-500 dark:text-slate-400">
      <div className="flex flex-col items-center justify-center gap-2">
        <span>{message}</span>
        {action && (
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </TableCell>
  </TableRow>
);

export const TableLoadingRow: React.FC<{
  colSpan?: number;
  message?: string;
}> = ({ colSpan, message = 'Loading records...' }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="text-center py-8 text-slate-500 dark:text-slate-400">
      {message}
    </TableCell>
  </TableRow>
);

export const TableErrorRow: React.FC<{
  colSpan?: number;
  error?: React.ReactNode;
  onRetry?: () => void;
}> = ({ colSpan, error = 'Failed to load records.', onRetry }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="text-center py-8 text-rose-600 dark:text-rose-400">
      <div className="flex flex-col items-center justify-center gap-2">
        <span>{error}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </TableCell>
  </TableRow>
);

export interface StatusDotProps {
  status: string;
  className?: string;
  label?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, className = '', label }) => {
  const s = (status || '').toLowerCase();
  let dotColor = 'bg-slate-400';
  if (s === 'active' || s === 'completed' || s === 'approved' || s === 'present' || s === 'paid' || s === 'signed') {
    dotColor = 'bg-emerald-500';
  } else if (s.includes('pending') || s.includes('progress') || s.includes('soon') || s === 'scheduled') {
    dotColor = 'bg-amber-500';
  } else if (
    s.includes('suspend') ||
    s.includes('inactive') ||
    s.includes('expired') ||
    s === 'cancelled' ||
    s === 'absent' ||
    s === 'unpaid' ||
    s === 'terminated' ||
    s === 'deactivated'
  ) {
    dotColor = 'bg-rose-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 capitalize ${className}`.trim()}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span>{(label || status || '').replace(/_/g, ' ')}</span>
    </span>
  );
};
