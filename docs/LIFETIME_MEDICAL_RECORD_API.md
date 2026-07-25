# Hồ sơ bệnh án trọn đời — API v2.7.1

## Endpoint đã tích hợp

```http
GET /api/v1/patients/{patientId}/lifetime-medical-record
Authorization: Bearer <access-token>
Accept: application/json
```

Backend v2.7.1 hiện chỉ công bố `patientId` ở path và trả dòng thời gian hợp
nhất trong tổ chức hiện tại. Frontend không gửi query parameters; tìm kiếm và
lọc được thực hiện trên mảng `events` sau khi tải.

API client: `src/api/lifetimeMedicalRecord.ts`.

## Response envelope

```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "uuid",
      "nationalHealthId": null,
      "code": "BN0001",
      "name": "Nguyễn Văn A",
      "dob": "1990-01-01",
      "gender": "male",
      "bloodType": "O+"
    },
    "summary": {
      "encounterCount": 1,
      "organizationCount": 1,
      "facilityCount": 1,
      "firstRecordedAt": "2026-07-25T04:38:44.741Z",
      "lastRecordedAt": "2026-07-25T04:38:44.741Z",
      "activeConditions": [],
      "allergies": [],
      "currentMedications": []
    },
    "events": [],
    "page": 1,
    "limit": 20,
    "total": 0,
    "synchronizedAt": "2026-07-25T04:38:44.741Z"
  },
  "meta": {},
  "requestId": "uuid"
}
```

Lớp `src/api/http.ts` tự unwrap `data`, nên API client nhận trực tiếp object hồ
sơ bệnh án.

## Quy ước nullable

Các trường Swagger đang hiển thị `{}` thực chất cần trả `string | null`, không
trả object rỗng:

- `nationalHealthId`, `dob`
- `firstRecordedAt`, `lastRecordedAt`
- `code`, `status`, `value`, `note` trong clinical item
- `endedAt`, `summary`, `specialty`, `practitionerName`
- `facilityId`, `facilityName`, `province`, `system`
- `contentType`, `signedAt`, `downloadUrl`
- `sourceSystem`, `importedAt`, `lastVerifiedAt`, `integrityHash`

Mảng không có dữ liệu trả `[]`. Ngày giờ trả ISO 8601. Frontend có normalizer
để không vỡ giao diện nếu backend tạm trả `null`, `{}` hoặc thiếu trường.

## Giá trị event type

```text
encounter | diagnosis | procedure | prescription | laboratory |
imaging | vaccination | allergy | document | care_plan
```

## Yêu cầu bảo mật

- Kiểm tra permission, organization scope, quan hệ điều trị và consent.
- Bác sĩ ngoài phạm vi phải dùng break-glass và MFA.
- Audit mọi lần đọc, tải tài liệu và truy cập khẩn cấp.
- Mỗi event phải có `provenance.sourceRecordId`.
- URL tải tài liệu phải kiểm tra quyền lại hoặc là signed URL ngắn hạn.
- Hồ sơ đã ký không được sửa âm thầm; chỉ thêm version/addendum.

## Nâng cấp backend đề xuất

Khi số lượng sự kiện lớn, bổ sung query:

```text
from, to, organizationId, facilityId, type, search, page, limit
```

Response tiếp tục giữ envelope và schema hiện tại để không phá frontend.

