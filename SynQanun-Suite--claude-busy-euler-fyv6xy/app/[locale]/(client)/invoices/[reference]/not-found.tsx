import { EngagementNotFound } from '../../EngagementNotFound';

export default function InvoiceNotFound() {
  return <EngagementNotFound namespace="invoices.detail" backHref="/invoices" />;
}
