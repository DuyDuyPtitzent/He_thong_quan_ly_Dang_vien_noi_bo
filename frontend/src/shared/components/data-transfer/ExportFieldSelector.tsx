import { Checkbox } from '@/shared/components/ui/checkbox'
import { Button } from '@/shared/components/ui/button'

export type ExportFieldOption = { key: string; label: string; group: string }

export function ExportFieldSelector({ fields, value, onChange }: { fields: ExportFieldOption[]; value: string[]; onChange: (value: string[]) => void }) {
  const groups = [...new Set(fields.map((field) => field.group))]
  const toggle = (key: string, checked: boolean) => onChange(checked ? [...value, key] : value.filter((item) => item !== key))
  return <section aria-labelledby="export-fields-title" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="export-fields-title" className="text-sm font-medium">Thông tin cần xuất <span className="text-muted-foreground">({value.length} trường)</span></h3><div className="flex gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => onChange(fields.map((field) => field.key))}>Chọn tất cả</Button><Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>Bỏ chọn</Button></div></div>
    <div className="space-y-3">{groups.map((group) => { const members = fields.filter((field) => field.group === group); const selected = members.filter((field) => value.includes(field.key)).length; return <details key={group} open className="rounded-md border px-3"><summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium"><Checkbox checked={selected === members.length} onCheckedChange={(checked) => { const keys = new Set(members.map((field) => field.key)); onChange(checked === true ? [...value.filter((key) => !keys.has(key)), ...members.map((field) => field.key)] : value.filter((key) => !keys.has(key))) }} onClick={(event) => event.stopPropagation()} aria-label={`Chọn tất cả nhóm ${group}`} /><span className="flex-1">{group}</span><span className="text-xs text-muted-foreground">{selected}/{members.length}</span></summary><div className="grid gap-2 border-t py-3 sm:grid-cols-2">{members.map((field) => <label key={field.key} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm"><Checkbox checked={value.includes(field.key)} onCheckedChange={(checked) => toggle(field.key, checked === true)} /><span>{field.label}</span></label>)}</div></details> })}</div>
  </section>
}
