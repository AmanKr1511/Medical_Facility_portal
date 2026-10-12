import './ui.css';

/** variant: 'solid' (default, dark) | 'outline'. size: 'md' | 'sm'. */
export default function Button({
  variant = 'solid',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const cls = ['btn', variant === 'outline' && 'btn--outline', size === 'sm' && 'btn--sm', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
