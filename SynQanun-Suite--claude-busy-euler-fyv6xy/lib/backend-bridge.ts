/**
 * Bridge between Next.js Frontend and FastAPI PostgreSQL Backend.
 * Implements Track A.5 real data persistence with seamless fallback.
 */
import { viewerStaffId } from '@/lib/demo-viewer';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

async function getHeaders(): Promise<HeadersInit> {
  const staffId = await viewerStaffId().catch(() => 'stf-001');
  return {
    'Content-Type': 'application/json',
    'X-Viewer-Staff-Id': staffId,
  };
}

async function getClientHeaders(): Promise<HeadersInit> {
  return {
    'Content-Type': 'application/json',
    'X-Viewer-Client-Id': 'cli-001',
  };
}

export const backendBridge = {
  // --- Clients ---
  clients: {
    async list(params?: { standing?: string; q?: string }) {
      try {
        const query = new URLSearchParams();
        if (params?.standing) query.set('standing', params.standing);
        if (params?.q) query.set('q', params.q);

        const res = await fetch(`${BACKEND_URL}/staff/clients?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async get(clientId: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/clients/${clientId}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async create(input: { name: string; summary?: string; standing: string }) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/clients`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(input),
        });
        return await res.json();
      } catch {
        return null;
      }
    },

    async contacts(clientId: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/clients/${clientId}/contacts`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async addContact(clientId: string, input: any) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/clients/${clientId}/contacts`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(input),
        });
        return await res.json();
      } catch {
        return null;
      }
    },
  },

  // --- Matters ---
  matters: {
    async list(params?: {
      view?: string;
      filter?: string;
      clientId?: string;
      venue?: string;
      leadId?: string;
      workType?: string;
    }) {
      try {
        const query = new URLSearchParams();
        if (params?.view) query.set('view', params.view);
        if (params?.filter) query.set('filter', params.filter);
        if (params?.clientId) query.set('clientId', params.clientId);
        if (params?.venue) query.set('venue', params.venue);
        if (params?.leadId) query.set('leadId', params.leadId);
        if (params?.workType) query.set('workType', params.workType);

        const res = await fetch(`${BACKEND_URL}/staff/matters?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async get(reference: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/matters/${reference}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async create(input: {
      title: string;
      workType: string;
      clientId: string;
      practiceArea: string;
      forum: string;
      leadId: string;
      scope?: string;
    }) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/matters`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(input),
        });
        return await res.json();
      } catch {
        return null;
      }
    },

    async reopen(reference: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/matters/${reference}/reopen`, {
          method: 'POST',
          headers: await getHeaders(),
        });
        return await res.json();
      } catch {
        return null;
      }
    },

    async close(reference: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/matters/${reference}/close`, {
          method: 'POST',
          headers: await getHeaders(),
        });
        return await res.json();
      } catch {
        return null;
      }
    },

    async reassignLead(input: { references: string[]; staffId: string }) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/matters/reassign-lead`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(input),
        });
        return await res.json();
      } catch {
        return null;
      }
    },

    async leadOptions() {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/matters/lead-options`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async options() {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/matters/options`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
  },

  // --- Client Matters ---
  clientMatters: {
    async list(params?: { filter?: string; page?: number; pageSize?: number }) {
      try {
        const query = new URLSearchParams();
        if (params?.filter) query.set('filter', params.filter);
        if (params?.page) query.set('page', params.page.toString());
        if (params?.pageSize) query.set('pageSize', params.pageSize.toString());

        const res = await fetch(`${BACKEND_URL}/client/matters?${query.toString()}`, {
          headers: await getClientHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async forums() {
      try {
        const res = await fetch(`${BACKEND_URL}/client/matters/forums`, {
          headers: await getClientHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async get(reference: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/client/matters/${reference}`, {
          headers: await getClientHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
  },

  // --- Billing ---
  billing: {
    async summary() {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/billing/summary`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async invoices(params?: { filter?: string; clientId?: string }) {
      try {
        const query = new URLSearchParams();
        if (params?.filter) query.set('filter', params.filter);
        if (params?.clientId) query.set('clientId', params.clientId);

        const res = await fetch(`${BACKEND_URL}/staff/billing/invoices?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async quotes(params?: { state?: string }) {
      try {
        const query = new URLSearchParams();
        if (params?.state) query.set('state', params.state);

        const res = await fetch(`${BACKEND_URL}/staff/billing/quotes?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async drafts() {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/billing/drafts`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async saveDraft(input: {
      engagementRef: string;
      description: string;
      lines: { description: string; minutes: number | null; fromEntryIds: string[]; amount: number | null }[];
    }) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/billing/drafts`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(input),
        });
        return await res.json();
      } catch {
        return null;
      }
    },

    async issue(reference: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/billing/invoices/${encodeURIComponent(reference)}/issue`, {
          method: 'POST',
          headers: await getHeaders(),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async markPaid(reference: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/billing/invoices/${encodeURIComponent(reference)}/mark-paid`, {
          method: 'POST',
          headers: await getHeaders(),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async logTime(input: {
      matterId?: string;
      engagementRef?: string;
      minutes: number;
      description: string;
      billable?: boolean | null;
      entryDate?: string;
    }) {
      try {
        const matterId = input.matterId || input.engagementRef || '';
        const payload = {
          matterId,
          minutes: input.minutes,
          description: input.description,
          billable: input.billable !== false,
          entryDate: input.entryDate,
        };
        const res = await fetch(`${BACKEND_URL}/staff/billing/time`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(payload),
        });
        return await res.json();
      } catch {
        return null;
      }
    },

    async timeEntries(params?: {
      matterId?: string;
      engagementRef?: string;
      staffId?: string;
      clientId?: string;
      unbilledOnly?: boolean;
    }) {
      try {
        const query = new URLSearchParams();
        if (params?.matterId) query.set('matterId', params.matterId);
        if (params?.engagementRef) query.set('engagementRef', params.engagementRef);
        if (params?.staffId) query.set('staffId', params.staffId);
        if (params?.clientId) query.set('clientId', params.clientId);
        if (params?.unbilledOnly) query.set('unbilledOnly', 'true');

        const res = await fetch(`${BACKEND_URL}/staff/billing/time?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async invoiceDraftContext(engagementRef?: string) {
      try {
        const query = new URLSearchParams();
        if (engagementRef) query.set('engagementRef', engagementRef);

        const res = await fetch(`${BACKEND_URL}/staff/billing/context?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    // Client Invoices
    async clientInvoices(params?: { filter?: string; page?: number; pageSize?: number }) {
      try {
        const query = new URLSearchParams();
        if (params?.filter) query.set('filter', params.filter);
        if (params?.page) query.set('page', String(params.page));
        if (params?.pageSize) query.set('pageSize', String(params.pageSize));

        const res = await fetch(`${BACKEND_URL}/client/invoices?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async clientInvoice(reference: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/client/invoices/${encodeURIComponent(reference)}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async clientInvoiceSummary() {
      try {
        const res = await fetch(`${BACKEND_URL}/client/invoices/summary`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async clientInvoiceEngagements() {
      try {
        const res = await fetch(`${BACKEND_URL}/client/invoices/engagements`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
  },

  // --- Legal Database ---
  legalDatabase: {
    async search(params?: { kind?: string; q?: string }) {
      try {
        const query = new URLSearchParams();
        if (params?.kind) query.set('kind', params.kind);
        if (params?.q) query.set('q', params.q);

        const res = await fetch(`${BACKEND_URL}/staff/legal-database?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async get(reference: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/legal-database/${reference}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
  },

  // --- Auth ---
  auth: {
    async login(email: string, password: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.detail || 'Login failed' };
        }
        const data = await res.json();
        return { ok: true, data };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Connection error' };
      }
    },
  },

  // --- Documents (Word .docx & Excel .xlsx) ---
  documents: {
    async generateWord(data: {
      matter_reference: string;
      template_type?: string;
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
    }) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/documents/generate-word`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.detail || 'Word generation failed' };
        }
        const doc = await res.json();
        return { ok: true, data: doc };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Connection error' };
      }
    },

    async exportExcel(data: {
      export_type: 'client_statement' | 'invoices_ledger' | 'timesheet';
      matter_reference?: string;
      client_id?: string;
      is_firm_only?: boolean;
    }) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/documents/export-excel`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.detail || 'Excel export failed' };
        }
        const doc = await res.json();
        return { ok: true, data: doc };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Connection error' };
      }
    },

    async list(params?: { engagement_ref?: string; client_id?: string; kind?: string }) {
      try {
        const query = new URLSearchParams();
        if (params?.engagement_ref) query.append('engagement_ref', params.engagement_ref);
        if (params?.client_id) query.append('client_id', params.client_id);
        if (params?.kind) query.append('kind', params.kind);
        const res = await fetch(`${BACKEND_URL}/staff/documents?${query.toString()}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
      } catch {
        return [];
      }
    },

    async listClient(params?: { engagement_ref?: string }) {
      try {
        const query = new URLSearchParams();
        if (params?.engagement_ref) query.append('engagement_ref', params.engagement_ref);
        const res = await fetch(`${BACKEND_URL}/client/documents?${query.toString()}`, {
          headers: await getClientHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
      } catch {
        return [];
      }
    },

    getDownloadUrl(docId: string) {
      return `http://127.0.0.1:8000/api/documents/${docId}/download`;
    },
  },

  // --- Microsoft 365 & Word Online Integrations ---
  integrations: {
    async getMicrosoftStatus() {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/integrations/microsoft/status`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) return { is_connected: false, has_configured_client_id: false };
        return await res.json();
      } catch {
        return { is_connected: false, has_configured_client_id: false };
      }
    },

    async getMicrosoftAuthUrl(redirectUri: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/integrations/microsoft/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`, {
          headers: await getHeaders(),
          cache: 'no-store',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.detail || 'Failed to get auth url' };
        }
        return { ok: true, data: await res.json() };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Network error' };
      }
    },

    async exchangeMicrosoftToken(code: string, redirectUri: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/integrations/microsoft/exchange-token`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.detail || 'Token exchange failed' };
        }
        return { ok: true, data: await res.json() };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Network error' };
      }
    },

    async disconnectMicrosoft() {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/integrations/microsoft/disconnect`, {
          method: 'POST',
          headers: await getHeaders(),
        });
        return await res.json();
      } catch {
        return null;
      }
    },

    async openWordOnline(documentId: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/integrations/documents/${documentId}/open-word-online`, {
          method: 'POST',
          headers: await getHeaders(),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.detail || 'Failed to open Word Online' };
        }
        return { ok: true, data: await res.json() };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Network error' };
      }
    },

    async syncFromWordOnline(documentId: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/staff/integrations/documents/${documentId}/sync-from-word-online`, {
          method: 'POST',
          headers: await getHeaders(),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.detail || 'Failed to sync from Word Online' };
        }
        return { ok: true, data: await res.json() };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Network error' };
      }
    },

    async uploadUpdatedDocx(documentId: string, formData: FormData) {
      try {
        const staffId = await viewerStaffId().catch(() => 'stf-001');
        const res = await fetch(`${BACKEND_URL}/staff/integrations/documents/${documentId}/upload-updated-docx`, {
          method: 'POST',
          headers: {
            'X-Viewer-Staff-Id': staffId,
          },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.detail || 'Failed to upload document' };
        }
        return { ok: true, data: await res.json() };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Network error' };
      }
    },
  },
};
