import type { Column } from "write-excel-file/browser";

import type { PrivateAdminRegistration } from "@/lib/admin/types";

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

export async function exportPrivateRegistrationsToExcel(
  registrations: PrivateAdminRegistration[],
) {
  const columns: Column<PrivateAdminRegistration>[] = [
    {
      header: header("Registration ID"),
      cell: (row, rowIndex) =>
        textCell(`PR-${String(row.id).padStart(6, "0")}`, rowIndex),
      width: 18,
    },
    {
      header: header("Submitted At"),
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
      width: 30,
    },
    {
      header: header("Designation"),
      cell: (row, rowIndex) => textCell(row.designation, rowIndex),
      width: 26,
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
      header: header("Purpose"),
      cell: (row, rowIndex) =>
        textCell(row.participation_purpose, rowIndex),
      width: 40,
    },
    {
      header: header("Organiser Notes"),
      cell: (row, rowIndex) =>
        textCell(row.summit_expectations, rowIndex),
      width: 42,
    },
  ];

  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  await writeExcelFile(
    registrations,
    {
      columns,
      sheet: "Link-only entries",
      stickyRowsCount: 1,
      stickyColumnsCount: 2,
      showGridLines: false,
      orientation: "landscape",
      zoomScale: 0.85,
    },
    {
      fontFamily: "Aptos",
      fontSize: 10,
    },
  ).toFile(`summit-link-only-entries-${date}.xlsx`);
}
