import type { Gender, TravelerFormValue } from "@/features/travelers/types"

function mrzDate(value: string, expiry = false) {
  if (!/^\d{6}$/.test(value)) return ""
  const year = Number(value.slice(0, 2))
  const month = value.slice(2, 4)
  const day = value.slice(4, 6)
  const currentYear = new Date().getFullYear() % 100
  const century = expiry || year <= currentYear ? 2000 : 1900
  return `${century + year}-${month}-${day}`
}

function cleanMrzName(value: string) {
  return value.replace(/</g, " ").replace(/\s+/g, " ").trim()
}

export function extractTravelerFields(text: string): Partial<TravelerFormValue> {
  const result: Partial<TravelerFormValue> = {}
  const normalizedLines = text
    .toUpperCase()
    .split(/\r?\n/)
    .map((line) => line.replace(/\s/g, ""))
    .filter(Boolean)

  const passportLineIndex = normalizedLines.findIndex((line) => line.startsWith("P<") && line.length >= 35)
  if (passportLineIndex >= 0 && normalizedLines[passportLineIndex + 1]?.length >= 35) {
    const namesLine = normalizedLines[passportLineIndex].padEnd(44, "<")
    const dataLine = normalizedLines[passportLineIndex + 1].padEnd(44, "<")
    const names = namesLine.slice(5).split("<<")
    result.last_name = cleanMrzName(names[0] ?? "")
    result.first_name = cleanMrzName(names.slice(1).join(" "))
    result.document_type = "passport"
    result.document_number = dataLine.slice(0, 9).replace(/</g, "").trim()
    result.nationality = dataLine.slice(10, 13).replace(/</g, "").trim()
    result.birth_date = mrzDate(dataLine.slice(13, 19))
    result.gender = ({ M: "male", F: "female" }[dataLine.slice(20, 21)] ?? "") as Gender | ""
    result.document_expiry_date = mrzDate(dataLine.slice(21, 27), true)
    return result
  }

  const upperText = text.toUpperCase()
  const cinMatch = upperText.match(/\b[A-Z]{1,2}\s?\d{5,8}\b/)
  if (cinMatch) {
    result.document_type = "cin"
    result.document_number = cinMatch[0].replace(/\s/g, "")
  }

  const dates = [...text.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/g)].map(
    (match) => `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`,
  )
  if (dates[0]) result.birth_date = dates[0]
  if (dates.length > 1) result.document_expiry_date = dates[dates.length - 1]

  return result
}
