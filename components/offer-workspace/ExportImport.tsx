'use client';

import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { downloadJson, parseImported } from '@/lib/offer-workspace/export-import';
import type { WorkspaceFile } from '@/lib/offer-workspace/types';

interface ExportImportProps {
  onExport: () => WorkspaceFile;
  onImport: (file: WorkspaceFile) => void;
  language: 'fr' | 'en';
}

export function ExportImport({ onExport, onImport, language }: ExportImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labels = language === 'en' ? L_EN : L_FR;

  const handleExport = () => {
    const file = onExport();
    downloadJson(file);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = parseImported(text);
      onImport(parsed);
    } catch (err) {
      // surface a non-blocking message; UI shows a banner higher up if needed
      // eslint-disable-next-line no-alert
      alert(language === 'en' ? `Import failed: ${String(err)}` : `Échec import : ${String(err)}`);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleExport}>
        <Download size={12} /> {labels.export}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload size={12} /> {labels.import}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}

const L_FR = { export: 'Exporter', import: 'Importer' };
const L_EN = { export: 'Export', import: 'Import' };
