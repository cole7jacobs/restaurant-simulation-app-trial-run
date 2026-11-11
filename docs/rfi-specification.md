# RFI export specification

The archived Q5–Q7 RFIs define the approved Finance record. The other RFI
records are still reference material for the full generator.

## Finance record

The line begins with ASCII `Finance` in columns 1–7, then spaces through column
43. Append exactly eight ten-character fields, each right-aligned with ASCII
spaces. The record ends at column 123 and is followed by CRLF.

| Field | Columns | Value |
| --- | --- | --- |
| 1 | 44–53 | TimeDepositChange |
| 2 | 54–63 | CertificateOfDepositChange |
| 3 | 64–73 | NotePayableChange |
| 4–8 | 74–123 | Five unsigned zeroes, one per field. Their business meanings are undocumented. |

The first three fields are explicitly signed whole-dollar amounts. Positive
amounts include `+`, negative amounts include `-`, and newly generated zeroes
use `+0`. The sign occupies one character, leaving at most nine digits.
Reject missing, fractional, and out-of-width amounts. Validate the format
without rounding or truncating values.

The archive remains the record of original bytes, including `-0`. The test
fixtures capture the Finance lines from all 15 Q5–Q7 RFIs with their original
signs and CRLF. Comparisons allow only the approved change from archived `-0`
to generated `+0`. The earlier ten-field layout is outside the export format.
