import type { Column } from "write-excel-file/browser";

import type { AdminRegistration } from "@/lib/admin/types";
import { decodeSummitPreferences } from "@/lib/summit/preferences";

type ExportRegistration = AdminRegistration & {
  participationPurpose: string;
  meetingRequests: string;
  organiserNotes: string;
};

const header = (value: string) => ({
  value,
  fontWeight: "bold" as const,
  textColor: "#FFFFFF",
  backgroundColor: "#0C4A66",
  alignVertical: "center" as const,
  height: 28,
  bottomBorderColor: "#0DA1A7",
  bottomBorderStyle: "medium" as const,
});

const textCell = (value: string | null | undefined, rowIndex: number) => ({
  value: value || "",
  type: String,
  format: "@",
  alignVertical: "top" as const,
  wrap: true,
  backgroundColor: rowIndex % 2 === 1 ? "#F5FBFB" : undefined,
  bottomBorderColor: "#E2F0F2",
  bottomBorderStyle: "thin" as const,
});

const numberCell = (value: number, rowIndex: number) => ({
  value,
  type: Number,
  format: '"₹"#,##0',
  align: "right" as const,
  alignVertical: "top" as const,
  backgroundColor: rowIndex % 2 === 1 ? "#F5FBFB" : undefined,
  bottomBorderColor: "#E2F0F2",
  bottomBorderStyle: "thin" as const,
});

const dateCell = (value: string | null, rowIndex: number) =>
  value
    ? {
        value: new Date(value),
        type: Date,
        format: "dd mmm yyyy, hh:mm AM/PM",
        alignVertical: "top" as const,
        backgroundColor: rowIndex % 2 === 1 ? "#F5FBFB" : undefined,
        bottomBorderColor: "#E2F0F2",
        bottomBorderStyle: "thin" as const,
      }
    : textCell("", rowIndex);

export async function exportRegistrationsToExcel(
  registrations: AdminRegistration[],
) {
  const rows: ExportRegistration[] = registrations.map((registration) => {
    const preferences = decodeSummitPreferences(
      registration.summit_expectations,
    );

    return {
      ...registration,
      participationPurpose: preferences.purpose,
      meetingRequests: preferences.meetings.join("; "),
      organiserNotes: preferences.notes,
    };
  });

  const columns: Column<ExportRegistration>[] = [
    {
      header: header("Registration ID"),
      cell: (row, rowIndex) => textCell(`IS-${String(row.application_id).padStart(6, "0")}`, rowIndex),
      width: 18,
    },
    {
      header: header("Registered At"),
      cell: (row, rowIndex) => dateCell(row.created_at, rowIndex),
      width: 23,
    },
    {
      header: header("First Name"),
      cell: (row, rowIndex) => textCell(row.first_name, rowIndex),
      width: 18,
    },
    {
      header: header("Last Name"),
      cell: (row, rowIndex) => textCell(row.last_name, rowIndex),
      width: 18,
    },
    {
      header: header("Email"),
      cell: (row, rowIndex) => textCell(row.email, rowIndex),
      width: 34,
    },
    {
      header: header("Phone"),
      cell: (row, rowIndex) => textCell(row.phone, rowIndex),
      width: 20,
    },
    {
      header: header("Organisation"),
      cell: (row, rowIndex) => textCell(row.profession, rowIndex),
      width: 28,
    },
    {
      header: header("Designation"),
      cell: (row, rowIndex) => textCell(row.designation, rowIndex),
      width: 24,
    },
    {
      header: header("Sector"),
      cell: (row, rowIndex) => textCell(row.industry, rowIndex),
      width: 28,
    },
    {
      header: header("City"),
      cell: (row, rowIndex) => textCell(row.place, rowIndex),
      width: 24,
    },
    {
      header: header("Participation Purpose"),
      cell: (row, rowIndex) => textCell(row.participationPurpose, rowIndex),
      width: 38,
    },
    {
      header: header("Meeting Requests"),
      cell: (row, rowIndex) => textCell(row.meetingRequests, rowIndex),
      width: 40,
    },
    {
      header: header("Organiser Notes"),
      cell: (row, rowIndex) => textCell(row.organiserNotes, rowIndex),
      width: 42,
    },
    {
      header: header("Plan"),
      cell: (row, rowIndex) => textCell(row.plan_name, rowIndex),
      width: 28,
    },
    {
      header: header("Redeem Code"),
      cell: (row, rowIndex) => textCell(row.redeem_code || "Standard", rowIndex),
      width: 17,
    },
    {
      header: header("Original Amount"),
      cell: (row, rowIndex) => numberCell(row.original_amount_paise / 100, rowIndex),
      width: 18,
    },
    {
      header: header("Discount"),
      cell: (row, rowIndex) => numberCell(row.discount_amount_paise / 100, rowIndex),
      width: 16,
    },
    {
      header: header("Amount Due / Paid"),
      cell: (row, rowIndex) => numberCell(row.amount_due_paise / 100, rowIndex),
      width: 20,
    },
    {
      header: header("Payment Status"),
      cell: (row, rowIndex) => textCell(paymentStatusLabel(row.payment_status), rowIndex),
      width: 18,
    },
    {
      header: header("Payment Mode"),
      cell: (row, rowIndex) => textCell(row.payment_mode || "", rowIndex),
      width: 16,
    },
    {
      header: header("Razorpay Order ID"),
      cell: (row, rowIndex) => textCell(row.razorpay_order_id, rowIndex),
      width: 28,
    },
    {
      header: header("Razorpay Payment ID"),
      cell: (row, rowIndex) => textCell(row.razorpay_payment_id, rowIndex),
      width: 28,
    },
    {
      header: header("Provider Status"),
      cell: (row, rowIndex) => textCell(row.provider_payment_status, rowIndex),
      width: 18,
    },
    {
      header: header("Payment Method"),
      cell: (row, rowIndex) => textCell(formatPaymentMethod(row.payment_method), rowIndex),
      width: 20,
    },
    {
      header: header("Paid At"),
      cell: (row, rowIndex) => dateCell(row.paid_at, rowIndex),
      width: 23,
    },
  ];

  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  await writeExcelFile(rows, {
    columns,
    sheet: "Registrations",
    stickyRowsCount: 1,
    stickyColumnsCount: 2,
    showGridLines: false,
    orientation: "landscape",
    zoomScale: 0.8,
  }, {
    fontFamily: "Aptos",
    fontSize: 10,
  }).toFile(`summit-registrations-${date}.xlsx`);
}

function paymentStatusLabel(status: AdminRegistration["payment_status"]) {
  if (status === "paid") return "Paid";
  if (status === "payment_pending") return "Pending";
  if (status === "cancelled") return "Cancelled";
  return "Not started";
}

function formatPaymentMethod(method: string | null) {
  if (!method) return "";
  return method
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
