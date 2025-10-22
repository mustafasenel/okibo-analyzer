export interface InvoiceItem {
    ArtikelNumber: string;
    ArtikelBez: string;
    Kolli: number;
    Inhalt: number;
    Menge: number;
    Preis: string;
    Netto: string;
    MwSt?: number; // VAT rate (typically 7 or 19)
    originalNetto?: string;
}

export interface InvoicePage {
    page: number;
    items: InvoiceItem[];
}

export interface InvoiceMeta {
    [key: string]: string | number;
}

export interface InvoiceSummary {
    vat_7?: number;       // 7% VAT amount (optional)
    vat_19?: number;      // 19% VAT amount (optional)
    total_vat?: number;   // Total VAT amount (required)
    total_net?: number;   // Total net amount (required)
    total_gross?: number; // Total gross amount (required)
    // Legacy fields for backward compatibility
    vat_7_net?: number;
    vat_7_gross?: number;
    vat_19_net?: number;
    vat_19_gross?: number;
    Zwischensumme?: number;
    MwSt?: number;
    Gesamtbetrag?: number;
}

export interface InvoiceData {
    invoiceMeta: InvoiceMeta;
    invoiceData: InvoicePage[];
    invoiceSummary: InvoiceSummary;
}
