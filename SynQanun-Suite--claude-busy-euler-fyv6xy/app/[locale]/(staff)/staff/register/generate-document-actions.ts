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
  body?: string;
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

export async function openWordOnlineAction(documentId: string) {
  return await backendBridge.integrations.openWordOnline(documentId);
}

export async function syncFromWordOnlineAction(documentId: string) {
  return await backendBridge.integrations.syncFromWordOnline(documentId);
}

export async function uploadUpdatedDocxAction(documentId: string, formData: FormData) {
  return await backendBridge.integrations.uploadUpdatedDocx(documentId, formData);
}

export async function getMicrosoftStatusAction() {
  return await backendBridge.integrations.getMicrosoftStatus();
}

export async function saveMicrosoftClientIdAction(clientId: string, clientSecret?: string) {
  return await backendBridge.integrations.saveMicrosoftClientId(clientId, clientSecret);
}

export async function getMicrosoftAuthUrlAction(redirectUri: string) {
  return await backendBridge.integrations.getMicrosoftAuthUrl(redirectUri);
}

export async function exchangeMicrosoftTokenAction(code: string, redirectUri: string) {
  return await backendBridge.integrations.exchangeMicrosoftToken(code, redirectUri);
}

export async function getMatterDocumentsAction(matterReference: string) {
  return await backendBridge.documents.list({ engagement_ref: matterReference });
}

export async function disconnectMicrosoftAction() {
  return await backendBridge.integrations.disconnectMicrosoft();
}

export async function getOnlyOfficeConfigAction(documentId: string) {
  return await backendBridge.onlyoffice.getConfig(documentId);
}

export async function getOnlyOfficeStatusAction() {
  return await backendBridge.onlyoffice.getStatus();
}

export async function configureOnlyOfficeAction(
  serverUrlOrInput: string | { server_url: string; jwt_secret?: string; is_active?: boolean },
  jwtSecret?: string
) {
  if (typeof serverUrlOrInput === 'object') {
    return await backendBridge.onlyoffice.configure(
      serverUrlOrInput.server_url,
      serverUrlOrInput.jwt_secret,
      serverUrlOrInput.is_active
    );
  }
  return await backendBridge.onlyoffice.configure(serverUrlOrInput, jwtSecret);
}
