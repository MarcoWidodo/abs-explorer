import { toPng } from 'html-to-image'

export async function exportPNG(elementRef, filename = 'abs-chart.png') {
  if (!elementRef?.current) return
  try {
    const dataUrl = await toPng(elementRef.current, {
      pixelRatio: 2,
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-bg').trim(),
    })
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error('PNG export failed:', err)
  }
}

export function exportCSV(rows, headers, filename = 'abs-data.csv') {
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const s = String(cell ?? '')
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
