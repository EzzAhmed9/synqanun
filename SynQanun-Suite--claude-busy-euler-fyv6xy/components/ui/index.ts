/**
 * Core UI kit — BUILD_PLAN.md §3, Batch 0, item 3.
 *
 * Every screen imports its primitives from here. Nothing in app/ should style
 * a button, card, badge, table, tab strip or modal inline: BUILD_PLAN.md names
 * per-screen restyling as the direct cause of the inconsistencies this
 * codebase exists to avoid.
 */

export {
  Button,
  // Button styling without the <button>, for a control that navigates.
  // See Button.tsx.
  buttonClasses,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from './Button';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardProps,
  type Elevation,
} from './Card';
export { Badge, type BadgeProps, type BadgeTone } from './Badge';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { Field, Input, type FieldProps, type InputProps } from './Input';
export { Textarea, type TextareaProps } from './Textarea';
export { Checkbox, type CheckboxProps } from './Checkbox';
export { Select, type SelectProps } from './Select';
export { PasswordInput, type PasswordInputProps } from './PasswordInput';
export {
  PasswordStrength,
  scorePassword,
  type PasswordStrengthProps,
  type StrengthLevel,
} from './PasswordStrength';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type SortDirection,
  type TableCellProps,
  type TableProps,
} from './Table';
export { TabPanel, Tabs, type TabItem, type TabsProps } from './Tabs';
// Separate module, no 'use client' — so a Server Component can use it too.
// See components/ui/tab-styles.ts.
export { tabTriggerClasses } from './tab-styles';
export { Modal, type ModalProps } from './Modal';
// The overlay mechanics <Modal> is built on — exported for the global search
// overlay, whose header is an input rather than a title. See Overlay.tsx.
export { Overlay, type OverlayProps, type OverlaySize } from './Overlay';
