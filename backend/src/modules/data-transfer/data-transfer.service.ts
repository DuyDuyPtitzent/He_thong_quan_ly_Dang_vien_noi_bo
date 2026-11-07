import { BadRequestException, Injectable } from '@nestjs/common'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'

export const DATA_TRANSFER_VERSION = '1.0'

export type ExcelCellReadResult = {
  value: string | number | boolean | Date | null
  source: 'VALUE' | 'FORMULA_CACHE'
  issue?: 'FORMULA_CACHE_MISSING' | 'FORMULA_RESULT_ERROR' | 'UNSAFE_FORMULA' | 'EXTERNAL_LINK'
}

@Injectable()
export class DataTransferService {
  private readonly unsafeNamesByWorkbook = new WeakMap<ExcelJS.Workbook, Set<string>>()
  private readonly emptyFormulaCacheCells = new WeakMap<ExcelJS.Workbook, Set<string>>()

  /** Reads cached formula results only. This method never evaluates a formula or follows a link. */
  readCell(cell: ExcelJS.Cell): ExcelCellReadResult {
    const value = cell.value
    if (cell.type === ExcelJS.ValueType.Hyperlink) return { value: null, source: 'VALUE', issue: 'EXTERNAL_LINK' }
    if (cell.type === ExcelJS.ValueType.Formula) {
      const formulaValue = value as ExcelJS.CellValue & { formula?: string; sharedFormula?: string; result?: unknown }
      const formula = formulaValue.formula ?? cell.formula
      if (typeof formula !== 'string') return { value: null, source: 'FORMULA_CACHE', issue: 'UNSAFE_FORMULA' }
      if (this.emptyFormulaCacheCells.get(cell.worksheet.workbook)?.has(`${cell.worksheet.name}!${cell.address}`)) {
        return { value: '', source: 'FORMULA_CACHE' }
      }
      const unsafeNames = this.unsafeNamesByWorkbook.get(cell.worksheet.workbook)
      const formulaIdentifiers = new Set((formula.toLocaleUpperCase('en-US').match(/[A-Z_\\][A-Z0-9_.]*/g) ?? []))
      const usesUnsafeName = [...(unsafeNames ?? [])].some((name) => formulaIdentifiers.has(name.toLocaleUpperCase('en-US')))
      if (/\[[^\]]+\][^!]*!/i.test(formula) || /\b(?:WEBSERVICE|HYPERLINK|RTD|DDE|FILTERXML|IMAGE|INDIRECT)\s*\(/i.test(formula) || usesUnsafeName) {
        return { value: null, source: 'FORMULA_CACHE', issue: 'UNSAFE_FORMULA' }
      }
      if (!Object.prototype.hasOwnProperty.call(formulaValue, 'result') || formulaValue.result === undefined) {
        return { value: null, source: 'FORMULA_CACHE', issue: 'FORMULA_CACHE_MISSING' }
      }
      const result = formulaValue.result
      if (result instanceof Date && Number.isNaN(result.getTime())) return { value: null, source: 'FORMULA_CACHE', issue: 'FORMULA_RESULT_ERROR' }
      if (typeof result === 'object' && result !== null && !(result instanceof Date)) {
        if ('error' in result) return { value: null, source: 'FORMULA_CACHE', issue: 'FORMULA_RESULT_ERROR' }
        return { value: null, source: 'FORMULA_CACHE', issue: 'FORMULA_RESULT_ERROR' }
      }
      if (result === null || typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean' || result instanceof Date) {
        return { value: result, source: 'FORMULA_CACHE' }
      }
      return { value: null, source: 'FORMULA_CACHE', issue: 'FORMULA_RESULT_ERROR' }
    }
    if (value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) {
      return { value: value ?? null, source: 'VALUE' }
    }
    const richText = value as { richText?: { text?: unknown }[]; text?: unknown; hyperlink?: unknown }
    if (Array.isArray(richText.richText)) return { value: richText.richText.map((part) => typeof part?.text === 'string' ? part.text : '').join(''), source: 'VALUE' }
    if (typeof richText.text === 'string' && typeof richText.hyperlink !== 'string') return { value: richText.text, source: 'VALUE' }
    return { value: null, source: 'VALUE', issue: 'EXTERNAL_LINK' }
  }

  cellReadError(result: ExcelCellReadResult, cell: ExcelJS.Cell) {
    if (!result.issue) return undefined
    const coordinate = cell.address.match(/^([A-Z]+)(\d+)$/i)
    const location = coordinate ? `Dòng ${coordinate[2] ?? ''}, cột ${(coordinate[1] ?? '').toUpperCase()}: ` : ''
    if (result.issue === 'FORMULA_CACHE_MISSING') return `${location}Ô này chứa công thức nhưng chưa có kết quả được lưu trong tệp. Vui lòng mở Excel, tính toán và lưu lại hoặc chuyển công thức thành giá trị.`
    if (result.issue === 'FORMULA_RESULT_ERROR') return `${location}Công thức trả về lỗi Excel hoặc kiểu kết quả không được hỗ trợ.`
    if (result.issue === 'EXTERNAL_LINK') return `${location}Không chấp nhận ô chứa liên kết ngoài trong tệp nhập.`
    return `${location}Công thức chứa tham chiếu hoặc thành phần không an toàn nên không được chấp nhận.`
  }

  async read(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook()
    try {
      const emptyFormulaCacheCells = await this.readEmptyFormulaCacheCells(buffer)
      await workbook.xlsx.load(buffer as never)
      const unsafeNames = new Set<string>()
      for (const name of workbook.definedNames.model) {
        if (name.ranges.some((range) => /\[[^\]]+\]/.test(range))) unsafeNames.add(name.name)
      }
      this.unsafeNamesByWorkbook.set(workbook, unsafeNames)
      this.emptyFormulaCacheCells.set(workbook, emptyFormulaCacheCells)
    } catch { throw new BadRequestException({ maLoi: 'EXCEL_KHONG_HOP_LE', thongBao: 'Tệp không phải Excel .xlsx hợp lệ.' }) }
    return workbook
  }

  private async readEmptyFormulaCacheCells(buffer: Buffer) {
    const zip = await JSZip.loadAsync(buffer)
    const workbookXml = await zip.file('xl/workbook.xml')?.async('string')
    const relationshipsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string')
    if (!workbookXml || !relationshipsXml) return new Set<string>()
    const attributes = (xml: string) => Object.fromEntries([...xml.matchAll(/([\w:.-]+)="([^"]*)"/g)].map((match) => [match[1] ?? '', (match[2] ?? '').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')]))
    const targets = new Map<string, string>()
    for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
      const relation = attributes(match[1] ?? '')
      if (relation.Id && relation.Target && relation.Type?.endsWith('/worksheet')) targets.set(relation.Id, relation.Target)
    }
    const result = new Set<string>()
    for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
      const sheet = attributes(match[1] ?? '')
      const name = sheet.name
      const target = sheet['r:id'] ? targets.get(sheet['r:id']) : undefined
      if (!name || !target) continue
      const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
      const xml = await zip.file(path)?.async('string')
      if (!xml) continue
      for (const cellMatch of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const cell = attributes(cellMatch[1] ?? '')
        const body = cellMatch[2] ?? ''
        if (!cell.r || cell.t !== 'str' || !/<f(?:\s[^>]*)?(?:\/>|>[\s\S]*?<\/f>)/.test(body)) continue
        const cachedValue = body.match(/<v(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/v>)/)
        if (cachedValue && !(cachedValue[1] ?? '').trim()) result.add(`${name}!${cell.r}`)
      }
    }
    return result
  }

  async write(workbook: ExcelJS.Workbook) { return Buffer.from(await workbook.xlsx.writeBuffer()) }

  createWorkbook() {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Hệ thống quản lý Đảng viên PTIT'
    workbook.created = new Date()
    return workbook
  }
}
