# DermaHealth / DermaFlow Clinical GPS

> Tài liệu nguồn chuẩn cho định hướng sản phẩm, kiến trúc và kế hoạch triển khai.
>
> Cập nhật lần cuối: 2026-07-26  
> Trạng thái sản phẩm: Prototype tích hợp API, đang chuyển sang lát cắt vận hành có thể kiểm thử end-to-end  
> Phạm vi tài liệu: Web frontend hiện tại, hợp đồng cần có với backend và lộ trình sản phẩm

---

## 0. Quy tắc dành cho AI hoặc kỹ sư tiếp quản

Đọc hết tài liệu này trước khi sửa nghiệp vụ. Không suy diễn rằng một màn hình đã tồn tại đồng nghĩa với backend và quy trình thực tế đã hoàn chỉnh.

Khi tiếp tục xây dựng:

1. Kiểm tra `git status`, `package.json`, `src/App.tsx`, `src/domain/core/entities.ts`, các API adapter và page liên quan.
2. Không thay đổi quyền backend bằng cách chỉ nới route hoặc ẩn/hiện menu phía frontend.
3. Không dùng dữ liệu giả để che lỗi API trong luồng production.
4. Không gọi kết quả AI là chẩn đoán cuối cùng. AI chỉ sàng lọc/hỗ trợ quyết định; bác sĩ là người xác nhận và ký.
5. Không sửa phiên bản quy trình đã xuất bản. Tạo phiên bản mới hoặc tạo bước riêng trên workflow instance của bệnh nhân.
6. Mọi thay đổi lâm sàng sau khi kích hoạt phải có người thực hiện, lý do, thời gian và audit event.
7. Không thiết kế Patient App như một BPM editor. Bệnh nhân chỉ cần biết hành động hiện tại, địa điểm, chuẩn bị, thời gian chờ, trở ngại và bước kế tiếp.
8. Với thao tác có thể lặp do retry/network, bắt buộc có idempotency key hoặc contract chống tạo trùng.
9. Cập nhật mục **Nhật ký triển khai** sau mỗi lát cắt hoàn thành: file, contract, kiểm thử, việc còn thiếu.
10. Nếu tài liệu và code mâu thuẫn, ghi nhận mâu thuẫn; không âm thầm chọn một phía.

### Ký hiệu trạng thái

- `[DONE]`: Có code và đã qua build/lint hoặc test tương ứng.
- `[PARTIAL]`: Đã có một phần nhưng chưa đủ tiêu chí nghiệm thu.
- `[TODO]`: Chưa triển khai.
- `[BLOCKED-BE]`: Frontend chưa thể hoàn tất vì thiếu/sai contract backend.
- `[ASSUMPTION]`: Giả định cần xác minh với người dùng bệnh viện.

---

## 1. Tầm nhìn sản phẩm

### 1.1 Tuyên bố ngắn

**DermaFlow Clinical GPS** là hệ điều phối hành trình khám và chăm sóc da liễu liên tục: từ sàng lọc ảnh trước khám, đặt lịch hoặc walk-in, check-in, bác sĩ chẩn đoán, thực thi y lệnh theo quy trình thích nghi, nhận kết quả, dùng thuốc đến tái khám và hồ sơ bệnh lý trọn đời.

Sản phẩm không phải:

- Một chatbot tự chẩn đoán.
- Một trình vẽ BPM đơn thuần.
- Một hồ sơ bệnh án chỉ dùng để lưu PDF.
- Một ứng dụng nhắc thuốc tách rời quy trình khám.

### 1.2 Nỗi đau cần giải quyết

#### Bệnh nhân

- Không biết tiếp theo phải làm gì, ở phòng/tầng nào và chờ bao lâu.
- Cầm nhiều phiếu giấy, dễ mất hoặc bỏ sót dịch vụ.
- Phải khai lại lịch sử và mang sổ ở mỗi lần khám/tái khám.
- Ảnh da chụp không đồng nhất nên khó đánh giá tiến triển.
- Quên thuốc, dùng sai cách hoặc không biết khi nào cần quay lại.

#### Bác sĩ

- Mất thời gian ghép lịch sử bệnh, ảnh, xét nghiệm và đơn thuốc từ nhiều nơi.
- Quy trình chuẩn không bao phủ hết ca đặc biệt.
- Thiếu cảnh báo dữ liệu/y lệnh/kết quả còn thiếu trước khi ra quyết định.
- Khó theo dõi đáp ứng điều trị theo tổn thương và theo thời gian.

#### Bệnh viện/phòng khám

- Thất lạc hoặc thực hiện thiếu y lệnh.
- Hàng đợi không cân bằng; bệnh nhân đi nhầm phòng hoặc hỏi đường nhiều.
- Không biết điểm nghẽn thực sự của từng khoa/phòng/máy.
- Kết quả cận lâm sàng về nhưng không được bác sĩ xác nhận kịp thời.
- Tỷ lệ bỏ tái khám và tuân thủ điều trị thấp.
- Dữ liệu phân mảnh, khó kiểm toán và tích hợp.

### 1.3 Giá trị bán hàng

Không bán “canvas BPM đẹp”. Bán kết quả vận hành:

- Giảm y lệnh bị bỏ sót.
- Giảm thời gian hoàn thành lượt khám.
- Giảm bệnh nhân đi nhầm hoặc quay lại quầy hỏi.
- Giảm thời gian bác sĩ tìm hồ sơ.
- Tăng tỷ lệ tái khám và tuân thủ điều trị.
- Có bằng chứng đầy đủ ai chỉ định, ai thực hiện, kết quả nào đã được xác nhận.

---

## 2. Nguyên tắc an toàn và ranh giới sản phẩm

1. **Bác sĩ quyết định cuối cùng.** AI đưa ra đánh giá sơ bộ, độ tin cậy, dữ liệu thiếu và dấu hiệu cảnh báo.
2. **Không tự đổi y lệnh lâm sàng.** Điều phối có thể đổi thứ tự các bước độc lập hoặc đổi phòng tương đương theo chính sách; thêm/bỏ/thay đổi bước chuyên môn phải có người có quyền duyệt.
3. **Dữ liệu tối thiểu cần thiết.** Ảnh vùng nhạy cảm phải có consent, quyền truy cập theo mục đích và audit.
4. **Tách quyền quản trị khỏi quyền lâm sàng.** Super admin không mặc nhiên được ký chẩn đoán, xem mọi ảnh hoặc thay bác sĩ.
5. **Không phụ thuộc tuyệt đối vào mạng.** Cần chế độ suy giảm: QR/mã hành trình, cache hướng dẫn tối thiểu, hàng đợi thao tác và đối soát sau khi kết nối lại.
6. **Mọi kết quả nguy cấp phải có acknowledgement.** “Đã gửi notification” không đồng nghĩa “bác sĩ đã tiếp nhận”.
7. **Không xóa lịch sử y khoa đã ký.** Sửa bằng addendum/amendment và giữ provenance.
8. **Không dùng token truy cập dài hạn trong URL/SSE.** Nếu cần SSE, backend cấp subscription ticket ngắn hạn, một lần dùng.

---

## 3. Mô hình hành trình chuẩn

### 3.1 Luồng A — Trước khám

1. Bệnh nhân đăng ký/xác minh tài khoản.
2. Chấp thuận điều khoản sử dụng ảnh và AI hỗ trợ.
3. Khai triệu chứng, thời gian mắc, mức độ, bệnh nền, dị ứng và thuốc đang dùng.
4. Chụp/tải ảnh.
5. Quality gate kiểm tra ánh sáng, nét, khoảng cách, vị trí cơ thể và ảnh tham chiếu kích thước.
6. AI trả:
   - Nhóm bệnh gợi ý, không phải chẩn đoán.
   - Mức độ tin cậy theo dải.
   - Dữ liệu ủng hộ/mâu thuẫn.
   - Dữ liệu còn thiếu.
   - Red flags và mức khẩn.
7. Nếu nguy hiểm: hướng dẫn cơ sở phù hợp/cấp cứu theo chính sách.
8. Nếu phù hợp: đặt lịch trực tiếp/online.

### 3.2 Luồng B — Walk-in hoặc đặt lịch

- Đặt lịch: phát QR check-in có thời hạn.
- Walk-in: lễ tân tìm/tạo bệnh nhân, xác minh, tạo encounter và phát số.
- Check-in phải chống quét lặp và không tạo nhiều encounter/ticket cho cùng một lần.
- Sau check-in, Patient App hiển thị khu chờ, số hiện tại và thời gian ước tính.

### 3.3 Luồng C — Bác sĩ khám và quyết định

1. Bác sĩ mở Clinical Workspace.
2. Xem tóm tắt an toàn, ảnh cũ/mới, thuốc, dị ứng, chẩn đoán và sự kiện gần đây.
3. Xem AI assessment cùng giới hạn và lý do.
4. Bác sĩ chấp nhận một phần, từ chối hoặc bổ sung chẩn đoán.
5. Bác sĩ ký chẩn đoán.
6. Chọn protocol/order set phù hợp.
7. Điều chỉnh Patient Care Plan và ghi lý do.
8. Kích hoạt workflow instance đã pin phiên bản.

### 3.4 Luồng D — Thực thi y lệnh và Clinical GPS

Mỗi dịch vụ phải có ba đối tượng tách biệt:

- **Clinical Order / ServiceRequest:** bác sĩ muốn thực hiện gì và tại sao.
- **Operational Task:** ai/phòng nào thực hiện, SLA, trạng thái và phụ thuộc.
- **Clinical Result / DiagnosticReport/Observation:** kết quả chuyên môn.

Patient App chỉ hiển thị:

- Hành động hiện tại.
- Phòng/tầng/khu chờ/bản đồ.
- Số thứ tự và thời gian chờ.
- Điều kiện cần hoàn tất trước.
- Hướng dẫn chuẩn bị.
- Trạng thái và lý do bị chặn.
- 1–3 bước kế tiếp có khả năng xảy ra.
- Nút xin hỗ trợ.

Không hiển thị cho bệnh nhân:

- JSON điều kiện.
- Role code nội bộ.
- Toàn bộ graph kỹ thuật.
- Cảnh báo chuyên môn chưa được bác sĩ diễn giải.

### 3.5 Luồng E — Kết thúc khám và chăm sóc liên tục

1. Kiểm tra đủ kết quả và bác sĩ đã acknowledgement bất thường.
2. Bác sĩ duyệt kế hoạch cuối, đơn thuốc và hướng dẫn.
3. Hồ sơ được ký và trở thành sự kiện trong lifetime medical record.
4. Tạo care plan sau khám:
   - Lịch dùng thuốc.
   - Hướng dẫn bôi/uống.
   - Cảnh báo tác dụng phụ.
   - Mốc chụp ảnh theo dõi.
   - Hẹn tái khám.
5. Nếu bệnh nhân báo bất thường hoặc bỏ lỡ hoạt động quan trọng:
   - Tạo alert.
   - Giao người chịu trách nhiệm.
   - Có deadline và escalation.
   - Có thể yêu cầu tạo encounter mới.

---

## 4. Thiết kế BPM thích nghi

### 4.1 Ba lớp bắt buộc

#### Protocol Template

Quy trình chuẩn dùng chung. Có phiên bản, draft/review/published/deprecated. Phiên bản published là bất biến.

#### Reusable Subflow / Order Set

Nhóm bước tái sử dụng, ví dụ:

- Bộ xét nghiệm trước Isotretinoin.
- Sinh thiết tổn thương da.
- Điều trị nấm và kiểm tra đáp ứng.
- Theo dõi sau thủ thuật.

#### Patient Care Plan / Workflow Instance

Bản chạy riêng cho một bệnh nhân, pin đúng template version. Cho phép ad-hoc task mà không sửa mẫu gốc.

### 4.2 Khả năng editor cần đạt

- Kéo thả tự do node và endpoint.
- Tự nối, nối lại và xóa edge.
- Không tự động nối mọi node vào Start/End.
- Có Start, End, Task, Decision, Parallel split/join, Waiting, Timer, Subflow.
- Edge có nhãn/điều kiện.
- Validate khi lưu nháp: schema và dữ liệu tối thiểu.
- Validate khi publish: node không tới được, nhánh cụt, vòng lặp nguy hiểm, decision thiếu nhánh mặc định, join sai, thiếu output.
- Undo/redo, autosave có debounce, trạng thái “đang lưu/đã lưu/xung đột”.
- Optimistic concurrency bằng `rowVersion`; không gửi field version không đúng contract.
- Node không được tự biến mất nếu API lỗi. Giữ local draft và cho retry.
- Trước publish có mô phỏng theo scenario.

### 4.3 Điều chỉnh ca bệnh

Bác sĩ được:

- Thêm/sửa/hủy ad-hoc task.
- Chèn subflow.
- Bỏ qua bước nếu chính sách cho phép.
- Rework bước.
- Chọn nhánh thủ công khi đủ quyền.
- Đổi người/phòng thực hiện tương đương.

Mọi override cần:

- `reasonCode`.
- `reasonText`.
- `createdBy`.
- `createdAt`.
- `approvedBy` nếu thuộc nhóm cần đồng ký.
- Audit và notification tới đơn vị bị ảnh hưởng.

### 4.4 Không làm

- Không biến canvas thành nguồn sự thật duy nhất. Backend graph/version mới là nguồn chuẩn.
- Không suy luận thứ tự chỉ dựa vào vị trí x/y.
- Không dùng mảng step tuyến tính cho graph có nhánh song song.
- Không cho sửa graph của instance đang chạy mà không có migration/compensation rule.

---

## 5. Mô hình dữ liệu đích

Tên trong ngoặc là mapping gần với HL7 FHIR, không bắt buộc backend phải expose FHIR REST ngay.

- Patient
- Practitioner / PractitionerRole
- Organization / Location
- Appointment
- Encounter
- Consent
- SymptomIntake / QuestionnaireResponse
- Media / DocumentReference
- AIAssessment + ModelVersion + InputSnapshot
- DoctorReview
- Diagnosis / Condition
- ProtocolDefinition / PlanDefinition
- CarePlan
- ClinicalOrder / ServiceRequest
- WorkflowInstance
- WorkflowTask / Task
- Observation
- DiagnosticReport
- ImagingStudy
- Prescription / MedicationRequest
- MedicationDispense
- MedicationAdministration hoặc adherence event
- FollowUpActivity
- ClinicalAlert
- Notification
- AuditEvent / Provenance
- Coverage / ClaimResponse hoặc payment authorization

### 5.1 Trường còn thiếu trong frontend domain hiện tại

`ClinicalOrder` cần mở rộng:

- `code`, `displayName`.
- `serviceCatalogId`.
- `priority`, `urgency`.
- `bodySite`.
- `performer`, `location`.
- `paymentStatus`, `insuranceAuthorizationStatus`.
- `preparationInstructions`.
- `barcode`.
- `authoredAt`, `acceptedAt`, `performedAt`.
- `version`.

`WorkflowTask` cần mở rộng:

- `locationId`, `room`, `floor`, `waitingArea`.
- `queueTicketId`.
- `preparationInstructions`.
- `blockingReasons[]`.
- `estimatedStartAt`.
- `patientVisibleName`, `patientVisibleInstruction`.
- `clinicalOrderId`.
- `completionEvidence`.

`WorkflowTemplateVersion` cần:

- `nodes[]`, `edges[]` thay vì chỉ `steps[]`.
- Edge condition schema có version.
- Validation report.
- Publication approval metadata.

`ClinicalResult` cần:

- Mã kết quả, giá trị có cấu trúc, đơn vị, khoảng tham chiếu.
- Mức độ bất thường/nguy cấp.
- Người xác nhận và acknowledgement.
- Liên kết document/image/specimen.

### 5.2 Quy tắc định danh

- ID nội bộ không chứa PII.
- Mã hành trình hiển thị cho con người tách khỏi primary key.
- QR chứa token ngắn hạn hoặc opaque reference, không chứa hồ sơ bệnh.
- Ảnh/file lưu hash, provenance và access policy.

---

## 6. Kiến trúc logical

### 6.1 Bounded contexts

1. Identity & Access.
2. Patient Registry & Consent.
3. Appointment, Check-in & Queue.
4. Encounter & Clinical Decision.
5. AI Assessment & Model Governance.
6. Protocol/BPM Definition.
7. Care Plan & Workflow Runtime.
8. Clinical Order Fulfilment.
9. Medical Record & Documents.
10. Medication & Adherence.
11. Follow-up & CRM.
12. Notification.
13. Integration Gateway.
14. Audit, Security & Reporting.

### 6.2 Tích hợp

- HIS/EMR: bệnh nhân, encounter, chẩn đoán.
- LIS: y lệnh và kết quả xét nghiệm.
- RIS/PACS: chỉ định và ảnh/chẩn đoán hình ảnh.
- Pharmacy: đơn, cấp phát, tồn.
- Payment/BHYT: trạng thái đủ điều kiện thực hiện.
- SMS/email/push provider.
- Sơ đồ cơ sở và location directory.

### 6.3 Độ tin cậy

- Transactional outbox cho domain event.
- Consumer idempotency.
- Retry có backoff và dead-letter queue.
- Reconciliation job cho message thất bại.
- Optimistic concurrency trên aggregate có chỉnh sửa đồng thời.
- Correlation ID xuyên suốt encounter/order/task/result.
- Không coi notification “sent” là nghiệp vụ đã hoàn tất.

---

## 7. Trải nghiệm theo vai trò

### Bệnh nhân

- Home tập trung vào “Việc cần làm tiếp theo”.
- Clinical GPS.
- Lịch hẹn/check-in/QR.
- Hồ sơ và ảnh tiến triển.
- Đơn thuốc và hướng dẫn.
- Nhắc thuốc/tái khám.
- Consent và chia sẻ hồ sơ.

### Bác sĩ

- Worklist ưu tiên theo nguy cơ/SLA.
- Clinical Workspace tóm tắt trong 10 giây.
- Review AI có evidence và limitation.
- Diagnosis + order set + care plan composer.
- Kết quả bất thường cần acknowledgement.
- So sánh ảnh và body map.

### Lễ tân/điều phối

- Tìm/xác minh bệnh nhân.
- Appointment và walk-in.
- QR/check-in.
- Queue và hỗ trợ điều hướng.
- Xử lý ngoại lệ: sai người, đến muộn, mất QR, trùng encounter.

### Khoa/phòng thực hiện

- Hàng đợi theo station/skill.
- Nhận việc, bắt đầu, hoàn thành, làm lại.
- Quét QR.
- Ghi bằng chứng/kết quả.
- Báo máy/phòng không khả dụng.

### Quản trị

- Quản lý quyền theo permission và scope.
- Protocol governance.
- Dashboard vận hành.
- Audit/break-glass.
- Integration health và reconciliation.

---

## 8. Kế hoạch theo phase

## Phase 0 — Củng cố nền tảng và khóa contract

### Mục tiêu

Biến prototype hiện tại thành nền có thể phát triển tiếp mà không lẫn mock, cache và dữ liệu backend.

### Phạm vi

- Lập inventory route, API, entity và role.
- Chuẩn hóa error envelope và validation mapping.
- Quy ước row version/idempotency.
- Chuẩn hóa loading/empty/error state.
- Xóa mọi token trong query URL.
- Viết contract test hoặc fixture cho adapter.
- Thiết lập logging/correlation ID.

### Tiêu chí nghiệm thu

- `npm run build` và `npm run lint` qua.
- Mỗi màn production phân biệt loading, empty, forbidden và API error.
- Refresh không làm mất node/task vừa lưu thành công.
- 401 dẫn về login; 403 hiển thị thiếu quyền; 409 hiển thị xung đột và reload option; 422 chỉ đúng field.
- Không có quyền nào chỉ được enforcement ở frontend.

### Trạng thái hiện tại

- `[DONE]` API client và route phân quyền đã tồn tại.
- `[DONE]` Không còn SSE access token trong URL; queue hiện polling có authorization header.
- `[PARTIAL]` Error/loading/empty state đã có component dùng chung nhưng chưa phủ hết màn.
- `[PARTIAL]` `rowVersion` đang không đồng nhất giữa các endpoint.
- `[TODO]` Contract test cho API adapters.

---

## Phase 1 — Digital Visit Passport & Clinical GPS

### Mục tiêu

Thay phiếu giấy điều hướng bằng một hành trình số sống, nhưng vẫn có fallback vận hành.

### Phạm vi bệnh nhân

- Chọn lượt khám đang hoạt động.
- Hiển thị bước hiện tại và CTA chính.
- Phòng/tầng/khu chờ/số thứ tự/thời gian chờ.
- Hướng dẫn chuẩn bị.
- Lý do bị chặn và cách xử lý.
- 1–3 bước tiếp theo.
- Tiến độ tổng quan.
- Danh sách y lệnh với trạng thái.
- Nút trợ giúp.

### Phạm vi nhân viên

- Quét QR và xác nhận bệnh nhân đến.
- Bắt đầu/kết thúc phục vụ.
- Chuyển trạm.
- Đánh dấu ngoại lệ, mẫu lỗi, cần làm lại.
- Mở workflow instance để điều hành.

### Backend cần có

- Query hành trình theo encounter trả snapshot nhất quán:
  - encounter.
  - active workflow instance.
  - patient-visible tasks.
  - queue ticket.
  - orders/result availability.
  - last event/version.
- SSE/WebSocket bằng subscription ticket ngắn hạn hoặc polling có ETag.
- Location directory và bản đồ cơ sở.

### Tiêu chí nghiệm thu

- Bệnh nhân nhìn trong 5 giây biết mình phải đi đâu/làm gì.
- Không hiển thị raw role code hoặc raw API error.
- Refresh giữ đúng trạng thái server.
- Task blocked phải có lý do.
- Scan/retry không tạo ticket hoặc completion trùng.
- Có bản in/QR fallback khi hệ thống suy giảm.

### Trạng thái hiện tại

- `[DONE]` `PatientJourneyDetail` chủ động tải workflow instance, task và clinical order từ backend.
- `[DONE]` Có Clinical GPS ưu tiên hành động hiện tại, hàng đợi, chuẩn bị, blocker, tối đa ba bước kế tiếp, tiến độ và phiếu dịch vụ điện tử.
- `[DONE]` Logic chọn current/next dùng dependency + status + urgency + priority; graph lỗi/vòng lặp vẫn có fallback hiển thị ổn định.
- `[PARTIAL]` Location hiện mới dùng department/room/waiting area từ encounter và queue ticket; chưa có floor/map/location directory.
- `[BLOCKED-BE]` Chưa có journey snapshot endpoint.
- `[TODO]` QR fallback có chữ ký, bản đồ cơ sở và realtime snapshot có ETag/subscription ticket.

---

## Phase 2 — Sàng lọc ảnh da và AI có giám sát

### Mục tiêu

Thu thập ảnh đủ chất lượng, sàng lọc nguy cơ và rút ngắn thời gian bác sĩ đọc hồ sơ.

### Phạm vi

- Capture guide theo vùng cơ thể.
- Quality gate: nét, sáng, khoảng cách, framing.
- Consent theo mục đích sử dụng.
- Body map và lesion ID.
- AI candidate conditions, confidence band, evidence/conflicts, missing data.
- Red flag routing.
- Doctor review: accept/partial/reject + rationale.
- Model registry, version, drift và audit.

### Không nằm trong phase

- AI tự ký chẩn đoán.
- AI tự kê đơn.
- Tuyên bố độ chính xác khi chưa có bộ dữ liệu/validation phù hợp.

### Tiêu chí nghiệm thu

- Không chạy assessment khi ảnh không đạt quality gate.
- Mọi assessment liên kết input snapshot và model version.
- Bác sĩ xem được cơ sở và giới hạn gợi ý.
- Có kiểm thử theo loại thiết bị, điều kiện ánh sáng và màu da.
- Red flag có luồng escalation rõ ràng.

### Trạng thái hiện tại

- `[DONE]` Quality gate phía client kiểm tra định dạng/dung lượng, độ phân giải, sáng tối, tương phản và dấu hiệu mất nét trước upload.
- `[DONE]` Ảnh JPG/PNG đạt gate được loại EXIF/XMP/IPTC/text metadata mà không decode/re-encode pixel; giữ ICC/color data cần thiết.
- `[DONE]` Ảnh warning cần người dùng xác nhận; ảnh blocking không được gửi.
- `[DONE]` Kiểm tra consent `data_processing` và xác nhận hiểu giới hạn AI trước assessment.
- `[DONE]` Đã bỏ tuyên bố dataset/độ chính xác chưa được chứng minh và vùng tổn thương minh họa giả.
- `[PARTIAL]` Có capture context vùng cơ thể + overview/close-up trong UI/tên tệp, nhưng backend intake chưa có structured image context.
- `[TODO]` Body map, lesion ID, đa ảnh theo protocol, kiểm thử thiết bị/màu da và model governance.

---

## Phase 3 — Bác sĩ chẩn đoán, order set và Care Plan cá thể hóa

### Mục tiêu

Cho phép bác sĩ tạo kế hoạch nhanh từ protocol chuẩn nhưng tùy chỉnh an toàn cho từng ca.

### Phạm vi

- Clinical Workspace.
- Diagnosis lifecycle: provisional/differential/confirmed/signed/revised.
- Order set và reusable subflow.
- Patient Care Plan composer.
- Override có reason/audit.
- Kiểm tra allergy, medication, pregnancy/lab prerequisite theo policy.
- Bác sĩ duyệt và kích hoạt workflow.

### Tiêu chí nghiệm thu

- Template published không bị sửa.
- Instance pin version.
- Ca đặc biệt thêm/bỏ/đổi bước không ảnh hưởng bệnh nhân khác.
- Mọi override có lý do.
- Không kích hoạt khi thiếu diagnosis/approval bắt buộc.

### Trạng thái hiện tại

- `[DONE]` Doctor Review chủ động reload assessment, review, diagnosis, plan, order, workflow instance và protocol từ backend.
- `[DONE]` Bác sĩ chọn rõ protocol đã publish, xem phiên bản/các bước rồi mới duyệt và kích hoạt.
- `[DONE]` Phát hiện backend tự kích hoạt template khác với lựa chọn thay vì âm thầm tiếp tục.
- `[DONE]` Instance đã chạy có đường dẫn điều chỉnh bước riêng, không sửa template dùng chung.
- `[PARTIAL]` Có doctor review, diagnosis lifecycle, clinical plan, order, workflow activation và ad-hoc task.
- `[TODO]` Order set/subflow thực sự.
- `[TODO]` Care Plan composer và policy checks.

---

## Phase 4 — BPMN-like Designer hoàn chỉnh

### Mục tiêu

Trình thiết kế quy trình tự do, dễ thao tác và an toàn khi publish.

### Phạm vi

- Node/edge graph chuẩn.
- Drag/drop, reconnect/delete edge.
- Gateway/parallel/timer/waiting/subflow.
- Inspector panel.
- Undo/redo.
- Autosave và conflict recovery.
- Validate + simulation.
- Governance: draft/review/approve/publish/deprecate.

### Tiêu chí nghiệm thu

- Node không tự mất khi request thất bại.
- Không auto-connect trái ý người dùng.
- Graph có thể lưu và load lại đúng 100% vị trí/edge.
- Validation field-level, bằng tiếng Việt và chỉ rõ node.
- Publish chặn graph không hợp lệ nhưng lưu nháp vẫn được.
- Có ít nhất 10 scenario test: tuyến tính, song song, nhánh điều kiện, loop kiểm soát, rework.

### Trạng thái hiện tại

- `[DONE]` Editor cho phép kéo node, nối/xóa/reconnect dây theo ý người thiết kế; không tự nối node mới.
- `[DONE]` Có validator graph thuần: Start/End, node mồ côi, đường tới End, dependency hỏng, self-loop, cycle và decision branch.
- `[DONE]` Publish bị chặn khi graph sai; lưu nháp vẫn được. Lỗi/cảnh báo chỉ rõ mã node bằng tiếng Việt.
- `[DONE]` Mô phỏng dùng thứ tự topo của graph thay vì thứ tự mảng step; không tự đoán kết quả điều kiện lâm sàng.
- `[PARTIAL]` Có editor dựa trên React Flow, node position, step CRUD và terminal edge trong trình duyệt.
- `[BLOCKED-BE]` Start/End và terminal edge chưa có contract lưu graph ở backend; refresh trên máy khác không bảo toàn 100%.
- `[TODO]` Edge entity/condition per edge, gateway mặc định, parallel join, timer, subflow, undo/redo và review/approve tách biệt.

---

## Phase 5 — Order Fulfilment, LIS/RIS/PACS và kết quả nguy cấp

### Mục tiêu

Đảm bảo từ y lệnh đến kết quả có thể truy vết, không bỏ sót.

### Phạm vi

- Service catalog.
- Barcode/specimen.
- Payment/insurance prerequisite.
- Laboratory/imaging fulfilment.
- Result structured data.
- Critical result acknowledgement.
- Rework/invalid sample.
- Integration reconciliation.

### Tiêu chí nghiệm thu

- Mỗi result truy ngược được order, encounter, patient và performer.
- Không hoàn tất encounter nếu còn critical result chưa acknowledgement.
- Duplicate integration message không tạo duplicate result.
- Message lỗi được retry/DLQ/reconcile.

### Trạng thái hiện tại

- `[PARTIAL]` Có clinical order/result và integration health.
- `[TODO]` Catalog, specimen, structured result, acknowledgement và tích hợp thực.

---

## Phase 6 — Hồ sơ da liễu trọn đời

### Mục tiêu

Cho bác sĩ hiểu lịch sử an toàn và tiến triển trong khoảng 10 giây.

### Phạm vi

- Patient header và identity confidence.
- Tóm tắt an toàn: allergy, thuốc, bệnh nền.
- Active conditions.
- Timeline đa cơ sở.
- Body map/lesion timeline.
- Side-by-side ảnh chuẩn hóa.
- Provenance, signature, addendum.
- Consent-based sharing/import.

### Tiêu chí nghiệm thu

- Hồ sơ đã ký không bị overwrite.
- Ảnh có thời gian, vùng cơ thể, nguồn và quyền.
- Import không tạo event trùng.
- Người dùng thấy nguồn dữ liệu và mức xác minh.

### Trạng thái hiện tại

- `[DONE]` Clinical workspace không còn gắn nhãn “đã xác minh” nếu API không có bằng chứng đối soát.
- `[DONE]` Không dùng profile của bệnh nhân đang đăng nhập làm fallback khi nhân viên mở hồ sơ người khác.
- `[DONE]` Timeline có lọc loại sự kiện/đơn vị/từ khóa và hiển thị provenance từng sự kiện.
- `[DONE]` Có đối chiếu hai ảnh kèm ngày, nguồn và trạng thái chữ ký; cảnh báo khi điều kiện chụp chưa chuẩn hóa.
- `[PARTIAL]` Có lifetime medical record API và clinical workspace.
- `[TODO]` Body map, lesion-level tracking, identity reconciliation và capture protocol cho ảnh so sánh định lượng.

---

## Phase 7 — Thuốc, tuân thủ và tái khám

### Mục tiêu

Biến đơn thuốc thành một kế hoạch chăm sóc có theo dõi.

### Phạm vi

- Prescription và dispensing.
- Lịch dùng thuốc.
- Hướng dẫn bôi/uống trực quan.
- Check-in tuân thủ.
- Missed dose/side-effect alert.
- Tái khám rule-based.
- Follow-up photo request.
- Escalation cho care coordinator/bác sĩ.

### Tiêu chí nghiệm thu

- Reminder theo timezone và preference.
- Không spam notification trùng.
- Bệnh nhân có thể báo bỏ liều/tác dụng phụ.
- Alert có owner, deadline và closure evidence.
- Việc tái khám liên kết encounter trước.

### Trạng thái hiện tại

- `[PARTIAL]` Có prescription, care plan, activity, alert và notification domain/API/UI.
- `[TODO]` Medication schedule/adherence và escalation end-to-end.

---

## Phase 8 — Điều phối thích nghi và phân tích vận hành

### Mục tiêu

Tối ưu hành trình theo tải thực tế mà không thay đổi quyết định lâm sàng.

### Phạm vi

- Station capacity và downtime.
- Estimated wait.
- Đổi thứ tự các task độc lập.
- Alternative equivalent location.
- Bottleneck dashboard.
- No-show prediction ở mức hỗ trợ.
- Outcome/quality dashboard.

### Guardrails

- Không đổi nội dung y lệnh.
- Không bỏ prerequisite.
- Mọi reroute có reason và audit.
- Người vận hành có thể override.

### KPI

- Median/P90 check-in-to-discharge.
- Waiting time theo station.
- Tỷ lệ y lệnh chưa hoàn tất.
- Tỷ lệ bệnh nhân cần hỗ trợ chỉ đường.
- Critical result acknowledgement time.
- No-show và follow-up completion.
- Medication adherence.
- Tỷ lệ ảnh đạt chuẩn lần đầu.

---

## Phase 9 — Production hardening và triển khai

### Mục tiêu

Đủ an toàn, quan sát được và phục hồi được trong môi trường khám thật.

### Phạm vi

- Threat model.
- Tenant/scope isolation tests.
- Encryption/key rotation.
- Backup/restore drill.
- Disaster recovery.
- Load/soak test.
- Accessibility.
- Observability và SLO.
- Data retention/deletion policy theo loại dữ liệu.
- UAT tại một cơ sở/pilot.

### Gate trước pilot

- Không có P0/P1 security issue mở.
- Restore dữ liệu đã diễn tập.
- Luồng suy giảm/offline đã diễn tập.
- Có runbook cho queue, integration, notification, storage và identity.
- Có quy trình phản ứng sự cố y khoa/dữ liệu.

---

## 9. Vertical slices ưu tiên

Không xây hết một “layer” rồi mới có giá trị. Triển khai theo lát cắt:

### Slice 1 — Một bệnh nhân từ check-in đến Clinical GPS

- Load encounter.
- Load queue ticket.
- Load workflow instance/tasks.
- Xác định hành động hiện tại theo state/dependency.
- Hiển thị phòng, chờ, chuẩn bị, blocker và bước kế.

### Slice 2 — Bác sĩ tạo một y lệnh và khoa hoàn tất

- Doctor creates order.
- Task được tạo/liên kết.
- Khoa nhận việc.
- Kết quả được ghi.
- Bác sĩ acknowledgement.
- Patient GPS cập nhật.

### Slice 3 — Ca đặc biệt

- Bác sĩ thêm ad-hoc step.
- Chèn dependency.
- Ghi reason.
- Patient thấy bước mới mà template gốc không đổi.

### Slice 4 — Sau khám

- Ký record.
- Phát prescription.
- Tạo follow-up activity.
- Nhắc và thu ảnh.
- Alert nếu bất thường.

---

## 10. API contracts đề xuất

### 10.1 Journey snapshot

`GET /api/v1/encounters/:encounterId/journey`

```json
{
  "snapshotVersion": 12,
  "generatedAt": "2026-07-26T08:30:00Z",
  "encounter": {},
  "queueTicket": {},
  "workflow": {
    "instance": {},
    "tasks": []
  },
  "orders": [],
  "patientGuidance": {
    "currentAction": {},
    "nextActions": [],
    "blockingReasons": [],
    "preparationInstructions": []
  }
}
```

Yêu cầu:

- Tenant/patient scoped ở backend.
- ETag hoặc snapshot version.
- Không trả dữ liệu nhạy cảm không cần thiết cho patient role.

### 10.2 Override care plan

`POST /api/v1/workflow-instances/:id/overrides`

```json
{
  "operation": "insert_task",
  "afterTaskId": "task-id",
  "taskDefinition": {},
  "reasonCode": "PATIENT_SPECIFIC",
  "reasonText": "Cần bổ sung xét nghiệm vì...",
  "instanceVersion": 7
}
```

### 10.3 Acknowledge critical result

`POST /api/v1/clinical-results/:id/acknowledgements`

```json
{
  "action": "reviewed",
  "clinicalDecision": "continue_plan",
  "note": "Đã xem và điều chỉnh...",
  "resultVersion": 3
}
```

### 10.4 Error envelope

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Dữ liệu chưa hợp lệ",
  "correlationId": "corr-id",
  "fieldErrors": [
    {
      "field": "description",
      "code": "REQUIRED",
      "message": "Vui lòng nhập mô tả"
    }
  ]
}
```

Frontend không hiển thị raw message như `property rowVersion should not exist`.

---

## 11. Kiểm thử bắt buộc

### Luồng nghiệp vụ

- Appointment và walk-in cùng tạo đúng một encounter.
- QR hết hạn, đã dùng, bị thay thế.
- Hai quầy quét cùng QR.
- Patient refresh giữa lúc chuyển trạm.
- Task song song hoàn thành khác thứ tự.
- Task bị rework.
- Phòng/máy dừng hoạt động.
- Kết quả bất thường/nguy cấp.
- Bác sĩ đổi kế hoạch giữa chừng.
- Bệnh nhân bỏ về hoặc mất kết nối.

### Phân quyền

- Patient không xem người khác.
- Admin kỹ thuật không mặc nhiên ký/xem lâm sàng.
- Bác sĩ ngoài scope không xem hồ sơ.
- Break-glass có lý do, expiry và audit.
- Permission bị thu hồi có hiệu lực sau refresh/session policy.

### Tính nhất quán

- Double click/retry không tạo trùng.
- 409 không làm mất local draft.
- Event đến sai thứ tự.
- Offline command được replay một lần.
- Import/reconcile không tạo bản ghi trùng.

### UX

- Mobile 360 px.
- Người lớn tuổi, font zoom 200%.
- Không chỉ dùng màu để biểu thị trạng thái.
- Nội dung lỗi nêu cách khắc phục.
- CTA chính duy nhất, tránh quá nhiều nút.

---

## 12. KPI pilot

Baseline phải đo trước khi triển khai.

- Thời gian check-in → gặp bác sĩ.
- Thời gian check-in → hoàn tất tất cả chỉ định.
- P50/P90 thời gian chờ theo phòng.
- Tỷ lệ y lệnh bị bỏ sót/chưa hoàn tất.
- Số lần bệnh nhân hỏi đường/trợ giúp.
- Thời gian bác sĩ tìm và đọc hồ sơ cũ.
- Tỷ lệ kết quả nguy cấp được xác nhận trong SLA.
- Tỷ lệ tái khám đúng hẹn.
- Tỷ lệ tuân thủ thuốc tự báo cáo.
- Tỷ lệ ảnh đạt quality gate lần đầu.
- Số phiếu giấy phát hành, nhưng không dùng đây làm KPI giá trị duy nhất.

---

## 13. Giả định cần kiểm chứng với cơ sở y tế

- `[ASSUMPTION]` Một bệnh nhân có thể thực hiện các y lệnh độc lập theo thứ tự linh hoạt.
- `[ASSUMPTION]` Bệnh viện có location/station code ổn định.
- `[ASSUMPTION]` LIS/RIS/PACS có API hoặc ít nhất cơ chế message/file tích hợp.
- `[ASSUMPTION]` Có người chịu trách nhiệm theo dõi alert sau khám.
- `[ASSUMPTION]` Bệnh nhân mục tiêu có smartphone; vẫn cần kiosk/phiếu dự phòng.
- `[ASSUMPTION]` Ảnh da có thể được thu thập với consent và chính sách lưu trữ phù hợp.
- `[ASSUMPTION]` Bệnh viện chấp nhận quy trình duyệt/publish protocol thay vì sửa trực tiếp bản đang chạy.

---

## 14. Definition of Done chung

Một tính năng chỉ được đánh dấu `[DONE]` khi:

- Có UI và contract/API tương ứng hoặc ghi rõ mock-only.
- Có phân quyền backend; frontend chỉ phản ánh.
- Có loading, empty, error, forbidden và conflict state.
- Có audit cho thao tác nhạy cảm.
- Không làm mất dữ liệu khi refresh hoặc retry.
- Build và lint qua.
- Có ít nhất kiểm thử happy path và failure path quan trọng.
- Tài liệu và nhật ký triển khai được cập nhật.

---

## 15. Nhật ký triển khai

### 2026-07-26 — Baseline

Đã xác nhận trong frontend:

- React 19 + TypeScript + Vite + Ant Design.
- Có route cho appointment, AI assessment, doctor review, journey, records, prescriptions, follow-up, queue, BPM, integrations, audit và owner.
- Domain đã có Encounter, ClinicalOrder, WorkflowInstance/Task, MedicalRecord, CarePlan, Alert và Notification.
- Runtime repository là in-memory view; dữ liệu được tải từ backend API.
- App boot hiện tải user, practitioners, appointments, patients, encounters và queue tickets.
- Workflow task/instance chưa được tải tập trung cho Patient Journey.

Việc triển khai kế tiếp đã chốt:

1. Hoàn thiện Slice 1 của Phase 1.
2. Tạo logic thuần để suy ra current/next/blocking/progress từ dependency và status.
3. Tải workflow instance/task/order khi mở chi tiết hành trình.
4. Thiết kế lại màn chi tiết thành Clinical GPS ưu tiên hành động.
5. Build/lint và ghi kết quả tại đây.

### 2026-07-26 — Phase 1 / Slice 1: Clinical GPS

Đã triển khai:

- `src/domain/clinicalGps.ts`
  - Sắp xếp task theo dependency có fallback khi graph malformed/cyclic.
  - Chọn current/next theo status, urgency, priority và thời gian tạo.
  - Tạo blocker dễ hiểu từ encounter, clinical warning và dependency chưa hoàn tất.
  - Không đưa raw role code/API field ra Patient UI.
- `src/pages/PatientJourneyDetail.tsx`
  - Đồng bộ instance, task và order khi mở/refresh.
  - Không làm trống toàn màn nếu chỉ một API con thất bại.
  - Hero “việc cần làm tiếp”, điểm đến, hàng đợi, thời gian chờ.
  - Timeline, tiến độ, chuẩn bị, bước kế, phiếu dịch vụ và hỗ trợ.
  - Nhân viên có CTA sang trang điều hành workflow.
- `src/styles/components/_clinical-gps.scss`
  - Responsive cho desktop/mobile.
  - Trạng thái current/done/blocked không chỉ phân biệt bằng màu.

Kiểm tra:

- `[DONE]` `npm run lint`.
- `[DONE]` `npm run build`.
- `[DONE]` Vite HTTPS trả trang tại `https://127.0.0.1:5173/`.
- `[TODO]` Visual QA/UAT có đăng nhập: môi trường agent hiện không cung cấp browser session.

Việc tiếp theo:

1. Backend journey snapshot để loại ba request rời và tránh snapshot lệch thời điểm.
2. Mở rộng task/order DTO với location, preparation, barcode, payment/insurance và blocking reason có cấu trúc.
3. Unit test cho `buildClinicalGpsView`.
4. Kiểm thử responsive và các trạng thái parallel/blocked/rework bằng dữ liệu backend thực.

### 2026-07-26 — Phase 2 / Slice 1: Image Quality & Consent Gate

Đã triển khai:

- `src/domain/imageQuality.ts`
  - Phân tích ảnh trên thiết bị, không gửi ảnh ra ngoài trong bước quality gate.
  - Đánh giá resolution, brightness, clipped dark/bright pixels, contrast và Laplacian sharpness.
  - Blur chỉ bị chặn ở mức cực đoan để tránh loại nhầm ảnh da vốn ít texture.
  - Loại metadata JPG/PNG theo byte segment/chunk; không re-encode pixel để tránh làm sai màu lâm sàng.
- `src/pages/AIAnalysis.tsx`
  - Chọn vùng cơ thể và loại ảnh trước upload.
  - Preview, điểm chất lượng, hướng dẫn chụp lại và xác nhận warning.
  - Chặn gửi khi chưa có consent xử lý dữ liệu hoặc chưa hiểu giới hạn AI.
  - Chỉ upload bản đã loại metadata.
  - Bỏ copy “AI Diagnosis” và các tuyên bố số liệu chưa có nguồn xác minh.

Kiểm tra:

- `[DONE]` Fixture metric ảnh tốt không sinh issue.
- `[DONE]` Fixture ảnh tối/mờ/thấp phân giải sinh blocking issues.
- `[DONE]` `npm run lint`.
- `[DONE]` `npm run build`.

Giới hạn:

- `[BLOCKED-BE]` Backend chưa nhận `bodyRegion`, `viewType`, quality metrics và capture protocol dưới dạng có cấu trúc.
- `[TODO]` HEIC cần pipeline chuyển đổi có kiểm soát màu; hiện chỉ nhận JPG/PNG.
- `[TODO]` Threshold cần hiệu chỉnh bằng bộ ảnh da liễu đại diện, không được coi là ngưỡng y khoa đã validation.

### 2026-07-26 — Phase 3 / Slice 1: Doctor-selected Protocol

Đã triển khai:

- Doctor Review hydrate lại toàn bộ dữ liệu quyết định từ API sau refresh/login.
- Chẩn đoán confirmed/revised/signed đều có thể làm đầu vào kế hoạch.
- Chỉ hiển thị protocol có published version.
- Bác sĩ xem tên, specialty, version và tối đa sáu bước trước khi áp dụng.
- Sau khi duyệt plan, client lấy encounter version mới trước khi activate để giảm lỗi optimistic concurrency.
- Client kiểm tra workflow instance backend vừa tạo; nếu backend tự chọn khác lựa chọn bác sĩ, dừng và báo lỗi cấu hình.
- Với plan đã duyệt nhưng chưa có workflow, bác sĩ có thể kích hoạt riêng.
- Với instance đã có, chuyển thẳng sang điều hành/thêm bước riêng cho bệnh nhân.

Kiểm tra:

- `[DONE]` `npm run lint`.
- `[DONE]` `npm run build`.

Giới hạn:

- `[BLOCKED-BE]` Nếu `POST clinical-plan` tự động kích hoạt protocol, backend phải nhận `templateId` trong cùng transaction hoặc ngừng auto-activate. Frontend không thể đảm bảo lựa chọn bác sĩ bằng hai request rời.
- `[TODO]` Reusable order set/subflow và policy check allergy/medication/lab prerequisite.

### 2026-07-26 — Phase 4 / Slice 1: Safe Graph Validation

Đã triển khai:

- `src/domain/workflowValidation.ts`
  - Kiểm tra Start/End, workflow rỗng, mã step trùng và dependency trỏ tới node đã mất.
  - Chặn self-loop, cycle, node không đi được từ Start và node không có đường tới End.
  - Điểm quyết định phải có ít nhất hai nhánh; cảnh báo nhánh chưa có điều kiện.
  - Cảnh báo bước bắt buộc thiếu output và bước lâm sàng thiếu địa điểm.
  - Sinh thứ tự mô phỏng topo có tính quyết định; không dùng thứ tự hiển thị của mảng step.
- `src/pages/workflows/WorkflowTemplateEditor.tsx`
  - Hiển thị tổng số lỗi/cảnh báo liên tục trong editor.
  - Modal kiểm tra chỉ rõ node liên quan.
  - Publish chặn graph sai nhưng không cản lưu nháp.
  - Mô phỏng chỉ bật khi graph hợp lệ.

Kiểm tra:

- `[DONE]` Fixture tuyến tính hợp lệ sinh thứ tự `Start → A → B → End`.
- `[DONE]` Fixture node mồ côi bị phát hiện cả ở chiều từ Start và tới End.
- `[DONE]` Fixture cycle bị chặn.
- `[DONE]` `npm run lint`.
- `[DONE]` `npm run build`.

Giới hạn:

- `[BLOCKED-BE]` `prerequisiteStepCodes` không đủ biểu diễn condition theo edge, default branch, parallel gateway và controlled loop.
- `[BLOCKED-BE]` Terminal node/edge còn lưu trong `localStorage`; cần graph DTO/version API trước khi có thể cam kết load lại đúng 100% trên mọi thiết bị.
- `[TODO]` Ít nhất 10 scenario test có fixture được giữ trong test suite CI thay vì chỉ chạy kiểm tra cục bộ.

### 2026-07-26 — Phase 5 / Contract Gate

Chưa dựng UI giả vì contract hiện tại chưa đủ bảo đảm an toàn:

- `ClinicalResult` chỉ có cờ `abnormal`; chưa có `criticality`, reference range, measured value/unit, reviewer hay acknowledgement.
- Chưa có API hàng đợi order toàn cơ sở để khoa xét nghiệm/chẩn đoán hình ảnh nhận và hoàn tất y lệnh.
- Chưa có acknowledgement endpoint, owner/deadline/escalation và điều kiện chặn đóng encounter khi còn kết quả nguy cấp.
- `WorkflowTask` chưa mang liên kết có cấu trúc tới `ClinicalOrder`.

Quyết định:

- `[BLOCKED-BE]` Không suy diễn `abnormal === critical`.
- `[BLOCKED-BE]` Không thêm nút “đã xử lý kết quả nguy cấp” nếu backend chưa ghi audit và optimistic concurrency.
- Phase 5 chỉ được mở implementation sau khi chốt order/result/acknowledgement contract và transaction boundary.

### 2026-07-26 — Phase 6 / Slice 1: Provenance-first Lifetime Record

Đã triển khai:

- Bỏ nhãn “Đã xác minh hồ sơ” mặc định; trạng thái đối soát được suy từ provenance từng event.
- Cảnh báo rõ số sự kiện chưa đối soát nguồn.
- Khi nhân viên mở `:patientId` khác, không lấy số điện thoại/email/địa chỉ của `currentPatient` để lấp dữ liệu thiếu.
- Super Admin không còn được coi là actor sửa dữ liệu lâm sàng chỉ vì có quyền nền tảng.
- Timeline lọc theo loại sự kiện, đơn vị nguồn và từ khóa; mỗi event hiện source system/source record/last verified.
- Thư viện ảnh cho chọn đúng hai ảnh để đối chiếu, giữ ngày, cơ sở nguồn và thông tin chữ ký.

Kiểm tra:

- `[DONE]` `npm run lint`.
- `[DONE]` `npm run build`.
- `[DONE]` `git diff --check`.

Giới hạn:

- `[BLOCKED-BE]` Chưa có identity confidence/master patient index nên frontend không được tự tuyên bố “định danh đã xác minh”.
- `[BLOCKED-BE]` Document DTO chưa có body region, view type, capture protocol, device/color calibration; ảnh chỉ được đặt cạnh nhau, chưa được phép tính % tiến triển.
- `[TODO]` UAT dữ liệu thật cho hồ sơ đa cơ sở và permission theo consent.

### 2026-07-27 — Verification pass

Đã hoàn tất:

- Chặn thao tác publish workflow khi không còn phiên bản nháp thay vì tiếp tục với `draft` rỗng.
- Xác nhận lại toàn bộ frontend bằng production build và ESLint.
- Khởi động thành công Vite HTTPS tại `https://127.0.0.1:5173/` để chuẩn bị Visual QA.

Kiểm tra:

- `[DONE]` `npm run build`.
- `[DONE]` `npm run lint`.
- `[TODO]` Visual QA/UAT có đăng nhập: runtime không cung cấp browser backend, dù local dev server đã chạy thành công.

Ranh giới chưa được phép triển khai giả:

- Các mục `[BLOCKED-BE]` ở journey snapshot, workflow graph DTO, critical-result acknowledgement và identity/capture provenance vẫn cần backend contract và enforcement tương ứng.
- Các phase 7–9 chưa đủ contract, dữ liệu pilot và hạ tầng để đạt Definition of Done; không được đổi trạng thái chỉ dựa trên UI/domain prototype hiện có.
