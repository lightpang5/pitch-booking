"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
} from "date-fns";
import { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ❌ 자기 자신을 import 하는 코드는 절대 없어야 합니다! (삭제됨)

// Supabase 타입 정의
type Booking = Database['public']['Tables']['bookings']['Row'];

// ✅ 1. 인터페이스 내보내기 (export 필수)
export interface SelectedSlot {
  date: Date;
  time: string;
}

interface BookingSchedulerProps {
  pitchId: string;
  reservations: Booking[];
  selectedSlot: SelectedSlot | null;
  onSelectSlot: (slot: SelectedSlot) => void;
  initialDate?: Date;
  onWeekChange: (start: Date, end: Date) => void;
  startHour?: number;
  endHour?: number;
  excludeBookingId?: string;
}

// ✅ 2. 컴포넌트 선언 (이 부분이 없어서 에러가 난 것입니다!)
const BookingScheduler: React.FC<BookingSchedulerProps> = ({
  pitchId,
  reservations,
  selectedSlot,
  onSelectSlot,
  initialDate,
  onWeekChange,
  startHour = 10,
  endHour = 24,
  excludeBookingId,
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    initialDate ? startOfWeek(initialDate, { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // useEffect(() => {
  //   onWeekChange(currentWeekStart, addDays(currentWeekStart, 7));
  // }, [currentWeekStart, onWeekChange]);

  const goToPreviousWeek = () => {
    const newStart = addDays(currentWeekStart, -7);
    setCurrentWeekStart(newStart);
    onWeekChange(newStart, addDays(newStart, 7)); // 여기서 직접 호출
  };

  const goToNextWeek = () => {
    const newStart = addDays(currentWeekStart, 7);
    setCurrentWeekStart(newStart);
    onWeekChange(newStart, addDays(newStart, 7)); // 여기서 직접 호출
  };

  const hours = useMemo(() => {
    return Array.from({ length: endHour - startHour }, (_, i) => i + startHour);
  }, [startHour, endHour]);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h3 className="text-lg font-bold">
            {format(currentWeekStart, "yyyy년 MM월")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(currentWeekStart, "dd일")} - {format(addDays(currentWeekStart, 6), "dd일")}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
    for (let i = 0; i < 7; i++) {
      const day = addDays(currentWeekStart, i);
      const isToday = isSameDay(day, new Date());
      const isSelectedDay = selectedSlot && isSameDay(selectedSlot.date, day);
      
      days.push(
        <div
          key={day.toISOString()}
          className="flex-1 text-center py-2 border-b border-transparent hover:bg-muted/30 transition-colors rounded-t-lg"
        >
          <div className="text-xs text-muted-foreground mb-1 font-medium">{dayNames[i]}</div>
          <div className={cn(
            "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all",
            isToday ? "bg-primary text-primary-foreground shadow-md" : "text-foreground",
            isSelectedDay && !isToday ? "ring-2 ring-primary ring-offset-2 bg-primary/10 text-primary" : ""
          )}>
            {format(day, "d")}
          </div>
        </div>
      );
    }
    return <div className="flex mb-2 border-b">{days}</div>;
  };

  const renderTimeSlots = () => {
    return (
      <div className="grid grid-cols-[auto_1fr] border rounded-lg overflow-hidden bg-background shadow-sm">
        <div className="col-span-1 bg-muted/30 border-r divide-y">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-12 flex items-center justify-end px-3 text-[11px] font-medium text-muted-foreground bg-muted/10"
            >
              {`${hour.toString().padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x flex-grow">
          {Array.from({ length: 7 }).map((_, dayIndex) => {
            const day = addDays(currentWeekStart, dayIndex);
            
            return (
              <div key={dayIndex} className="divide-y">
                {hours.map((hour) => {
                  const slotStartTime = new Date(day);
                  slotStartTime.setHours(hour, 0, 0, 0);
                  
                  const slotEndTime = new Date(day);
                  slotEndTime.setHours(hour + 1, 0, 0, 0);

                  const isPast = slotStartTime < new Date();

                  const isBooked = reservations.some((booking) => {
                    if (excludeBookingId && booking.id === excludeBookingId) return false;
                    const bookingStart = parseISO(booking.start_time);
                    const bookingEnd = parseISO(booking.end_time);
                    return (bookingStart < slotEndTime && bookingEnd > slotStartTime);
                  });

                  // 내 예약 확인 로직
                  let isMyBooking = false;
                  if (excludeBookingId) {
                    const myBooking = reservations.find(b => b.id === excludeBookingId);
                    if (myBooking) {
                        const bookingStart = parseISO(myBooking.start_time);
                        const bookingEnd = parseISO(myBooking.end_time);
                        if (bookingStart < slotEndTime && bookingEnd > slotStartTime) {
                            isMyBooking = true;
                        }
                    }
                  }

                  const isDisabled = isPast || isBooked;

                  const isSelected = selectedSlot &&
                    isSameDay(selectedSlot.date, slotStartTime) &&
                    selectedSlot.time === format(slotStartTime, "HH:mm");

                  return (
                    <div
                      key={hour}
                      className={cn(
                        "h-12 transition-all duration-200 relative group border-b border-r",
                        isDisabled && "bg-slate-100 cursor-not-allowed pattern-diagonal-lines",
                        !isDisabled && isSelected && "bg-blue-600 text-white",
                        !isDisabled && !isSelected && isMyBooking && "bg-blue-100 ring-1 ring-inset ring-blue-300", 
                        !isDisabled && !isSelected && !isMyBooking && "bg-white hover:bg-gray-50 cursor-pointer"
                      )}
                      onClick={() => {
                        if (!isDisabled) {
                          onSelectSlot({ date: slotStartTime, time: format(slotStartTime, "HH:mm") });
                        }
                      }}
                    >
                      {isDisabled && (
                        <div className="absolute inset-0 flex items-center justify-center p-1">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">
                            {isPast ? "불가" : "예약됨"}
                          </span>
                        </div>
                      )}
                      
                      {!isDisabled && !isSelected && isMyBooking && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50/90 px-2 py-0.5 rounded border border-blue-200 shadow-sm z-10">
                            현재 예약
                          </span>
                        </div>
                      )}

                      {!isDisabled && isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <div className="w-full h-full border-2 border-primary bg-primary/20 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">선택</span>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full select-none">
      {renderHeader()}
      {renderDays()}
      {renderTimeSlots()}
      
      {selectedSlot && (
        <div className="mt-4 p-4 border rounded-lg bg-primary/5 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div>
            <p className="text-xs text-primary font-bold mb-0.5">선택된 일정</p>
            <p className="text-sm font-medium text-foreground">
              {format(selectedSlot.date, "yyyy년 MM월 dd일 (EEE)", { locale: undefined })} {selectedSlot.time}
            </p>
          </div>          
        </div>
      )}
    </div>
  );
};

// ✅ 3. Default Export (파일 맨 끝)
export default BookingScheduler;