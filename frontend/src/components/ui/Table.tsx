import React from 'react';

interface TableToolbarProps {
  totalLabel: string;
  selectedCount?: number;
  actions?: React.ReactNode;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  totalLabel, selectedCount, actions,
}) => (
  <div className="flex items-center justify-between flex-wrap gap-2">
    <span className="text-[13px] text-gray-500">
      {selectedCount !== undefined && selectedCount > 0 ? (
        <>Đã chọn <strong className="text-gray-900">{selectedCount}</strong> mục</>
      ) : (
        <span dangerouslySetInnerHTML={{ __html: totalLabel }} />
      )}
    </span>
    {actions && (
      <div className="flex items-center gap-2 flex-wrap">
        {actions}
      </div>
    )}
  </div>
);

interface TableWrapperProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const TableWrapper: React.FC<TableWrapperProps> = ({ children, footer }) => (
  <div className="bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.07)] overflow-hidden overflow-x-auto flex-1">
    {children}
    {footer && (
      <div className="px-3.5 py-2.5 text-[13px] text-gray-500 bg-white border-t border-gray-100">
        {footer}
      </div>
    )}
  </div>
);

interface PageLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ sidebar, children }) => (
  <div className="flex min-h-[calc(100vh-92px)] bg-gray-100 font-[Segoe_UI,sans-serif]">
    <aside className="w-[270px] flex-shrink-0 flex flex-col p-3">{sidebar}</aside>
    <main className="flex-1 min-w-0 px-3 pt-3 pb-3 pl-1 flex flex-col gap-2.5">{children}</main>
  </div>
);
