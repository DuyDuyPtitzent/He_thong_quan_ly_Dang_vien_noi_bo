import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { DataTransferService } from '../src/modules/data-transfer/data-transfer.service'

describe('DataTransferService', () => {
  it('writes and reads a real xlsx workbook', async () => {
    const service = new DataTransferService()
    const workbook = service.createWorkbook()
    workbook.addWorksheet('Hướng dẫn').addRow(['Phiên bản', '1.0'])
    const parsed = await service.read(await service.write(workbook))
    expect(parsed.getWorksheet('Hướng dẫn')?.getCell('A1').text).toBe('Phiên bản')
    expect(parsed.getWorksheet('Hướng dẫn')?.getCell('B1').text).toBe('1.0')
  })

  it('rejects data that is not a valid xlsx file', async () => {
    const service = new DataTransferService()
    await expect(service.read(Buffer.from('not an xlsx file'))).rejects.toMatchObject({
      response: { maLoi: 'EXCEL_KHONG_HOP_LE' },
    })
  })

  it('returns cached formula values of scalar types without evaluating formulas', async () => {
    const service = new DataTransferService()
    const workbook = service.createWorkbook()
    const sheet = workbook.addWorksheet('Data')
    const source = workbook.addWorksheet('Nguồn')
    source.getCell('A1').value = 'cached from another sheet'
    sheet.getCell('A1').value = { formula: '="cached text"', result: 'cached text' }
    sheet.getCell('A2').value = { formula: '=1+2', result: 3 }
    sheet.getCell('A3').value = { formula: '=DATE(2025,1,2)', result: new Date('2025-01-02T00:00:00.000Z') }
    sheet.getCell('A4').value = { formula: '=TRUE()', result: true }
    sheet.getCell('A5').value = { formula: '=IF(TRUE(),"","")', result: '' }
    sheet.getCell('A6').value = { formula: "='Nguồn'!A1", result: 'cached from another sheet' }
    const zip = await JSZip.loadAsync(await service.write(workbook))
    const worksheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    const blankFormulaCell = worksheetXml.match(/<c\b[^>]*\br="A5"[^>]*>[\s\S]*?<\/c>/)?.[0]
    expect(blankFormulaCell).toBeDefined()
    zip.file('xl/worksheets/sheet1.xml', worksheetXml.replace(blankFormulaCell!, blankFormulaCell!.replace('</c>', '<v></v></c>')))
    const parsed = await service.read(await zip.generateAsync({ type: 'nodebuffer' }))
    const results = Array.from({ length: 6 }, (_, index) => service.readCell(parsed.getWorksheet('Data')!.getCell(index + 1, 1)))

    expect(results.map((result) => result.value)).toEqual(['cached text', 3, new Date('2025-01-02T00:00:00.000Z'), true, '', 'cached from another sheet'])
    expect(results.map((result) => result.source)).toEqual(Array(6).fill('FORMULA_CACHE'))
    expect(results.slice(0, 4).every((result) => !result.issue)).toBe(true)
    expect(results.every((result) => !result.issue)).toBe(true)
  })

  it('rejects missing/error cached values and external or unsafe formula references', async () => {
    const service = new DataTransferService()
    const workbook = service.createWorkbook()
    const sheet = workbook.addWorksheet('Data')
    sheet.getCell('A1').value = { formula: '=1+2' }
    sheet.getCell('A2').value = { formula: '=NA()', result: { error: '#N/A' } }
    sheet.getCell('A3').value = { formula: "='[external.xlsx]Sheet1'!A1", result: 'linked' }
    sheet.getCell('A4').value = { formula: '=HYPERLINK("https://example.invalid","link")', result: 'link' }
    sheet.getCell('A5').value = { text: 'linked value', hyperlink: 'https://example.invalid' }

    const parsed = await service.read(await service.write(workbook))
    const results = Array.from({ length: 5 }, (_, index) => service.readCell(parsed.getWorksheet('Data')!.getCell(index + 1, 1)))

    expect(results.map((result) => result.issue)).toEqual([
      'FORMULA_CACHE_MISSING', 'FORMULA_RESULT_ERROR', 'UNSAFE_FORMULA', 'UNSAFE_FORMULA', 'EXTERNAL_LINK',
    ])
    expect(results.map((result) => service.cellReadError(result, parsed.getWorksheet('Data')!.getCell(results.indexOf(result) + 1, 1))))
      .toContain('Dòng 1, cột A: Ô này chứa công thức nhưng chưa có kết quả được lưu trong tệp. Vui lòng mở Excel, tính toán và lưu lại hoặc chuyển công thức thành giá trị.')
  })
})
