"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintInvoiceButton() {
  return (
    <Button onClick={() => window.print()}>
      <PrinterIcon className="size-4" /> Imprimer ou enregistrer en PDF
    </Button>
  );
}
