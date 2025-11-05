import * as React from "react";

type TileProps = React.PropsWithChildren<{
  href?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}>;

export function Tile({ href, title, subtitle, icon, children }: TileProps) {
  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/70 dark:border-neutral-700/60 bg-white/80 dark:bg-neutral-800/70 backdrop-blur transition-all hover:shadow-xl hover:-translate-y-0.5">
      <div className="p-5 flex items-start gap-4">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          {icon ?? <span>★</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-neutral-900 dark:text-white truncate">{title}</div>
          {subtitle ? (
            <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{subtitle}</div>
          ) : null}
        </div>
      </div>
      {children ? <div className="px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-300">{children}</div> : null}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block focus:outline-none focus-visible:ring focus-visible:ring-blue-400 rounded-2xl">
        {content}
      </a>
    );
  }
  return content;
}




