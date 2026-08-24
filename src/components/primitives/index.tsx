import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Tone = 'accent' | 'muted' | 'warning' | 'danger' | 'success'

const toneClass: Record<Tone, string> = {
  accent: 'text-accent',
  muted: 'text-muted',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
}

/**
 * The uppercase mono label used for every eyebrow, section kicker and
 * caption. Replaces the `font-display text-3xs uppercase tracking-[...]`
 * string that had been copied across the pages.
 */
export function Kicker({
  children,
  tone = 'accent',
  size = 'md',
  as: Tag = 'p',
  className = '',
}: {
  children: ReactNode
  tone?: 'accent' | 'muted'
  size?: 'sm' | 'md'
  as?: 'p' | 'span' | 'div'
  className?: string
}) {
  const classes = ['kicker', tone === 'muted' && 'kicker-muted', size === 'sm' && 'kicker-sm', className]
  return <Tag className={classes.filter(Boolean).join(' ')}>{children}</Tag>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  meta,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
  meta?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="max-w-4xl">
        <Kicker>{eyebrow}</Kicker>
        {meta}
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </header>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  id,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  id?: string
}) {
  return (
    <div className="section-bar">
      <div className="max-w-3xl">
        {eyebrow && <Kicker>{eyebrow}</Kicker>}
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm leading-6 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Notice({
  icon: Icon,
  tone = 'accent',
  title,
  children,
  className = '',
}: {
  icon?: LucideIcon
  tone?: 'accent' | 'warning' | 'danger' | 'neutral'
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={['notice', `notice-${tone}`, className].filter(Boolean).join(' ')}>
      {Icon && <Icon aria-hidden="true" className="notice-icon" size={18} />}
      <div>
        {title && <strong className="text-ink">{title}：</strong>}
        {children}
      </div>
    </div>
  )
}

export function Disclosure({
  icon: Icon,
  title,
  children,
  open,
}: {
  icon?: LucideIcon
  title: string
  children: ReactNode
  open?: boolean
}) {
  return (
    <details className="disclosure" open={open}>
      <summary>
        {Icon && <Icon aria-hidden="true" size={19} />}
        {title}
      </summary>
      <div className="disclosure-content">{children}</div>
    </details>
  )
}

export function StepList({ steps, columns = true }: { steps: readonly string[]; columns?: boolean }) {
  return (
    <ol className={'grid gap-4 ' + (columns ? 'lg:grid-cols-2' : '')}>
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm leading-6 text-muted">
          <span className="step-number">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * The one card shape behind what used to be five near-identical page-local
 * components (Concept, Gate, Boundary, DataCard and the inline articles).
 * `href` renders an external link, `to` an in-app route, neither renders an
 * <article>.
 */
export function InfoCard({
  icon: Icon,
  tone = 'accent',
  kicker,
  badge,
  title,
  headingLevel = 3,
  headingId,
  children,
  footer,
  href,
  to,
  className = '',
}: {
  icon?: LucideIcon
  tone?: Tone
  kicker?: string
  badge?: ReactNode
  title: string
  headingLevel?: 2 | 3
  headingId?: string
  children?: ReactNode
  footer?: ReactNode
  href?: string
  to?: string
  className?: string
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const showLeadingIcon = Boolean(Icon) && !kicker
  const trailing =
    badge ??
    (href ? (
      <ArrowUpRight aria-hidden="true" className="shrink-0 text-muted" size={17} />
    ) : Icon && kicker ? (
      <Icon aria-hidden="true" className="text-muted" size={18} />
    ) : null)
  const hasHeader = showLeadingIcon || Boolean(kicker) || Boolean(trailing)

  const body = (
    <>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3">
          {kicker ? (
            <Kicker as="span" size="sm">
              {kicker}
            </Kicker>
          ) : showLeadingIcon && Icon ? (
            <Icon aria-hidden="true" className={toneClass[tone]} size={20} />
          ) : (
            <span />
          )}
          {trailing}
        </div>
      )}
      <Heading
        id={headingId}
        className={
          (hasHeader ? 'mt-5 ' : '') +
          (headingLevel === 2 ? 'text-2xl' : 'text-lg') +
          ' font-semibold text-ink'
        }
      >
        {title}
      </Heading>
      {children && <div className="mt-3 text-sm leading-7 text-muted">{children}</div>}
      {footer && <div className="mt-4 border-t border-line/60 pt-4 text-xs leading-5">{footer}</div>}
    </>
  )

  const classes = ['equipment-panel', className].filter(Boolean).join(' ')
  if (href) {
    return (
      <a className={classes + ' device-card group'} href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    )
  }
  if (to) {
    return (
      <Link className={classes + ' device-card group'} to={to}>
        {body}
      </Link>
    )
  }
  return <article className={classes}>{body}</article>
}

/**
 * The bordered, horizontally scrollable table wrapper that had been hand-rolled
 * on four pages with three different arbitrary min-widths.
 */
export function DataTable({
  columns,
  rows,
  label,
}: {
  columns: readonly string[]
  rows: readonly { key: string; cells: readonly ReactNode[] }[]
  label?: string
}) {
  return (
    <div className="table-frame">
      <div className="table-scroll" tabIndex={0} role="region" aria-label={label}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) => (
                  <td key={index}>
                    {/* Below sm the header row is hidden and each cell carries
                        its own label; see the stacked table rules in styles.css. */}
                    <span className="table-label" aria-hidden="true">
                      {columns[index]}
                    </span>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
