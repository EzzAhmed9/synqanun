'use server';

import { backendBridge } from '@/lib/backend-bridge';

export interface GenerateWordInput {
  matter_reference: string;
  template_type: string;
  title?: string;
  court_name?: string;
  circuit?: string;
  case_number?: string;
  client_role?: string;
  opposing_party?: string;
  facts?: string;
  defenses?: string;
  requests?: string;
  is_firm_only?: boolean;
}

export interface ExportExcelInput {
  export_type: 'client_statement' | 'invoices_ledger' | 'timesheet';
  matter_reference?: string;
  client_id?: string;
  is_firm_only?: boolean;
}

export async function generateWordAction(input: GenerateWordInput) {
  const result = await backendBridge.documents.generateWord(input);
  return result;
}

export async function exportExcelAction(input: ExportExcelInput) {
  const result = await backendBridge.documents.exportExcel(input);
  return result;
}
