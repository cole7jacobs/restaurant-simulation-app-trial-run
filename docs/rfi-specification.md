# RFI export specification

The export follows the archived Q5–Q7 profile for market `ME`. Each firm has a
file named `RFI{firm}ME.TXT`, where the assigned firm is 1 through 5. The
selected round identifies the submitted decision in D1. The filename and
header carry the firm identity.

## Records and widths

The export is ASCII with CRLF after each record, including the final blank
record. The widths below exclude CRLF. Right-align numeric fields with ASCII
spaces. Numeric values must fit their ten-character fields at the stated
precision.

| Records | Width | Contents |
| --- | --- | --- |
| 1–3 | 0 | Three opening blank records |
| 4 | 96 | Firm label starts at column 19. The archived literals `LS` and `B1` occupy columns 85–86 and 95–96. |
| 5–14 | 103 or 93 | Ten ordered menu slots. Populated rows place the item in columns 1–32 and its preparation label in columns 33–43. Six ten-character fields follow for prep code, portion (one decimal), promotion (whole dollars), price (two decimals), `0.000`, and `0`. Unused slots end at column 93 with a right-aligned `0.000`. |
| 15–18 | 143, 143, 93, 93 | Fixed Management, Supervisory, Service, and Support records. Their first fields are `1.5`, `1.0`, `10.0`, and `9.0`, followed by two `0.0` fields and unsigned zeroes through the end of each record. |
| 19 | 143 | Operations record described below |
| 20 | 123 | Approved Finance record |
| 21–24 | 63 | Investments, leases, borrowings, and variances. Each has two fixed unsigned zero fields. |
| 25 | 0 | Final blank record |

Operations begins with a 43-character label area. The first five fields are
staff FTEs (one decimal), compensation and training per hour and amenities per
order (two decimals each), then entertainment and maintenance (whole dollars).
Fields 6 and 7 encode Guest Satisfaction and Financial using `0` or `1`, as
supported by the matched listings. Fields 8–10 use the archived literals
`0`, `0`, and `12000`. Product requests must be set to No for export because
there is no confirmed enabled Product mapping. The staffing and asset
records, header literals, and other constant fields reproduce the archived
values without assigning undocumented business meanings.

The local archive tests reconstruct decisions from each of the 15 Q5–Q7 RFIs
and compare the entire generated file. An export with an archived `-0` is
compared using the approved new-output spelling `+0`.

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
