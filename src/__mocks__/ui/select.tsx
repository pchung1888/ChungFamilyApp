// Replaces Radix UI Select with a native <select> for predictable testing.
// Radix UI uses portals and keyboard navigation that don't render reliably in happy-dom.
//
// KEY DESIGN: `Select` (the parent) renders the <select> element. The `id` prop lives on
// `SelectTrigger` (a child). We extract it by scanning children, so getByLabelText() works.

import React from "react";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  required?: boolean;
}

interface SelectTriggerProps {
  id?: string;
  children?: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children?: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SimpleChildProps {
  children?: React.ReactNode;
}

export function Select({
  value,
  onValueChange,
  children,
  required,
}: SelectProps): React.ReactElement {
  // Extract the `id` from the SelectTrigger child so the <select> can be found
  // via getByLabelText(). The `id` is passed to SelectTrigger in component code,
  // not to Select directly — we bridge that here.
  let selectId: string | undefined;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement<{ id?: string }>(child) && child.props.id) {
      selectId = child.props.id;
    }
  });

  return (
    <select
      id={selectId}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
      required={required}
    >
      {children}
    </select>
  );
}

// SelectTrigger renders nothing visual — the <select> is owned by Select above.
// Its only job is to carry the `id` prop so Select can extract it.
export function SelectTrigger({ children }: SelectTriggerProps): React.ReactElement {
  return <>{children}</>;
}

export function SelectValue({ placeholder }: SelectValueProps): React.ReactElement {
  return <option value="">{placeholder}</option>;
}

export function SelectContent({ children }: SimpleChildProps): React.ReactElement {
  return <>{children}</>;
}

export function SelectItem({ value, children }: SelectItemProps): React.ReactElement {
  return <option value={value}>{children}</option>;
}
