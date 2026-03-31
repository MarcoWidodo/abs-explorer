import { Download, Image, Table } from 'lucide-react'

export default function ExportBar({ onExportPNG, onExportCSV, disabled }) {
  return (
    <div className="export-bar">
      <button
        className="export-btn"
        onClick={onExportPNG}
        disabled={disabled}
        title="Export chart as PNG"
      >
        <Image size={14} />
        <span>PNG</span>
      </button>
      <button
        className="export-btn"
        onClick={onExportCSV}
        disabled={disabled}
        title="Export data as CSV"
      >
        <Table size={14} />
        <span>CSV</span>
      </button>
    </div>
  )
}
