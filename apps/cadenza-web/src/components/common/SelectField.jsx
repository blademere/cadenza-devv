import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export default function SelectField({ label, value, onChange, options = [], placeholder = 'Select an option', disabled = false, clearable = false }) {
  const selectValue = value ?? ''
  return (
    <div className="grid gap-2">
      {label && <Label>{label}</Label>}
      <Select value={selectValue} onValueChange={(next) => onChange?.(next || null)} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {clearable && <SelectItem value="__clear__">Clear selection</SelectItem>}
          {options.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
