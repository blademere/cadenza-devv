import { useMemo, useState } from 'react'
import { Input } from './ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

export default function DataTable({ columns, rows, searchPlaceholder = 'Search…', emptyMessage = 'No results.' }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => columns.some((column) => {
      if (column.searchable === false) return false
      const value = typeof column.value === 'function' ? column.value(row) : row[column.key]
      return String(value ?? '').toLowerCase().includes(term)
    }))
  }, [columns, rows, search])

  return (
    <div className="space-y-4">
      <Input value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder={searchPlaceholder} className="max-w-sm" />
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>{columns.map((column) => <TableHead key={column.key}>{column.header}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? filtered.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => <TableCell key={column.key}>{typeof column.render === 'function' ? column.render(row) : (column.value ? column.value(row) : row[column.key])}</TableCell>)}
              </TableRow>
            )) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">{emptyMessage}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
