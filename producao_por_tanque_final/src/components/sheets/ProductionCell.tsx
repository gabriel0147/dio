import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ProductionRow } from '@/lib/types'
import { format, parseISO, isValid } from 'date-fns'
import { useState, useEffect, useRef } from 'react'

interface ProductionCellProps {
  value: string | number
  field: keyof ProductionRow
  onChange: (value: string) => void
  readOnly?: boolean
  type?: 'text' | 'number' | 'date' | 'datetime'
  className?: string
}

export function ProductionCell({
  value,
  onChange,
  readOnly,
  type = 'text',
  className,
}: ProductionCellProps) {
  // Local state for immediate user feedback and avoiding constant parent updates
  const [localValue, setLocalValue] = useState<string | number>('')
  const isFocused = useRef(false)

  // Initialize local value from props
  useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(formatValueForInput(value, type))
    }
  }, [value, type])

  // Helper to format value for input (datetime-local requires yyyy-MM-ddTHH:mm)
  const formatValueForInput = (
    val: string | number,
    inputType: string,
  ): string | number => {
    if (inputType === 'datetime' && val && typeof val === 'string') {
      try {
        const date = parseISO(val)
        if (isValid(date)) {
          return format(date, "yyyy-MM-dd'T'HH:mm")
        }
      } catch (e) {
        console.error('Error parsing date for input:', e)
      }
    }
    return val
  }

  // Helper to display formatted value in read-only mode
  const getDisplayValue = () => {
    if (!value) return ''

    try {
      if (type === 'datetime') {
        const date =
          typeof value === 'string' ? parseISO(value) : new Date(value)
        if (isValid(date)) {
          return format(date, 'dd/MM/yyyy HH:mm')
        }
      } else if (type === 'date') {
        const date =
          typeof value === 'string' ? parseISO(value) : new Date(value)
        if (isValid(date)) {
          return format(date, 'dd/MM/yyyy')
        }
      }
    } catch {
      // Fallback to original value
    }
    return value
  }

  const handleBlur = () => {
    isFocused.current = false
    const strValue = String(localValue)
    // Only trigger onChange if value is different from prop to avoid redundant updates/logs
    if (strValue !== String(value)) {
      onChange(strValue)
    }
  }

  const handleFocus = () => {
    isFocused.current = true
  }

  if (readOnly) {
    return (
      <div
        className={cn(
          'flex h-9 w-full items-center rounded-md border border-transparent bg-muted/20 px-2 py-1 text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis',
          className,
        )}
        title={String(value)}
      >
        {getDisplayValue()}
      </div>
    )
  }

  return (
    <Input
      type={
        type === 'datetime'
          ? 'datetime-local'
          : type === 'date'
            ? 'date'
            : 'text'
      }
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={cn(
        'h-9 px-2 py-1 text-sm transition-colors focus-visible:ring-1',
        className,
      )}
      step={type === 'number' ? 'any' : undefined}
    />
  )
}
