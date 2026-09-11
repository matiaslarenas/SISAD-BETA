import type { LucideIcon } from "lucide-react";

export interface Product {
  id: string;
  item: string;
  type: string;
  category: string;
  location?: string;
  onHand: number;
  minStock: number;
  purchaseUnit: string;
  costPerUnit: number;
  inventoryValue: number;
}

export type AlertCategory = "stock" | "waste" | "purchases" | "inactive";
export type AlertSeverity = "danger" | "warning" | "info";

export interface OperationalAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionLabel: string;
  actionRoute: string;
}

export interface PurchaseOrderItem {
  id?: string;
  productId: string;
  productName: string;
  purchaseUnit?: string;
  quantity: number;
  receivedQuantity?: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  category: string;
  orderedDate: string;
  receiptDate?: string;
  status: "pending" | "in-transit" | "received";
  notes?: string;
  items: PurchaseOrderItem[];
  amount: number;
  orderedDateLabel: string;
  receiptDateLabel: string;
  statusMeta: {
    label: string;
    className: string;
  };
}

export type KpiStatus = "default" | "success" | "warning" | "danger";

export interface KpiData {
  label: string;
  value: string | number;
  trend: string;
  icon: LucideIcon;
  status?: KpiStatus;
}
