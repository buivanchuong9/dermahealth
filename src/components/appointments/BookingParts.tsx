import type { ReactNode } from "react";
import { DatePicker, Empty, Spin } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Building2, Check, Clock, Video } from "lucide-react";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export interface DoctorChoice {
  id: string;
  name: string;
  specialty?: string;
  place?: string;
  avatarUrl?: string;
}

export function DoctorPicker({
  doctors,
  value,
  onChange,
}: {
  doctors: DoctorChoice[];
  value?: string;
  onChange: (id: string) => void;
}) {
  if (!doctors.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bác sĩ trong hệ thống" />;
  }
  return (
    <div className="doctor-grid" role="radiogroup" aria-label="Chọn bác sĩ">
      {doctors.map((doctor) => {
        const selected = doctor.id === value;
        return (
          <button
            key={doctor.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`doctor-card${selected ? " is-selected" : ""}`}
            onClick={() => onChange(doctor.id)}
          >
            <span className="doctor-avatar">
              {doctor.avatarUrl ? (
                <img src={doctor.avatarUrl} alt="" />
              ) : (
                doctor.name.replace(/^(BS\.?|Bác sĩ)\s*/i, "").charAt(0).toUpperCase()
              )}
            </span>
            <span className="doctor-info">
              <strong>{doctor.name}</strong>
              <small>{doctor.specialty || "Bác sĩ"}</small>
              {doctor.place && <small className="doctor-place">{doctor.place}</small>}
            </span>
            {selected && (
              <span className="doctor-check">
                <Check size={13} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DateStrip({
  value,
  onChange,
  days = 14,
}: {
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  days?: number;
}) {
  const today = dayjs().startOf("day");
  const list = Array.from({ length: days }, (_, index) => today.add(index, "day"));
  const outside = value && !list.some((day) => day.isSame(value, "day"));
  return (
    <div className="date-strip-wrap">
      <div className="date-strip" role="radiogroup" aria-label="Chọn ngày khám">
        {outside && value && (
          <button type="button" role="radio" aria-checked className="date-chip is-selected">
            <small>{WEEKDAY[value.day()]}</small>
            <strong>{value.format("DD")}</strong>
            <small>Thg {value.format("M")}</small>
          </button>
        )}
        {list.map((day) => {
          const selected = Boolean(value?.isSame(day, "day"));
          return (
            <button
              key={day.format("YYYY-MM-DD")}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`date-chip${selected ? " is-selected" : ""}${day.day() === 0 ? " is-sunday" : ""}`}
              onClick={() => onChange(day)}
            >
              <small>{day.isSame(today, "day") ? "Hôm nay" : WEEKDAY[day.day()]}</small>
              <strong>{day.format("DD")}</strong>
              <small>Thg {day.format("M")}</small>
            </button>
          );
        })}
      </div>
      <DatePicker
        value={outside ? value : null}
        onChange={onChange}
        disabledDate={(current) => current.isBefore(dayjs(), "day")}
        placeholder="Ngày khác"
        format="DD/MM/YYYY"
        className="date-other"
      />
    </div>
  );
}

export interface SlotChoice {
  value: string;
  disabled: boolean;
  startsAt: string;
  endsAt: string;
  /** "Còn 3 chỗ", "Đã kín", "Bạn đã có lịch trùng giờ"... */
  hint: string;
}

const PERIODS: Array<{ key: string; label: string; test: (hour: number) => boolean }> = [
  { key: "morning", label: "Buổi sáng", test: (hour) => hour < 12 },
  { key: "afternoon", label: "Buổi chiều", test: (hour) => hour >= 12 && hour < 17 },
  { key: "evening", label: "Buổi tối", test: (hour) => hour >= 17 },
];

export function SlotPicker({
  choices,
  value,
  onChange,
  loading,
  empty,
}: {
  choices: SlotChoice[];
  value?: string;
  onChange: (id: string) => void;
  loading?: boolean;
  empty?: ReactNode;
}) {
  if (loading) {
    return (
      <div className="slot-state">
        <Spin size="small" /> <span>Đang kiểm tra giờ trống…</span>
      </div>
    );
  }
  if (!choices.length) return <>{empty}</>;
  const freeCount = choices.filter((choice) => !choice.disabled).length;
  return (
    <div className="slot-picker">
      <div className="slot-summary">
        <Clock size={14} /> Còn <strong>{freeCount}</strong> khung giờ trống
      </div>
      {PERIODS.map((period) => {
        const rows = choices.filter((choice) => period.test(dayjs(choice.startsAt).hour()));
        if (!rows.length) return null;
        return (
          <div key={period.key} className="slot-period">
            <span className="slot-period-label">{period.label}</span>
            <div className="slot-grid">
              {rows.map((choice) => {
                const selected = choice.value === value;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    disabled={choice.disabled}
                    title={`${dayjs(choice.startsAt).format("HH:mm")} – ${dayjs(choice.endsAt).format("HH:mm")} · ${choice.hint}`}
                    className={`slot-pill${selected ? " is-selected" : ""}`}
                    onClick={() => onChange(choice.value)}
                  >
                    <strong>{dayjs(choice.startsAt).format("HH:mm")}</strong>
                    <small>{choice.hint}</small>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ModePicker({
  value,
  onChange,
}: {
  value: "in_person" | "video";
  onChange: (value: "in_person" | "video") => void;
}) {
  const options = [
    { value: "in_person" as const, label: "Tại phòng khám", note: "Đến trực tiếp cơ sở", icon: <Building2 size={20} /> },
    { value: "video" as const, label: "Trực tuyến", note: "Khám qua video", icon: <Video size={20} /> },
  ];
  return (
    <div className="mode-grid" role="radiogroup" aria-label="Hình thức khám">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={`mode-card${value === option.value ? " is-selected" : ""}`}
          onClick={() => onChange(option.value)}
        >
          <span className="mode-icon">{option.icon}</span>
          <span>
            <strong>{option.label}</strong>
            <small>{option.note}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
